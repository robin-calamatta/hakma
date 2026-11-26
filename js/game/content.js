import { genreMoves, genreOf } from '../content/types.js';
// Turns a topic pack (plain data) into a playable world: species, stats, moves, question pools, trainers.
import { TOPICS } from '../content/index.js';
import { GEN } from '../content/generators.js';
import '../content/gen-extra.js';
import { EXAMPLES } from '../content/examples/index.js';
import { DEEP, DEEP_META } from '../content/deep/all.js';
import { MATH_MISTAKES, MATH_MISTAKE_GEN, mistakeQuestions } from '../content/mistakes.js';
import { hash, rng, R, shuffle, clamp } from '../core/rng.js';

export const BIOME_ORDER = ['meadow', 'coast', 'forest', 'desert', 'snow', 'volcano', 'crystal', 'neon'];
const TYPE_BIAS = { flux: { atk: 1.25, spd: 1.05 }, structure: { def: 1.3, hp: 1.05 }, spark: { spd: 1.3, atk: 1.05 }, data: { hp: 1.3 }, logic: { spd: 1.1, def: 1.1 }, cipher: { atk: 1.15, spd: 1.15 } };
const FIRST = ['Ari', 'Bea', 'Cal', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivo', 'Jun', 'Kai', 'Lio', 'Mara', 'Nico', 'Oli', 'Pia', 'Quin', 'Rae', 'Sol', 'Tess', 'Uma', 'Vic', 'Wren', 'Xan', 'Yuki', 'Zed', 'Ines', 'Omar', 'Lena', 'Ravi', 'Noor', 'Theo', 'Mei', 'Ayo', 'Sana', 'Bo'];
const CLASSES = { tech: ['Intern', 'Junior Dev', 'Analyst', 'SRE', 'Ops Ranger', 'Architect', 'Researcher', 'Hacker', 'Tech Lead'], school: ['Student', 'Bookworm', 'Tutor', 'Scout', 'Scholar', 'Lab Tech', 'Explorer', 'Prodigy', 'Mentor'] };

const worlds = {};
export const topics = () => TOPICS;
// per-save seed: reshuffles which wild Hakma live where, their rarities and the legend names (empty = legacy)
let CSEED = '';
export function setContentSeed(s) { CSEED = s || ''; }
function shuffleSeeded(arr, seed) { const r = rng(seed); const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export function getWorld(topicId) {
  const key = topicId + '|' + CSEED; if (worlds[key]) return worlds[key];
  const t = TOPICS.find((x) => x.id === topicId);
  if (!t) throw new Error('Unknown topic ' + topicId);
  return (worlds[key] = buildWorld(t));
}

export const RARITY = {
  common: { name: 'Common', stars: 1, color: '#b8c0cc', stat: 1, catch: 1 },
  uncommon: { name: 'Uncommon', stars: 2, color: '#5fd068', stat: 1.05, catch: 0.9 },
  rare: { name: 'Rare', stars: 3, color: '#4aa8ff', stat: 1.1, catch: 0.75 },
  epic: { name: 'Epic', stars: 4, color: '#b36bff', stat: 1.18, catch: 0.55 },
  legendary: { name: 'Legendary', stars: 5, color: '#ffb020', stat: 1, catch: 0.3 },
  mythic: { name: 'Mythic', stars: 6, color: '#ff5fd2', stat: 1, catch: 0.2 },
};
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
  const wildOrder = CSEED ? shuffleSeeded(wild, hash(t.id + CSEED + 'wild')) : wild;
  wildOrder.forEach((l, k) => { l.route = 1 + Math.floor((k * 9) / Math.max(1, wild.length)); });
  // ---- rarity tiers: common · uncommon · rare · epic (wild), legendary and mythic (hidden lairs only)
  W.lines.forEach((l) => {
    const x = rng(hash(t.id + CSEED + l.names[0] + 'rarity'))(); l.rarity = l.li < 3 ? 'rare' : x < 0.48 ? 'common' : x < 0.76 ? 'uncommon' : x < 0.92 ? 'rare' : 'epic';
    for (const id of l.ids) { const sp = W.species[id]; sp.rarity = l.rarity; const mul = RARITY[l.rarity].stat; for (const k in sp.base) sp.base[k] = Math.round(sp.base[k] * mul); }
  });
  W.legends = []; const lairCities = [1, 3, 5, 7]; const SUF = ['oros', 'arch', 'aeon', 'thrax', 'astra'];
  const mkLegend = (name, type, title, concept, rarity, lair) => {
    const li = W.lines.length; const id = li + '.0'; const r = rng(hash(t.id + name));
    const M = genreMoves(genreOf(t), type) || MOVES[type] || MOVES.logic; const tot = rarity === 'mythic' ? 690 : 610;
    const w = { hp: 0.9 + r() * 0.3, atk: 0.9 + r() * 0.3, def: 0.9 + r() * 0.3, spd: 0.9 + r() * 0.3 }; const sum = w.hp + w.atk + w.def + w.spd; const base = {}; for (const k in w) base[k] = Math.round((w[k] / sum) * tot);
    const mv = [{ name: M[2][0], power: 60, type, kind: 'hit', lvl: 1 }, { name: M[1][1], power: 0, type: 'normal', kind: 'boost', lvl: 1 }, { name: M[2][1], power: 90, type, kind: 'hit', lvl: 1 }, { name: `${name.replace(/(ion|on|ix|ox|rax|or|ra|th|yx|ine|a|ex|os|is|e|rn|ke)$/, '')} ${rarity === 'mythic' ? 'Genesis' : 'Ascension'}`, power: 120, type, kind: 'hit', lvl: 1 }];
    W.species[id] = { id, name, type, concept, li, stage: 0, stages: 1, base, moves: mv, evolveAt: null, next: null, seed: hash(t.id + name + 'v'), lineSeed: hash(t.id + ':' + name), uidKey: t.id + id, dex: `${title}. ${rarity === 'mythic' ? 'A mythic being said to embody all of ' + t.name + '.' : 'A legendary guardian that appears only to the most curious explorers.'}`, rarity, title, lair };
    W.lines.push({ li, names: [name], type, concept, ids: [id], rarity, legend: true }); if (rarity === 'legendary') W.legends.push(id); return id;
  };
  const LEG = ['Aetherion', 'Solgaron', 'Nyxaroth', 'Valkyra', 'Thundrake', 'Glaciorn', 'Pyrolith', 'Seraphex', 'Chronyx', 'Umbralith', 'Zephyros', 'Astraeon', 'Vortexa', 'Lumenor', 'Obsidrax', 'Celestine', 'Tempestor', 'Nebularch', 'Quasarion', 'Titanox', 'Draconis', 'Aurorix']; const MYT = ['Omniversa', 'Genesix', 'Infinitor', 'Primordia', 'Aeonyx', 'Eternara']; const used2 = new Set(Object.values(W.species).map((x) => x.name));
  lairCities.forEach((ci, k) => { const c = t.cities[ci]; const term = (c.terms[c.terms.length - 1] || [c.theme])[0]; let j = hash(t.id + CSEED + 'leg' + k) % LEG.length; while (used2.has(LEG[j])) j = (j + 1) % LEG.length; const name = LEG[j]; used2.add(name);
    mkLegend(name, c.type || 'logic', `Guardian of ${c.theme}`, term, 'legendary', k); });
  W.mythic = mkLegend(MYT[hash(t.id + CSEED + 'myth') % MYT.length], t.cities[7].type || 'flux', `Sovereign of ${t.name}`, t.name, 'mythic', 4);
  // weighted wild pick: rarer lines appear less often (and more often in hidden places)
  W.pickWild = (lines, R, boost = 0) => { const wts = lines.map((li) => { const rr = W.lines[li].rarity; return rr === 'common' ? 50 - boost * 25 : rr === 'uncommon' ? 28 : rr === 'rare' ? 14 + boost * 10 : rr === 'epic' ? 5 + boost * 8 : 1; }); let x = R() * wts.reduce((a, b) => a + Math.max(1, b), 0); for (let i = 0; i < lines.length; i++) { x -= Math.max(1, wts[i]); if (x <= 0) return lines[i]; } return lines[lines.length - 1]; };
  // ---- cities, terms, questions
  const D = DEEP[t.id] || []; W.meta = DEEP_META[t.id] || {};
  t.cities.forEach((c, ci) => {
    const d = D[ci] || {};
    const city = { ...c, ci, pool: [], terms: [], gen: [...(c.gen || []), ...(d.gen || [])], lessons: d.lessons || [], vocab: [], conj: d.conj || [], cloze: [] };
    const tl = [...(c.terms || []).map((x, k) => [x[0], x[1], k < 5 ? 1 : 2]), ...(d.terms || []).map((x) => [x[0], x[1], x[2] || 2])];
    tl.forEach(([term, def, lvl], k) => { const T = { id: `t${ci}.${k}`, term, def, ci, lvl, ex: (EX[term] || []) }; city.terms.push(T); W.terms.push(T); });
    (c.qs || []).forEach((q, k) => { const Q = { id: `q${ci}.${k}`, q: q[0], a: q[1], wrong: q.slice(2, -1).filter(Boolean), expl: q[q.length - 1], ci, lvl: k < 2 ? 1 : 2 }; city.pool.push(Q); W.qIndex[Q.id] = Q; });
    (d.qs || []).forEach((q, k) => { const [lvl, qq, a, ...rest] = q; const Q = { id: `d${ci}.${k}`, q: qq, a, wrong: rest.slice(0, -1).filter(Boolean), expl: rest[rest.length - 1], ci, lvl }; city.pool.push(Q); W.qIndex[Q.id] = Q; });
    (d.vocab || []).forEach((v, k) => city.vocab.push({ id: `v${ci}.${k}`, w: v[0], en: v[1], lvl: v[2] || 1, note: v[3] || '' }));
    (d.cloze || []).forEach((q, k) => { const [lvl, s, a, ...rest] = q; city.cloze.push({ id: `c${ci}.${k}`, s, a, wrong: rest.slice(0, 3), expl: rest[3] || '', lvl }); });
    W.cities.push(city);
  });
  // "find the mistake" questions: hand-written ones join the city pools (so missed ones come back for review), maths ones are generated
  W.cities.forEach((city) => { city.mistakes = []; city.mgen = (MATH_MISTAKE_GEN[t.id] || [])[city.ci] || []; });
  mistakeQuestions(t.id).forEach((m, k) => { const city = W.cities[Math.min(m.ci, W.cities.length - 1)]; const [q, a, w1, w2, w3, expl] = m.t; const Q = { id: `m${city.ci}.${k}`, q, a, wrong: [w1, w2, w3], expl, ci: city.ci, mistake: true, lvl: 2 }; city.mistakes.push(Q); W.qIndex[Q.id] = Q; });
  // term-derived questions (need at least 4 terms in reach)
  W.cities.forEach((city, ci) => {
    const near = W.terms.filter((x) => Math.abs(x.ci - ci) <= 1);
    city.terms.forEach((T, k) => {
      const others = shuffle(near.filter((x) => x.id !== T.id), rng(hash(T.id)));
      if (others.length < 3) return;
      const sameCity = others.filter((x) => x.ci === ci); const pickFrom = (sameCity.length >= 3 ? sameCity : others).slice(0, 3);
      const Q1 = { id: T.id + 'd', q: `What best describes "${T.term}"?`, a: T.def, wrong: pickFrom.map((x) => x.def), expl: `${T.term}: ${T.def}`, ci, term: true, lvl: T.lvl };
      const Q2 = { id: T.id + 'r', q: `Which term matches: "${T.def}"`, a: T.term, wrong: pickFrom.map((x) => x.term), expl: `${T.term}: ${T.def}`, ci, term: true, lvl: Math.min(3, T.lvl + 1) };
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
    let lines = W.lines.filter((l) => l.type === city.type && l.li >= 3 && !l.legend).map((l) => l.li);
    const rl = W.routeLines(ci + 1); if (lines.length < 2) lines = lines.concat(rl);
    return W.makeTeam(hash(t.id + 'leader' + ci), lines, n, L);
  };
  W.pickQ = (ci, save, opt = {}) => nextQuestion(save, () => pickQuestion(W, ci, save, opt));
  return W;
}

function fresh(Q) {
  const opts = shuffle([Q.a, ...Q.wrong]);
  return { id: Q.id, q: Q.q, opts, answer: opts.indexOf(Q.a), expl: Q.expl, ci: Q.ci, a: Q.a, lvl: Q.lvl, say: Q.say, sayLang: Q.sayLang, regen: Q.regen };
}
// Difficulty ramp: each city starts easy and climbs to mastery as you answer its questions correctly.
export function levelFor(save, ci) {
  const pc = save?.stats?.perCity?.[String(ci)]; const c = pc ? pc.c : 0;
  let l = c < 8 ? 1 : c < 24 ? 2 : 3; if (save?.badges?.[ci]) l = Math.max(l, 2); if (save?.champion) l = 3; return l;
}
// Global guard against seeing the same question text again too soon (covers
// generated, vocab and era questions too). History is kept in the save so it
// survives reloads.
const qKey = (q) => String(q?.q || '').replace(/^⏳\s*/, '').trim().toLowerCase().slice(0, 90);
export function recentlyAsked(save, q) { const k = qKey(q); return !!k && !!save?.qHist?.includes(k); }
export function noteAsked(save, q) { if (!save) return; const k = qKey(q); if (!k) return; const h = (save.qHist || []).filter((x) => x !== k); h.push(k); save.qHist = h.slice(-60); }
export function nextQuestion(save, get, tries = 16) {
  // Draw until we find one not seen recently; if every draw is recent, use the one asked longest ago.
  const H = save?.qHist || []; let best = null, bestAge = -1;
  for (let n = 0; n <= tries; n++) {
    const q = get(); if (!q) continue; if (q.echo) { best = q; break; }
    const at = H.lastIndexOf(qKey(q)); const age = at < 0 ? Infinity : H.length - at;
    if (age > bestAge) { best = q; bestAge = age; } if (age === Infinity || age > 25) break;
  }
  noteAsked(save, best); return best;
}
export const LEVEL_NAME = ['', 'Easy', 'Medium', 'Mastery'];
const pickLv = (arr, lvl, recent = []) => {
  const ok = arr.filter((x) => (x.lvl || 1) <= lvl && !recent.includes(x.id)); let src = ok.length ? ok : arr.filter((x) => (x.lvl || 1) <= lvl);
  if (!ok.length && src.length > 1) { const age = (x) => recent.lastIndexOf(x.id); src = src.slice().sort((a, b) => age(a) - age(b)).slice(0, Math.max(1, Math.ceil(src.length / 3))); return R.pick(src); }
  if (!src.length) return null; const top = src.filter((x) => (x.lvl || 1) === lvl);
  return R.pick(top.length && R() < 0.6 ? top : src);
};
const remember = (W, id) => { W.recent.push(id); W.recent = W.recent.slice(-40); };
const otherVocab = (W, city, v, n = 3) => { let pool = city.vocab.filter((x) => x.id !== v.id && x.en !== v.en && x.w !== v.w); if (pool.length < n) pool = pool.concat(W.cities.flatMap((c) => c.vocab).filter((x) => x.id !== v.id && x.en !== v.en && x.w !== v.w)); return shuffle(pool).slice(0, n); };
export function vocabQ(W, city, lvl, dir) {
  const v = pickLv(city.vocab, lvl, W.recent); if (!v) return null; remember(W, v.id); const o = otherVocab(W, city, v); if (o.length < 3) return null;
  const lang = W.topic.name; const note = v.note ? ` (${v.note})` : '';
  dir = dir || (R() < 0.5 ? 'to' : 'from');
  if (dir === 'from') return { id: 'gen', q: `What does «${v.w}» mean?`, a: v.en, wrong: o.map((x) => x.en), expl: `${v.w} = ${v.en}${note}`, ci: city.ci, lvl: v.lvl, say: v.w, sayLang: W.meta.speech };
  return { id: 'gen', q: `How do you say “${v.en}” in ${lang}?`, a: v.w, wrong: o.map((x) => x.w), expl: `${v.en} = ${v.w}${note}`, ci: city.ci, lvl: v.lvl, say: v.w, sayLang: W.meta.speech, sayAfter: true };
}
export function conjQ(W, city, lvl) {
  const sets = city.conj.filter((c) => (c.lvl || 1) <= lvl); if (!sets.length) return null; const set = R.pick(sets); const [inf, en, forms] = R.pick(set.verbs);
  const P = W.meta.pronouns || []; const i = R.int(0, forms.length - 1); const a = forms[i]; const wrong = shuffle([...new Set(forms.filter((f) => f !== a))]).slice(0, 3);
  if (wrong.length < 3) return null;
  return { id: 'gen', q: `${set.tense}: ${P[i] || ''} ___  (${inf} — ${en})`, a, wrong, expl: `${inf} (${set.tense.toLowerCase()}): ${forms.map((f, k) => `${P[k] || ''} ${f}`).join(' · ')}`, ci: city.ci, lvl: set.lvl || 1, say: `${(P[i] || '').split('/')[0]} ${a}`, sayLang: W.meta.speech };
}
export function clozeQ(W, city, lvl) {
  const c = pickLv(city.cloze, lvl, W.recent); if (!c) return null; remember(W, c.id);
  return { id: c.id, q: `Fill the blank: ${c.s}`, a: c.a, wrong: c.wrong, expl: c.expl || c.s.replace('___', c.a), ci: city.ci, lvl: c.lvl, say: c.s.replace('___', c.a), sayLang: W.meta.speech, sayAfter: true };
}
function pickQuestion(W, ci, save, opt) {
  const final = ci === 'final' || ci >= 8;
  const maxC = final ? 7 : clamp(ci, 0, 7);
  // 1) spaced review of previously missed questions
  if (save && save.missed && save.missed.length && R() < (opt.review ?? 0.22)) {
    const cand = save.missed.filter((id) => W.qIndex[id] && W.qIndex[id].ci <= maxC + (final ? 1 : 0) && !W.recent.includes(id));
    if (cand.length) { const id = R.pick(cand); remember(W, id); return { ...fresh(W.qIndex[id]), review: true }; }
  }
  if (final && W.finalPool.length && R() < 0.45) { const pool = W.finalPool.filter((q) => !W.recent.includes(q.id)); const Q = R.pick(pool.length ? pool : W.finalPool); remember(W, Q.id); return fresh(Q); }
  let c = maxC;
  if (final) c = R.int(0, 7); else if (opt.mix !== false && maxC > 0 && R() < 0.25) c = R.int(0, maxC - 1);
  const city = W.cities[c];
  const lvl = clamp((opt.lvl ?? (final ? 3 : levelFor(save, c))) + (opt.boost || 0), 1, 3);
  // ~1 in 6 questions is a "find the mistake" one (from medium difficulty up)
  if (lvl >= 2 && (city.mistakes?.length || city.mgen?.length) && R() < 0.17) {
    const useGen = city.mgen.length && (!city.mistakes.length || R() < 0.6);
    if (useGen) { const mk = MATH_MISTAKES[R.pick(city.mgen)]; const make = () => { const [q, a, w1, w2, w3, expl] = mk(R); return { id: 'gen', q, a: String(a), wrong: [w1, w2, w3].map(String), expl, ci: c, lvl }; }; return fresh({ ...make(), regen: make }); }
    const pool = city.mistakes.filter((Q) => !W.recent.includes(Q.id)); if (pool.length) { const Q = R.pick(pool); remember(W, Q.id); return fresh(Q); }
  }
  // languages: vocabulary, conjugation and fill-the-blank drills
  if (city.vocab.length || city.conj.length || city.cloze.length) {
    const r = R(); let Q = null;
    let mk = null;
    if (city.conj.length && r < 0.18) mk = () => conjQ(W, city, lvl);
    else if (city.cloze.length && r < 0.32) mk = () => clozeQ(W, city, lvl);
    else if (city.vocab.length && r < 0.62) mk = () => vocabQ(W, city, lvl);
    if (mk) Q = mk();
    if (Q) return fresh({ ...Q, regen: mk });
  }
  if (city.gen.length && (R() < (city.pool.length > 30 ? 0.4 : 0.6) || !city.pool.length)) {
    const g = GEN[R.pick(city.gen)];
    if (g) { const make = () => { const [q, a, w1, w2, w3, expl] = g(R, lvl); const wrong = [...new Set([w1, w2, w3].map(String))].filter((x) => x !== String(a)); return { id: 'gen', q, a: String(a), wrong, expl, ci: c, lvl }; }; return fresh({ ...make(), regen: make }); }
  }
  const hand = city.pool.filter((q) => !q.term); const useHand = hand.length && R() < 0.6;
  const Q = pickLv(useHand ? hand : city.pool, lvl, W.recent) || R.pick(city.pool);
  remember(W, Q.id);
  return fresh(Q);
}

// ------------------------------------------------------------ generated Hakma from glossary terms
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
    const type = c.type || 'logic'; const M = genreMoves(genreOf(t), type) || MOVES[type] || MOVES.logic; const r = rng(h);
    const moves = [M[0][r.int(0, 3)], M[1][r.int(0, 3)], M[2][r.int(0, 3)], M[2][(r.int(0, 3) + 1) % 4] + '!'].map((x, i) => (i === 3 ? x.replace('!', '') + ' Max' : x));
    moves[3] = `${root} ${['Overdrive', 'Nova', 'Cascade', 'Finale', 'Surge'][h % 5]}`;
    out.push([names, type, term, moves, def, { route: ci + 1, termKey: ci + ':' + term }]);
    total += stages;
  }));
  return out;
}
