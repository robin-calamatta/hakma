// Online client: accounts, cloud saves, friends, presence and party co-op over WebSocket. Fully optional — the game runs offline.
import { CONFIG } from '../config.js';
import { G, listSlots, writeSlot } from './state.js';
import { getMap } from './maps.js';
import { audio } from '../core/audio.js';
import { esc } from '../core/rng.js';
import { ui } from './ui.js';
import { input } from '../core/input.js';

const base = () => (localStorage.getItem('hakma.server') || CONFIG.SERVER_URL || '').replace(/\/$/, '');

export const net = {
  token: localStorage.getItem('hakma.token') || null, user: null, ws: null, online: false, peers: new Map(), party: null, friends: [], requests: [], chatLog: [], listeners: new Set(), lastSync: 0,
  get authed() { return !!this.user; },
  async api(method, path, body) {
    const r = await fetch(base() + path, { method, headers: { 'Content-Type': 'application/json', ...(this.token ? { Authorization: 'Bearer ' + this.token } : {}) }, body: body ? JSON.stringify(body) : undefined });
    let j = {}; try { j = await r.json(); } catch {}
    if (!r.ok) { if (r.status === 401 && this.token) this.clear(); const err = new Error(j.error || (r.status === 404 || r.status === 405 ? 'Cloud saves aren\'t available on this server' : 'Request failed (' + r.status + ')')); err.status = r.status; throw err; }
    return j;
  },
  clear() { this.token = null; this.user = null; localStorage.removeItem('hakma.token'); this.ws?.close(); },
  async init() { if (!this.token) return; try { const j = await this.api('GET', '/api/me'); this.user = j.user; this.connect(); this.pullSaves(); } catch (e) { console.warn('offline or session expired', e.message); } },
  async register(f) { const j = await this.api('POST', '/api/register', f); this.lastOk = Date.now(); this.token = j.token; this.user = j.user; localStorage.setItem('hakma.token', j.token); this.connect(); this.pushAll(); return j; },
  async login(f) { const j = await this.api('POST', '/api/login', f); this.lastOk = Date.now(); this.token = j.token; this.user = j.user; localStorage.setItem('hakma.token', j.token); this.connect(); await this.pullSaves(); return j; },
  async logout() { try { await this.api('POST', '/api/logout'); } catch {} this.clear(); this.emit(); },
  // ---- cloud saves (newest wins)
  conflicts: new Set(), lastOk: 0, syncErr: '',
  async pullSaves() {
    try {
      const { saves } = await this.api('GET', '/api/saves'); const local = listSlots(); let n = 0;
      for (const sv of saves) {
        const l = local[sv.slot]; const newer = !l || (sv.updated_at > (l.updated || 0) && sv.data.id);
        const tomb = +localStorage.getItem('hakma.deleted.' + sv.slot) || 0; if (!l && tomb && sv.updated_at <= tomb) { this.api('DELETE', '/api/saves/' + sv.slot).catch(() => {}); continue; } // deleted on this device
        if (!newer) continue;
        // never swap out the save you're playing right now — ask the player to reload from the title screen instead
        if (G.save && !G.title && G.slot === sv.slot) { this.conflicts.add(sv.slot); ui.toast('☁ A newer cloud save exists for this slot. Return to the Title Screen to load it (this slot won\'t upload until then).', 6000); continue; }
        localStorage.setItem('hakma.slot.' + sv.slot, JSON.stringify(sv.data)); n++;
      }
      if (n) ui.toast(`☁ ${n} save${n > 1 ? 's' : ''} restored from the cloud`);
      this.lastOk = Date.now(); this.syncErr = '';
      this.pushAll();
      return n;
    } catch (e) { console.warn(e); this.syncErr = e.message; return 0; }
  },
  pushAll() { listSlots().forEach((s, i) => s && this.pushSave(i, s, true)); },
  async pushSave(slot, save, force) {
    if (!this.authed || (!force && Date.now() - this.lastSync < 15000)) return; this.lastSync = Date.now();
    if (this.conflicts.has(slot) && !(G.title || G.slot !== slot)) return;
    try { await this.api('PUT', '/api/saves/' + slot, { data: save, topic: save.topic, playtime: Math.round(save.playtime) }); this.lastOk = Date.now(); this.syncErr = ''; this.conflicts.delete(slot); }
    catch (e) { if (e.status === 409) { this.conflicts.add(slot); return; } console.warn('sync failed', e.message); this.syncErr = e.message; }
  },
  // ---- realtime
  connect() {
    if (!CONFIG.ONLINE) return; // cloud-saves-only mode has no realtime server
    if (!this.token || (this.ws && this.ws.readyState <= 1)) return;
    const u = new URL((base() || location.origin) + '/ws'); u.protocol = u.protocol.replace('http', 'ws'); u.searchParams.set('token', this.token);
    const ws = (this.ws = new WebSocket(u));
    ws.onopen = () => { this.online = true; this.retry = 0; this.sendPos(true); this.emit(); };
    ws.onclose = () => { this.online = false; this.peers.clear(); this.emit(); if (this.token) setTimeout(() => this.connect(), Math.min(30000, 1000 * 2 ** (this.retry = (this.retry || 0) + 1))); };
    ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch { return; } this.onMsg(m); };
  },
  send(m) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(m)); },
  sendPos(force) {
    const s = G.save; const w = G.world; if (!s || !w || !w.lp?.length) return; const p = w.lp[0];
    const st = { t: 'pos', topic: s.topic, map: s.map, mapName: w.map?.name, x: p.x, y: p.y, dir: p.dir, color: s.players[0].color, name: s.players[0].name };
    const key = JSON.stringify(st); if (!force && key === this.lastPos) return; this.lastPos = key; this.send(st);
  },
  onMsg(m) {
    switch (m.t) {
      case 'hello': this.friends = m.friends || []; this.requests = m.requests || []; this.party = m.party || null; break;
      case 'friends': this.friends = m.friends; this.requests = m.requests || this.requests; break;
      case 'presence': { const f = this.friends.find((x) => x.id === m.id); if (f) Object.assign(f, m); if (!m.online) this.peers.delete(m.id); break; }
      case 'pos': { const p = this.peers.get(m.from) || { id: m.from }; Object.assign(p, m, { id: m.from }); this.peers.set(m.from, p); break; }
      case 'party': this.party = m.party; if (!m.party) this.peers.clear(); else for (const id of [...this.peers.keys()]) if (!m.party.members.some((x) => x.id === id)) this.peers.delete(id); break;
      case 'invite': audio.sfx('chat'); this.pendingInvite = m; ui.toast(`👥 ${m.name} invited you to their party! Open Friends & Co-op to join.`, 5000); break;
      case 'friend_request': audio.sfx('chat'); this.requests = m.requests; ui.toast(`👋 Friend request from ${m.name}`, 4000); break;
      case 'chat': { this.chatLog.push(m); this.chatLog = this.chatLog.slice(-60); const p = this.peers.get(m.from); if (p) { p.bubble = m.text; p.bubbleUntil = Date.now() + 5000; } if (m.from !== this.user?.id) { audio.sfx('chat'); if (!this.panelOpen) ui.toast(`💬 ${m.name}: ${m.text}`, 3500); } break; }
      case 'error': ui.toast(m.error); break;
    }
    if (m.t !== 'pos') this.emit();
  },
  peersHere() { if (!this.party || !G.save) return []; const out = []; for (const p of this.peers.values()) if (p.id !== this.user?.id && p.topic === G.save.topic && p.map === G.save.map) out.push(p); return out; },
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
  emit() { for (const f of this.listeners) try { f(); } catch {} },
};
G.net = net;

// ------------------------------------------------------------ UI
const field = (name, label, type = 'text', extra = '') => `<label class="fld"><span>${label}</span><input class="txt" name="${name}" type="${type}" ${extra} autocomplete="${type === 'password' ? 'current-password' : 'off'}"></label>`;
function textGuard(root) { root.querySelectorAll('input.txt').forEach((i) => { i.addEventListener('focus', () => { input.textMode = true; }); i.addEventListener('blur', () => { input.textMode = false; input.keys.clear(); }); i.addEventListener('keydown', (e) => e.stopPropagation()); }); }
const ago = (t) => { if (!t) return 'never'; const s = (Date.now() - t) / 1000; if (s < 90) return 'just now'; if (s < 3600) return Math.round(s / 60) + 'm ago'; if (s < 86400) return Math.round(s / 3600) + 'h ago'; return Math.round(s / 86400) + 'd ago'; };

export const netui = {
  async friends() {
    let mode = net.authed ? 'home' : 'auth', err = '', busy = false;
    const off = net.on(() => { if (layer && !layer.closed && mode === 'home' && !(document.activeElement && document.activeElement.tagName === 'INPUT')) layer.rerender?.(); });
    let layer = null; net.panelOpen = true;
    const val = (n) => layer.el.querySelector(`[name="${n}"]`)?.value?.trim() || '';
    const chk = (n) => !!layer.el.querySelector(`[name="${n}"]`)?.checked;
    const cloud = !CONFIG.ONLINE;
    const p = ui.panel({ title: cloud ? '☁ Account & Cloud Save' : 'Friends & Co-op', wide: true, cls: 'friendsp', render: () => {
      setTimeout(() => { layer = ui.stack[ui.stack.length - 1]; if (layer) textGuard(layer.el); }, 0);
      const e = err ? `<p class="bad">${esc(err)}</p>` : '';
      if (mode === 'auth' && cloud) return `<p>Create a free account to back up your saves and continue on any device — phone, tablet or computer. Log in on the other device and your saves come with you.</p><p class="dim">Hakma still plays fully offline; your saves upload whenever you're online.</p>${e}
        <div class="row"><button data-nav data-act="m" data-arg="login">Log in</button><button data-nav data-act="m" data-arg="register">Create account</button></div>`;
      if (mode === 'auth') return `<p>Play online to add friends, see who's on, travel together in co-op parties and back up your saves to the cloud. Hakma also plays fully offline.</p>${e}
        <div class="row"><button data-nav data-act="m" data-arg="login">Log in</button><button data-nav data-act="m" data-arg="register">Create account</button></div><p class="dim">Server: ${esc(base() || location.origin)}</p>`;
      if (mode === 'login') return `${e}${field('login', 'Username or email')}${field('password', 'Password', 'password')}<div class="row"><button data-nav data-act="login" ${busy ? 'disabled' : ''}>Log in</button><button data-nav data-act="m" data-arg="auth">Back</button></div><p class="dim">Forgot your password? Ask the game administrator to reset it.</p>`;
      if (mode === 'register') return `${e}${field('username', 'Username (3–16 letters/numbers)', 'text', 'maxlength="16"')}${field('email', 'Email', 'email')}${field('password', 'Password (8+ characters)', 'password')}
        <label class="chk"><input type="checkbox" name="agree"> I have read and agree to the <a href="legal/eula.html" target="_blank">EULA</a>, <a href="legal/terms.html" target="_blank">Terms</a> and <a href="legal/privacy.html" target="_blank">Privacy Policy</a>.</label>
        <label class="chk"><input type="checkbox" name="age"> I am 13 or older, or a parent/guardian is creating this account for me.</label>
        <div class="row"><button data-nav data-act="register" ${busy ? 'disabled' : ''}>Create account</button><button data-nav data-act="m" data-arg="auth">Back</button></div>`;
      // home
      const u = net.user; const pt = net.party;
      if (cloud) return `<div class="me"><b>${esc(u.username)}</b> <span class="dim">${esc(u.email || '')}</span> <button data-nav data-act="logout">Log out</button></div>${e}
        <h4>Cloud save</h4><p>${net.syncErr ? `<span class="bad">Last sync failed: ${esc(net.syncErr)}</span>` : `☁ Last synced ${ago(net.lastOk)}.`} Your saves upload automatically while you play.</p>
        ${net.conflicts.size ? '<p class="bad">A newer cloud copy of the save you\'re playing exists. Go back to the Title Screen to load it.</p>' : ''}
        <div class="row"><button data-nav data-act="sync">⟳ Sync now</button></div>
        <p class="dim">On another device: open Hakma, choose <b>☁ Log in</b> on the title screen, then Continue.</p>
        <h4>Account</h4>
        <div class="row">${field('pw_cur', 'Current password', 'password')}${field('pw_new', 'New password (8+)', 'password')}<button data-nav data-act="pw">Change password</button></div>
        <div class="row"><button data-nav data-act="export">Download my data</button><button data-nav data-act="delacct">Delete my account</button></div>`;
      return `<div class="me"><b>${esc(u.username)}</b> <span class="dot ${net.online ? 'on' : ''}"></span> ${net.online ? 'Online' : 'Connecting…'} · Friend code <code>${esc(u.friend_code)}</code> ${u.admin ? '<a class="btn" data-nav href="admin.html" target="_blank">Admin</a>' : ''} <button data-nav data-act="logout">Log out</button></div>${e}
        <div class="row">${field('add', 'Add friend by username or code')}<button data-nav data-act="add">Send request</button></div>
        ${net.requests.length ? `<h4>Requests</h4>${net.requests.map((r) => `<div class="frow"><b>${esc(r.username)}</b><button data-nav data-act="acc" data-arg="${r.id}">Accept</button><button data-nav data-act="dec" data-arg="${r.id}">Decline</button></div>`).join('')}` : ''}
        ${net.pendingInvite ? `<div class="frow inv">👥 <b>${esc(net.pendingInvite.name)}</b> invited you to a party. <button data-nav data-act="join" data-arg="${net.pendingInvite.party}">Join</button></div>` : ''}
        <h4>Party ${pt ? `(${pt.members.length}/4)` : ''}</h4>
        ${pt ? `${pt.members.map((m) => `<div class="frow"><span class="dot ${m.online ? 'on' : ''}"></span><b>${esc(m.username)}</b> <span class="dim">${esc(m.where || '')}</span>${m.id !== u.id ? `<button data-nav data-act="goto" data-arg="${m.id}">Travel to</button>` : ' (you)'}</div>`).join('')}
          <div class="chat">${net.chatLog.map((c) => `<p><b>${esc(c.name)}:</b> ${esc(c.text)}</p>`).join('') || '<p class="dim">Party chat appears here and above players\' heads.</p>'}</div>
          <div class="row">${field('chat', 'Message', 'text', 'maxlength="120"')}<button data-nav data-act="chat">Send</button><button data-nav data-act="leave">Leave party</button></div>` : '<p class="dim">Invite online friends to form a party of up to 4. Party members studying the same topic see each other in the world and can travel to each other.</p>'}
        <h4>Friends (${net.friends.length})</h4>
        ${net.friends.map((f) => `<div class="frow"><span class="dot ${f.online ? 'on' : ''}"></span><b>${esc(f.username)}</b> <span class="dim">${f.online ? esc(f.where || 'Online') : 'Last seen ' + ago(f.last_seen)}</span>${f.online ? `<button data-nav data-act="inv" data-arg="${f.id}">Invite</button>` : ''}<button data-nav data-act="rm" data-arg="${f.id}">Remove</button></div>`).join('') || '<p class="dim">No friends yet — share your friend code!</p>'}
        <h4>Account</h4>${u.must_change_password ? '<p class="bad">An admin reset your password — please set a new one.</p>' : ''}
        <div class="row">${field('pw_cur', 'Current password', 'password')}${field('pw_new', 'New password (8+)', 'password')}<button data-nav data-act="pw">Change password</button></div>
        <div class="row"><button data-nav data-act="export">Download my data</button><button data-nav data-act="delacct">Delete my account</button></div>`;
    }, actions: {
      m: (a) => { mode = a; err = ''; },
      login: async () => { busy = true; err = ''; try { await net.login({ login: val('login'), password: val('password') }); mode = 'home'; ui.toast('Welcome back, ' + net.user.username + '!'); } catch (e) { err = e.message; } busy = false; },
      register: async () => { busy = true; err = ''; try { await net.register({ username: val('username'), email: val('email'), password: val('password'), agree: chk('agree'), age: chk('age') }); mode = 'home'; ui.toast('Account created!'); } catch (e) { err = e.message; } busy = false; },
      logout: async () => { await net.logout(); mode = 'auth'; },
      sync: async () => { err = ''; if (G.save && !G.title) { G.autosave?.(); } const n = await net.pullSaves(); if (G.save && !G.title) await net.pushSave(G.slot, G.save, true); ui.toast(net.syncErr ? 'Sync failed: ' + net.syncErr : n ? `☁ Synced — ${n} save${n > 1 ? 's' : ''} downloaded` : '☁ Synced'); },
      pw: async () => { err = ''; try { await net.api('POST', '/api/me/password', { current: val('pw_cur'), next: val('pw_new') }); net.user.must_change_password = false; ui.toast('Password changed'); } catch (e) { err = e.message; } },
      export: async () => { try { const j = await net.api('GET', '/api/me/export'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(j, null, 2)], { type: 'application/json' })); a.download = 'hakma-my-data.json'; a.click(); } catch (e) { err = e.message; } },
      delacct: async () => { if (!(await ui.confirm((cloud ? 'Permanently delete your account and cloud saves?' : 'Permanently delete your online account, friends and cloud saves?') + ' Saves on this device are kept.'))) return; try { await net.api('DELETE', '/api/me'); net.clear(); mode = 'auth'; ui.toast('Account deleted'); } catch (e) { err = e.message; } },
      add: async () => { err = ''; try { await net.api('POST', '/api/friends/request', { who: val('add') }); ui.toast('Friend request sent'); } catch (e) { err = e.message; } },
      acc: async (id) => { await net.api('POST', '/api/friends/respond', { id: +id, accept: true }).catch((e) => (err = e.message)); },
      dec: async (id) => { await net.api('POST', '/api/friends/respond', { id: +id, accept: false }).catch((e) => (err = e.message)); },
      rm: async (id) => { if (await ui.confirm('Remove this friend?')) await net.api('POST', '/api/friends/remove', { id: +id }).catch((e) => (err = e.message)); },
      inv: (id) => { net.send({ t: 'invite', to: +id }); ui.toast('Invite sent'); },
      join: (pid) => { net.send({ t: 'join', party: pid }); net.pendingInvite = null; },
      leave: () => { net.send({ t: 'leave' }); },
      chat: () => { const tx = val('chat'); if (tx) net.send({ t: 'chat', text: tx }); },
      goto: async (id) => {
        const m = net.peers.get(+id); if (!m || !m.map) { ui.toast('Their location is unknown right now.'); return; }
        if (m.topic !== G.save.topic) { ui.toast(`They're studying a different topic, so you can't share a world. Start a ${m.topic} save to join them.`, 4000); return; }
        try { getMap(G.W, m.map); } catch { return; }
        return G.world.warp(m.map, m.x, m.y, m.dir || 'down').then(() => 'close');
      },
    } });
    await p; off(); net.panelOpen = false;
  },
};
G.netui = netui;
