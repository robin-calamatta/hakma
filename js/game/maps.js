import { typeBeatsLines } from '../content/types.js';
// Deterministic map generation: every topic gets its own region of 8 cities, 9 routes, gyms, interiors and a summit.
import { rng, hash } from '../core/rng.js';
import { T } from '../core/sprites.js';
import { BIOME_ORDER } from './content.js';

const CITY_MOOD = { meadow: 'town', coast: 'bright', forest: 'mystic', desert: 'bright', snow: 'calm', volcano: 'epic', crystal: 'cave', neon: 'neon' };
const ROUTE_MOOD = { crystal: 'cave', neon: 'neon' };
export const HOMETOWN = 'Origin Town';

function grid(w, h, fill) {
  const t = new Uint8Array(w * h).fill(fill);
  const m = { w, h, t, objs: [], warps: [], buildings: [] };
  m.get = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? T.TREE : t[y * w + x]);
  m.set = (x, y, v) => { if (x >= 0 && y >= 0 && x < w && y < h) t[y * w + x] = v; };
  m.rect = (x, y, rw, rh, v) => { for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) m.set(i, j, v); };
  return m;
}
const biomeCache = {};
const cityBiome = (W, i) => { if (W.cities[i]?.biome) return W.cities[i].biome; if (!SEED) return BIOME_ORDER[i % 8]; const k = W.id + SEED; const order = biomeCache[k] || (biomeCache[k] = [...BIOME_ORDER].sort((a, b) => hash(k + a) - hash(k + b))); return order[i % 8]; };
export const biomeOf = cityBiome;
const doorOutside = (W, mapId, kind) => { const cm = getMap(W, mapId); const d = cm.warps.find((q) => q.door && q.kind === kind); return [d.x, d.y + 1]; };
const routeEntryY = (W, r) => routeLayout(W, r).h - 2;
// Where you land when Soaring to a place: just outside its Mend Station (or home in Origin Town)
export function flyPoint(W, mapId) { return mapId === 'hometown' ? doorOutside(W, 'hometown', 'home') : doorOutside(W, mapId, 'mend'); }
function building(m, x, y, w, h, kind, to, label) {
  m.rect(x, y, w, h, T.BWALL);
  const dx = x + Math.floor(w / 2), dy = y + h - 1; m.set(dx, dy, T.DOOR);
  m.buildings.push({ x, y, w, h, kind, label });
  if (to) m.warps.push({ x: dx, y: dy, to, tx: 5, ty: 7, dir: 'up', door: true, kind });
  return { dx, dy };
}
function interior(w, h, exitTo, ex, ey) {
  const m = grid(w, h, T.FLOOR); m.rect(0, 0, w, 2, T.IWALL);
  const mx = Math.floor(w / 2) - 1; m.set(mx, h - 1, T.MAT); m.set(mx + 1, h - 1, T.MAT);
  m.warps.push({ x: mx, y: h - 1, to: exitTo, tx: ex, ty: ey, dir: 'down' }, { x: mx + 1, y: h - 1, to: exitTo, tx: ex, ty: ey, dir: 'down' });
  m.kind = 'interior'; m.biome = 'interior'; m.entry = { x: mx, y: h - 2 };
  return m;
}
const npc = (x, y, o) => ({ x, y, kind: 'npc', dir: 'down', ...o });

// ---- per-save world seed: every new game gets a different region layout. 'legacy' keeps pre-seed saves identical.
let SEED = '';
export function setWorldSeed(seed) { SEED = !seed || seed === 'legacy' ? '' : String(seed); }
export const worldSeed = () => SEED;
function variant(W, key, n) { if (!SEED) return 0; return hash(W.id + SEED + 'var' + key) % n; }
const CLEARABLE = new Set([T.CUTTREE, T.CRACKROCK]);
const maps = {};
export function getMap(W, id) {
  const key = W.id + ':' + SEED + ':' + id;
  if (!maps[key]) { const m = build(W, id); m.id = id; m.musicKey = m.musicKey || key; maps[key] = m; }
  return maps[key];
}
function build(W, id) {
  let mm;
  if (id === 'home_room') return homeRoom(W);
  if (id === 'home_house') return homeHouse(W);
  if (id === 'hometown') return hometown(W);
  if (id === 'lab') return profLab(W);
  if (id === 'summit') return summit(W);
  if ((mm = id.match(/^route(\d)$/))) return route(W, +mm[1]);
  if ((mm = id.match(/^grove(\d)$/))) return grove(W, +mm[1]);
  if ((mm = id.match(/^city(\d)$/))) return city(W, +mm[1]);
  if ((mm = id.match(/^city(\d)_(\w+)$/))) return cityInterior(W, +mm[1], mm[2]);
  throw new Error('No map ' + id);
}

// ------------------------------------------------------------ home
function homeRoom(W) {
  const m = interior(9, 7, null); m.warps = []; m.rect(0, 6, 9, 1, T.IWALL); // no exit mat
  m.set(1, 3, T.BED); m.set(4, 2, T.DESK); m.set(5, 2, T.SHELF); m.set(7, 2, T.STAIRS); m.set(2, 2, T.PLANT); m.rect(3, 4, 3, 2, T.RUG);
  m.warps.push({ x: 7, y: 2, to: 'home_house', tx: 7, ty: 3, dir: 'down', stairs: true });
  m.objs.push({ x: 4, y: 2, kind: 'terminal', solidTile: true });
  m.name = 'Your Room'; m.music = 'calm'; m.ci = 0; m.musicKey = W.id + ':home';
  return m;
}
function homeHouse(W) {
  const m = interior(10, 8, 'hometown', ...doorOutside(W, 'hometown', 'home'));
  m.set(7, 2, T.STAIRS); m.warps.push({ x: 7, y: 2, to: 'home_room', tx: 6, ty: 2, dir: 'left', stairs: true });
  m.set(4, 4, T.TABLE); m.set(1, 2, T.SHELF); m.set(2, 2, T.SHELF); m.set(8, 6, T.PLANT); m.rect(3, 5, 3, 1, T.RUG);
  m.objs.push(npc(3, 4, { kind: 'guardian', name: 'Guardian', pal: { hair: '#5a3820', shirt: '#e06090' }, dir: 'right' }));
  m.name = 'Home'; m.music = 'calm'; m.ci = 0; m.musicKey = W.id + ':home';
  return m;
}
function hometown(W) {
  const w = 24, h = 20, m = grid(w, h, T.GRASS); const r = rng(hash(W.id + SEED + 'home'));
  const M = variant(W, 'home', 2) === 1; const mx = (x, bw = 1) => (M ? w - x - bw : x);
  border(m, [11, 12], []);
  m.rect(11, 0, 2, 11, T.PATH); m.rect(3, 9, 18, 2, T.PATH);
  const hd = building(m, mx(4, 5), 4, 5, 4, 'home', 'home_house'); m.set(hd.dx, hd.dy + 1, T.PATH);
  m.warps[m.warps.length - 1].tx = 4; m.warps[m.warps.length - 1].ty = 6;
  const ld = building(m, mx(14, 7), 3, 7, 5, 'prof', 'lab'); m.set(ld.dx, ld.dy + 1, T.PATH);
  m.warps[m.warps.length - 1].tx = 5; m.warps[m.warps.length - 1].ty = 8;
  m.rect(mx(15, 5), 13, 5, 3, T.WATER); m.rect(mx(14, 7), 12, 7, 1, T.FENCE);
  for (let i = 0; i < 18; i++) { const x = r.int(2, w - 3), y = r.int(11, h - 3); if (m.get(x, y) === T.GRASS) m.set(x, y, r() < 0.6 ? T.FLOWER : T.TREE); }
  const sx = mx(13); m.set(sx, 11, T.SIGN); m.objs.push({ x: sx, y: 11, kind: 'sign', text: [`${HOMETOWN} — where every journey of learning begins.`, `North: Route 1 toward ${W.cities[0].name}.`] });
  m.set(mx(7), 12, T.GRASS); m.set(mx(17), 11, T.GRASS);
  m.objs.push(npc(mx(7), 12, { name: 'Kid', wander: true, lines: ['In battle you attack by answering questions! Get it right fast for a Quick Recall critical hit.', 'Wrong answers aren\'t wasted — you see the explanation, and the question comes back later so you can master it.'] }));
  m.objs.push(npc(mx(17), 11, { name: 'Elder', lines: ['Six types rule this world:', ...typeBeatsLines(), 'A super-effective hit does double damage.'] }));
  m.objs.push(npc(mx(10), 2, { kind: 'guard', name: 'Ranger', gate: 'starter', dir: 'down' }));
  const ry = routeEntryY(W, 1);
  m.warps.push({ x: 11, y: 0, to: 'route1', tx: 10, ty: ry, dir: 'up' }, { x: 12, y: 0, to: 'route1', tx: 11, ty: ry, dir: 'up' });
  Object.assign(m, { name: HOMETOWN, kind: 'town', biome: SEED ? cityBiome(W, 0) : 'meadow', music: 'town', ci: 0, gateNorth: { y: 1, flag: 'starter' } });
  return m;
}
function profLab(W) {
  const m = interior(12, 10, 'hometown', ...doorOutside(W, 'hometown', 'prof'));
  m.rect(1, 2, 3, 1, T.SHELF); m.rect(8, 2, 3, 1, T.SHELF); m.rect(4, 5, 5, 1, T.TABLE); m.set(1, 7, T.PLANT); m.set(10, 7, T.PLANT); m.set(10, 4, T.PC);
  m.objs.push(npc(6, 3, { kind: 'prof', name: W.profName, pal: { coat: true, hair: '#e0e0f0', shirt: '#3070d0' } }));
  W.starters.forEach((sid, i) => m.objs.push({ x: 4 + i * 2, y: 5, kind: 'starter', sp: sid, solidTile: true }));
  m.objs.push(npc(2, 6, { name: 'Lab Aide', pal: { coat: true }, lines: ['The Professor studies how monsters grow when their trainers learn.', 'Every correct answer gives your monster bonus experience. Knowledge literally makes them stronger!'] }));
  Object.assign(m, { name: W.profName.split(' ').pop() + ' Lab', music: 'lab', ci: 0 });
  return m;
}

// ------------------------------------------------------------ helpers
function border(m, northGap, southGap) {
  const { w, h } = m;
  for (let x = 0; x < w; x++) for (const y of [0, 1, h - 2, h - 1]) {
    if ((y <= 1 && northGap.includes(x)) || (y >= h - 2 && southGap.includes(x))) continue; m.set(x, y, T.TREE);
  }
  for (let y = 0; y < h; y++) for (const x of [0, 1, w - 2, w - 1]) m.set(x, y, T.TREE);
}
function scatter(m, r, n, kinds, avoid) {
  for (let i = 0; i < n * 4 && n > 0; i++) {
    const x = r.int(2, m.w - 3), y = r.int(2, m.h - 3);
    if (m.get(x, y) !== T.GRASS || (avoid && avoid(x, y))) continue;
    m.set(x, y, r.pick(kinds)); n--;
  }
}
const tipLines = (W, ci, k, n = 2) => { const terms = W.cities[ci]?.terms || []; if (!terms.length) return []; const out = []; for (let i = 0; i < n; i++) out.push(terms[(k * n + i) % terms.length].id); return out; };

// ------------------------------------------------------------ routes
const routeCache = {};
export function routeLayout(W, r) {
  const key = W.id + SEED + r; if (routeCache[key]) return routeCache[key];
  const w = 34, h = SEED ? 50 + 2 * rng(hash(W.id + SEED + 'rlen' + r)).int(0, 7) : 54, R = rng(hash(W.id + SEED + 'route' + r)); const px = new Array(h);
  let cx = 10;
  for (let y = h - 1; y >= 0; y--) {
    if (y > 4 && y < h - 4 && (h - y) % 6 === 0) cx = Math.max(4, Math.min(26, cx + R.pick([-6, -5, -4, 4, 5, 6, -3, 3])));
    if (y <= 4) cx = 10; px[y] = cx;
  }
  return (routeCache[key] = { w, h, px, R });
}
function route(W, r) {
  const { w, h, px } = routeLayout(W, r); const R = rng(hash(W.id + SEED + 'r' + r));
  const toCity = r <= 8 ? r - 1 : null; const fromCity = r === 1 ? null : r - 2;
  const biome = cityBiome(W, Math.min(r - 1, 7));
  const m = grid(w, h, T.GRASS); border(m, [10, 11], [10, 11]);
  let prev = px[h - 1];
  for (let y = h - 1; y >= 0; y--) { const cx = px[y]; const a = Math.min(cx, prev), b = Math.max(cx, prev); m.rect(a, y, b - a + 2, 1, T.PATH); prev = cx; }
  const onPath = (x, y) => x >= px[y] - 1 && x <= px[y] + 2;
  // tall grass patches
  for (let i = 0; i < 16; i++) { const pw = R.int(3, 8), ph = R.int(3, 6), x0 = R.int(2, w - 2 - pw), y0 = R.int(4, h - 6 - ph); for (let y = y0; y < y0 + ph; y++) for (let x = x0; x < x0 + pw; x++) if (m.get(x, y) === T.GRASS || (m.get(x, y) === T.PATH && R() < 0.85)) m.set(x, y, T.TALL); }
  // pond
  for (let k = 0; k < 3; k++) { const pw = R.int(3, 6), ph = R.int(2, 4), x0 = R.int(2, w - 2 - pw), y0 = R.int(6, h - 8 - ph); let ok = true; for (let y = y0 - 1; y < y0 + ph + 1; y++) for (let x = x0 - 1; x < x0 + pw + 1; x++) if (onPath(x, y)) ok = false; if (ok) m.rect(x0, y0, pw, ph, T.WATER); }
  scatter(m, R, 85, [T.TREE, T.TREE, T.TREE, T.TREE, T.ROCK, T.FLOWER, T.FLOWER], (x, y) => onPath(x, y) || onPath(x - 1, y) || onPath(x + 1, y));
  // trainers
  const lines = W.routeLines(r); const [, hi] = W.routeLevels(r);
  [0.86, 0.68, 0.5, 0.33, 0.16].forEach((f, k) => {
    const y = Math.floor(h * f) + R.int(-2, 2); const left = R() < 0.5; const x = left ? px[y] - 2 : px[y] + 3;
    if (x < 2 || x > w - 3) return; m.set(x, y, T.GRASS); m.set(left ? x + 1 : x - 1, y, T.PATH);
    const nm = W.trainerName(hash(W.id + SEED + r + 't' + k)); const n = Math.min(1 + Math.floor((r + k) / 4), 3);
    m.objs.push({ x, y, kind: 'trainer', dir: left ? 'right' : 'left', sight: 4, key: `r${r}t${k}`, name: nm.name, cls: nm.cls, team: W.makeTeam(hash(W.id + SEED + r + 'team' + k), lines, n, hi + 1 - (n - 1)), money: (hi + 2) * 22, qci: Math.min(r - 1, 7), tip: tipLines(W, Math.min(r - 1, 7), k + 3, 1)[0] });
  });
  // item caches + notes (placed beside the path so they are always reachable)
  const spots = []; for (let y = 4; y < h - 4; y += 3) { for (const x of [px[y] - 1, px[y] + 2]) if (x > 1 && x < w - 2 && !m.objs.some((o) => o.x === x && o.y === y)) spots.push([x, y]); }
  const sp = spots.sort(() => R() - 0.5);
  const items = ['tonic', 'cube', r > 3 ? 'supertonic' : 'tonic', 'shard'];
  for (let k = 0; k < 4 && sp.length; k++) { const [x, y] = sp.pop(); m.set(x, y, T.GRASS); m.objs.push({ x, y, kind: 'item', item: R.pick(items), count: 1, key: `r${r}i${k}`, solidTile: false }); }
  const nc = toCity !== null ? toCity : 7; const terms = W.cities[nc].terms;
  for (let k = 0; k < 4 && sp.length && terms.length; k++) { const [x, y] = sp.pop(); m.set(x, y, T.GRASS); m.objs.push({ x, y, kind: 'note', term: terms[(k * 3 + 1) % terms.length].id, key: `r${r}n${k}` }); }
  // ---- exploration: a side glade off the road (reached by a little trail) with a wanderer and a treasure
  {
    const gy = Math.floor(h * (0.35 + R() * 0.3)); const left = px[gy] > w / 2; const gw = 7, gh = 6;
    const gx = left ? 3 : w - 3 - gw, gy0 = gy - 2;
    m.rect(gx, gy0, gw, gh, T.GRASS); for (let y = gy0; y < gy0 + gh; y++) for (let x = gx; x < gx + gw; x++) if (R() < 0.25) m.set(x, y, T.FLOWER);
    for (let x = Math.min(gx + gw, px[gy]); x <= Math.max(gx - 1, px[gy] + 1); x++) m.set(x, gy, T.PATH);
    m.set(gx + 3, gy0 + 1, T.GRASS); m.objs.push({ x: gx + 3, y: gy0 + 1, kind: 'item', item: R.pick(['shard', 'cube2', 'supertonic', 'shard']), count: 1, key: `r${r}gl` });
    m.set(gx + 1, gy0 + 3, T.GRASS); m.objs.push(npc(gx + 1, gy0 + 3, { name: R.pick(['Wanderer', 'Hiker', 'Birdwatcher', 'Camper']), tips: tipLines(W, Math.min(r - 1, 7), 8, 2), dir: 'right', pal: { shirt: '#7a5a3a', hat: '#4a8a3a' } }));
    m.set(gx + gw - 2, gy0 + gh - 2, T.SIGN); m.objs.push({ x: gx + gw - 2, y: gy0 + gh - 2, kind: 'sign', text: ['A quiet glade. Explorers say every route hides a sparkle or two — look for glints in the grass!'] });
  }
  // ---- hidden items: glinting spots you can walk over; face them and press A
  for (let k = 0, tries = 0; k < 2 && tries < 80; tries++) {
    const x = R.int(3, w - 4), y = R.int(5, h - 6);
    if (m.get(x, y) !== T.GRASS && m.get(x, y) !== T.TALL) continue; if (m.objs.some((o) => Math.abs(o.x - x) + Math.abs(o.y - y) < 3)) continue;
    m.objs.push({ x, y, kind: 'item', hidden: true, walkable: true, item: R.pick(['tonic', 'cube', 'shard', 'supertonic', 'cube2']), count: 1, key: `r${r}h${k}` }); k++;
  }
  // signpost
  m.set(px[h - 4] - 1, h - 4, T.SIGN);
  m.objs.push({ x: px[h - 4] - 1, y: h - 4, kind: 'sign', text: [`Route ${r}`, toCity !== null ? `North: ${W.cities[toCity].name} — ${W.cities[toCity].theme}.` : 'North: the Mastery Summit.', 'Tall grass hides wild monsters. Lost notes on this route preview what\'s ahead!'] });
  // ---- field-skill obstacles. Slice (from Leader 1) clears saplings; Smash (from Leader 3) breaks cracked boulders.
  // A wall only blocks the main road on routes you reach after earning that skill; pockets hide bonus items.
  const obst = [];
  const wallRow = (tile) => {
    for (let tries = 0; tries < 60; tries++) {
      const y = R.int(8, h - 10); const x0 = px[y];
      if (px[y - 1] !== x0 || px[y + 1] !== x0 || m.objs.some((o) => Math.abs(o.y - y) <= 1)) continue;
      for (let x = 2; x < w - 2; x++) { if (x === x0 || x === x0 + 1) { obst.push([x, y, tile, T.PATH]); m.set(x, y, tile); } else m.set(x, y, T.TREE); }
      return true;
    }
    return false;
  };
  const wallKind = r >= 4 && R() < 0.45 ? T.CRACKROCK : r >= 2 && R() < 0.7 ? T.CUTTREE : null;
  if (wallKind !== null && r <= 8) wallRow(wallKind);
  if (r >= 2) {
    for (let tries = 0; tries < 6 && sp.length; tries++) {
      const [x, y] = sp.pop(); const dir = x < px[y] ? -1 : 1; const ix = x + dir;
      if (ix < 2 || ix > w - 3 || m.objs.some((o) => Math.abs(o.x - ix) <= 1 && Math.abs(o.y - y) <= 1) || obst.some((o) => Math.abs(o[1] - y) <= 1)) continue;
      const tile = r >= 4 && R() < 0.5 ? T.CRACKROCK : T.CUTTREE;
      obst.push([x, y, tile, T.GRASS]); m.set(x, y, tile); m.set(ix, y, T.GRASS);
      for (const [ax, ay] of [[ix, y - 1], [ix, y + 1], [ix + dir, y]]) if (ax >= 1 && ax <= w - 2) m.set(ax, ay, T.TREE);
      const prize = r >= 5 ? R.pick(['tm', 'shard', 'cube2', 'maxtonic']) : R.pick(['shard', 'cube2', 'supertonic']);
      m.objs.push({ x: ix, y, kind: 'item', item: prize === 'tm' ? 'tm_' + R.pick(['logic', 'cipher', 'spark', 'data', 'structure', 'flux']) : prize, count: 1, key: `r${r}p` });
      break;
    }
  }
  // ---- Hidden Grove entrance on some routes (a trail to the edge of the map, often behind a Slice sapling)
  if (hasGrove(r)) {
    const gy = groveRow(W, r); const left = px[gy] > w / 2; const ex = left ? 0 : w - 1;
    for (let x = Math.min(ex, px[gy]); x <= Math.max(ex, px[gy] + 1); x++) { if (m.get(x, gy) === T.WATER || m.get(x, gy) === T.TREE || m.get(x, gy) === T.ROCK || x <= 1 || x >= w - 2 || true) m.set(x, gy, T.PATH); }
    m.objs = m.objs.filter((o) => o.y !== gy || (o.x > Math.min(ex, px[gy]) && o.x < Math.max(ex, px[gy]) ? false : true));
    for (const o of obst) if (o[1] === gy) o[3] = T.PATH;
    if (r >= 3) { const bx = left ? 2 : w - 3; obst.push([bx, gy, T.CUTTREE, T.PATH]); m.set(bx, gy, T.CUTTREE); }
    m.warps.push({ x: ex, y: gy, to: `grove${r}`, tx: left ? 22 : 1, ty: 10, dir: left ? 'left' : 'right' });
    m.groveSide = left ? 'west' : 'east';
  }
  m.obstacles = obst; m.clearable = CLEARABLE;
  // exits
  const southTo = fromCity === null ? ['hometown', 11, 2] : [`city${fromCity}`, 14, 2];
  const northTo = toCity !== null ? [`city${toCity}`, 14, 23] : ['summit', 6, 32];
  for (const x of [10, 11]) { m.warps.push({ x, y: h - 1, to: southTo[0], tx: southTo[1] + (x - 10), ty: southTo[2], dir: 'down' }); m.warps.push({ x, y: 0, to: northTo[0], tx: northTo[1] + (x - 10), ty: northTo[2], dir: 'up' }); }
  Object.assign(m, { name: `Route ${r}`, kind: 'route', biome, music: ROUTE_MOOD[biome] || 'route', ci: Math.min(r - 1, 7), encounter: r, noteRoute: r });
  return m;
}

// ------------------------------------------------------------ hidden groves (optional side areas with rarer monsters)
const hasGrove = (r) => r >= 2 && r <= 8;
const groveRow = (W, r) => { const { h, px } = routeLayout(W, r); for (let k = 0; k < 40; k++) { const y = Math.floor(h * 0.2) + (hash(W.id + SEED + 'gr' + r + k) % Math.floor(h * 0.25)); if (px[y - 1] === px[y] && px[y + 1] === px[y]) return y; } return Math.floor(h * 0.3); };
function grove(W, r) {
  const back = `route${r}`; const rm = getMap(W, back); const back_w = rm.warps.find((q) => q.to === 'grove' + r);
  const w = 24, h = 20, m = grid(w, h, T.TALL); const R = rng(hash(W.id + SEED + 'grove' + r)); const biome = cityBiome(W, Math.min(r, 7));
  border(m, [], []); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x < 3 || x > w - 4 || y < 3 || y > h - 4) && R() < 0.6) m.set(x, y, T.TREE);
  const westEntry = rm.groveSide === 'east'; // route exit on the east edge -> enter grove from its west side
  const ex = westEntry ? 0 : w - 1;
  for (let x = 0; x < w; x++) m.set(x, 10, x === 0 || x === w - 1 ? (x === ex ? T.PATH : T.TREE) : m.get(x, 10) === T.TREE ? T.PATH : m.get(x, 10));
  for (let x = 1; x < w - 1; x++) if (m.get(x, 10) === T.TREE) m.set(x, 10, T.PATH);
  m.rect(9, 6, 6, 8, T.GRASS); m.rect(8, 9, 8, 3, T.PATH);
  m.rect(R.int(3, 6), R.int(3, 5), 3, 2, T.WATER); scatter(m, R, 18, [T.FLOWER, T.FLOWER, T.TREE, T.ROCK], (x, y) => y >= 9 && y <= 11);
  m.set(11, 7, T.SIGN); m.objs.push({ x: 11, y: 7, kind: 'sign', text: [`Hidden Grove`, 'Rarer, stronger monsters live in this deep grass. Few trainers ever find this place!'] });
  m.objs.push(npc(13, 8, { name: 'Grove Keeper', tips: tipLines(W, Math.min(r - 1, 7), 9, 3), pal: { coat: true, shirt: '#3a8a5a', hair: '#e0e0e0' } }));
  const prizes = ['shard', 'shard', 'maxtonic', 'cube2', 'tm_' + R.pick(['logic', 'cipher', 'spark', 'data', 'structure', 'flux'])];
  [[4, 15], [19, 4], [18, 15]].forEach(([x, y], k) => { m.set(x, y, T.GRASS); m.objs.push({ x, y, kind: 'item', item: k === 2 && r >= 4 ? prizes[4] : R.pick(prizes.slice(0, 4)), count: 1, key: `gv${r}i${k}` }); for (const [ax, ay] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) if (m.get(ax, ay) === T.TREE) m.set(ax, ay, T.TALL); });
  // connect the item pockets to open ground
  for (const [x, y] of [[4, 15], [19, 4], [18, 15]]) { let cx = x, cy = y; while (cx !== 12 || cy !== 10) { if (cx !== 12) cx += cx < 12 ? 1 : -1; else cy += cy < 10 ? 1 : -1; if (m.get(cx, cy) === T.TREE || m.get(cx, cy) === T.WATER || m.get(cx, cy) === T.ROCK) m.set(cx, cy, T.TALL); } }
  m.warps.push({ x: ex, y: 10, to: back, tx: back_w.x + (westEntry ? -1 : 1), ty: back_w.y, dir: westEntry ? 'left' : 'right' });
  Object.assign(m, { name: 'Hidden Grove', kind: 'route', biome, music: 'mystic', ci: Math.min(r - 1, 7), encounter: Math.min(r + 2, 9), encRate: 1.4 });
  return m;
}

// ------------------------------------------------------------ cities
function city(W, i) {
  const c = W.cities[i]; const w = 40, h = 26, m = grid(w, h, T.GRASS); const r = rng(hash(W.id + SEED + 'city' + i)); const biome = cityBiome(W, i);
  // layout variation: mirror + which slot holds the Mend Station / Study Lab / Supply Depot
  const M = variant(W, 'cityM' + i, 2) === 1; const perm = [[0, 1, 2], [1, 0, 2], [2, 1, 0], [0, 2, 1], [1, 2, 0], [2, 0, 1]][variant(W, 'cityP' + i, 6)];
  const mx = (x, bw = 1) => (M ? 30 - x - bw : x);
  border(m, [14, 15], [14, 15]);
  m.rect(14, 0, 2, h, T.PATH); m.rect(2, 9, w - 4, 2, T.PATH); m.rect(2, 19, w - 4, 2, T.PATH);
  for (let y = 2; y < h - 2; y++) m.set(29, y, y === 9 || y === 10 || y === 19 || y === 20 ? T.PATH : T.TREE); // hedge between old town and east district
  const slots = [[19, 3, 6, 5], [3, 13, 6, 5], [19, 13, 6, 5]]; const kinds = [['mend', 'Mend Station'], ['lab', 'Study Lab'], ['depot', 'Supply Depot']];
  const doors = [building(m, mx(3, 8), 2, 8, 6, 'gym', `city${i}_gym`, c.name + ' Mastery Hall'), building(m, mx(10, 3), 14, 3, 4, 'house', `city${i}_house`, 'House')];
  kinds.forEach(([k, label], j) => { const [x, y, bw, bh] = slots[perm[j]]; doors.push(building(m, mx(x, bw), y, bw, bh, k, `city${i}_${k}`, label)); });
  doors.push(building(m, 31, 2, 7, 6, 'archive', `city${i}_archive`, 'Archive'));
  for (const d of doors) m.set(d.dx, d.dy + 1, T.PATH);
  const ent = { gym: [7, 18], mend: [5, 7], lab: [6, 8], house: [4, 6], depot: [5, 7], archive: [6, 8] };
  for (const wp of m.warps) if (wp.door) { const e = ent[wp.kind]; wp.tx = e[0]; wp.ty = e[1]; }
  const reserved = new Set(); const res = (x, y) => reserved.add(x + ',' + y);
  for (const d of doors) for (let k = 0; k < 3; k++) res(d.dx, d.dy + k);
  const npcSpots = [[12, 11], [17, 11], [8, 21], [21, 21], [5, 11], [25, 11], [17, 7], [26, 22]].map(([x, y]) => [mx(x), y]).filter(([x, y]) => m.get(x, y) !== T.BWALL && m.get(x, y) !== T.DOOR).sort(() => r() - 0.5);
  npcSpots.forEach(([x, y]) => res(x, y));
  if (biome === 'coast' || biome === 'meadow' || biome === 'forest') m.rect(mx(23, 4), 22, 4, 1, T.WATER);
  // east district: a park with a pond, benches of flowers, a hidden glint and a couple of locals
  m.rect(31, 13, 6, 4, T.GRASS); m.rect(32, 14, 3, 2, T.WATER); for (const [x, y] of [[31, 12], [36, 12], [31, 17], [36, 17], [30, 15], [37, 15]]) m.set(x, y, T.FLOWER);
  for (let k = 0; k < 2; k++) { const x = 30 + k * 6 + 1, y = 22; res(x, y); m.set(x, y, T.GRASS); m.objs.push(npc(x, y, { name: W.trainerName(hash(c.name + 'e' + k)).name, tips: tipLines(W, i, 10 + k), wander: true, pal: { shirt: ['#c06020', '#2080a0'][k] } })); }
  res(35, 11); res(35, 18); res(36, 22); m.objs.push({ x: 36, y: 22, kind: 'item', hidden: true, walkable: true, item: 'shard', count: 1, key: `c${i}h` });
  for (let x = 30; x < 38; x++) res(x, 21); for (let x = 30; x < 38; x++) res(x, 8);
  scatter(m, r, 40, biome === 'neon' || biome === 'crystal' ? [T.TREE, T.FLOWER, T.ROCK] : [T.FLOWER, T.FLOWER, T.TREE, T.TREE, T.ROCK], (x, y) => reserved.has(x + ',' + y) || (x >= 13 && x <= 16) || y === 8 || y === 11 || y === 18 || y === 21 || y === 1 || y === h - 3 || x >= 28);
  const pals = ['#d04040', '#3070d0', '#30a050', '#8040c0', '#e0a020'];
  for (let k = 0; k < 4; k++) { const [x, y] = npcSpots[k]; m.set(x, y, m.get(x, y) === T.PATH ? T.PATH : T.GRASS); m.objs.push(npc(x, y, { name: W.trainerName(hash(c.name + k)).name, tips: tipLines(W, i, k), wander: k % 2 === 0, pal: { shirt: pals[k] } })); }
  { const [x, y] = npcSpots[4]; m.set(x, y, T.GRASS); m.objs.push(npc(x, y, { kind: 'researcher', ci: i, name: 'Field Researcher', pal: { coat: true, shirt: '#30a050' } })); }
  const s1 = mx(16), s2 = mx(12);
  m.set(s1, 22, T.SIGN); m.objs.push({ x: s1, y: 22, kind: 'sign', text: [`${c.name} — ${c.theme}`, `Mastery Hall Leader: ${c.leader}. Badge: ${c.badge}.`] });
  m.set(s2, 8, T.SIGN); m.objs.push({ x: s2, y: 8, kind: 'sign', text: [`${c.name} Mastery Hall`, `Leader ${c.leader} — "${c.theme}"`, 'Challengers must first pass the Study Lab trial.'] });
  m.objs.push(npc(mx(13), 2, { kind: 'guard', name: 'Gatekeeper', gate: 'badge', ci: i, dir: 'down' }));
  const ry = i + 2 <= 9 ? routeEntryY(W, i + 2) : 38;
  for (const x of [14, 15]) {
    m.warps.push({ x, y: h - 1, to: `route${i + 1}`, tx: 10 + (x - 14), ty: 1, dir: 'down' });
    m.warps.push({ x, y: 0, to: `route${i + 2}`, tx: 10 + (x - 14), ty: ry, dir: 'up' });
  }
  Object.assign(m, { name: c.name, kind: 'town', biome, music: CITY_MOOD[biome] || 'town', ci: i, cityIdx: i, gateNorth: { y: 1, badge: i } });
  return m;
}
function cityInterior(W, i, kind) {
  const c = W.cities[i]; const back = `city${i}`;
  const outside = doorOutside(W, back, kind);
  let m;
  const base = { ci: i, cityIdx: i, musicKey: W.id + ':' + back };
  if (kind === 'mend') {
    m = interior(12, 9, back, ...outside); m.rect(3, 3, 6, 1, T.COUNTER); m.set(10, 2, T.PC); m.set(1, 2, T.PLANT); m.set(10, 7, T.PLANT); m.set(1, 7, T.PLANT); m.rect(4, 5, 4, 2, T.RUG);
    m.objs.push(npc(5, 2, { kind: 'nurse', name: 'Mender', pal: { hair: '#ff9fd0', shirt: '#2fb8a8' } }));
    m.objs.push({ x: 10, y: 2, kind: 'pc', solidTile: true });
    m.objs.push(npc(2, 5, { name: 'Visitor', tips: tipLines(W, i, 5), wander: true }));
    Object.assign(m, base, { name: 'Mend Station', music: 'heal', musicKey: W.id + ':mend' });
  } else if (kind === 'depot') {
    m = interior(12, 9, back, ...outside); m.rect(2, 3, 4, 1, T.COUNTER); m.rect(7, 2, 4, 1, T.SHELF); m.rect(7, 5, 4, 1, T.SHELF); m.set(1, 7, T.PLANT);
    m.objs.push(npc(3, 2, { kind: 'clerk', name: 'Clerk', pal: { shirt: '#4a7adf', hat: '#4a7adf' } }));
    m.objs.push(npc(9, 6, { name: 'Shopper', tips: tipLines(W, i, 6), wander: true }));
    Object.assign(m, base, { name: 'Supply Depot' });
  } else if (kind === 'lab') {
    m = interior(14, 10, back, ...outside); m.rect(1, 2, 3, 1, T.SHELF); m.rect(10, 2, 3, 1, T.SHELF); m.set(3, 5, T.DESK); m.set(7, 6, T.DESK); m.set(11, 5, T.DESK); m.set(1, 8, T.PLANT); m.set(12, 8, T.PLANT);
    m.objs.push(npc(7, 3, { kind: 'labkeeper', ci: i, name: 'Lab Keeper', pal: { coat: true, hair: '#c07a30', shirt: '#f0a030' } }));
    m.objs.push({ x: 3, y: 5, kind: 'station', game: 'match', ci: i, solidTile: true });
    m.objs.push({ x: 7, y: 6, kind: 'station', game: 'sequence', ci: i, solidTile: true });
    m.objs.push({ x: 11, y: 5, kind: 'station', game: 'speed', ci: i, solidTile: true });
    m.objs.push(npc(10, 7, { name: 'Student', tips: tipLines(W, i, 7), wander: true }));
    Object.assign(m, base, { name: 'Study Lab', music: 'lab', musicKey: W.id + ':lab' + i });
  } else if (kind === 'house') {
    m = interior(10, 8, back, ...outside); m.set(6, 3, T.TABLE); m.rect(1, 2, 2, 1, T.SHELF); m.set(8, 2, T.PLANT); m.set(8, 6, T.BED);
    m.objs.push(npc(5, 3, { name: 'Resident', tips: tipLines(W, i, 2, 3), dir: 'right' }));
    m.objs.push(npc(2, 5, { kind: 'gifter', ci: i, name: 'Mentor', key: `gift${i}` }));
    Object.assign(m, base, { name: c.name + ' House' });
  } else if (kind === 'archive') {
    m = interior(14, 10, back, ...outside); for (const y of [2, 4, 6]) { m.rect(1, y, 4, 1, T.SHELF); m.rect(9, y, 4, 1, T.SHELF); } m.set(6, 4, T.DESK); m.set(7, 4, T.DESK); m.set(1, 8, T.PLANT); m.set(12, 8, T.PLANT); m.rect(5, 6, 4, 2, T.RUG);
    m.objs.push(npc(6, 3, { name: 'Archivist', tips: tipLines(W, i, 11, 4), pal: { coat: true, hair: '#8a8a9a', shirt: '#5a4ab0' } }));
    m.objs.push(npc(11, 7, { kind: 'gifter', ci: i, name: 'Old Scholar', key: `arch${i}`, dir: 'left' }));
    m.objs.push(npc(2, 7, { name: 'Reader', tips: tipLines(W, i, 12, 2), wander: true }));
    Object.assign(m, base, { name: c.name + ' Archive', music: 'lab', musicKey: W.id + ':lab' + i });
  } else if (kind === 'gym') {
    m = interior(15, 20, back, ...outside); m.rect(0, 2, 15, 18, T.GYMFLOOR); m.rect(0, 0, 15, 2, T.IWALL);
    for (let y = 2; y < 19; y++) { m.set(0, y, T.IWALL); m.set(14, y, T.IWALL); }
    m.rect(0, 19, 15, 1, T.IWALL); m.set(6, 19, T.MAT); m.set(7, 19, T.MAT); m.warps.forEach((wp, k) => { wp.x = 6 + k; wp.y = 19; });
    for (const [x, y] of [[5, 17], [9, 17], [2, 12], [12, 12], [2, 6], [12, 6], [5, 4], [9, 4]]) m.set(x, y, T.STATUE);
    for (let x = 3; x <= 11; x++) if (x < 6 || x > 8) { m.set(x, 14, T.BARRIER); m.set(x, 9, T.BARRIER); }
    const lines = W.lines.filter((l) => l.type === c.type && l.li >= 3).map((l) => l.li); const pool = lines.length ? lines : W.routeLines(i + 1);
    const L = W.leaderLevel(i);
    [[6, 13, 'right', 0], [8, 8, 'left', 1]].forEach(([x, y, dir, k]) => { const nm = W.trainerName(hash(c.name + 'g' + k)); m.objs.push({ x, y, kind: 'trainer', dir, sight: 3, key: `g${i}t${k}`, name: nm.name, cls: 'Hall ' + W.classes[Math.min(2 + k + Math.floor(i / 2), W.classes.length - 1)], team: W.makeTeam(hash(W.id + SEED + 'gt' + i + k), pool, 2, L - 3 + k), money: L * 30, qci: i, tip: tipLines(W, i, 4 + k, 1)[0] }); });
    m.objs.push(npc(7, 3, { kind: 'leader', ci: i, name: c.leader, pal: { shirt: null, hat: null } }));
    m.objs.push(npc(4, 17, { kind: 'gymguide', ci: i, name: 'Hall Guide', dir: 'right' }));
    m.entry = { x: 7, y: 18 };
    Object.assign(m, base, { name: c.name + ' Mastery Hall', music: 'epic', musicKey: W.id + ':gym' + i });
  }
  return m;
}

// ------------------------------------------------------------ summit
function summit(W) {
  const w = 13, h = 34, m = grid(w, h, T.IWALL); m.rect(4, 2, 5, h - 2, T.GYMFLOOR); m.rect(2, h - 7, 9, 6, T.GYMFLOOR); m.rect(6, 2, 1, h - 2, T.RUG);
  m.set(6, h - 1, T.MAT); m.warps.push({ x: 6, y: h - 1, to: 'route9', tx: 10, ty: 1, dir: 'down' });
  m.set(3, h - 5, T.PC); m.objs.push({ x: 3, y: h - 5, kind: 'pc', solidTile: true });
  m.objs.push(npc(9, h - 5, { kind: 'nurse', name: 'Summit Mender', pal: { hair: '#ff9fd0', shirt: '#6a4ad0' }, dir: 'left' }));
  const rows = [h - 9, h - 14, h - 19, h - 24];
  W.elite.forEach((e, k) => { const y = rows[k]; for (const x of [4, 5, 7, 8]) m.set(x, y, T.STATUE); m.objs.push(npc(6, y, { kind: 'elite', idx: k, name: e.name, title: e.title, type: e.type })); });
  for (const x of [4, 5, 7, 8]) m.set(x, 4, T.STATUE);
  m.objs.push(npc(6, 3, { kind: 'champion', name: W.champion.name }));
  Object.assign(m, { name: 'Mastery Summit', kind: 'interior', biome: 'interior', music: 'epic', ci: 'final', entry: { x: 6, y: h - 2 } });
  return m;
}
