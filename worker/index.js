// Hakma cloud backend for Cloudflare Workers (free tier): accounts + cloud saves, stored in a D1 database.
// Everything that isn't /api/* is served from the static game files (env.ASSETS).
// Same API shape as the Node server (server/index.js) for the parts the game uses offline-first.

const enc = new TextEncoder();
const now = () => Date.now();
const TOKEN_DAYS = 90;
const MAX_SAVE_BYTES = 1_500_000;
const PBKDF2_ITER = 100_000; // Workers' maximum

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE COLLATE NOCASE, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    pass TEXT NOT NULL, salt TEXT NOT NULL, created_at INTEGER NOT NULL, last_login INTEGER, failed INTEGER NOT NULL DEFAULT 0, locked_until INTEGER NOT NULL DEFAULT 0, terms_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS tokens (hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created_at INTEGER NOT NULL, last_used INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS tokens_user ON tokens(user_id)`,
  `CREATE TABLE IF NOT EXISTS saves (user_id INTEGER NOT NULL, slot INTEGER NOT NULL, data TEXT NOT NULL, topic TEXT, playtime INTEGER, updated_at INTEGER NOT NULL, PRIMARY KEY (user_id, slot))`,
];
let ready = null;
function init(env) {
  if (!ready) ready = env.DB.batch(SCHEMA.map((s) => env.DB.prepare(s))).catch((e) => { ready = null; throw e; });
  return ready;
}

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const randHex = (n) => hex(crypto.getRandomValues(new Uint8Array(n)));
const sha = async (s) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
async function hashPw(pw, salt) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: PBKDF2_ITER }, key, 256));
}
function same(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const bad = (msg, status = 400) => { throw new HttpError(status, msg); };
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
const pub = (u) => ({ id: u.id, username: u.username, email: u.email, friend_code: '', admin: false, must_change_password: false, created_at: u.created_at });

async function body(req) { try { const t = await req.text(); if (t.length > MAX_SAVE_BYTES + 10_000) bad('Too large', 413); return t ? JSON.parse(t) : {}; } catch (e) { if (e instanceof HttpError) throw e; bad('Bad JSON'); } }

async function issueToken(env, userId) {
  const token = randHex(32); const t = now();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO tokens (hash, user_id, created_at, last_used) VALUES (?, ?, ?, ?)').bind(await sha(token), userId, t, t),
    env.DB.prepare('DELETE FROM tokens WHERE user_id = ? AND last_used < ?').bind(userId, t - TOKEN_DAYS * 864e5),
  ]);
  return token;
}
async function auth(env, req) {
  const h = req.headers.get('authorization') || ''; const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (!/^[0-9a-f]{64}$/.test(token)) bad('Please log in', 401);
  const th = await sha(token);
  const row = await env.DB.prepare('SELECT u.*, t.last_used FROM tokens t JOIN users u ON u.id = t.user_id WHERE t.hash = ?').bind(th).first();
  if (!row || row.last_used < now() - TOKEN_DAYS * 864e5) bad('Session expired — please log in again', 401);
  if (now() - row.last_used > 3600e3) await env.DB.prepare('UPDATE tokens SET last_used = ? WHERE hash = ?').bind(now(), th).run();
  return { user: row, th };
}

async function api(req, env, url) {
  await init(env);
  const p = url.pathname, m = req.method;
  if (p === '/api/health') return json({ ok: true, name: 'hakma-cloud', time: now() });
  if (p === '/api/info' && m === 'GET') return json({ cloud: true, online: false, allowRegistration: env.ALLOW_REGISTRATION !== 'false', externalLinks: env.EXTERNAL_LINKS !== 'false', operatorName: env.OPERATOR_NAME || undefined });

  if (p === '/api/register' && m === 'POST') {
    if (env.ALLOW_REGISTRATION === 'false') bad('New accounts are currently closed.', 403);
    const b = await body(req); const username = String(b.username || '').trim(), email = String(b.email || '').trim().toLowerCase(), password = String(b.password || '');
    if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) bad('Username must be 3–16 letters, numbers or _');
    if (!/^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(email) || email.length > 254) bad('Please enter a valid email');
    if (password.length < 8 || password.length > 200) bad('Password must be at least 8 characters');
    if (!b.agree) bad('Please accept the EULA, Terms and Privacy Policy');
    if (!b.age) bad('Please confirm the age requirement');
    const dup = await env.DB.prepare('SELECT username, email FROM users WHERE username = ? OR email = ?').bind(username, email).first();
    if (dup) bad(dup.username.toLowerCase() === username.toLowerCase() ? 'That username is taken' : 'An account with that email already exists', 409);
    const salt = randHex(16); const pass = await hashPw(password, salt); const t = now();
    const r = await env.DB.prepare('INSERT INTO users (username, email, pass, salt, created_at, last_login, terms_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(username, email, pass, salt, t, t, t).run();
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(r.meta.last_row_id).first();
    return json({ token: await issueToken(env, user.id), user: pub(user) });
  }
  if (p === '/api/login' && m === 'POST') {
    const b = await body(req); const login = String(b.login || '').trim(), password = String(b.password || '');
    const user = await env.DB.prepare('SELECT * FROM users WHERE username = ? OR email = ?').bind(login, login.toLowerCase()).first();
    if (!user) { await hashPw(password, 'x'.repeat(32)); bad('Wrong username/email or password', 401); }
    if (user.locked_until > now()) bad(`Too many attempts — try again in ${Math.ceil((user.locked_until - now()) / 60000)} min`, 429);
    if (!same(await hashPw(password, user.salt), user.pass)) {
      const f = user.failed + 1;
      await env.DB.prepare('UPDATE users SET failed = ?, locked_until = ? WHERE id = ?').bind(f >= 5 ? 0 : f, f >= 5 ? now() + 10 * 60e3 : 0, user.id).run();
      bad('Wrong username/email or password', 401);
    }
    await env.DB.prepare('UPDATE users SET failed = 0, locked_until = 0, last_login = ? WHERE id = ?').bind(now(), user.id).run();
    return json({ token: await issueToken(env, user.id), user: pub(user) });
  }

  const { user, th } = await auth(env, req);
  if (p === '/api/logout' && m === 'POST') { await env.DB.prepare('DELETE FROM tokens WHERE hash = ?').bind(th).run(); return json({ ok: true }); }
  if (p === '/api/me' && m === 'GET') return json({ user: pub(user) });
  if (p === '/api/me' && m === 'DELETE') {
    await env.DB.batch(['DELETE FROM saves WHERE user_id = ?', 'DELETE FROM tokens WHERE user_id = ?', 'DELETE FROM users WHERE id = ?'].map((s) => env.DB.prepare(s).bind(user.id)));
    return json({ ok: true });
  }
  if (p === '/api/me/password' && m === 'POST') {
    const b = await body(req); const next = String(b.next || '');
    if (!same(await hashPw(String(b.current || ''), user.salt), user.pass)) bad('Current password is wrong', 401);
    if (next.length < 8 || next.length > 200) bad('New password must be at least 8 characters');
    const salt = randHex(16);
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET pass = ?, salt = ? WHERE id = ?').bind(await hashPw(next, salt), salt, user.id),
      env.DB.prepare('DELETE FROM tokens WHERE user_id = ? AND hash != ?').bind(user.id, th), // log out other devices
    ]);
    return json({ ok: true });
  }
  if (p === '/api/me/export' && m === 'GET') {
    const saves = (await env.DB.prepare('SELECT slot, topic, playtime, updated_at, data FROM saves WHERE user_id = ?').bind(user.id).all()).results.map((s) => ({ ...s, data: JSON.parse(s.data) }));
    return json({ account: { username: user.username, email: user.email, created_at: user.created_at, last_login: user.last_login, terms_accepted_at: user.terms_at }, saves });
  }
  if (p === '/api/saves' && m === 'GET') {
    const rows = (await env.DB.prepare('SELECT slot, data, updated_at FROM saves WHERE user_id = ?').bind(user.id).all()).results;
    return json({ saves: rows.map((s) => ({ slot: s.slot, updated_at: s.updated_at, data: JSON.parse(s.data) })) });
  }
  const sm = p.match(/^\/api\/saves\/(\d{1,2})$/);
  if (sm && m === 'PUT') {
    const slot = +sm[1]; if (slot > 9) bad('Bad slot');
    const b = await body(req); if (!b.data || typeof b.data !== 'object') bad('Missing save data');
    const data = JSON.stringify(b.data); if (data.length > MAX_SAVE_BYTES) bad('Save is too large', 413);
    const updated = Number.isFinite(b.data.updated) ? Math.min(b.data.updated, now() + 60e3) : now();
    const cur = await env.DB.prepare('SELECT updated_at FROM saves WHERE user_id = ? AND slot = ?').bind(user.id, slot).first();
    if (cur && cur.updated_at > updated && !b.force) return json({ ok: false, stale: true, updated_at: cur.updated_at }, 409);
    await env.DB.prepare('INSERT INTO saves (user_id, slot, data, topic, playtime, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, slot) DO UPDATE SET data = excluded.data, topic = excluded.topic, playtime = excluded.playtime, updated_at = excluded.updated_at')
      .bind(user.id, slot, data, String(b.topic || '').slice(0, 40), Math.max(0, Math.round(+b.playtime || 0)), updated).run();
    return json({ ok: true, updated_at: updated });
  }
  if (sm && m === 'DELETE') { await env.DB.prepare('DELETE FROM saves WHERE user_id = ? AND slot = ?').bind(user.id, +sm[1]).run(); return json({ ok: true }); }
  bad('Not found', 404);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) {
      if (!env.DB) return json({ error: 'Cloud saves are not set up on this server yet.' }, 503);
      try { return await api(req, env, url); }
      catch (e) { if (e instanceof HttpError) return json({ error: e.message }, e.status); console.error(e); return json({ error: 'Server error — please try again' }, 500); }
    }
    return env.ASSETS.fetch(req);
  },
};
