// Unique city styles, the Static Syndicate storyline and its dungeons (towers, caves, crypt, power plant),
// plus the special buildings (mall, saloon, lodge…). Only seeded worlds use these; classic saves keep their old map.
import { T, SOLID } from '../core/sprites.js';
import { rng, hash } from '../core/rng.js';
import { grid, interior, npc, tipLines, worldSeed } from './maps.js';

// ------------------------------------------------------------ city archetypes (each world deals them out differently)
export const ARCHETYPES = [
  { id: 'metropolis', label: 'Metropolis', biome: 'neon', uniques: [['mall', 10, 6, 'Skyline Mall'], ['skate', 6, 5, 'Skate Shop']], greet: 'Welcome to the big city — mind the traffic and visit the Skyline Mall!' },
  { id: 'mountain', label: 'Mountain Town', biome: 'snow', uniques: [['lodge', 7, 5, 'Ski Lodge'], ['cablecar', 6, 5, 'Cable Car Station']], greet: 'Fresh mountain air! Warm up with cocoa at the Ski Lodge.' },
  { id: 'western', label: 'Frontier Town', biome: 'desert', uniques: [['saloon', 7, 5, 'Saloon'], ['sheriff', 6, 5, "Sheriff's Office"]], greet: 'Howdy, partner. Wet your whistle at the Saloon — and keep an eye out for outlaws.' },
  { id: 'harbor', label: 'Harbour Town', biome: 'coast', uniques: [['fishmarket', 7, 5, 'Fish Market'], ['aquarium', 8, 6, 'Aquarium']], greet: 'Smell that sea breeze! Boats in, boats out, all day long.' },
  { id: 'farm', label: 'Farm Village', biome: 'meadow', uniques: [['barn', 7, 6, 'Big Red Barn'], ['farmstand', 6, 5, 'Farm Stand']], greet: 'Mornin\'! Fresh milk at the barn, cheap tonics at the farm stand.' },
  { id: 'historic', label: 'Old Town', biome: 'forest', uniques: [['museum', 8, 6, 'Museum of History'], ['library', 7, 5, 'Grand Library']], greet: 'This town is older than the Mastery Halls. The Museum tells the story.' },
  { id: 'volcanic', label: 'Ember Springs', biome: 'volcano', uniques: [['bazaar', 7, 5, 'Ember Bazaar'], ['hotspring', 7, 5, 'Hot Springs']], greet: 'Feel the warmth? A soak in the Hot Springs cures anything.' },
  { id: 'tech', label: 'Tech Campus', biome: 'crystal', uniques: [['vr', 7, 5, 'VR Arena'], ['observatory', 6, 6, 'Observatory']], greet: 'Welcome to the campus. Train in the VR Arena, stargaze at the Observatory.' },
];
const archCache = {};
export function archOf(W, i) {
  const S = worldSeed(); if (!S) return null; const k = W.id + S;
  const order = archCache[k] || (archCache[k] = ARCHETYPES.map((a, j) => j).sort((a, b) => hash(k + 'arch' + a) - hash(k + 'arch' + b)));
  return ARCHETYPES[order[i % 8]];
}

// ------------------------------------------------------------ the Static Syndicate storyline: one scenario per city
export const SCEN = {
  1: { id: 'kidnap', building: ['watchtower', 5, 6, 'Old Watchtower'], floors: 4, title: 'The Kidnapping', desc: (c) => `The Static Syndicate kidnapped a child in ${c}. Rescue them from the top of the Old Watchtower.` },
  2: { id: 'lockdown', title: 'Lockdown', desc: (c) => `Syndicate grunts have locked down ${c}. Defeat every grunt in town to lift it.` },
  3: { id: 'lost', building: ['cavemouth', 6, 5, 'Tangle Caverns'], floors: 3, title: 'Lost in the Tangle', desc: (c) => `${c}'s Hall Leader chased the Syndicate into the Tangle Caverns and never came back. Find them on the deepest level.` },
  4: { id: 'blackout', building: ['power', 7, 5, 'Power Plant'], title: 'Blackout', desc: (c) => `The Syndicate cut ${c}'s power. Flip the three breakers in the Power Plant.` },
  5: { id: 'haunt', building: ['crypt', 6, 5, 'Hollow Crypt'], floors: 2, title: 'The Haunting', desc: (c) => `The Syndicate stole ${c}'s Hall relic and hid it in the Hollow Crypt. Beat the Grave Warden to get it back.` },
  6: { id: 'hq', building: ['hq', 6, 6, 'Syndicate Tower'], floors: 5, title: 'Syndicate HQ', desc: (c) => `The Syndicate's headquarters looms over ${c}. Climb all five floors and defeat Kingpin Vex.` },
  7: { id: 'laststand', title: 'Last Stand', desc: (c) => `Two Syndicate admins are holding the ${c} Mastery Hall. Beat them together.` },
};
export const scenOf = (i) => (worldSeed() ? SCEN[i] || null : null);
export const scenActive = (S, i) => !!scenOf(i) && !S.flags['mob' + i];
export const SYN = { cls: 'Syndicate Grunt', pal: { shirt: '#26232f', pants: '#1a1820', hat: '#d8303a', hair: '#141218', coat: true } };
const GRUNT_NAMES = ['Ravi', 'Kez', 'Dax', 'Mona', 'Brick', 'Sly', 'Vera', 'Jinx', 'Rook', 'Tess', 'Zed', 'Lula', 'Fitz', 'Nova', 'Grim', 'Pip'];
const GRUNT_LINES = [['The Static Syndicate runs this place now!'], ['You picked the wrong street, kid.'], ['Boss Vex says nobody gets through. Nobody!'], ['We cause the static, you get the shock!']];
export function grunt(W, i, x, y, dir, key, extra = {}) {
  const r = Math.min(9, i + 1); const [, hi] = W.routeLevels(r); const lines = W.routeLines(r); const n = Math.min(2 + (i >> 2), 3);
  return { x, y, kind: 'trainer', dir, sight: 3, key, name: GRUNT_NAMES[hash(key) % GRUNT_NAMES.length], cls: SYN.cls, team: W.makeTeam(hash(W.id + worldSeed() + key), lines, n, hi + 1 + (extra.lvlUp || 0)), money: (hi + 2) * 30, qci: Math.min(i, 7), pal: SYN.pal, syndicate: true, lines: GRUNT_LINES[hash(key + 'l') % GRUNT_LINES.length], after: 'Ugh… the boss is not gonna like this.', ...extra };
}

// ------------------------------------------------------------ what each seeded city builds (beyond the standard eight)
export function cityExtras(W, i) {
  const a = archOf(W, i); const out = a ? a.uniques.map(([kind, w, h, label]) => [kind, w, h, `city${i}_${kind}${kind === 'mall' ? '_f1' : ''}`, label]) : [];
  const sc = scenOf(i); if (sc?.building) { const [kind, w, h, label] = sc.building; const first = { watchtower: 'tower_f1', cavemouth: 'cave_b1', crypt: 'crypt_f1', hq: 'hq_f1', power: 'power' }[kind]; out.push([kind, w, h, `city${i}_${first}`, label]); }
  return out;
}
// decorations that make each archetype look different
export function decorateCity(W, i, m, r, free, res) {
  const a = archOf(W, i); if (!a) return;
  const deco = (x, y, art, text, walk) => { if (!free(x, y)) return false; m.objs.push({ x, y, kind: 'deco', art, decor: true, walkable: !!walk, text }); res(x, y); return true; };
  const spots = []; for (let y = 3; y < m.h - 3; y++) for (let x = 3; x < m.w - 3; x++) if (free(x, y) && free(x, y - 1) && free(x + 1, y) && free(x - 1, y)) spots.push([x, y]);
  const pick = () => (spots.length ? spots.splice(r.int(0, spots.length - 1), 1)[0] : null);
  const many = (n, art, text, walk) => { for (let k = 0; k < n; k++) { const p = pick(); if (p) deco(p[0], p[1], art, text, walk); } };
  if (a.id === 'metropolis') { many(7, 'skyscraper', ['A gleaming skyscraper. The lobby is staff-only.']); many(4, 'streetlamp'); many(2, 'hotdog', ['A hot dog cart. It smells amazing.']); }
  if (a.id === 'mountain') { many(10, 'pine'); many(6, 'boulder'); many(1, 'pylon', ['A cable car pylon hums overhead.']); many(2, 'snowman', ['Someone built a snow Hakma.']); }
  if (a.id === 'western') { many(9, 'cactus'); many(2, 'trough', ['A water trough for travellers\' Hakma.']); many(3, 'barrel'); many(1, 'wanted', ['WANTED: Kingpin Vex of the Static Syndicate. Reward: glory.']); }
  if (a.id === 'harbor') { many(4, 'anchor'); many(3, 'crates'); many(2, 'buoy'); many(2, 'nets', ['Fishing nets drying in the sun.']); }
  if (a.id === 'farm') { many(2, 'windmill', ['The windmill creaks in the breeze.']); many(6, 'hay'); many(4, 'crop', null, false); many(2, 'scarecrow', ['A scarecrow wearing a Syndicate hat. Cheeky.']); }
  if (a.id === 'historic') { many(1, 'clocktower', ['The old clock tower. It\'s always five minutes slow.']); many(4, 'statue', ['A statue of a founder of the Mastery Halls.']); many(2, 'fountain', ['Coins glint in the fountain.']); }
  if (a.id === 'volcanic') { many(6, 'lavarock'); many(4, 'steam', ['Warm steam rises from a vent.']); many(2, 'brazier'); }
  if (a.id === 'tech') { many(3, 'antenna'); many(2, 'dish', ['A satellite dish tracks something in the sky.']); many(4, 'kiosk', ['An info kiosk. It says: "Have you tried turning it off and on again?"']); }
}
// people and story objects in seeded cities
export function populateCity(W, i, m, r, take) {
  const a = archOf(W, i); const S = worldSeed();
  if (a) { const p = take(); if (p) m.objs.push(npc(p[0], p[1], { name: a.label + ' Local', tips: [a.greet, ...tipLines(W, i, 17, 1)], wander: true })); }
  // side-quest givers
  for (let q = 0; q < 2; q++) { const p = take(); if (p) m.objs.push(npc(p[0], p[1], { kind: 'quest', qid: `q${i}_${q}`, name: ['Worried Neighbour', 'Busy Courier', 'Old Collector', 'Coach', 'Inventor', 'Gardener'][hash(S + i + q) % 6], pal: { shirt: ['#d07a30', '#3080c0', '#8a50c0', '#30a070'][q + (i % 2) * 2] } })); }
  const sc = scenOf(i); if (!sc) return;
  if (sc.id === 'laststand') { const d = m.warps.find((q) => q.door && q.kind === 'gym'); if (d) { const spots = [[d.x - 1, d.y + 1], [d.x + 1, d.y + 1], [d.x - 1, d.y + 2], [d.x + 1, d.y + 2]].filter(([x, y]) => !SOLID.has(m.get(x, y)) && !m.objs.some((o) => o.x === x && o.y === y)); if (spots.length >= 2) { const lines = ['We\'re the last of the Static Syndicate — and we\'re not going quietly!']; m.objs.push(grunt(W, i, spots[0][0], spots[0][1], 'down', `mob${i}a`, { pair: `mob${i}p`, cls: 'Syndicate Admin', lvlUp: 3, pairLines: lines, sight: 2 }), grunt(W, i, spots[1][0], spots[1][1], 'down', `mob${i}b`, { pair: `mob${i}p`, cls: 'Syndicate Admin', lvlUp: 3, pairLines: lines, sight: 2 })); } } }
  if (sc.id === 'lockdown') { for (let g = 0; g < 4; g++) { const p = take(); if (p) m.objs.push(grunt(W, i, p[0], p[1], r.pick(['left', 'right', 'down']), `mob${i}g${g}`, { pair: g < 2 ? `mob${i}p` : undefined, mobOf: i })); } }
  // lockdown grunts in pairs must stand next to each other
  const pairs = m.objs.filter((o) => o.pair === `mob${i}p`); if (pairs.length === 2) { const [p1, p2] = pairs; if (Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y) > 1) { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = p1.x + dx, y = p1.y + dy; if (!SOLID.has(m.get(x, y)) && !m.objs.some((o) => o.x === x && o.y === y) && !m.warps.some((w) => w.x === x && w.y === y)) { p2.x = x; p2.y = y; break; } } } }
}
// guard objects in front of the gym door while a scenario is active (handled by doorBlocked)

// ------------------------------------------------------------ route mayhem: Syndicate pairs and friendly pairs
export function routePairs(W, r, m, R, onPath) {
  if (!worldSeed() || r < 2) return;
  const spots = []; for (let y = 6; y < m.h - 6; y++) for (let x = 3; x < m.w - 4; x++) { const ok = (xx) => [T.GRASS, T.FLOWER].includes(m.get(xx, y)) && !m.objs.some((o) => o.x === xx && o.y === y); if (ok(x) && ok(x + 1) && (onPath(x - 1, y) || onPath(x + 2, y) || onPath(x, y + 1) || onPath(x, y - 1))) spots.push([x, y]); }
  const place = (key, mk) => { if (!spots.length) return; const [x, y] = spots.splice(R.int(0, spots.length - 1), 1)[0]; const dir = onPath(x - 1, y) ? 'left' : onPath(x + 2, y) ? 'right' : onPath(x, y + 1) ? 'down' : 'up'; m.objs.push(mk(x, y, dir, key + 'a', key), mk(x + 1, y, dir, key + 'b', key)); };
  const i = Math.min(7, r - 1);
  if (r <= 8) place(`rp${r}s`, (x, y, dir, key, pair) => grunt(W, i, x, y, dir, key, { pair, sight: 3 }));
  const kinds = [['Twins', ['We do everything together!']], ['Study Buddies', ['Two heads are better than one!']], ['Best Friends', ['Double trouble, coming right up!']], ['Rival Siblings', ['We argue all day, but we battle as one!']]];
  const [cls, lines] = kinds[hash(W.id + worldSeed() + r) % kinds.length]; const [, hi] = W.routeLevels(r); const pool = W.routeLines(r); const nm = ['Ana', 'Bo', 'Cy', 'Di', 'Eli', 'Fay', 'Gus', 'Ivy', 'Jo', 'Kit'];
  place(`rp${r}f`, (x, y, dir, key, pair) => ({ x, y, kind: 'trainer', dir, sight: 3, key, pair, cls, name: nm[hash(key) % nm.length], team: W.makeTeam(hash(W.id + worldSeed() + key), pool, Math.min(1 + Math.floor(r / 3), 3), hi), money: (hi + 2) * 20, qci: Math.min(r - 1, 7), pairLines: lines }));
}

// ------------------------------------------------------------ interiors for the special buildings and dungeons
const ent = (m, x, y) => { m.entry = { x, y }; return m; };
function connected(m, from, targets) {
  const seen = new Set([from[0] + ',' + from[1]]); const q = [from];
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen.has(k) || nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue; if (SOLID.has(m.get(nx, ny))) continue; const o = m.objs.find((o2) => o2.x === nx && o2.y === ny); if (o && !o.walkable) { seen.add(k); continue; } seen.add(k); q.push([nx, ny]); } }
  return targets.every(([x, y]) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(x + dx + ',' + (y + dy)) && !(dx === 0 && dy === 0 && SOLID.has(m.get(x, y)))));
}
// a floor of a multi-storey tower: stairs up/down, obstacles, trainers, and a goal on the top floor
function towerFloor(W, i, base, f, nF, outside, style) {
  const back = `city${i}`; const w = 16, h = 12;
  for (let tries = 0; tries < 40; tries++) {
    const r = rng(hash(W.id + worldSeed() + base + f + 't' + tries));
    const m = f === 1 ? interior(w, h, back, ...outside) : grid(w, h, T.FLOOR);
    if (f > 1) { m.rect(0, 0, w, 2, T.IWALL); m.rect(0, h - 1, w, 1, T.IWALL); m.kind = 'interior'; m.biome = 'interior'; }
    m.rect(0, 0, 1, h, T.IWALL); m.rect(w - 1, 0, 1, h, T.IWALL); if (f === 1) { const mx = Math.floor(w / 2) - 1; m.set(mx, h - 1, T.MAT); m.set(mx + 1, h - 1, T.MAT); }
    const up = f % 2 ? [w - 3, 2] : [2, 2], down = f % 2 ? [2, 2] : [w - 3, 2];
    if (f < nF) { m.set(up[0], up[1], T.STAIRS); m.warps.push({ x: up[0], y: up[1], to: `${back}_${base}_f${f + 1}`, tx: up[0], ty: up[1] + 1, dir: 'down', stairs: true }); }
    if (f > 1) { m.set(down[0], down[1], T.STAIRS); m.warps.push({ x: down[0], y: down[1], to: `${back}_${base}_f${f - 1}`, tx: down[0], ty: down[1] + 1, dir: 'down', stairs: true }); }
    // obstacles: rows of crates / consoles with gaps
    const blk = style === 'hq' ? [T.DESK, T.PC, T.SHELF] : [T.SHELF, T.TABLE, T.PLANT];
    for (let k = 0; k < 3; k++) { const y = 4 + k * 2 + r.int(0, 1); if (y >= h - 2) continue; const gap = r.int(2, w - 4); for (let x = 2; x < w - 2; x++) if (Math.abs(x - gap) > 1 && r() < 0.8) m.set(x, y, r.pick(blk)); }
    const arrive = f === 1 ? [Math.floor(w / 2) - 1, h - 2] : [down[0], down[1] + 1];
    for (const [x, y] of [[up[0], up[1] + 1], [down[0], down[1] + 1], arrive]) m.set(x, y, T.FLOOR);
    const freeT = []; for (let y = 3; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (m.get(x, y) === T.FLOOR && Math.abs(x - arrive[0]) + Math.abs(y - arrive[1]) > 2 && !m.warps.some((q) => Math.abs(q.x - x) + Math.abs(q.y - y) < 2)) freeT.push([x, y]);
    const takeT = () => (freeT.length ? freeT.splice(r.int(0, freeT.length - 1), 1)[0] : null);
    const goal = []; if (f < nF) goal.push(up);
    if (style === 'hq' || style === 'watch') {
      const nT = f === nF ? 0 : style === 'hq' && f % 2 === 0 ? 2 : 1;
      if (nT === 2) { const p = takeT(); if (p && m.get(p[0] + 1, p[1]) === T.FLOOR) { m.objs.push(grunt(W, i, p[0], p[1], 'down', `${base}${i}f${f}a`, { pair: `${base}${i}f${f}`, lvlUp: 1 }), grunt(W, i, p[0] + 1, p[1], 'down', `${base}${i}f${f}b`, { pair: `${base}${i}f${f}`, lvlUp: 1 })); goal.push(p); } }
      else for (let t = 0; t < nT; t++) { const p = takeT(); if (p) { m.objs.push(grunt(W, i, p[0], p[1], r.pick(['left', 'right', 'down']), `${base}${i}f${f}g${t}`)); goal.push(p); } }
    }
    const it = takeT(); if (it) { m.objs.push({ x: it[0], y: it[1], kind: 'item', item: r.pick(['supertonic', 'revive', 'cube2', 'maxtonic']), count: 1, key: `${base}${i}f${f}i` }); goal.push(it); }
    if (f === nF) { const gx = Math.floor(w / 2), gy = 4; m.rect(gx - 2, gy - 1, 5, 3, T.RUG); m.set(gx, gy, T.FLOOR);
      if (style === 'watch') m.objs.push(npc(gx, gy, { kind: 'kid', ci: i, name: 'Kidnapped Kid', pal: { shirt: '#ffcf3f', hair: '#7a4a20' } }), grunt(W, i, gx - 2, gy + 2, 'down', `watch${i}boss`, { name: 'Brick', cls: 'Syndicate Captain', lvlUp: 2, lines: ['You want the kid? Go through me!'] }));
      if (style === 'hq') m.objs.push(grunt(W, i, gx, gy, 'down', `hq${i}boss`, { kind: 'trainer', cls: 'Kingpin', name: 'Vex', lvlUp: 5, sight: 4, boss: true, music: 'epic', lines: ['So you\'re the one who keeps wrecking my plans.', 'The Static Syndicate will short-circuit every Mastery Hall in this region!', 'Let\'s see how much you really know.'], after: 'Impossible… beaten by someone who actually studied.', pal: { shirt: '#120f18', coat: true, hat: '#ffd23f', hair: '#e8e8e8' } }));
      goal.push([gx, gy]); }
    if (connected(m, arrive, goal)) return Object.assign(m, { name: `${style === 'hq' ? 'Syndicate Tower' : 'Old Watchtower'} ${f}F`, ci: i, cityIdx: i, music: style === 'hq' ? 'epic' : 'cave', tower: base, entry: { x: arrive[0], y: arrive[1] } });
  }
  throw new Error('tower floor gen failed');
}
// a level of the Tangle Caverns: a dark maze with ladders up, ladders down and holes you can fall through
function caveLevel(W, i, L, nL, outside) {
  const back = `city${i}`; const cw = 15, ch = 11, w = cw * 2 + 1, h = ch * 2 + 1;
  const r = rng(hash(W.id + worldSeed() + 'cave' + i + L)); const m = grid(w, h, T.ROCK);
  const C = (cx, cy) => [1 + cx * 2, 1 + cy * 2]; const seen = new Set(); const st = [[0, ch - 1]]; seen.add('0,' + (ch - 1)); m.set(...C(0, ch - 1), T.PATH);
  while (st.length) { const [cx, cy] = st[st.length - 1]; const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [cx + dx, cy + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < cw && y < ch && !seen.has(x + ',' + y)); if (!nb.length) { st.pop(); continue; } const [nx, ny] = nb[r.int(0, nb.length - 1)]; seen.add(nx + ',' + ny); const [ax, ay] = C(cx, cy), [bx, by] = C(nx, ny); m.set((ax + bx) / 2, (ay + by) / 2, T.PATH); m.set(bx, by, T.PATH); st.push([nx, ny]); }
  for (let k = 0; k < 14; k++) { const x = r.int(1, w - 2), y = r.int(1, h - 2); if (m.get(x, y) === T.ROCK && ((m.get(x - 1, y) === T.PATH && m.get(x + 1, y) === T.PATH) || (m.get(x, y - 1) === T.PATH && m.get(x, y + 1) === T.PATH))) m.set(x, y, T.PATH); }
  const deg = ([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => m.get(x + dx, y + dy) === T.PATH).length;
  const cells = []; for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) cells.push(C(cx, cy));
  const ends = cells.filter((c) => deg(c) === 1); // dead ends: ladders, holes and people never block a tunnel
  const far = (p, q, d) => Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) >= d;
  const westEnds = ends.filter((c) => c[0] <= 9); const upAt = (westEnds.length ? westEnds : ends)[r.int(0, (westEnds.length ? westEnds : ends).length - 1)];
  const used = [upAt]; const pickCell = (d = 8) => { const pool = ends.filter((c) => !used.some((u) => u[0] === c[0] && u[1] === c[1])); for (let t = 0; t < 200 && pool.length; t++) { const c = pool[r.int(0, pool.length - 1)]; if (used.every((u) => far(u, c, d))) { used.push(c); return c; } } if (!pool.length) return null; const c = pool[r.int(0, pool.length - 1)]; used.push(c); return c; };
  // the way back up
  if (L === 1) { m.objs.push({ x: upAt[0], y: upAt[1], kind: 'deco', art: 'ladder_up', decor: true, walkable: true }); m.warps.push({ x: upAt[0], y: upAt[1], to: back, tx: outside[0], ty: outside[1], dir: 'down', ladder: true }); }
  else { m.objs.push({ x: upAt[0], y: upAt[1], kind: 'deco', art: 'ladder_up', decor: true, walkable: true }); }
  const arrive = [upAt[0], upAt[1] + (m.get(upAt[0], upAt[1] + 1) === T.PATH ? 1 : 0)];
  if (arrive[1] === upAt[1]) for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1]]) if (m.get(upAt[0] + dx, upAt[1] + dy) === T.PATH) { arrive[0] = upAt[0] + dx; arrive[1] = upAt[1] + dy; break; }
  m.cave = { upAt, arrive };
  if (L < nL) { // two ladders down to different parts of the next level, plus holes
    for (let k = 0; k < 2; k++) { const c = pickCell(9); if (!c) break; m.objs.push({ x: c[0], y: c[1], kind: 'deco', art: 'ladder_down', decor: true, walkable: true }); m.warps.push({ x: c[0], y: c[1], to: `${back}_cave_b${L + 1}`, ladderTo: k, ladder: true, dir: 'down' }); }
    for (let k = 0; k < 2; k++) { const c = pickCell(6); if (!c) break; m.objs.push({ x: c[0], y: c[1], kind: 'deco', art: 'hole', decor: true, walkable: true }); m.warps.push({ x: c[0], y: c[1], to: `${back}_cave_b${L + 1}`, hole: true, tx: c[0], ty: c[1], dir: 'down' }); }
  }
  // ladders arriving from above lead back up from here
  if (L > 1) m.warps.push({ x: upAt[0], y: upAt[1], to: `${back}_cave_b${L - 1}`, ladderBack: true, ladder: true, dir: 'down' });
  // stuff to find
  for (let k = 0; k < 3; k++) { const c = pickCell(4); if (!c) break; m.objs.push({ x: c[0], y: c[1], kind: 'item', item: r.pick(['supertonic', 'cube2', 'revive', 'maxtonic', 'cube3']), count: 1, key: `cave${i}b${L}i${k}`, hidden: k === 2, walkable: k === 2 }); }
  for (let k = 0; k < 2; k++) { const c = pickCell(5); if (!c) break; const nm = W.trainerName(hash(W.id + worldSeed() + 'cv' + i + L + k)); const [, hi] = W.routeLevels(Math.min(9, i + 1)); m.objs.push({ x: c[0], y: c[1], kind: 'trainer', dir: r.pick(['up', 'down', 'left', 'right']), sight: 2, key: `cave${i}b${L}t${k}`, name: nm.name, cls: 'Hiker', team: W.makeTeam(hash(W.id + worldSeed() + 'cvt' + i + L + k), W.routeLines(Math.min(9, i + 1)), 2, hi), money: (hi + 2) * 24, qci: Math.min(i, 7) }); }
  for (let k = 0; k < 10; k++) { const c = cells[r.int(0, cells.length - 1)]; if (!m.objs.some((o) => o.x === c[0] && o.y === c[1]) && !m.warps.some((q) => q.x === c[0] && q.y === c[1])) m.set(c[0], c[1], T.TALL); }
  if (L === nL) { const c = pickCell(14) || pickCell(1); m.objs.push(npc(c[0], c[1], { kind: 'hostage', ci: i, name: 'Lost Hall Leader', pal: { coat: true, shirt: '#3a6ad8' } })); }
  if (L === 1) { const c = pickCell(2); if (c) m.objs.push(npc(c[0], c[1], { name: 'Spelunker', tips: ['The Tangle twists back on itself. Ladders down lead to different tunnels — if you\'re stuck, go back up and try the other one.', 'Holes drop you to the level below. You can\'t climb back through them!'] })); }
  return Object.assign(m, { name: `Tangle Caverns B${L}`, kind: 'route', biome: 'crystal', music: 'cave', ci: Math.min(i, 7), encounter: Math.min(9, i + 1), dark: true, cityIdx: undefined, entry: { x: arrive[0], y: arrive[1] } });
}
// the Hollow Crypt: graves, fog and restless undead that wander and battle when they spot you
function cryptLevel(W, i, f, nF, outside) {
  const back = `city${i}`; const w = 30, h = 22; const r = rng(hash(W.id + worldSeed() + 'crypt' + i + f));
  const m = grid(w, h, T.PATH); m.rect(0, 0, w, 1, T.ROCK); m.rect(0, h - 1, w, 1, T.ROCK); m.rect(0, 0, 1, h, T.ROCK); m.rect(w - 1, 0, 1, h, T.ROCK);
  // walls of crumbling stone with openings
  for (const x of [8, 15, 22]) { for (let y = 1; y < h - 1; y++) m.set(x, y, T.ROCK); for (let k = 0; k < 2; k++) { const gy = r.int(2, h - 3); m.set(x, gy, T.PATH); m.set(x, gy + 1, T.PATH); } }
  for (let k = 0; k < 40; k++) { const x = r.int(2, w - 3), y = r.int(2, h - 3); if (m.get(x, y) === T.PATH && ![8, 15, 22].includes(x) && x % 2 === 0 && y % 3 === 0) m.objs.push({ x, y, kind: 'deco', art: 'grave', decor: true, text: [r.pick(['Here lies a forgotten coder. Their last commit: "fix later".', 'R.I.P. — they never wrote the tests.', 'Rest in peace. Their password was "password".', 'Gone but not garbage-collected.'])] }); }
  const arrive = [3, h - 3]; const exitAt = [3, h - 2];
  if (f === 1) { m.set(exitAt[0], exitAt[1], T.PATH); m.warps.push({ x: exitAt[0], y: exitAt[1] + 1, to: back, tx: outside[0], ty: outside[1], dir: 'down' }); m.set(exitAt[0], exitAt[1] + 1, T.PATH); }
  else { m.objs.push({ x: arrive[0], y: arrive[1] + 1, kind: 'deco', art: 'ladder_up', decor: true, walkable: true }); m.warps.push({ x: arrive[0], y: arrive[1] + 1, to: `${back}_crypt_f${f - 1}`, tx: w - 4, ty: 3, dir: 'down', stairs: true }); }
  if (f < nF) { m.set(w - 4, 2, T.STAIRS); m.warps.push({ x: w - 4, y: 2, to: `${back}_crypt_f${f + 1}`, tx: arrive[0], ty: arrive[1], dir: 'up', stairs: true }); }
  m.objs = m.objs.filter((o) => Math.abs(o.x - arrive[0]) + Math.abs(o.y - arrive[1]) > 2 && !(o.x === w - 4 && o.y <= 3));
  const [, hi] = W.routeLevels(Math.min(9, i + 1)); const lines = W.routeLines(Math.min(9, i + 1));
  const UNDEAD = [['Restless Ghoul', { skin: '#9fc89a', shirt: '#4a4a5a', hair: '#2a3a2a' }], ['Wailing Wraith', { skin: '#d8e4f0', shirt: '#e8eef8', coat: true, hair: '#f4f4ff' }], ['Bone Rattler', { skin: '#e8e0c8', shirt: '#3a3040', hair: '#e8e0c8' }]];
  for (let k = 0; k < 5; k++) { for (let t = 0; t < 50; t++) { const x = r.int(4, w - 5), y = r.int(2, h - 3); if (m.get(x, y) !== T.PATH || m.objs.some((o) => Math.abs(o.x - x) + Math.abs(o.y - y) < 2) || Math.abs(x - arrive[0]) + Math.abs(y - arrive[1]) < 6) continue; const [cls, pal] = UNDEAD[(k + f) % 3];
    m.objs.push({ x, y, kind: 'trainer', dir: r.pick(['up', 'down', 'left', 'right']), sight: 3, wander: true, range: 4, key: `crypt${i}f${f}u${k}`, cls, name: ['Mort', 'Grimsby', 'Moan', 'Rattle', 'Hollow', 'Dusk'][(k + f * 2) % 6], team: W.makeTeam(hash(W.id + worldSeed() + 'und' + i + f + k), lines, 2, hi + 1), money: (hi + 2) * 18, qci: Math.min(i, 7), pal, lines: [r.pick(['Ooooooh… you smell like fresh knowledge…', 'Join usss… answer foreverrrr…', 'Brrraaains… I mean, brrrain teasers…'])], after: 'The spirit fades into the mist…', undead: true }); break; } }
  for (let k = 0; k < 2; k++) { for (let t = 0; t < 40; t++) { const x = r.int(2, w - 3), y = r.int(2, h - 3); if (m.get(x, y) === T.PATH && !m.objs.some((o) => o.x === x && o.y === y)) { m.objs.push({ x, y, kind: 'item', item: r.pick(['revive', 'maxtonic', 'cube3']), count: 1, key: `crypt${i}f${f}i${k}` }); break; } } }
  if (f === nF) { const bx = w - 5, by = Math.floor(h / 2); m.rect(bx - 2, by - 2, 5, 5, T.PATH); m.objs = m.objs.filter((o) => Math.abs(o.x - bx) > 2 || Math.abs(o.y - by) > 2);
    m.objs.push({ x: bx, y: by, kind: 'trainer', dir: 'left', sight: 4, key: `crypt${i}boss`, cls: 'Grave Warden', name: 'Morrow', boss: true, team: W.makeTeam(hash(W.id + worldSeed() + 'warden' + i), lines, 3, hi + 4), money: (hi + 5) * 40, qci: Math.min(i, 7), pal: { skin: '#b8d0b0', shirt: '#1a1424', coat: true, hat: '#3a2a4a', hair: '#e0e0e0' }, lines: ['The Syndicate paid me well to guard this relic.', 'But the dead do not give things back…'], after: 'Take the relic… and let the crypt sleep.', music: 'epic' }); }
  return Object.assign(m, { name: `Hollow Crypt ${f === 1 ? '' : 'Depths'}`.trim(), kind: 'route', biome: 'volcano', music: 'mystic', ci: Math.min(i, 7), dark: true, crypt: true, entry: { x: arrive[0], y: arrive[1] } });
}
function powerPlant(W, i, outside) {
  const m = interior(18, 13, `city${i}`, ...outside); const r = rng(hash(W.id + worldSeed() + 'power' + i));
  for (const y of [3, 6, 9]) for (let x = 2; x < 16; x++) if (x % 5 !== 1) m.set(x, y, T.PC);
  [[3, 2], [14, 5], [8, 8]].forEach(([x, y], k) => { m.set(x, y, T.FLOOR); m.objs.push({ x, y, kind: 'switch', ci: i, sw: k }); });
  [[6, 4, 'right'], [12, 7, 'left'], [4, 10, 'right']].forEach(([x, y, d], k) => m.objs.push(grunt(W, i, x, y, d, `power${i}g${k}`, { lvlUp: 1 })));
  m.objs.push(npc(15, 11, { name: 'Plant Engineer', tips: ['They switched off all three breakers! Flip them back on — the big levers by the turbines.', 'Watch out, the grunts are still guarding them.'] }));
  void r; return Object.assign(m, { name: 'Power Plant', ci: i, cityIdx: i, music: 'lab', dark: true });
}
function mallFloor(W, i, f, outside) {
  const back = `city${i}`; const m = f === 1 ? interior(26, 14, back, ...outside) : grid(26, 14, T.FLOOR);
  if (f > 1) { m.rect(0, 0, 26, 2, T.IWALL); m.rect(0, 13, 26, 1, T.IWALL); m.kind = 'interior'; m.biome = 'interior'; }
  m.rect(0, 0, 1, 14, T.IWALL); m.rect(25, 0, 1, 14, T.IWALL);
  const esc = f === 1 ? [22, 2] : [3, 2]; m.set(esc[0], esc[1], T.STAIRS); m.warps.push({ x: esc[0], y: esc[1], to: `${back}_mall_f${f === 1 ? 2 : 1}`, tx: f === 1 ? 3 : 22, ty: 3, dir: 'down', stairs: true });
  const shop = (x, label, shopId, pal, kind = 'mallshop') => { m.rect(x - 1, 4, 3, 1, T.COUNTER); m.objs.push(npc(x, 3, { kind, shop: shopId, name: label, pal })); m.objs.push({ x: x - 1, y: 2, kind: 'deco', art: 'shopsign', label, decor: true }); };
  if (f === 1) { shop(4, 'Mega Mart', 'mart', { shirt: '#3a7adf' }); shop(9, 'Cube Boutique', 'cubes', { shirt: '#ff4fd8' }); shop(14, 'Food Court', 'food', { shirt: '#ff8a3a', hat: '#ffffff' }); m.rect(11, 8, 4, 2, T.WATER); m.objs.push({ x: 10, y: 9, kind: 'deco', art: 'fountain', decor: true, text: ['The mall fountain. Someone tossed in a Capture Cube for luck.'] }); }
  else { shop(7, 'Disc Electronics', 'tms', { shirt: '#30c0a0' }); shop(13, 'Style Studio', 'style', { shirt: '#c040a0' }, 'stylist'); shop(19, 'Book Nook', 'books', { shirt: '#8a6a40' }); m.objs.push({ x: 20, y: 9, kind: 'cabinet', game: 'blitz', ci: i, label: 'blitz' }, { x: 21, y: 9, kind: 'cabinet', game: 'guess', ci: i, label: 'guess' }); }
  for (let k = 0; k < 3; k++) m.objs.push(npc(5 + k * 6, 10 - (k % 2), { name: ['Shopper', 'Mall Walker', 'Teen'][k], tips: tipLines(W, i, 20 + k + f * 3, 1), wander: true }));
  m.rect(1, 12, 24, 1, f === 1 ? T.FLOOR : T.FLOOR);
  return Object.assign(m, { name: `Skyline Mall ${f}F`, ci: i, cityIdx: i, music: 'neon', entry: f === 1 ? m.entry : { x: esc[0], y: 3 } });
}
// small single-room specials
function special(W, i, kind, outside) {
  const back = `city${i}`; let m; const S = worldSeed(); const name = (n) => n;
  if (kind === 'saloon') { m = interior(14, 10, back, ...outside); m.rect(2, 3, 7, 1, T.COUNTER); m.rect(2, 2, 7, 1, T.SHELF); m.objs.push(npc(5, 2, { kind: 'bartender', name: 'Bartender Dusty', pal: { shirt: '#f0e8d8', hat: '#6a4428', hair: '#5a3a20' } })); for (const [x, y] of [[10, 4], [10, 7], [4, 7]]) m.set(x, y, T.TABLE); m.objs.push({ x: 12, y: 2, kind: 'deco', art: 'piano', decor: true, text: ['The piano plays itself… badly.'] }); m.objs.push(npc(11, 5, { name: 'Cowpoke', tips: ['Sarsaparilla heals up your team. A Prairie Fizz gets you fired up for the next fight!', ...tipLines(W, i, 30, 1)], pal: { hat: '#8a6a3a', shirt: '#b04030' } })); m.objs.push(npc(3, 8, { name: 'Card Shark', tips: ['I don\'t gamble with credits, only with quiz answers. Wanna bet you can\'t name every type?'] , pal: { hat: '#2a2a2a', shirt: '#2a2a2a' } })); m.objs.push(npc(8, 8, { kind: 'quest', qid: `q${i}_s`, name: 'Saloon Regular', pal: { hat: '#6a8a3a', shirt: '#d8b060' } })); m.name = 'Saloon'; m.music = 'bright'; }
  else if (kind === 'sheriff') { m = interior(12, 9, back, ...outside); m.rect(1, 2, 3, 3, T.BARRIER); m.set(7, 4, T.DESK); m.objs.push(npc(7, 3, { kind: 'sheriff', name: 'Sheriff Holt', pal: { hat: '#c8a040', shirt: '#7a5a30', coat: true } })); m.objs.push({ x: 10, y: 2, kind: 'deco', art: 'wanted', decor: true, text: ['WANTED: Kingpin Vex. Last seen climbing a very tall tower.'] }); m.name = "Sheriff's Office"; }
  else if (kind === 'lodge') { m = interior(14, 10, back, ...outside); m.rect(5, 2, 4, 1, T.SHELF); m.objs.push({ x: 7, y: 3, kind: 'deco', art: 'fireplace', decor: true, text: ['A crackling fire. Your Hakma huddle close.'] }); m.rect(2, 5, 2, 2, T.RUG); m.objs.push(npc(11, 3, { kind: 'cocoa', name: 'Lodge Host', pal: { shirt: '#c03030', hat: '#ffffff' } })); m.objs.push(npc(3, 7, { name: 'Ski Instructor', tips: ['Lean into the turns! …That\'s also how I approach exams.', ...tipLines(W, i, 31, 1)], wander: true, pal: { shirt: '#3080e0' } })); m.name = 'Ski Lodge'; m.music = 'calm'; }
  else if (kind === 'cablecar') { m = interior(12, 9, back, ...outside); m.objs.push({ x: 6, y: 2, kind: 'deco', art: 'gondola', decor: true }); m.objs.push(npc(4, 3, { kind: 'cablecar', ci: i, name: 'Cable Car Attendant', pal: { shirt: '#e0a020', hat: '#e0a020' } })); m.name = 'Cable Car Station'; }
  else if (kind === 'fishmarket') { m = interior(14, 9, back, ...outside); m.rect(2, 3, 10, 1, T.COUNTER); m.objs.push(npc(6, 2, { kind: 'mallshop', shop: 'fish', name: 'Fishmonger', pal: { shirt: '#ffffff', hat: '#3a6ad8' } })); m.objs.push(npc(10, 6, { name: 'Old Sailor', tips: ['The sea\'s full of Hakma that never come ashore. Learn to Swim and see for yourself!', ...tipLines(W, i, 32, 1)], wander: true })); m.name = 'Fish Market'; }
  else if (kind === 'aquarium') { m = interior(16, 11, back, ...outside); m.rect(1, 2, 5, 3, T.WATER); m.rect(10, 2, 5, 3, T.WATER); m.rect(5, 7, 6, 2, T.WATER); m.objs.push(npc(8, 4, { name: 'Marine Biologist', tips: ['Water-loving Hakma are often weak to Spark-type moves. Probably. Don\'t quote me.', ...tipLines(W, i, 33, 2)] })); m.objs.push(npc(3, 9, { kind: 'quest', qid: `q${i}_a`, name: 'Aquarium Kid' })); m.name = 'Aquarium'; m.music = 'calm'; }
  else if (kind === 'barn') { m = interior(14, 10, back, ...outside); for (const [x, y] of [[2, 3], [2, 6], [11, 3]]) m.objs.push({ x, y, kind: 'deco', art: 'cow', decor: true, text: ['Moooo.'] }); m.rect(9, 6, 4, 2, T.SHELF); m.objs.push(npc(6, 4, { kind: 'milk', name: 'Farmer Jo', pal: { hat: '#e0c060', shirt: '#3a70c0' } })); m.name = 'Big Red Barn'; }
  else if (kind === 'farmstand') { m = interior(12, 8, back, ...outside); m.rect(2, 3, 8, 1, T.COUNTER); m.objs.push(npc(5, 2, { kind: 'mallshop', shop: 'farm', name: 'Farm Stand Seller', pal: { hat: '#e0c060', shirt: '#5aa040' } })); m.name = 'Farm Stand'; }
  else if (kind === 'museum') { m = interior(16, 11, back, ...outside); const lore = [`${W.legends?.[0]?.name || 'A legend'} sleeps in a lair off Route 3, they say.`, 'The Mastery Halls were founded so knowledge could be tested fairly.', `${W.mythic?.name || 'The mythic one'} is said to rest beneath Origin Town, waiting for a true Master.`, 'Ancient trainers believed Hakma grow fiercer the more you learn together.'];
    [[3, 3], [7, 3], [11, 3], [3, 7]].forEach(([x, y], k) => { m.set(x, y, T.STATUE); m.set(x, y + 1, T.SIGN); m.objs.push({ x, y: y + 1, kind: 'sign', text: [lore[k]] }); }); m.objs.push(npc(12, 7, { kind: 'quest', qid: `q${i}_m`, name: 'Curator', pal: { coat: true, shirt: '#5a4ab0' } })); m.name = 'Museum of History'; m.music = 'mystic'; }
  else if (kind === 'library') { m = interior(14, 10, back, ...outside); for (const y of [2, 4, 6]) { m.rect(1, y, 5, 1, T.SHELF); m.rect(8, y, 5, 1, T.SHELF); } m.objs.push({ x: 6, y: 2, kind: 'lessons', ci: i }); m.objs.push(npc(7, 8, { name: 'Librarian', tips: ['Shh! The lessons on that shelf go from easy to mastery.', ...tipLines(W, i, 34, 3)], pal: { coat: true, hair: '#b0b0c0' } })); m.name = 'Grand Library'; m.music = 'lab'; }
  else if (kind === 'bazaar') { m = interior(14, 9, back, ...outside); for (const x of [2, 6, 10]) { m.rect(x, 3, 3, 1, T.COUNTER); } m.objs.push(npc(3, 2, { kind: 'mallshop', shop: 'bazaar', name: 'Travelling Merchant', pal: { shirt: '#c04020', hat: '#e0a020' } })); m.objs.push(npc(7, 2, { kind: 'mallshop', shop: 'cubes', name: 'Cube Trader', pal: { shirt: '#8a40c0' } })); m.objs.push(npc(11, 2, { name: 'Spice Seller', tips: ['These peppers? Not for Hakma. Trust me.', ...tipLines(W, i, 35, 1)] })); m.name = 'Ember Bazaar'; m.music = 'bright'; }
  else if (kind === 'hotspring') { m = interior(14, 10, back, ...outside); m.rect(3, 3, 8, 4, T.WATER); m.objs.push(npc(12, 3, { kind: 'spring', name: 'Spring Keeper', pal: { shirt: '#ffffff', hair: '#404040' } })); m.name = 'Hot Springs'; m.music = 'calm'; }
  else if (kind === 'vr') { m = interior(14, 10, back, ...outside); m.rect(3, 4, 8, 4, T.GYMFLOOR); m.objs.push(npc(7, 2, { kind: 'vr', ci: i, name: 'VR Operator', pal: { shirt: '#4cf0ff', hat: '#202040' } })); m.name = 'VR Arena'; m.music = 'neon'; }
  else if (kind === 'observatory') { m = interior(12, 10, back, ...outside); m.objs.push({ x: 6, y: 3, kind: 'deco', art: 'telescope', decor: true, scope: true }); m.objs.push(npc(3, 6, { name: 'Astronomer', tips: ['Look through the telescope — you can see the whole region from up here.', ...tipLines(W, i, 36, 2)], pal: { coat: true, shirt: '#202860' } })); m.name = 'Observatory'; m.music = 'mystic'; }
  else if (kind === 'skate') { m = interior(12, 9, back, ...outside); m.rect(2, 3, 6, 1, T.COUNTER); m.objs.push(npc(4, 2, { kind: 'skater', name: 'Skate Shop Owner', pal: { hat: '#ff4fd8', shirt: '#202020' } })); m.objs.push({ x: 9, y: 2, kind: 'deco', art: 'boards', decor: true, text: ['A wall of longboards. They look FAST.'] }); m.name = 'Skate Shop'; m.music = 'neon'; }
  if (!m) return null; void S; void name;
  return Object.assign(m, { ci: i, cityIdx: i });
}
// entry point used by cityInterior(): returns a map or null when the kind isn't one of ours
export function placeInterior(W, i, kind, doorOutside) {
  if (!worldSeed()) return null; const back = `city${i}`; let mm;
  const out = (k) => doorOutside(W, back, k);
  if ((mm = kind.match(/^tower_f(\d)$/))) return towerFloor(W, i, 'tower', +mm[1], SCEN[1].floors, out('watchtower'), 'watch');
  if ((mm = kind.match(/^hq_f(\d)$/))) return towerFloor(W, i, 'hq', +mm[1], SCEN[6].floors, out('hq'), 'hq');
  if ((mm = kind.match(/^cave_b(\d)$/))) return caveLevel(W, i, +mm[1], SCEN[3].floors, out('cavemouth'));
  if ((mm = kind.match(/^crypt_f(\d)$/))) return cryptLevel(W, i, +mm[1], SCEN[5].floors, out('crypt'));
  if ((mm = kind.match(/^mall_f(\d)$/))) return mallFloor(W, i, +mm[1], out('mall'));
  if (kind === 'power') return powerPlant(W, i, out('power'));
  const a = archOf(W, i); if (a && a.uniques.some((u) => u[0] === kind)) return special(W, i, kind, out(kind));
  return null;
}
export const placesConnected = connected;
