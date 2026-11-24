// Global game state, save format, and monster maths.
import { uid, clamp } from '../core/rng.js';

export const G = { save: null, W: null, ui: null, scene: null, net: null, busy: 0, t: 0, slot: 0, world: null, battle: null };
export const SAVE_VERSION = 1;
export const PLAYER_COLORS = ['#e04848', '#3a7ae0', '#30b060', '#e0a020'];

export const ITEMS = {
  cube:       { name: 'Capture Cube', price: 200, desc: 'Captures a wild monster. Answer correctly for a big bonus.', kind: 'cube', rate: 1 },
  cube2:      { name: 'Prime Cube', price: 600, desc: 'A sharper cube with a better capture rate.', kind: 'cube', rate: 1.6, badge: 2 },
  cube3:      { name: 'Apex Cube', price: 1200, desc: 'Top-tier capture rate.', kind: 'cube', rate: 2.3, badge: 5 },
  tonic:      { name: 'Mend Tonic', price: 150, desc: 'Restores 30 HP.', kind: 'heal', amt: 30 },
  supertonic: { name: 'Super Tonic', price: 400, desc: 'Restores 90 HP.', kind: 'heal', amt: 90, badge: 2 },
  maxtonic:   { name: 'Max Tonic', price: 900, desc: 'Fully restores HP.', kind: 'heal', amt: 9999, badge: 4 },
  revive:     { name: 'Revive Spark', price: 700, desc: 'Revives a fainted monster to half HP.', kind: 'revive' },
  tm_logic:     { name: 'Disc: Proof by Induction', price: 2500, desc: 'Technique Disc. Teaches a monster Proof by Induction (Logic, 85).', kind: 'tm', type: 'logic', move: 'Proof by Induction', badge: 3 },
  tm_cipher:    { name: 'Disc: Zero-Knowledge Strike', price: 2500, desc: 'Technique Disc. Teaches Zero-Knowledge Strike (Cipher, 85).', kind: 'tm', type: 'cipher', move: 'Zero-Knowledge Strike', badge: 3 },
  tm_spark:     { name: 'Disc: Overclock Surge', price: 2500, desc: 'Technique Disc. Teaches Overclock Surge (Spark, 85).', kind: 'tm', type: 'spark', move: 'Overclock Surge', badge: 3 },
  tm_data:      { name: 'Disc: Big Data Crash', price: 2500, desc: 'Technique Disc. Teaches Big Data Crash (Data, 85).', kind: 'tm', type: 'data', move: 'Big Data Crash', badge: 3 },
  tm_structure: { name: 'Disc: Foundation Quake', price: 2500, desc: 'Technique Disc. Teaches Foundation Quake (Structure, 85).', kind: 'tm', type: 'structure', move: 'Foundation Quake', badge: 3 },
  tm_flux:      { name: 'Disc: Refactor Blaze', price: 2500, desc: 'Technique Disc. Teaches Refactor Blaze (Flux, 85).', kind: 'tm', type: 'flux', move: 'Refactor Blaze', badge: 3 },
  shard:      { name: 'Insight Shard', price: 0, desc: 'Very rare — one is awarded with each badge. Raises a monster by one level. Can\'t be used during battle.', kind: 'level' },
};

export function defaultSettings() { return { music: 0.55, sfx: 0.7, timer: false, timerV2: true, timerSec: 25, textSpeed: 2, every: true, showControls: true }; }
export function loadSettings() {
  try {
    const s = { ...defaultSettings(), ...JSON.parse(localStorage.getItem('hakma.settings') || '{}') };
    if (!s.timerV2) { s.timer = false; s.timerV2 = true; saveSettings(s); } // question timer now starts OFF (turn on in Settings)
    return s;
  } catch { return defaultSettings(); }
}
export function saveSettings(s) { localStorage.setItem('hakma.settings', JSON.stringify(s)); }

export function newSave(name) {
  return {
    v: SAVE_VERSION, id: uid(), seed: uid(), created: Date.now(), updated: Date.now(), playtime: 0, topic: null,
    players: [newPlayer(name, 0)], bag: { cube: 5, tonic: 3 }, money: 500, badges: [false, false, false, false, false, false, false, false], champion: false,
    flags: {}, map: 'home_room', pos: [{ x: 5, y: 4, dir: 'down' }], lastHeal: { map: 'home_house', x: 4, y: 5 },
    skills: {}, cleared: {},
    seen: {}, caught: {}, codex: {}, stats: { answered: 0, correct: 0, quick: 0, perCity: {} }, missed: [], trainers: {}, taken: {}, quests: {},
  };
}
export function newPlayer(name, idx) { return { name: name || 'Player ' + (idx + 1), color: PLAYER_COLORS[idx % 4], party: [], box: [], local: idx }; }

export function xpToNext(lvl) { return Math.floor(12 + lvl * lvl * 1.1); }
export function makeMon(W, spId, lvl) {
  const m = { uid: uid(), sp: spId, lvl, xp: 0, hp: 1, nick: null, met: Date.now() };
  m.hp = stats(W, m).hp; return m;
}
export function stats(W, m) {
  const b = W.species[m.sp].base; const L = m.lvl;
  return { hp: Math.floor((b.hp * 2 * L) / 100) + L + 12, atk: Math.floor((b.atk * 2 * L) / 100) + 5, def: Math.floor((b.def * 2 * L) / 100) + 5, spd: Math.floor((b.spd * 2 * L) / 100) + 5 };
}
export const maxHp = (W, m) => stats(W, m).hp;
export const FIELD_SKILLS = {
  cut:   { name: 'Slice', disc: 'Slice Disc', badge: 0, desc: 'Cuts down small saplings that block paths.' },
  smash: { name: 'Smash', disc: 'Smash Disc', badge: 2, desc: 'Shatters cracked boulders in your way.' },
  fly:   { name: 'Soar',  disc: 'Soar Disc',  badge: 4, desc: 'Fly instantly to any city you have visited (from the Region Map).' },
};
export const tmMove = (id) => ({ name: ITEMS[id].move, power: 85, type: ITEMS[id].type, kind: 'hit', lvl: 1, tm: true });
export const movesOf = (W, m) => W.species[m.sp].moves.filter((mv) => mv.lvl <= m.lvl).concat((m.tms || []).filter((id) => ITEMS[id]).map(tmMove));
export const lookOf = (m) => (m?.era || '') + (m?.shiny ? '*' : '');
export const ERA_PREFIX = { past: 'Ancient ', future: 'Neo-' };
export const monName = (W, m) => m.nick || (ERA_PREFIX[m.era] || '') + W.species[m.sp].name;
// Status conditions. Flux moves can burn, Cipher moves can poison, Data moves can make a monster sick.
// They last until healed at a Mend Station / home, or with any healing item.
export const STATUS = {
  psn: { name: 'Poisoned', tag: 'PSN', col: '#b050e0', from: 'cipher', chance: 0.22, tick: 1 / 10, verb: 'was poisoned' },
  brn: { name: 'Burned', tag: 'BRN', col: '#ff7030', from: 'flux', chance: 0.22, tick: 1 / 16, verb: 'was burned' },
  sick: { name: 'Sick', tag: 'SICK', col: '#7cbf3a', from: 'data', chance: 0.18, tick: 1 / 20, verb: 'caught a bug and feels sick' },
};
export function healMon(W, m) { m.hp = maxHp(W, m); delete m.status; }
export function healAll(W, save) { for (const p of save.players) { for (const m of p.party) healMon(W, m); } }
export function addMon(save, pi, mon) {
  const p = save.players[pi] || save.players[0];
  if (p.party.length < 6) { p.party.push(mon); return 'party'; }
  p.box.push(mon); return 'box';
}
// returns list of events: {type:'level', lvl} / {type:'move', move} / {type:'evolve', to}
export function gainXp(W, m, amount) {
  const ev = []; if (m.lvl >= 100) return ev;
  m.xp += Math.max(1, Math.round(amount));
  while (m.lvl < 100 && m.xp >= xpToNext(m.lvl)) {
    m.xp -= xpToNext(m.lvl); const before = maxHp(W, m); m.lvl++;
    m.hp = clamp(m.hp + (maxHp(W, m) - before), 0, maxHp(W, m)); ev.push({ type: 'level', lvl: m.lvl });
    for (const mv of W.species[m.sp].moves) if (mv.lvl === m.lvl) ev.push({ type: 'move', move: mv.name });
  }
  return ev;
}
export function checkEvolve(W, m) { const sp = W.species[m.sp]; return sp.evolveAt && sp.next && m.lvl >= sp.evolveAt ? sp.next : null; }
export function evolve(W, m, to) { const before = maxHp(W, m); m.sp = to; m.hp = clamp(m.hp + (maxHp(W, m) - before), 1, maxHp(W, m)); }
export function partyAlive(p) { return p.party.some((m) => m.hp > 0); }
export function badgeCount(save) { return save.badges.filter(Boolean).length; }
export function chapter(save) { return Math.min(badgeCount(save), 7); }
export function addCodex(save, termId) { if (!save.codex[termId]) { save.codex[termId] = Date.now(); return true; } return false; }
// ---- Learning Echoes: every miss returns on a spaced-repetition schedule (10 min, 1, 3, 7, 21 days)
export const ECHO_INT = [10 * 60e3, 864e5, 3 * 864e5, 7 * 864e5, 21 * 864e5];
export function echoUpdate(save, q, correct) {
  if (!q || !q.q || !Array.isArray(q.opts)) return null;
  const E = save.echoes || (save.echoes = []); const e = E.find((x) => x.k === q.q);
  if (e) {
    if (!correct) { e.st = 0; e.due = Date.now() + ECHO_INT[0]; return 'reset'; }
    if (!q.echo) return null; // only echo battles advance the schedule
    e.st++; if (e.st >= ECHO_INT.length) { E.splice(E.indexOf(e), 1); save.echoMastered = (save.echoMastered || 0) + 1; return 'mastered'; }
    e.due = Date.now() + ECHO_INT[e.st]; return 'up';
  }
  if (correct) return null;
  E.push({ k: q.q, q: { q: q.q, a: q.a ?? q.opts[q.answer], wrong: q.opts.filter((o, i) => i !== q.answer), expl: q.expl, ci: q.ci }, st: 0, due: Date.now() + ECHO_INT[0] });
  if (E.length > 80) E.shift(); return 'new';
}
export const dueEchoes = (save, now = Date.now()) => (save.echoes || []).filter((e) => e.due <= now);
export function recordAnswer(save, q, correct, quick) {
  q.echoResult = echoUpdate(save, q, correct);
  const s = save.stats; s.answered++; if (correct) s.correct++; if (quick) s.quick++;
  const k = String(q.ci); const pc = s.perCity[k] || (s.perCity[k] = { a: 0, c: 0 }); pc.a++; if (correct) pc.c++;
  if (q.id && q.id !== 'gen') {
    const i = save.missed.indexOf(q.id);
    if (!correct && i < 0) save.missed.push(q.id);
    if (correct && i >= 0 && q.review) save.missed.splice(i, 1); // cleared on a correct review
    if (save.missed.length > 300) save.missed.shift();
  }
}
// ---------------------------------------------------------------- local save slots
const SLOT_KEY = (n) => 'hakma.slot.' + n;
export function listSlots() { return [0, 1, 2].map((n) => { try { return JSON.parse(localStorage.getItem(SLOT_KEY(n)) || 'null'); } catch { return null; } }); }
export function writeSlot(n, save) { localStorage.removeItem('hakma.deleted.' + n); save.updated = Date.now(); localStorage.setItem(SLOT_KEY(n), JSON.stringify(save)); }
export function readSlot(n) { try { return JSON.parse(localStorage.getItem(SLOT_KEY(n)) || 'null'); } catch { return null; } }
export function deleteSlot(n) { localStorage.removeItem(SLOT_KEY(n)); }
export function migrate(save) {
  if (!save) return save;
  if (!save.seed) save.seed = 'legacy'; // saves from before randomized worlds keep their original map
  save.skills = save.skills || {}; save.cleared = save.cleared || {};
  for (const k in FIELD_SKILLS) if (save.badges?.[FIELD_SKILLS[k].badge]) save.skills[k] = true; // earned before skills existed
  save.players.forEach((p, i) => { p.color = p.color || PLAYER_COLORS[i]; p.box = p.box || []; });
  save.pos = save.pos || [{ x: 5, y: 4, dir: 'down' }];
  if (save.follower === undefined) save.follower = save.players[0]?.party[0]?.uid || undefined; // partner walks behind you by default
  while (save.pos.length < save.players.length) save.pos.push({ ...save.pos[0] });
  for (const k of ['flags', 'seen', 'caught', 'codex', 'trainers', 'taken', 'quests']) save[k] = save[k] || {};
  save.missed = save.missed || []; save.stats = save.stats || { answered: 0, correct: 0, quick: 0, perCity: {} };
  return save;
}
