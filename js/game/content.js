// Turns a topic pack (plain data) into a playable world: species, stats, moves, question pools, trainers.
import { TOPICS } from '../content/index.js';
import { GEN } from '../content/generators.js';
import { EXAMPLES } from '../content/examples/index.js';
import { hash, rng, R, shuffle, clamp } from '../core/rng.js';

export const BIOME_ORDER = ['meadow', 'coast', 'forest', 'desert', 'snow', 'volcano', 'crystal', 'neon'];
const TYPE_BIAS = { flux: { atk: 1.25, spd: 1.05 }, structure: { def: 1.3, hp: 1.05 }, spark: { spd: 1.3, atk: 1.05 }, data: { hp: 1.3 }, logic: { spd: 1.1, def: 1.1 }, cipher: { atk: 1.15, spd: 1.15 } };
const FIRST = ['Ari', 'Bea', 'Cal', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivo', 'Jun', 'Kai', 'Lio', 'Mara', 'Nico', 'Oli', 'Pia', 'Quin', 'Rae', 'Sol', 'Tess', 'Uma', 'Vic', 'Wren', 'Xan', 'Yuki', 'Zed', 'Ines', 'Omar', 'Lena', 'Ravi', 'Noor', 'Theo', 'Mei', 'Ayo', 'Sana', 'Bo'];
const CLASSES = { tech: ['Intern', 'Junior Dev', 'Analyst', 'SRE', 'Ops Ranger', 'Architect', 'Researcher', 'Hacker', 'Tech Lead'], school: ['Student', 'Bookworm', 'Tutor', 'Scout', 'Scholar', 'Lab Tech', 'Explorer', 'Prodigy', 'Mentor'] };

const worlds = {};
export const topics = () => TOPICS;
export function getWorld(topicId) {
  if (worlds[topicId]) return worlds[topicId];
  const t = TOPICS.find((x) => x.id === topicId);
  if (!t) throw new Error('Unknown topic ' + topicId);
  return (worlds[topicId] = buildWorld(t));
}

function buildWorld(t) {
  const EX = EXAMPLES[t.id] || {};
  const W = { topic: t, id: t.id, species: {}, lines: [], cities: [], qIndex: {}, terms: [], recent: [] };
  // ---- species: hand-made lines + one generated line per glossary term (~150 species per world)
  const mons = t.mons.map((m) => [...m]).concat(termLines(t));
  mons.forEach((ln, li) => {
    const [names, type, concept, moves, dex, meta] = ln;
    const stages = names.length; const line = { li, names, type, concept, ids: [], route: meta?.route, termKey: meta?.termKey };
    const lineSeed = hash(t.id + ':' + names[0]);
    const totals = stages === 3 ? [290, 400, 525] : stages === 2 ? [325, 480] : [470];
    const evo = stages === 3 ? [16, 34] : stages === 2 ? [24] : [];
    names.forEach((nm, si) => {
      const id = li + '.' + si; const r = rng(hash(t.id + nm));
      const bias = TYPE_BIAS[type] || {};
      const w = { hp: (bias.hp || 1) * (0.8 + r() * 0.4), atk: (bias.atk || 1) * (0.8 + r() * 0.4), def: (bias.def || 1) * (0.8 + r() * 0.4), spd: (bias.spd || 1) * (0.8 + r() * 0.4) };
      const sum = w.hp + w.atk + w.def + w.spd; const tot = totals[si] * (li < 3 ? 1.06 : 1);
      const base = {}; for (const k in w) base[k] = Math.round((w[k] / sum) * tot);
      const mv = [
        { name: moves[0], power: 40, type, kind: 'hit', lvl: 1 },
        { name: moves[1], power: 0, type: 'normal', kind: 'boost', lvl: 1 },
        { name: moves[2], power: 65, type, kind: 'hit', lvl: 12 },
        { name: moves[3], power: 95, type, kind: 'hit', lvl: 28 },
      ];
      W.species[id] = { id, name: nm, type, concept, li, stage: si, stages, base, moves: mv, evolveAt: evo[si] || null, next: si < stages - 1 ? li + '.' + (si + 1) : null, seed: hash(t.id + nm + 'v'), lineSeed, uidKey: t.id + id, dex: dex || null };
      line.ids.push(id);
    });
    W.lines.push(line);
  });
  W.starters = [0, 1, 2].filter((i) => W.lines[i]).map((i) => W.lines[i].ids[0]);
  const wild = W.lines.slice(3).filter((l) => !l.route);
  wild.forEach((l, k) => { l.route = 1 + Math.floor((k * 9) / Math.max(1, wild.length)); });
  // ---- cities, terms, questions
  t.cities.forEach((c, ci) => {
    const city = { ...c, ci, pool: [], terms: [], gen: c.gen || [] };
    (c.terms || []).forEach(([term, def], k) => { const T = { id: `t${ci}.${k}`, term, def, ci, ex: (EX[term] || []) }; city.terms.push(T); W.terms.push(T); });
    (c.qs || []).forEach((q, k) => { const Q = { id: `q${ci}.${k}`, q: q[0], a: q[1], wrong: q.slice(2, -1).filter(Boolean), expl: q[q.length - 1], ci }; city.pool.push(Q); W.qIndex[Q.id] = Q; });
    W.cities.push(city);
  });
  // term-derived questions (need at least 4 terms in reach)
  W.cities.forEach((city, ci) => {
    const near = W.terms.filter((x) => Math.abs(x.ci - ci) <= 1);
    city.terms.forEach((T, k) => {
      const others = shuffle(near.filter((x) => x.id !== T.id), rng(hash(T.id)));
      if (others.length < 3) return;
      const sameCity = others.filter((x) => x.ci === ci); const pickFrom = (sameCity.length >= 3 ? sameCity : others).slice(0, 3);
      const Q1 = { id: T.id + 'd', q: `What best describes "${T.term}"?`, a: T.def, wrong: pickFrom.map((x) => x.def), expl: `${T.term}: ${T.def}`, ci, term: true };
      const Q2 = { id: T.id + 'r', q: `Which term matches: "${T.def}"`, a: T.term, wrong: pickFrom.map((x) => x.term), expl: `${T.term}: ${T.def}`, ci, term: true };
      city.pool.push(Q1, Q2); W.qIndex[Q1.id] = Q1; W.qIndex[Q2.id] = Q2;
    });
  });
  for (const l of W.lines) if (l.termKey) { const T = W.terms.find((x) => x.ci + ':' + x.term === l.termKey); if (T) { l.termId = T.id; for (const id of l.ids) W.species[id].termId = T.id; } }
  W.finalPool = (t.final || []).map((q, k) => { const Q = { id: `f.${k}`, q: q[0], a: q[1], wrong: q.slice(2, -1).filter(Boolean), expl: q[q.length - 1], ci: 8 }; W.qIndex[Q.id] = Q; return Q; });
  // ---- league
  const cat = t.cat === 'tech' ? 'tech' : 'school';
  W.classes = CLASSES[cat];
  const eliteTypes = ['logic', 'cipher', 'spark', 'flux'];
  W.elite = (t.elite || eliteTypes.map((ty, i) => ({ name: FIRST[(hash(t.id + i) % FIRST.length)], title: 'Council ' + ['Sage', 'Warden', 'Oracle', 'Vanguard'][i], type: ty }))).slice(0, 4);
  W.champion = t.champion || { name: 'Astra', title: 'Grand Master' };
  W.region = t.region || 'Hakma Region';
  W.profName = t.prof || 'Professor Lumen';

  // ---- helpers
  W.speciesFor = (li, lvl) => { const l = W.lines[li]; let id = l.ids[0]; for (const sid of l.ids) { const sp = W.species[sid]; id = sid; if (!sp.evolveAt || lvl < sp.evolveAt) break; } return id; };
  W.routeLines = (r) => { let pool = W.lines.filter((l) => l.route && l.route <= r && l.route >= r - 2).map((l) => l.li); if (!pool.length) pool = W.lines.filter((l) => l.route).map((l) => l.li); if (!pool.length) pool = [0, 1, 2]; return pool; };
  W.routeLevels = (r) => { const lo = 2 + (r - 1) * 6; return [lo, lo + 3]; };
  W.leaderLevel = (ci) => 8 + ci * 6;
  W.trainerName = (seed) => { const r = rng(seed); return { cls: r.pick(W.classes), name: r.pick(FIRST) }; };
  W.makeTeam = (seed, lines, n, lvl) => { const r = rng(seed); const out = []; for (let i = 0; i < n; i++) { const li = r.pick(lines); const L = clamp(lvl - (n - 1 - i) * 2 + r.int(-1, 1), 2, 100); out.push({ sp: W.speciesFor(li, L), lvl: L }); } return out; };
  W.leaderTeam = (ci) => {
    const city = W.cities[ci]; const L = W.leaderLevel(ci); const n = Math.min(2 + Math.floor(ci / 2), 5);
    let lines = W.lines.filter((l) => l.type === city.type && l.li >= 3).map((l) => l.li);
    const rl = W.routeLines(ci + 1); if (lines.length < 2) lines = lines.concat(rl);
    return W.makeTeam(hash(t.id + 'leader' + ci), lines, n, L);
  };
  W.pickQ = (ci, save, opt = {}) => pickQuestion(W, ci, save, opt);
  return W;
}

function fresh(Q) {
  const opts = shuffle([Q.a, ...Q.wrong]);
  return { id: Q.id, q: Q.q, opts, answer: opts.indexOf(Q.a), expl: Q.expl, ci: Q.ci, a: Q.a };
}
function pickQuestion(W, ci, save, opt) {
  const final = ci === 'final' || ci >= 8;
  const maxC = final ? 7 : clamp(ci, 0, 7);
  // 1) spaced review of previously missed questions
  if (save && save.missed && save.missed.length && R() < (opt.review ?? 0.22)) {
    const cand = save.missed.filter((id) => W.qIndex[id] && W.qIndex[id].ci <= maxC + (final ? 1 : 0) && !W.recent.includes(id));
    if (cand.length) { const id = R.pick(cand); W.recent.push(id); W.recent = W.recent.slice(-10); return { ...fresh(W.qIndex[id]), review: true }; }
  }
  if (final && W.finalPool.length && R() < 0.45) { const pool = W.finalPool.filter((q) => !W.recent.includes(q.id)); const Q = R.pick(pool.length ? pool : W.finalPool); W.recent.push(Q.id); W.recent = W.recent.slice(-10); return fresh(Q); }
  let c = maxC;
  if (final) c = R.int(0, 7); else if (opt.mix !== false && maxC > 0 && R() < 0.25) c = R.int(0, maxC - 1);
  const city = W.cities[c];
  if (city.gen.length && (R() < 0.6 || !city.pool.length)) {
    const g = GEN[R.pick(city.gen)];
    if (g) { const [q, a, w1, w2, w3, expl] = g(R); const wrong = [...new Set([w1, w2, w3].map(String))].filter((x) => x !== String(a)); const Q = { id: 'gen', q, a: String(a), wrong, expl, ci: c }; return fresh(Q); }
  }
  const handFirst = city.pool.filter((q) => !q.term && !W.recent.includes(q.id));
  const all = city.pool.filter((q) => !W.recent.includes(q.id));
  const pool = handFirst.length && R() < 0.55 ? handFirst : all.length ? all : city.pool;
  const Q = R.pick(pool);
  W.recent.push(Q.id); W.recent = W.recent.slice(-10);
  return fresh(Q);
}

// ------------------------------------------------------------ generated monsters from glossary terms
const SUFFIX = [['let', 'ling', 'kin', 'bit', 'pip', 'ix', 'ette', 'ipup'], ['ore', 'ex', 'ara', 'on', 'ite', 'oid', 'ark', 'ox'], ['zilla', 'tron', 'saur', 'naut', 'gon', 'rex', 'lord', 'mancer', 'titan', 'wyrm']];
const MOVES = {
  logic: [['Logic Jab', 'Bit Shift', 'Proof Beam', 'Recursion Ray'], ['Focus Loop', 'Think Ahead', 'Optimise', 'Deduce'], ['Branch Strike', 'Algorithm Arc', 'Theorem Lance', 'Inference Storm']],
  cipher: [['Hash Nip', 'Salt Spray', 'Obfuscate', 'Masked Swipe'], ['Encrypt', 'Shroud', 'Key Rotate', 'Veil'], ['Rune Lash', 'Shadow Key', 'Zero-Day Fang', 'Cipher Nova']],
  spark: [['Static Zap', 'Signal Ping', 'Volt Tap', 'Pulse'], ['Charge Up', 'Overclock', 'Amplify', 'Energise'], ['Arc Flash', 'Thunder Bus', 'Surge Strike', 'Lightning Lattice']],
  data: [['Byte Bite', 'Record Toss', 'Leaf Packet', 'Sample'], ['Cache', 'Index', 'Replicate', 'Grow'], ['Data Deluge', 'Query Quake', 'Bloom Burst', 'Stream Torrent']],
  structure: [['Block Bash', 'Brick Toss', 'Frame Slam', 'Pebble Pack'], ['Fortify', 'Reinforce', 'Scaffold', 'Brace'], ['Foundation Fall', 'Pillar Crush', 'Bedrock Breaker', 'Monolith Drop']],
  flux: [['Ember Flick', 'Flow Kick', 'Drift', 'Spark Kindle'], ['Heat Up', 'Accelerate', 'Adapt', 'Momentum'], ['Flux Flare', 'Phase Shift', 'Torrent Blaze', 'Entropy Inferno']],
};
const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase();
function rootOf(term) {
  const words = term.replace(/\(.*?\)/g, '').replace(/[^A-Za-z ]/g, ' ').split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return 'Glyph';
  let r;
  if (words.length >= 2) r = words[0].slice(0, Math.min(4, words[0].length)) + words[1].slice(0, 3).toLowerCase();
  else { const w = words[0]; r = w.length <= 5 ? w : w.slice(0, 5); }
  r = r.replace(/[aeiou]{2,}$/i, (m) => m[0]);
  return cap(r);
}
function termLines(t) {
  const used = new Set(t.mons.flatMap((m) => m[0].map((n) => n.toLowerCase())));
  const concepts = new Set(t.mons.map((m) => String(m[2]).toLowerCase()));
  const out = []; let total = t.mons.reduce((a, m) => a + m[0].length, 0);
  const cand = (t.cities || []).reduce((a, c) => a + (c.terms || []).filter(([term]) => !concepts.has(term.toLowerCase())).length, 0);
  const avg = Math.max(1, Math.min(3, (150 - total) / Math.max(1, cand)));
  (t.cities || []).forEach((c, ci) => (c.terms || []).forEach(([term, def], k) => {
    if (total >= 150 || concepts.has(term.toLowerCase())) return;
    const h = hash(t.id + term); const stages = Math.max(1, Math.min(3, 150 - total, Math.floor(avg) + ((h % 1000) / 1000 < avg % 1 ? 1 : 0))); const root = rootOf(term);
    const names = [];
    for (let s = 0; s < stages; s++) {
      const tier = stages === 1 ? 1 + (h % 2) : stages === 2 ? s * 2 : s; const pool = SUFFIX[tier];
      let n, j = 0; do { n = root + pool[(h + s * 7 + j) % pool.length]; j++; } while (used.has(n.toLowerCase()) && j < 30);
      used.add(n.toLowerCase()); names.push(n);
    }
    const type = c.type || 'logic'; const M = MOVES[type] || MOVES.logic; const r = rng(h);
    const moves = [M[0][r.int(0, 3)], M[1][r.int(0, 3)], M[2][r.int(0, 3)], M[2][(r.int(0, 3) + 1) % 4] + '!'].map((x, i) => (i === 3 ? x.replace('!', '') + ' Max' : x));
    moves[3] = `${root} ${['Overdrive', 'Nova', 'Cascade', 'Finale', 'Surge'][h % 5]}`;
    out.push([names, type, term, moves, def, { route: ci + 1, termKey: ci + ':' + term }]);
    total += stages;
  }));
  return out;
}
