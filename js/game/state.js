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
  shard:      { name: 'Insight Shard', price: 0, desc: 'Earned by learning. Raises a monster by one level.', kind: 'level' },
};

export function defaultSettings() { return { music: 0.55, sfx: 0.7, timer: true, timerSec: 25, textSpeed: 2, every: true, showControls: true }; }
export function loadSettings() { try { return { ...defaultSettings(), ...JSON.parse(localStorage.getItem('hakma.settings') || '{}') }; } catch { return defaultSettings(); } }
export function saveSettings(s) { localStorage.setItem('hakma.settings', JSON.stringify(s)); }

export function newSave(name) {
  return {
    v: SAVE_VERSION, id: uid(), created: Date.now(), updated: Date.now(), playtime: 0, topic: null,
    players: [newPlayer(name, 0)], bag: { cube: 5, tonic: 3 }, money: 500, badges: [false, false, false, false, false, false, false, false], champion: false,
    flags: {}, map: 'home_room', pos: [{ x: 5, y: 4, dir: 'down' }], lastHeal: { map: 'home_house', x: 4, y: 5 },
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
export const movesOf = (W, m) => W.species[m.sp].moves.filter((mv) => mv.lvl <= m.lvl);
export const monName = (W, m) => m.nick || W.species[m.sp].name;
export function healMon(W, m) { m.hp = maxHp(W, m); }
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
export function recordAnswer(save, q, correct, quick) {
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
export function writeSlot(n, save) { save.updated = Date.now(); localStorage.setItem(SLOT_KEY(n), JSON.stringify(save)); }
export function readSlot(n) { try { return JSON.parse(localStorage.getItem(SLOT_KEY(n)) || 'null'); } catch { return null; } }
export function deleteSlot(n) { localStorage.removeItem(SLOT_KEY(n)); }
export function migrate(save) {
  if (!save) return save;
  save.players.forEach((p, i) => { p.color = p.color || PLAYER_COLORS[i]; p.box = p.box || []; });
  save.pos = save.pos || [{ x: 5, y: 4, dir: 'down' }];
  while (save.pos.length < save.players.length) save.pos.push({ ...save.pos[0] });
  for (const k of ['flags', 'seen', 'caught', 'codex', 'trainers', 'taken', 'quests']) save[k] = save[k] || {};
  save.missed = save.missed || []; save.stats = save.stats || { answered: 0, correct: 0, quick: 0, perCity: {} };
  return save;
}
