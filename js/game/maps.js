import { typeBeatsLines } from '../content/types.js';
// Deterministic map generation: every topic gets its own region of 8 cities, 9 routes, gyms, interiors and a summit.
import { rng, hash } from '../core/rng.js';
import { T } from '../core/sprites.js';
import { BIOME_ORDER } from './content.js';
import { eraSetFor } from '../content/eras.js';

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
  if (id === 'era_past' || id === 'era_future') return eraMap(W, id.slice(4));
  if ((mm = id.match(/^route(\d)$/))) return route(W, +mm[1]);
  if ((mm = id.match(/^grove(\d)$/))) return grove(W, +mm[1]);
  if ((mm = id.match(/^zone(\d)$/))) return zone(W, +mm[1]);
  if ((mm = id.match(/^lair(\d)$/))) return lair(W, +mm[1]);
  if ((mm = id.match(/^garden(\d)$/))) return garden(W, +mm[1]);
  if (id === 'sanctum') return lair(W, 4);
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
  // Time Garden: Chrono Gate, Keeper of Time, seasonal visitor and the Echo Rift
  m.rect(mx(2, 9), 11, 9, 6, T.GRASS); m.rect(mx(4), 11, 1, 3, T.PATH); m.set(mx(4), 14, T.PATH);
  m.objs.push({ x: mx(4), y: 14, kind: 'chrono' });
  m.objs.push(npc(mx(6), 14, { kind: 'keeper', name: 'Keeper of Time', pal: { coat: true, shirt: '#6a4ad0', hair: '#f0f0ff' } }));
  m.objs.push(npc(mx(9), 15, { kind: 'seasonal', name: 'Season Herald', pal: { shirt: '#e07030', hair: '#5a3018', hat: '#c03030' } }));
  m.objs.push({ x: mx(2), y: 13, kind: 'rift' });
  m.objs.push({ x: mx(1), y: 15, kind: 'secretdoor', to: 'sanctum', tx: 12, ty: 21, dir: 'up', need: 'badges', label: 'A stone door with eight badge-shaped hollows is hidden among the trees.' });
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
  const items = ['tonic', 'cube', r > 3 ? 'supertonic' : 'tonic', 'cube'];
  for (let k = 0; k < 4 && sp.length; k++) { const [x, y] = sp.pop(); m.set(x, y, T.GRASS); m.objs.push({ x, y, kind: 'item', item: R.pick(items), count: 1, key: `r${r}i${k}`, solidTile: false }); }
  const nc = toCity !== null ? toCity : 7; const terms = W.cities[nc].terms;
  for (let k = 0; k < 4 && sp.length && terms.length; k++) { const [x, y] = sp.pop(); m.set(x, y, T.GRASS); m.objs.push({ x, y, kind: 'note', term: terms[(k * 3 + 1) % terms.length].id, key: `r${r}n${k}` }); }
  // ---- exploration: a side glade off the road (reached by a little trail) with a wanderer and a treasure
  {
    const gy = Math.floor(h * (0.35 + R() * 0.3)); const left = px[gy] > w / 2; const gw = 7, gh = 6;
    const gx = left ? 3 : w - 3 - gw, gy0 = gy - 2;
    m.rect(gx, gy0, gw, gh, T.GRASS); for (let y = gy0; y < gy0 + gh; y++) for (let x = gx; x < gx + gw; x++) if (R() < 0.25) m.set(x, y, T.FLOWER);
    for (let x = Math.min(gx + gw, px[gy]); x <= Math.max(gx - 1, px[gy] + 1); x++) m.set(x, gy, T.PATH);
    m.set(gx + 3, gy0 + 1, T.GRASS); m.objs.push({ x: gx + 3, y: gy0 + 1, kind: 'item', item: R.pick(['cube2', 'supertonic', 'maxtonic']), count: 1, key: `r${r}gl` });
    m.set(gx + 1, gy0 + 3, T.GRASS); m.objs.push(npc(gx + 1, gy0 + 3, { name: R.pick(['Wanderer', 'Hiker', 'Birdwatcher', 'Camper']), tips: tipLines(W, Math.min(r - 1, 7), 8, 2), dir: 'right', pal: { shirt: '#7a5a3a', hat: '#4a8a3a' } }));
    m.set(gx + gw - 2, gy0 + gh - 2, T.SIGN); m.objs.push({ x: gx + gw - 2, y: gy0 + gh - 2, kind: 'sign', text: ['A quiet glade. Explorers say every route hides a sparkle or two — look for glints in the grass!'] });
  }
  // ---- hidden items: glinting spots you can walk over; face them and press A
  for (let k = 0, tries = 0; k < 2 && tries < 80; tries++) {
    const x = R.int(3, w - 4), y = R.int(5, h - 6);
    if (m.get(x, y) !== T.GRASS && m.get(x, y) !== T.TALL) continue; if (m.objs.some((o) => Math.abs(o.x - x) + Math.abs(o.y - y) < 3)) continue;
    m.objs.push({ x, y, kind: 'item', hidden: true, walkable: true, item: R.pick(['tonic', 'cube', 'supertonic', 'cube2']), count: 1, key: `r${r}h${k}` }); k++;
  }
  // signpost
  m.set(px[h - 4] - 1, h - 4, T.SIGN);
  m.objs.push({ x: px[h - 4] - 1, y: h - 4, kind: 'sign', text: [`Route ${r}`, toCity !== null ? `North: ${ZONES[r - 1].name}, then ${W.cities[toCity].name} — ${W.cities[toCity].theme}.` : `North: ${ZONES[r - 1].name}, then the Mastery Summit.`, 'Tall grass hides wild monsters. Lost notes on this route preview what\'s ahead!'] });
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
      const prize = r >= 5 ? R.pick(['tm', 'revive', 'cube2', 'maxtonic']) : R.pick(['revive', 'cube2', 'supertonic']);
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
  // ---- Legendary lair: a hidden gap in the trees on routes 3, 5, 7 and 9
  if (LAIR_ROUTE.includes(r)) {
    const k = LAIR_ROUTE.indexOf(r); const gy0 = hasGrove(r) ? groveRow(W, r) : -9; let ly = Math.floor(h * 0.22) + R.int(0, 3); if (Math.abs(ly - gy0) < 4) ly = Math.floor(h * 0.62);
    const left = hasGrove(r) ? m.groveSide === 'east' : px[ly] > w / 2; const dx = left ? 1 : w - 2;
    for (let x = Math.min(dx + (left ? 1 : -1), px[ly]); x <= Math.max(dx + (left ? 1 : -1), px[ly] + 1); x++) m.set(x, ly, T.PATH);
    m.objs = m.objs.filter((o) => !(o.y === ly && o.x >= Math.min(dx, px[ly]) && o.x <= Math.max(dx, px[ly] + 1)));
    for (const o of obst) if (o[1] === ly) o[3] = T.PATH;
    m.set(dx, ly, T.TREE); m.objs.push({ x: dx, y: ly, kind: 'secretdoor', to: 'lair' + k, tx: 12, ty: 21, dir: 'up', label: 'A narrow gap between the trees… cold air flows out of it.' });
    m.lairDoor = { x: dx, y: ly, side: left ? 'west' : 'east' };
  }
  m.obstacles = obst; m.clearable = CLEARABLE;
  // exits
  const southTo = fromCity === null ? ['hometown', 11, 2] : [`city${fromCity}`, 14, 2];
  const northTo = [`zone${r}`, 14, zoneH(r) - 2];
  for (const x of [10, 11]) { m.warps.push({ x, y: h - 1, to: southTo[0], tx: southTo[1] + (x - 10), ty: southTo[2], dir: 'down' }); m.warps.push({ x, y: 0, to: northTo[0], tx: northTo[1] + (x - 10), ty: northTo[2], dir: 'up' }); }
  Object.assign(m, { name: `Route ${r}`, kind: 'route', biome, music: ROUTE_MOOD[biome] || 'route', ci: Math.min(r - 1, 7), encounter: r, noteRoute: r });
  return m;
}


// ------------------------------------------------------------ in-between zones: one on every route, between the road and the next town
export const ZONES = [
  { kind: 'forest', name: 'Whispering Woods', icon: 'forest' }, { kind: 'maze', name: 'Hedge Maze', icon: 'maze' }, { kind: 'lake', name: 'Mirror Lake', icon: 'lake' },
  { kind: 'cave', name: 'Echo Caverns', icon: 'cave' }, { kind: 'park', name: 'Wonderland Park', icon: 'park' }, { kind: 'ruins', name: 'Sunken Ruins', icon: 'ruins' },
  { kind: 'maze', name: 'Crystal Labyrinth', icon: 'maze', crystal: true }, { kind: 'forest', name: 'Mistwood', icon: 'forest', night: true }, { kind: 'lake', name: 'Cloudwalk Bridges', icon: 'sky', sky: true },
];
export const zoneInfo = (r) => ZONES[r - 1];
const ZW = 30; // all zones: 30 wide; south entrance and north exit at x 14–15
const zoneH = (r) => ({ forest: 44, maze: 39, lake: 40, cave: 42, park: 34, ruins: 40 })[ZONES[r - 1].kind];
function zoneExits(W, m, r) {
  const h = m.h; const north = r <= 8 ? [`city${r - 1}`, 14, 23] : ['summit', 6, 32];
  for (const x of [14, 15]) { m.warps.push({ x, y: h - 1, to: `route${r}`, tx: 10 + (x - 14), ty: 1, dir: 'down' }); m.warps.push({ x, y: 0, to: north[0], tx: north[1] + (x - 14), ty: north[2], dir: 'up' }); m.set(x, h - 1, T.PATH); m.set(x, 0, T.PATH); m.set(x, h - 2, T.PATH); m.set(x, 1, T.PATH); }
}
const carveWalk = (m, R, x0, y0, x1, y1, wdt, tile = T.PATH, wobble = 0.45) => { let x = x0, y = y0; while (y !== y1 || x !== x1) { for (let k = 0; k < wdt; k++) m.set(Math.max(2, Math.min(m.w - 3, x + k)), y, tile); if (y !== y1 && (R() > wobble || x === x1)) y += y1 > y ? 1 : -1; else { const tx = R() < 0.25 ? x + (R() < 0.5 ? -1 : 1) : x + Math.sign(x1 - x); x = Math.max(3, Math.min(m.w - 4, tx)); } } for (let k = 0; k < wdt; k++) m.set(x + k, y, tile); };
function zone(W, r) {
  const Z = ZONES[r - 1]; const h = zoneH(r), w = ZW; const R = rng(hash(W.id + SEED + 'zone' + r)); const ci = Math.min(r - 1, 7);
  const biome = Z.crystal ? 'crystal' : Z.sky ? 'snow' : Z.kind === 'cave' ? 'crystal' : Z.kind === 'ruins' ? 'desert' : Z.kind === 'park' ? 'meadow' : Z.kind === 'lake' ? 'coast' : 'forest';
  let m; const lines = W.routeLines(r); const [, hi] = W.routeLevels(r);
  const trainer = (x, y, dir, k) => { const nm = W.trainerName(hash(W.id + SEED + 'z' + r + 't' + k)); const n = Math.min(1 + Math.floor((r + k) / 4), 3); m.set(x, y, m.get(x, y) === T.TALL ? T.GRASS : m.get(x, y)); m.objs.push({ x, y, kind: 'trainer', dir, sight: 3, key: `z${r}t${k}`, name: nm.name, cls: nm.cls, team: W.makeTeam(hash(W.id + SEED + 'z' + r + 'tm' + k), lines, n, hi + 1 - (n - 1)), money: (hi + 2) * 24, qci: ci }); };
  const item = (x, y, it, k, hidden) => { if (!hidden) m.set(x, y, m.get(x, y) === T.TALL ? T.GRASS : m.get(x, y)); m.objs.push({ x, y, kind: 'item', item: it, count: 1, key: `z${r}i${k}`, ...(hidden ? { hidden: true, walkable: true } : {}) }); };
  const loot = () => R.pick(r >= 5 ? ['maxtonic', 'cube2', 'revive', 'supertonic', 'cube3'] : ['supertonic', 'cube', 'cube2', 'tonic', 'revive']);
  if (Z.kind === 'forest') {
    m = grid(w, h, T.TREE);
    carveWalk(m, R, 14, h - 2, 14, 1, 2, T.PATH, 0.4);
    const glades = []; for (let k = 0; k < 5; k++) { const gy = 5 + Math.floor(((h - 12) * k) / 4), gx = k % 2 ? R.int(3, 8) : R.int(18, 22); m.rect(gx, gy, 6, 4, T.GRASS); for (let y = gy; y < gy + 4; y++) for (let x = gx; x < gx + 6; x++) if (R() < 0.35) m.set(x, y, T.TALL); glades.push([gx, gy]);
      carveWalk(m, R, gx + 2, gy + 2, 14, Math.min(h - 3, gy + 2 + R.int(-1, 1)), 1, T.PATH, 0.6); }
    for (let y = 3; y < h - 3; y++) for (let x = 3; x < w - 3; x++) if (m.get(x, y) === T.PATH && R() < 0.12) { const dx = R() < 0.5 ? -1 : 1; if (m.get(x + dx, y) === T.TREE && x + dx > 2 && x + dx < w - 3) m.set(x + dx, y, T.TALL); }
    glades.forEach(([gx, gy], k) => { if (k === 1 || k === 3) item(gx + 4, gy + 1, loot(), k); if (k === 2) item(gx + 1, gy + 3, 'cube3', 9, true); if (k === 0 || k === 4) trainer(gx + 1, gy + 1, 'right', k); });
    { const [gx, gy] = glades[2]; m.objs.push(npc(gx + 3, gy + 1, { name: Z.night ? 'Mist Watcher' : 'Forest Hermit', tips: [Z.night ? 'The mist hides many paths. Rare monsters wander here after dark.' : 'Every glade in these woods hides something. Explore off the main trail!', ...tipLines(W, ci, 16, 2)], pal: { coat: true, shirt: '#4a6a3a', hair: '#d8d8d8' } })); }
  } else if (Z.kind === 'maze') {
    m = grid(w, h, Z.crystal ? T.ROCK : T.TREE); const cw = 14, chh = Math.floor((h - 5) / 2); const vis = new Set(); const C = (cx, cy) => [1 + cx * 2, 3 + cy * 2];
    const stack = [[7, chh - 1]]; vis.add('7,' + (chh - 1)); { const [x, y] = C(7, chh - 1); m.set(x, y, T.PATH); }
    while (stack.length) { const [cx, cy] = stack[stack.length - 1]; const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [cx + dx, cy + dy]).filter(([a, b]) => a >= 0 && b >= 0 && a < cw && b < chh && !vis.has(a + ',' + b));
      if (!nb.length) { stack.pop(); continue; } const [nx, ny] = R.pick(nb); vis.add(nx + ',' + ny); const [x1, y1] = C(cx, cy), [x2, y2] = C(nx, ny); m.set(x2, y2, T.PATH); m.set((x1 + x2) / 2, (y1 + y2) / 2, T.PATH); stack.push([nx, ny]); }
    // a few extra openings so it's a maze with loops, not a single corridor
    for (let k = 0; k < 10; k++) { const x = 2 + R.int(0, cw - 2) * 2 + 1, y = 3 + R.int(0, chh - 2) * 2 + 1; if (x < w - 2 && y < h - 3) m.set(x, y, T.PATH); }
    m.rect(2, h - 3, w - 4, 1, T.PATH); m.rect(2, 1, w - 4, 1, T.PATH); m.rect(2, 2, w - 4, 1, Z.crystal ? T.ROCK : T.TREE); m.rect(0, 0, w, 1, Z.crystal ? T.ROCK : T.TREE); m.rect(0, h - 1, w, 1, Z.crystal ? T.ROCK : T.TREE); for (let y = 0; y < h; y++) { m.set(0, y, Z.crystal ? T.ROCK : T.TREE); m.set(w - 1, y, Z.crystal ? T.ROCK : T.TREE); }
    const [ex, ey] = C(7, chh - 1); for (let y = ey; y <= h - 3; y++) m.set(ex, y, T.PATH); const [tx, ty] = C(R.int(0, cw - 1), 0); for (let y = 1; y <= ty; y++) m.set(tx, y, T.PATH);
    for (let x = Math.min(ex, 14); x <= Math.max(ex, 15); x++) m.set(x, h - 3, T.PATH); for (let x = Math.min(tx, 14); x <= Math.max(tx, 15); x++) m.set(x, 1, T.PATH);
    const [mx0, my0] = C(6, Math.floor(chh / 2)); m.rect(mx0 - 1, my0 - 1, 5, 3, T.GRASS); m.set(mx0 + 1, my0 - 1, T.SIGN);
    m.objs.push({ x: mx0 + 1, y: my0 - 1, kind: 'sign', text: [`${Z.name} — the centre!`, 'Dead ends often hide treasure. The exit is somewhere along the north wall.'] }); item(mx0 + 2, my0 + 1, 'cube3', 8);
    m.objs.push(npc(mx0, my0 + 1, { name: 'Maze Keeper', tips: ['You found the heart of the maze! Few get this far.', ...tipLines(W, ci, 17, 2)], pal: { shirt: Z.crystal ? '#8a6aff' : '#3a8a3a', hat: '#d8b040' } }));
    const dead = []; for (let cy = 0; cy < chh; cy++) for (let cx = 0; cx < cw; cx++) { const [x, y] = C(cx, cy); if (m.get(x, y) !== T.PATH) continue; const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => m.get(x + dx, y + dy) === T.PATH).length; if (n === 1) dead.push([x, y]); }
    dead.sort(() => R() - 0.5).slice(0, 4).forEach(([x, y], k) => item(x, y, loot(), k)); dead.slice(4, 9).forEach(([x, y]) => m.set(x, y, T.TALL));
    for (let k = 0; k < 14; k++) { const [x, y] = C(R.int(0, cw - 1), R.int(0, chh - 1)); if (m.get(x, y) === T.PATH && !m.objs.some((o) => o.x === x && o.y === y)) m.set(x, y, T.TALL); }
  } else if (Z.kind === 'lake') {
    m = grid(w, h, T.WATER); m.rect(0, h - 4, w, 4, T.GRASS); m.rect(0, 0, w, 4, T.GRASS);
    const isl = [[14, h - 9], [6, h - 16], [22, h - 18], [12, h - 25], [5, h - 31], [21, h - 31], [14, 7]];
    isl.forEach(([x, y]) => { m.rect(x - 2, y - 2, 5, 4, T.GRASS); m.rect(x - 1, y - 1, 3, 2, T.TALL); });
    const link = (a, b) => { let [x, y] = a; const [x2, y2] = b; while (x !== x2) { if (m.get(x, y) === T.WATER) m.set(x, y, T.BRIDGE); x += Math.sign(x2 - x); } while (y !== y2) { if (m.get(x, y) === T.WATER) m.set(x, y, T.BRIDGE); y += Math.sign(y2 - y); } };
    link([14, h - 4], isl[0]); link(isl[0], isl[1]); link(isl[0], isl[2]); link(isl[1], isl[3]); link(isl[2], isl[3]); link(isl[3], isl[4]); link(isl[3], isl[5]); link(isl[5], isl[6]); link(isl[6], [14, 3]); link([15, h - 4], [15, h - 9]);
    for (let y = 0; y < h; y++) for (const x of [0, 1, w - 2, w - 1]) m.set(x, y, T.TREE); for (let x = 0; x < w; x++) { if (x < 13 || x > 16) { m.set(x, 0, T.TREE); m.set(x, h - 1, T.TREE); } }
    item(5, h - 31, loot(), 1); item(23, h - 18, loot(), 2); item(4, h - 16, 'cube3', 3, true);
    m.objs.push(npc(13, h - 8, { name: Z.sky ? 'Sky Sailor' : 'Angler', tips: [Z.sky ? 'These bridges hang above the clouds. Don\'t look down!' : 'The fish here are huge… and so are the monsters on the islands!', ...tipLines(W, ci, 18, 2)], pal: { shirt: Z.sky ? '#a0c8ff' : '#3a6aa0', hat: '#e0d0a0' } }));
    trainer(21, h - 31, 'left', 0); trainer(5, h - 16, 'right', 1);
  } else if (Z.kind === 'cave') {
    m = grid(w, h, T.ROCK);
    carveWalk(m, R, 14, h - 2, 14, 1, 2, T.PATH, 0.35); carveWalk(m, R, 14, h - 8, 4, 10, 2, T.PATH, 0.5); carveWalk(m, R, 15, h - 14, 24, 6, 2, T.PATH, 0.5);
    for (const [cx, cy] of [[6, 12], [22, 8], [12, h - 18], [20, h - 10]]) { m.rect(cx - 2, cy - 2, 5, 4, T.PATH); m.rect(cx - 1, cy - 1, 3, 2, T.TALL); carveWalk(m, R, cx, cy + 1, 14, cy + 1, 1, T.PATH, 1); }
    // a treasure chamber sealed by a cracked boulder (needs Smash)
    m.rect(3, h - 8, 4, 3, T.PATH); m.set(7, h - 7, T.CRACKROCK); m.rect(8, h - 7, 6, 1, T.PATH); item(4, h - 7, 'cube3', 5); item(5, h - 6, loot(), 6);
    m.obstacles = [[7, h - 7, T.CRACKROCK, T.PATH]]; m.clearable = CLEARABLE;
    item(6, 12, loot(), 1); item(22, 8, loot(), 2); item(20, h - 10, 'revive', 3, true);
    m.objs.push(npc(12, h - 17, { name: 'Spelunker', tips: ['Shout and the caverns shout back. The cracked boulder in the west tunnel hides treasure — Smash it!', ...tipLines(W, ci, 19, 2)], pal: { shirt: '#c08030', hat: '#ffd23f' } }));
    trainer(23, 9, 'left', 0);
  } else if (Z.kind === 'ruins') {
    m = grid(w, h, T.GRASS); border(m, [14, 15], [14, 15]);
    for (let y = 2; y < h - 2; y++) for (const x of [2, 3, w - 4, w - 3]) if (R() < 0.7) m.set(x, y, T.ROCK);
    m.rect(13, 2, 4, h - 4, T.PATH);
    for (let k = 0; k < 4; k++) { const y0 = 5 + k * 8; m.rect(6, y0, 18, 5, T.PATH); for (const x of [6, 23]) for (const y of [y0, y0 + 4]) m.set(x, y, T.STATUE); for (let x = 8; x < 22; x += 3) if (x !== 14 && x !== 13 && x !== 16) m.set(x, y0 + 2, T.ROCK); }
    for (let k = 0; k < 6; k++) { const pw = R.int(3, 5), ph = R.int(2, 3), x0 = R.int(4, w - 4 - pw), y0 = R.int(3, h - 5 - ph); for (let y = y0; y < y0 + ph; y++) for (let x = x0; x < x0 + pw; x++) if (m.get(x, y) === T.GRASS) m.set(x, y, T.TALL); }
    const lore = ['An ancient tablet: "Knowledge is the only treasure that grows when shared."', 'A worn carving shows scholars teaching monsters to read.', 'The tablet reads: "Those who ask questions find the hidden doors."'];
    [[9, 7], [20, 15], [9, 23]].forEach(([x, y], k) => { m.set(x, y, T.SIGN); m.objs.push({ x, y, kind: 'sign', text: [lore[k]] }); });
    item(20, 31, loot(), 1); item(8, 15, loot(), 2); item(22, 7, 'cube3', 3, true);
    trainer(10, 31, 'right', 0); trainer(19, 23, 'left', 1);
    m.objs.push(npc(16, 17, { name: 'Archaeologist', tips: ['These ruins are older than any Mastery Hall. Read every tablet!', ...tipLines(W, ci, 20, 2)], pal: { coat: true, shirt: '#b08a5a', hat: '#7a5a30' } }));
  } else if (Z.kind === 'park') {
    m = grid(w, h, T.GRASS); border(m, [14, 15], [14, 15]);
    m.rect(2, 15, w - 4, 3, T.PATH); m.rect(13, 2, 4, h - 4, T.PATH); m.rect(5, 6, 20, 2, T.PATH); m.rect(5, 26, 20, 2, T.PATH); m.rect(5, 6, 2, 22, T.PATH); m.rect(23, 6, 2, 22, T.PATH);
    const fenceBox = (x, y, bw, bh) => { for (let i = 0; i < bw; i++) { m.set(x + i, y, T.FENCE); m.set(x + i, y + bh - 1, T.FENCE); } for (let j = 0; j < bh; j++) { m.set(x, y + j, T.FENCE); m.set(x + bw - 1, y + j, T.FENCE); } for (let j = 1; j < bh - 1; j++) for (let i = 1; i < bw - 1; i++) m.set(x + i, y + j, T.FLOWER); };
    fenceBox(7, 8, 6, 6); fenceBox(17, 8, 6, 6); fenceBox(7, 19, 6, 6); fenceBox(17, 19, 6, 6);
    m.objs.push({ x: 10, y: 12, kind: 'ride', ride: 'wheel', name: 'Ferris Wheel', decor: true }, { x: 20, y: 12, kind: 'ride', ride: 'coaster', name: 'Quiz Coaster', decor: true }, { x: 10, y: 23, kind: 'ride', ride: 'carousel', name: 'Carousel', decor: true }, { x: 20, y: 23, kind: 'ride', ride: 'tent', name: 'Big Top', decor: true });
    for (const [x, y] of [[10, 14], [20, 14], [10, 25], [20, 25]]) m.set(x, y, T.PATH); // gates in the fences, ride operators stand there
    m.objs.push(npc(10, 14, { kind: 'rideop', ride: 'wheel', name: 'Wheel Operator', dir: 'down', pal: { shirt: '#ff4fd8', hat: '#ffd23f' } }), npc(20, 14, { kind: 'rideop', ride: 'coaster', name: 'Coaster Operator', dir: 'down', pal: { shirt: '#4cf0ff', hat: '#ff4fd8' } }), npc(10, 25, { kind: 'rideop', ride: 'carousel', name: 'Carousel Keeper', dir: 'down', pal: { shirt: '#ffd23f', hat: '#4cf0ff' } }), npc(20, 25, { kind: 'rideop', ride: 'tent', name: 'Ringmaster', dir: 'down', pal: { coat: true, shirt: '#d04040', hat: '#202020' } }));
    m.objs.push(npc(14, 30, { kind: 'nurse', name: 'First Aid', dir: 'up', pal: { coat: true, shirt: '#ffffff', hair: '#d04040' } }));
    m.objs.push(npc(3, 16, { name: 'Balloon Seller', tips: ['Balloons! Every colour! …They don\'t do anything, but they look great.', ...tipLines(W, ci, 21, 1)], wander: true, pal: { shirt: '#ff7ab8' } }), npc(26, 16, { name: 'Snack Vendor', tips: ['Popcorn, cotton candy, and fun facts!', ...tipLines(W, ci, 22, 2)], pal: { shirt: '#ffb020', hat: '#ffffff' } }), npc(18, 4, { kind: 'mascot', name: 'Parky the Mascot', wander: true, pal: { shirt: '#b36bff', hair: '#ffd23f', hat: '#b36bff' } }));
    [[3, 5, 'unscramble'], [26, 5, 'blitz'], [3, 29, 'guess'], [26, 29, 'ladder']].forEach(([x, y, game]) => { m.set(x, y, T.PATH); m.objs.push({ x, y, kind: 'cabinet', game, ci }); });
    m.set(12, h - 4, T.SIGN); m.objs.push({ x: 12, y: h - 4, kind: 'sign', text: ['Welcome to WONDERLAND PARK!', 'Ride the Ferris Wheel for the best view of the region, take on the Quiz Coaster, relax on the Carousel and catch a show at the Big Top!'] });
    item(26, 10, 'cube2', 1); item(4, 22, 'supertonic', 2); item(27, 24, 'cube3', 3, true);
  }
  m.w = w; m.h = h; zoneExits(W, m, r);
  Object.assign(m, { name: Z.name, kind: Z.kind === 'park' ? 'town' : 'route', zone: r, biome, music: Z.kind === 'park' ? 'neon' : Z.kind === 'maze' || Z.kind === 'cave' || Z.night ? 'mystic' : ROUTE_MOOD[biome] || 'route', ci, encounter: Z.kind === 'park' ? undefined : r, encRate: Z.kind === 'maze' ? 0.8 : 1, entry: Z.kind === 'park' ? { x: 14, y: 31 } : undefined });
  if (Z.kind === 'park') m.noEncounters = true;
  return m;
}

// ------------------------------------------------------------ legendary lairs & the mythic sanctum
export const LAIR_ROUTE = [3, 5, 7, 9];
function lair(W, k) {
  const sanct = k === 4; const w = 26, h = 24, m = grid(w, h, T.ROCK); const R = rng(hash(W.id + SEED + 'lair' + k));
  const spId = sanct ? W.mythic : W.legends[k]; const sp = W.species[spId];
  m.rect(4, 2, 18, 7, T.PATH); m.rect(11, 9, 4, 5, T.PATH); m.rect(2, 13, 22, 9, T.PATH); m.rect(11, 21, 4, 3, T.PATH);
  m.rect(3, 14, 6, 4, T.TALL); m.rect(17, 14, 6, 4, T.TALL); m.rect(10, 16, 6, 2, T.WATER);
  for (const [x, y] of [[5, 3], [20, 3], [5, 7], [20, 7], [8, 5], [17, 5]]) m.set(x, y, T.ROCK);
  scatter(m, R, 14, [T.FLOWER, T.ROCK], (x, y) => y < 13 || (x >= 10 && x <= 15) || y >= 19);
  const back = sanct ? { to: 'hometown', ...SANCTUM_DOOR(W) } : (() => { const rm = getMap(W, 'route' + LAIR_ROUTE[k]); const d = rm.lairDoor; return { to: 'route' + LAIR_ROUTE[k], x: d.x + (d.side === 'west' ? 1 : -1), y: d.y }; })();
  for (const x of [12, 13]) m.warps.push({ x, y: h - 1, to: back.to, tx: back.x, ty: back.y, dir: 'down' });
  const lvl = sanct ? 70 : W.routeLevels(LAIR_ROUTE[k])[1] + 6;
  m.objs.push({ x: 13, y: 3, kind: 'legend', sp: spId, lvl, key: sanct ? 'legendM' : 'legend' + k });
  m.set(10, 6, T.SIGN); m.objs.push({ x: 10, y: 6, kind: 'sign', text: sanct ? [`Starfall Sanctum`, `${sp.name}, ${sp.title}, rests here.`, 'Only one who has mastered every Hall may stand before it.'] : [`${sp.name}'s Lair`, `An ancient tablet: "${sp.title} watches over those who seek to understand."`, 'Its power is immense. Come prepared — and bring Apex Cubes.'] });
  [[3, 19, sanct ? 'cube3' : 'cube3'], [22, 19, 'maxtonic'], [5, 4, 'revive'], [20, 4, 'tm_' + R.pick(['logic', 'cipher', 'spark', 'data', 'structure', 'flux'])]].forEach(([x, y, it], j) => { m.set(x, y, T.PATH); m.objs.push({ x, y, kind: 'item', item: it, count: j === 0 ? 2 : 1, key: `${sanct ? 'sx' : 'lx' + k}i${j}` }); });
  m.objs.push({ x: 21, y: 20, kind: 'item', hidden: true, walkable: true, item: 'cube3', count: 1, key: `${sanct ? 'sx' : 'lx' + k}h` });
  Object.assign(m, { name: sanct ? 'Starfall Sanctum' : `${sp.name}'s Lair`, kind: 'route', biome: sanct ? 'neon' : 'crystal', music: 'mystic', ci: sanct ? 7 : [1, 3, 5, 7][k], encounter: sanct ? 9 : LAIR_ROUTE[k], encRate: 1.2, secret: true, entry: { x: 12, y: 21 } });
  return m;
}
export const SANCTUM_DOOR = (W) => { const hm = getMap(W, 'hometown'); const d = hm.objs.find((o) => o.kind === 'secretdoor'); return { x: d.x + (d.x < hm.w / 2 ? 1 : -1), y: d.y }; };
// ------------------------------------------------------------ secret gardens (one per city, behind the east hedge)
function garden(W, i) {
  const w = 20, h = 14, m = grid(w, h, T.GRASS); const R = rng(hash(W.id + SEED + 'garden' + i)); border(m, [], []);
  m.rect(3, 3, 5, 4, T.TALL); m.rect(12, 7, 5, 4, T.TALL); m.rect(11, 3, 4, 2, T.WATER);
  scatter(m, R, 26, [T.FLOWER, T.FLOWER, T.FLOWER, T.TREE], (x, y) => y === 7 || x <= 2);
  for (let x = 0; x < 9; x++) m.set(x, 7, T.PATH);
  m.warps.push({ x: 0, y: 7, to: `city${i}`, tx: 37, ty: 15, dir: 'left' });
  m.set(8, 5, T.SIGN); m.objs.push({ x: 8, y: 5, kind: 'sign', text: ['Secret Garden', 'Rare and Epic monsters love quiet places like this. Shimmering Prismatic ones appear more often in secret spots!'] });
  m.objs.push(npc(9, 9, { name: 'Gardener', tips: [`I keep notes on monster rarity: ★ Common, ★★ Uncommon, ★★★ Rare, ★★★★ Epic.`, 'Legends say four ★★★★★ Legendary guardians hide in lairs along the odd-numbered routes — look for gaps in the trees.', `And a ★★★★★★ Mythic sleeps beneath ${HOMETOWN}… but only for a true master.`], pal: { shirt: '#5a9a3a', hat: '#d8b040' } }));
  m.objs.push({ x: 17, y: 3, kind: 'item', item: R.pick(['cube2', 'supertonic', 'revive']), count: 2, key: `gd${i}i` });
  m.objs.push({ x: 15, y: 11, kind: 'item', hidden: true, walkable: true, item: 'cube3', count: 1, key: `gd${i}h` });
  Object.assign(m, { name: `${W.cities[i].name} Secret Garden`, kind: 'route', biome: cityBiome(W, i), music: 'mystic', ci: i, encounter: Math.min(i + 2, 9), encRate: 1.3, secret: true });
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
  const prizes = ['supertonic', 'revive', 'maxtonic', 'cube2', 'tm_' + R.pick(['logic', 'cipher', 'spark', 'data', 'structure', 'flux'])];
  [[4, 15], [19, 4], [18, 15]].forEach(([x, y], k) => { m.set(x, y, T.GRASS); m.objs.push({ x, y, kind: 'item', item: k === 2 && r >= 4 ? prizes[4] : R.pick(prizes.slice(0, 4)), count: 1, key: `gv${r}i${k}` }); for (const [ax, ay] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) if (m.get(ax, ay) === T.TREE) m.set(ax, ay, T.TALL); });
  // connect the item pockets to open ground
  for (const [x, y] of [[4, 15], [19, 4], [18, 15]]) { let cx = x, cy = y; while (cx !== 12 || cy !== 10) { if (cx !== 12) cx += cx < 12 ? 1 : -1; else cy += cy < 10 ? 1 : -1; if (m.get(cx, cy) === T.TREE || m.get(cx, cy) === T.WATER || m.get(cx, cy) === T.ROCK) m.set(cx, cy, T.TALL); } }
  m.warps.push({ x: ex, y: 10, to: back, tx: back_w.x + (westEntry ? -1 : 1), ty: back_w.y, dir: westEntry ? 'left' : 'right' });
  Object.assign(m, { name: 'Hidden Grove', kind: 'route', secret: true, biome, music: 'mystic', ci: Math.min(r - 1, 7), encounter: Math.min(r + 2, 9), encRate: 1.4 });
  return m;
}

// ------------------------------------------------------------ Chrono Gate eras
function eraMap(W, era) {
  const w = 30, h = 36, m = grid(w, h, T.GRASS); const R = rng(hash(W.id + SEED + 'era' + era)); const past = era === 'past';
  const set = eraSetFor(W.id)[era]; border(m, [], []);
  m.rect(14, 2, 2, h - 4, T.PATH); m.rect(6, 3, 18, 7, T.PATH);
  for (const x of [6, 23]) for (const y of [3, 9]) m.set(x, y, past ? T.ROCK : T.FENCE);
  m.rect(3, 13, 9, 6, T.TALL); m.rect(18, 13, 9, 6, T.TALL); m.rect(3, 22, 9, 7, T.TALL); m.rect(18, 22, 9, 7, T.TALL);
  scatter(m, R, 26, past ? [T.TREE, T.FLOWER, T.ROCK] : [T.FLOWER, T.FLOWER, T.FENCE], (x, y) => (x >= 12 && x <= 17) || y <= 11 || y >= h - 5 || (y >= 19 && y <= 21));
  m.set(12, 10, T.SIGN); m.objs.push({ x: 12, y: 10, kind: 'sign', text: [`${set.name} — ${set.years}`, past ? 'The air smells of old paper and machine oil. Monsters here wear their *Ancient* forms.' : 'Neon light hums everywhere. Monsters here have evolved *Neo-* forms.', 'Step on the time portal at the south end to return to the present.'] });
  m.objs.push(npc(10, 4, { kind: 'nurse', name: past ? 'Apothecary' : 'Med-Bot', dir: 'down', pal: { coat: true, shirt: past ? '#8a5a30' : '#30d0e0', hair: past ? '#504030' : '#c0f8ff' } }));
  m.objs.push(npc(19, 4, { name: past ? 'Historian' : 'Futurist', lines: [...set.facts, 'Battle here and you\'ll be quizzed on this era too!'], pal: { coat: past, shirt: past ? '#704020' : '#4040ff', hair: past ? '#909090' : '#ff40d0' } }));
  m.objs.push({ x: 17, y: 7, kind: 'rift' });
  const lines = W.routeLines(5); const [, hi] = W.routeLevels(5);
  [[12, 14, 'right'], [17, 20, 'left'], [12, 26, 'right'], [17, 30, 'left']].forEach(([x, y, dir], k) => {
    m.set(x, y, T.GRASS); const nm = W.trainerName(hash(W.id + SEED + era + 't' + k)); const n = Math.min(2 + (k >> 1), 3);
    const team = W.makeTeam(hash(W.id + SEED + era + 'team' + k), lines, n, hi + 1 - (n - 1)).map((e) => ({ ...e, era }));
    m.objs.push({ x, y, kind: 'trainer', dir, sight: 4, key: `era_${era}_t${k}`, name: nm.name, cls: past ? 'Time Scholar' : 'Chrononaut', team, money: (hi + 4) * 26, qci: 4, era, pal: past ? { shirt: '#8a6a40', hat: '#5a4020' } : { shirt: '#20e0ff', hair: '#ff60e0' } });
  });
  [[4, 30], [25, 30], [4, 12], [25, 12]].forEach(([x, y], k) => { m.set(x, y, T.GRASS); m.objs.push({ x, y, kind: 'item', item: ['maxtonic', 'cube3', 'revive', 'tm_' + R.pick(['logic', 'cipher', 'spark', 'data', 'structure', 'flux'])][k], count: 1, key: `era_${era}_i${k}` }); });
  m.objs.push({ x: 14, y: h - 3, kind: 'chrono', back: true });
  Object.assign(m, { name: set.name, kind: 'route', biome: past ? 'desert' : 'neon', music: past ? 'mystic' : 'neon', ci: 4, encounter: 5, encRate: 1.1, era, entry: { x: 10, y: 6 } });
  return m;
}

// ------------------------------------------------------------ cities
function city(W, i) {
  const c = W.cities[i]; const w = 48, h = 26, m = grid(w, h, T.GRASS); const r = rng(hash(W.id + SEED + 'city' + i)); const biome = cityBiome(W, i);
  // layout variation: mirror + which slot holds the Mend Station / Study Lab / Supply Depot
  const M = variant(W, 'cityM' + i, 2) === 1; const perm = [[0, 1, 2], [1, 0, 2], [2, 1, 0], [0, 2, 1], [1, 2, 0], [2, 0, 1]][variant(W, 'cityP' + i, 6)];
  const mx = (x, bw = 1) => (M ? 30 - x - bw : x);
  border(m, [14, 15], [14, 15]);
  m.rect(14, 0, 2, h, T.PATH); m.rect(2, 9, w - 4, 2, T.PATH); m.rect(2, 19, w - 4, 2, T.PATH);
  for (const hx of [29, 38]) for (let y = 2; y < h - 2; y++) m.set(hx, y, y === 9 || y === 10 || y === 19 || y === 20 ? T.PATH : T.TREE); // hedges: old town | east district | learning quarter
  const slots = [[19, 3, 6, 5], [3, 13, 6, 5], [19, 13, 6, 5]]; const kinds = [['mend', 'Mend Station'], ['lab', 'Study Lab'], ['depot', 'Supply Depot']];
  const doors = [building(m, mx(3, 8), 2, 8, 6, 'gym', `city${i}_gym`, c.name + ' Mastery Hall'), building(m, mx(10, 3), 14, 3, 4, 'house', `city${i}_house`, 'House')];
  kinds.forEach(([k, label], j) => { const [x, y, bw, bh] = slots[perm[j]]; doors.push(building(m, mx(x, bw), y, bw, bh, k, `city${i}_${k}`, label)); });
  doors.push(building(m, 31, 2, 7, 6, 'archive', `city${i}_archive`, 'Archive'));
  doors.push(building(m, 40, 2, 7, 6, 'academy', `city${i}_academy`, 'Academy'), building(m, 40, 13, 7, 5, 'arcade', `city${i}_arcade`, 'Arcade'));
  for (const d of doors) m.set(d.dx, d.dy + 1, T.PATH);
  const ent = { gym: [7, 18], mend: [5, 7], lab: [6, 8], house: [4, 6], depot: [5, 7], archive: [6, 8], academy: [6, 8], arcade: [6, 8] };
  for (const wp of m.warps) if (wp.door) { const e = ent[wp.kind]; wp.tx = e[0]; wp.ty = e[1]; }
  const reserved = new Set(); const res = (x, y) => reserved.add(x + ',' + y);
  for (const d of doors) for (let k = 0; k < 3; k++) res(d.dx, d.dy + k);
  const npcSpots = [[12, 11], [17, 11], [8, 21], [21, 21], [5, 11], [25, 11], [17, 7], [26, 22]].map(([x, y]) => [mx(x), y]).filter(([x, y]) => m.get(x, y) !== T.BWALL && m.get(x, y) !== T.DOOR).sort(() => r() - 0.5);
  npcSpots.forEach(([x, y]) => res(x, y));
  if (biome === 'coast' || biome === 'meadow' || biome === 'forest') m.rect(mx(23, 4), 22, 4, 1, T.WATER);
  // east district: a park with a pond, benches of flowers, a hidden glint and a couple of locals
  m.rect(31, 13, 6, 4, T.GRASS); m.rect(32, 14, 3, 2, T.WATER); for (const [x, y] of [[31, 12], [36, 12], [31, 17], [36, 17], [30, 15], [37, 15]]) m.set(x, y, T.FLOWER);
  for (let k = 0; k < 2; k++) { const x = 30 + k * 6 + 1, y = 22; res(x, y); m.set(x, y, T.GRASS); m.objs.push(npc(x, y, { name: W.trainerName(hash(c.name + 'e' + k)).name, tips: tipLines(W, i, 10 + k), wander: true, pal: { shirt: ['#c06020', '#2080a0'][k] } })); }
  res(35, 11); res(35, 18); res(36, 22); m.objs.push({ x: 36, y: 22, kind: 'item', hidden: true, walkable: true, item: 'maxtonic', count: 1, key: `c${i}h` });
  for (let x = 30; x < 47; x++) res(x, 21); for (let x = 30; x < 47; x++) res(x, 8); for (let y = 2; y < 24; y++) res(43, y);
  m.set(37, 15, T.FLOWER); m.objs.push({ x: 38, y: 15, kind: 'secretdoor', to: `garden${i}`, tx: 1, ty: 7, dir: 'right', label: 'The hedge here is thin… there\'s a garden on the other side!' }); res(37, 15); res(37, 14); res(37, 16);
  m.set(41, 22, T.SIGN); m.objs.push({ x: 41, y: 22, kind: 'sign', text: ['Learning Quarter', 'North: the Academy — lessons from easy to mastery.', 'South: the Arcade — mini games that train what you learn.'] });
  m.objs.push(npc(45, 11, { name: 'Tutor', tips: tipLines(W, i, 13, 3), wander: true, pal: { coat: true, shirt: '#3060a0' } }));
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
    m.warps.push({ x, y: h - 1, to: `zone${i + 1}`, tx: x, ty: 1, dir: 'down' });
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
  } else if (kind === 'academy') {
    m = interior(14, 10, back, ...outside); m.rect(1, 2, 3, 1, T.SHELF); m.rect(10, 2, 3, 1, T.SHELF); for (const [x, y] of [[3, 6], [6, 6], [9, 6], [3, 4], [9, 4]]) m.set(x, y, T.DESK); m.set(1, 8, T.PLANT); m.set(12, 8, T.PLANT);
    m.objs.push({ x: 6, y: 2, kind: 'lessons', ci: i }); m.objs.push({ x: 7, y: 2, kind: 'lessons', ci: i });
    m.objs.push(npc(5, 3, { kind: 'teacher', ci: i, name: 'Teacher ' + W.trainerName(hash(c.name + 'teach')).name, pal: { coat: true, shirt: '#a03040', hair: '#402818' } }));
    m.objs.push(npc(11, 6, { name: 'Classmate', tips: tipLines(W, i, 14, 3), wander: true }));
    Object.assign(m, base, { name: c.name + ' Academy', music: 'lab', musicKey: W.id + ':lab' + i });
  } else if (kind === 'arcade') {
    m = interior(14, 10, back, ...outside); m.set(1, 8, T.PLANT); m.set(12, 8, T.PLANT); m.rect(4, 6, 6, 2, T.RUG);
    [['unscramble', 2, 2], ['blitz', 4, 2], ['guess', 9, 2], ['ladder', 11, 2], ['listen', 12, 5]].forEach(([game, x, y]) => m.objs.push({ x, y, kind: 'cabinet', game, ci: i, solidTile: true }));
    m.objs.push(npc(6, 3, { kind: 'arcadehost', ci: i, name: 'Arcade Host', pal: { shirt: '#ff40a0', hair: '#40e0ff', hat: '#202020' } }));
    m.objs.push(npc(2, 6, { name: 'Gamer', tips: tipLines(W, i, 15, 2), wander: true }));
    Object.assign(m, base, { name: c.name + ' Arcade', music: 'neon', musicKey: W.id + ':arcade' }); m.objs.forEach((o) => { if (o.kind === 'cabinet') o.label = o.game; });
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
  m.set(6, h - 1, T.MAT); m.warps.push({ x: 6, y: h - 1, to: 'zone9', tx: 14, ty: 1, dir: 'down' });
  m.set(3, h - 5, T.PC); m.objs.push({ x: 3, y: h - 5, kind: 'pc', solidTile: true });
  m.objs.push(npc(9, h - 5, { kind: 'nurse', name: 'Summit Mender', pal: { hair: '#ff9fd0', shirt: '#6a4ad0' }, dir: 'left' }));
  const rows = [h - 9, h - 14, h - 19, h - 24];
  W.elite.forEach((e, k) => { const y = rows[k]; for (const x of [4, 5, 7, 8]) m.set(x, y, T.STATUE); m.objs.push(npc(6, y, { kind: 'elite', idx: k, name: e.name, title: e.title, type: e.type })); });
  for (const x of [4, 5, 7, 8]) m.set(x, 4, T.STATUE);
  m.objs.push(npc(6, 3, { kind: 'champion', name: W.champion.name }));
  Object.assign(m, { name: 'Mastery Summit', kind: 'interior', biome: 'interior', music: 'epic', ci: 'final', entry: { x: 6, y: h - 2 } });
  return m;
}
