// Lessons (Academy) and Arcade mini games: Unscramble, True/False Blitz, Word Guess, Quiz Ladder, Listening.
import { G, ITEMS, recordAnswer } from './state.js';
import { ui, fmt } from './ui.js';
import { audio } from '../core/audio.js';
import { esc, shuffle, R, sleep, clamp } from '../core/rng.js';
import { levelFor, LEVEL_NAME, vocabQ } from './content.js';
import { speak, canSpeak } from '../core/speech.js';
import * as puzzles from './puzzles.js';

const S = () => G.save, W = () => G.W;
const isLang = (ci) => !!(W().cities[ci].vocab?.length);
const letters = (s) => s.normalize('NFC').replace(/[^\p{L}\p{N}]/gu, '');

// ------------------------------------------------------------ word sources
function items(ci, { minLen = 0, maxLen = 99 } = {}) {
  const w = W(); const out = [];
  for (let k = 0; k <= ci; k++) {
    const c = w.cities[k]; const weight = k === ci ? 3 : 1;
    const src = c.vocab?.length ? c.vocab.map((v) => ({ word: v.w, clue: v.en, id: v.id })) : c.terms.map((t) => ({ word: t.term, clue: t.def, id: t.id }));
    for (const it of src) { const L = letters(it.word).length; if (L >= minLen && L <= maxLen) for (let i = 0; i < weight; i++) out.push(it); }
  }
  return out;
}
const uniq = (arr, n) => { const seen = new Set(), out = []; for (const x of shuffle(arr)) { if (seen.has(x.word)) continue; seen.add(x.word); out.push(x); if (out.length >= n) break; } return out; };
function prize(game, ci, score, target, label) {
  const s = S(); s.arcade = s.arcade || {}; const k = game + ci; const best = s.arcade[k] || 0; const lines = [];
  if (score > best) { s.arcade[k] = score; if (best) lines.push(`🏆 New high score! (was ${best})`); }
  if (score >= target && !s.flags['arc_' + k]) {
    s.flags['arc_' + k] = 1; const item = R.pick(['supertonic', 'cube2', 'revive', 'maxtonic']); s.bag[item] = (s.bag[item] || 0) + 2; s.money += 150; audio.sfx('badge');
    lines.push(`First clear of ${label} here: ¤150 and 2× ${ITEMS[item]?.name || item}!`);
  } else { const cash = score * 6; s.money += cash; lines.push(`Earned ¤${cash}.`); }
  G.autosave?.(); return lines;
}

// ------------------------------------------------------------ lessons
export function lessonsFor(ci) {
  const c = W().cities[ci]; if (c.lessons?.length) return c.lessons;
  // fallback: build study notes from the glossary, easiest first
  const by = [1, 2, 3].map((l) => c.terms.filter((t) => (t.lvl || 1) === l)).filter((g) => g.length);
  return by.map((g, i) => [`${c.theme}: ${['the basics', 'going deeper', 'mastery'][i] || 'more'}`, g.map((t) => `*${t.term}* — ${t.def}${t.ex?.[0] ? `\n   e.g. ${t.ex[0]}` : ''}`).join('\n\n')]);
}
export async function lessonBoard(ci) {
  const c = W().cities[ci]; const ls = lessonsFor(ci); const s = S(); s.read = s.read || {};
  for (;;) {
    const lvl = levelFor(s, ci);
    const pick = await ui.choose(`${c.name} Academy — ${c.theme} · Your level: ${LEVEL_NAME[lvl]}`, ls.map(([t], i) => ({ html: `${s.read[ci + ':' + i] ? '✔' : '📖'} Lesson ${i + 1}: ${esc(t)}` })), { cls: 'teamlist' });
    if (pick < 0) return; await readLesson(ci, pick);
  }
}
export async function readLesson(ci, i) {
  const c = W().cities[ci]; const ls = lessonsFor(ci); const [title, body] = ls[i]; const s = S(); s.read = s.read || {}; let check = false;
  const lang = W().meta?.speech;
  await ui.panel({ title: `📖 ${esc(title)}`, wide: true, cls: 'lesson', render: () => `<div class="lessonbody">${fmt(esc(body))}</div>
    <div class="row">${i > 0 ? '<button data-nav data-act="prev">◀ Previous</button>' : ''}<button data-nav data-act="check">✔ Quick check (3 questions)</button>${i < ls.length - 1 ? '<button data-nav data-act="next">Next ▶</button>' : ''}</div>`,
    actions: { check: () => { check = true; return 'close'; }, prev: () => { i--; check = 'nav'; return 'close'; }, next: () => { i++; check = 'nav'; return 'close'; } } });
  if (!s.read[ci + ':' + i] && check !== 'nav') { s.read[ci + ':' + i] = 1; s.money += 40; ui.toast('📖 Lesson read · +¤40'); }
  if (check === 'nav') return readLesson(ci, i);
  if (!check) return;
  const lvl = clamp(Math.ceil(((i + 1) / ls.length) * 3), 1, 3); let score = 0;
  for (let k = 0; k < 3; k++) { const q = W().pickQ(ci, s, { mix: false, review: 0, lvl }); const r = await ui.question(q, { tag: `Quick check · ${k + 1}/3` }); recordAnswer(s, q, r.correct, r.quick); if (r.correct) score++; }
  s.money += score * 15; await ui.say(`Quick check: *${score}/3*. ¤${score * 15} earned.${score < 2 ? ' Re-read the lesson and try again!' : ''}`, { name: 'Teacher' }); G.autosave?.();
  void lang;
}
export async function teacher(o) {
  const ci = o.ci; const c = W().cities[ci]; const s = S(); const lvl = levelFor(s, ci); const pc = s.stats.perCity[String(ci)] || { c: 0 };
  const next = lvl === 1 ? 8 - pc.c : lvl === 2 ? 24 - pc.c : 0;
  await ui.say([`Welcome to the ${c.name} Academy! We study *${c.theme}* here.`, `Your level in this city: *${LEVEL_NAME[lvl]}*.${next > 0 ? ` Answer ${next} more ${c.theme} questions correctly to reach the next level.` : ''}`, 'Lessons are on the boards. Questions get harder as your level rises — all the way to Mastery.'], { name: o.name });
  const opts = ['📖 Read the lessons', `📝 Level check (6 questions, ${LEVEL_NAME[lvl]})`, s.flags['mastery' + ci] ? '🎓 Mastery Exam — passed ✔' : '🎓 Mastery Exam (8 Mastery questions)', 'Bye'];
  const k = await ui.choose(`${o.name}`, opts); if (k === 0) return lessonBoard(ci);
  if (k === 1 || k === 2) {
    const exam = k === 2; const n = exam ? 8 : 6; const need = exam ? 7 : 5; let score = 0;
    if (exam && lvl < 3 && !(await ui.confirm('The Mastery Exam uses the hardest questions. Reaching Mastery level first is recommended. Try anyway?'))) return;
    for (let i = 0; i < n; i++) { const q = W().pickQ(ci, s, { mix: false, review: 0, lvl: exam ? 3 : lvl }); const r = await ui.question(q, { tag: `${exam ? 'Mastery Exam' : 'Level check'} · ${i + 1}/${n} · ${score}` }); recordAnswer(s, q, r.correct, r.quick); if (r.correct) score++; }
    if (score >= need) {
      if (exam && !s.flags['mastery' + ci]) { s.flags['mastery' + ci] = 1; s.bag.cube3 = (s.bag.cube3 || 0) + 2; s.money += 800; audio.sfx('badge'); await ui.say([`*${score}/${n}* — you have MASTERED ${c.theme}! 🎓`, 'Take 2 Apex Cubes and ¤800.'], { name: o.name }); }
      else { s.money += 120; audio.sfx('correct'); await ui.say(`*${score}/${n}* — excellent! ¤120.`, { name: o.name }); }
    } else await ui.say(`*${score}/${n}*. You need ${need}. Review the lessons and try again.`, { name: o.name });
    G.autosave?.();
  }
}

// ------------------------------------------------------------ arcade
export const CABINETS = { unscramble: '🔤 Unscramble', blitz: '⚡ True/False Blitz', guess: '❓ Word Guess', ladder: '🪜 Quiz Ladder', listen: '🎧 Listening', match: '🃏 Memory Match' };
export async function cabinet(game, ci) {
  if (game === 'listen' && !(isLang(ci) && canSpeak(W().meta?.speech))) game = isLang(ci) ? 'translate' : 'match';
  if (game === 'unscramble') return unscramble(ci);
  if (game === 'blitz') return blitz(ci);
  if (game === 'guess') return guess(ci);
  if (game === 'ladder') return ladder(ci);
  if (game === 'listen') return listen(ci);
  if (game === 'translate') return translate(ci);
  return puzzles.station('match', ci);
}
export async function arcadeHost(o) {
  const s = S(); s.arcade = s.arcade || {}; const ci = o.ci;
  const rows = ['unscramble', 'blitz', 'guess', 'ladder', isLang(ci) ? 'listen' : 'match'].map((g) => `${CABINETS[g]}: best ${s.arcade[g + ci] || 0}`);
  await ui.say(['Welcome to the Arcade! Every cabinet uses what you\'re learning here.', 'Beat a cabinet\'s target for a first-clear prize. High scores:', ...rows], { name: o.name });
}

async function unscramble(ci) {
  const list = uniq(items(ci, { minLen: 3, maxLen: 13 }), 5); if (list.length < 2) return ui.say('Not enough words here yet!');
  if (!(await ui.confirm(`🔤 UNSCRAMBLE — rebuild ${list.length} words from their scrambled letters. Use the clue! Ready?`))) return;
  let score = 0;
  for (let n = 0; n < list.length; n++) {
    const it = list[n]; const target = letters(it.word).toUpperCase(); let tiles = shuffle(target.split('').map((ch, i) => ({ ch, i }))); if (tiles.map((t) => t.ch).join('') === target && target.length > 1) tiles = tiles.reverse();
    let picked = []; let result = null;
    await ui.panel({ title: `Unscramble ${n + 1}/${list.length} · Score ${score}`, wide: true, cls: 'arcade', render: () => `<p class="clue">${fmt(esc(it.clue))}</p>
      <div class="slots">${target.split('').map((_, i) => `<span class="slot">${picked[i] ? esc(picked[i].ch) : '_'}</span>`).join('')}</div>
      <div class="tiles">${tiles.map((t, k) => `<button data-nav data-act="t" data-arg="${k}" ${picked.includes(t) ? 'disabled class="used"' : ''}>${esc(t.ch)}</button>`).join('')}</div>
      <div class="row"><button data-nav data-act="back">⌫ Undo</button><button data-nav data-act="skip">Give up</button></div>`,
      actions: {
        t: (a) => { const t = tiles[+a]; if (picked.includes(t)) return; picked.push(t); audio.sfx('blip'); if (picked.length === target.length) { result = picked.map((p) => p.ch).join('') === target; return 'close'; } },
        back: () => { picked.pop(); }, skip: () => { result = false; return 'close'; },
      } });
    if (result === null) return;
    if (result) { score++; audio.sfx('correct'); } else audio.sfx('wrong');
    await ui.say(`${result ? '✔' : '✘'} *${it.word}* — ${it.clue}`); if (isLang(ci)) speak(it.word, W().meta?.speech);
  }
  await ui.say([`Unscramble score: *${score}/${list.length}*`, ...prize('unscramble', ci, score, 4, 'Unscramble')]);
}

async function blitz(ci) {
  const pool = uniq(items(ci), 40); if (pool.length < 4) return ui.say('Not enough content here yet!');
  if (!(await ui.confirm('⚡ TRUE/FALSE BLITZ — 45 seconds! Does the word match its meaning? Right +1, wrong −1. Ready?'))) return;
  const t0 = performance.now(); let score = 0, n = 0;
  while ((performance.now() - t0) / 1000 < 45) {
    const a = pool[n % pool.length]; n++; const truth = R() < 0.5; const b = truth ? a : R.pick(pool.filter((x) => x.clue !== a.clue));
    const left = Math.max(0, 45 - Math.round((performance.now() - t0) / 1000));
    const q = { q: `*${a.word}* means: “${b.clue}”`, opts: ['True', 'False'], answer: truth ? 0 : 1, a: truth ? 'True' : 'False', expl: `${a.word} — ${a.clue}` };
    const r = await ui.question(q, { tag: `Blitz · ${left}s · Score ${score}`, autoClose: true, grid: false, quick: 3, learn: false });
    score += r.correct ? 1 : -1; if (score < 0) score = 0;
  }
  await ui.say([`Time! Blitz score: *${score}*`, ...prize('blitz', ci, score, 12, 'Blitz')]);
}

async function guess(ci) {
  const list = uniq(items(ci, { minLen: 3, maxLen: 14 }), 3); if (!list.length) return ui.say('Not enough words here yet!');
  if (!(await ui.confirm('❓ WORD GUESS — guess the hidden word one letter at a time. 6 misses and it\'s gone! 3 words. Ready?'))) return;
  let score = 0;
  for (let n = 0; n < list.length; n++) {
    const it = list[n]; const word = it.word.toUpperCase(); const need = new Set(letters(word).split(''));
    const base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''); const keys = [...new Set([...base, ...need])];
    const got = new Set(); let miss = 0, done = null;
    await ui.panel({ title: `Word Guess ${n + 1}/${list.length} · Score ${score}`, wide: true, cls: 'arcade', render: () => `<p class="clue">${fmt(esc(it.clue))}</p>
      <div class="slots">${word.split('').map((ch) => (letters(ch) ? `<span class="slot">${got.has(ch) || done !== null ? esc(ch) : '_'}</span>` : `<span class="gap">${esc(ch)}</span>`)).join('')}</div>
      <p class="lives">${'❤'.repeat(6 - miss)}${'♡'.repeat(miss)}</p>
      <div class="tiles keys">${keys.map((k) => `<button data-nav data-act="k" data-arg="${k}" ${got.has(k) || done !== null ? 'disabled class="used"' : ''}>${k}</button>`).join('')}</div>`,
      actions: { k: async (k) => {
        if (got.has(k)) return; got.add(k);
        if (need.has(k)) audio.sfx('correct'); else { miss++; audio.sfx('wrong'); }
        if ([...need].every((ch) => got.has(ch))) { done = true; return 'close'; } if (miss >= 6) { done = false; return 'close'; }
      } } });
    if (done === null) return; if (done) score++;
    await ui.say(`${done ? '✔ Got it!' : '✘ Out of guesses.'} *${it.word}* — ${it.clue}`); if (isLang(ci)) speak(it.word, W().meta?.speech);
  }
  await ui.say([`Word Guess score: *${score}/${list.length}*`, ...prize('guess', ci, score, 3, 'Word Guess')]);
}

async function ladder(ci) {
  if (!(await ui.confirm('🪜 QUIZ LADDER — 10 rungs that get harder: Easy → Medium → Mastery. One wrong answer and you fall! Ready?'))) return;
  let rung = 0; const s = S();
  for (; rung < 10; rung++) {
    const lvl = rung < 3 ? 1 : rung < 7 ? 2 : 3; const q = W().pickQ(ci, s, { mix: rung > 5, review: 0, lvl });
    const r = await ui.question(q, { tag: `Ladder · rung ${rung + 1}/10` }); recordAnswer(s, q, r.correct, r.quick); if (!r.correct) break;
  }
  await ui.say([rung >= 10 ? '🏆 You reached the top of the ladder!' : `You climbed *${rung}* rung${rung === 1 ? '' : 's'}.`, ...prize('ladder', ci, rung, 10, 'Quiz Ladder')]);
}

async function listen(ci) {
  const lang = W().meta.speech; const city = W().cities[ci];
  if (!(await ui.confirm('🎧 LISTENING — hear a word or phrase, then pick what it means. Press 🔊 to replay. 8 rounds. Ready?'))) return;
  let score = 0;
  for (let n = 0; n < 8; n++) {
    const c = R() < 0.7 ? city : W().cities[R.int(0, ci)]; const Q = vocabQ(W(), c.vocab.length ? c : city, 3, 'from'); if (!Q) break;
    const opts = shuffle([Q.a, ...Q.wrong]); const q = { q: '🎧 What did you hear? (press 🔊 to replay)', opts, answer: opts.indexOf(Q.a), a: Q.a, expl: Q.expl, say: Q.say, sayLang: lang, lvl: Q.lvl };
    const r = await ui.question(q, { tag: `Listening · ${n + 1}/8 · Score ${score}`, learn: false }); if (r.correct) score++;
  }
  await ui.say([`Listening score: *${score}/8*`, ...prize('listen', ci, score, 6, 'Listening')]);
}
async function translate(ci) {
  const city = W().cities[ci]; if (!city.vocab.length) return puzzles.station('match', ci);
  if (!(await ui.confirm('🌐 SPEED TRANSLATE — 10 quick translations, both directions. Fast answers score double! (No voice for this language on your device, so Listening becomes Speed Translate.)'))) return;
  let score = 0;
  for (let n = 0; n < 10; n++) { const Q = vocabQ(W(), city, 3); if (!Q) break; const opts = shuffle([Q.a, ...Q.wrong]); const r = await ui.question({ ...Q, opts, answer: opts.indexOf(Q.a) }, { tag: `Translate · ${n + 1}/10 · Score ${score}`, learn: false, quick: 5 }); if (r.correct) score += r.quick ? 2 : 1; }
  await ui.say([`Speed Translate score: *${score}*`, ...prize('listen', ci, score, 14, 'Speed Translate')]);
}

// ------------------------------------------------------------ handlers (merged into events)
export const arcadeHandlers = {
  async lessons(o) { await lessonBoard(o.ci); },
  async teacher(o) { await teacher(o); },
  async cabinet(o) { await cabinet(o.game, o.ci); },
  async arcadehost(o) { await arcadeHost(o); },
};

// ------------------------------------------------------------ secrets: hidden doors and legendary encounters
import { runBattle } from './battle.js';
import { afterBattle } from './events.js';
import { RARITY } from './content.js';
export const SECRET_IDS = (W) => [...[2, 3, 4, 5, 6, 7, 8].map((r) => 'grove' + r), ...[0, 1, 2, 3].map((k) => 'lair' + k), ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => 'garden' + i), 'sea', 'sanctum'];
export function discover(id) {
  const s = S(); if (!SECRET_IDS(W()).includes(id) || s.flags['found_' + id]) return;
  s.flags['found_' + id] = 1; const n = SECRET_IDS(W()).filter((x) => s.flags['found_' + x]).length;
  audio.sfx('badge'); ui.toast(`🗝 Secret area discovered! (${n}/${SECRET_IDS(W()).length})`, 3600);
}
export const secretHandlers = {
  async secretdoor(o) {
    const s = S();
    if (o.need === 'badges' && !s.badges.every(Boolean)) { await ui.say([o.label, `Only ${s.badges.filter(Boolean).length}/8 hollows glow. Return when you hold every badge.`]); return; }
    await ui.say([o.label, 'You squeeze through…']); audio.sfx('door');
    await ui.fade(true, 350); await G.world.warp(o.to, o.tx, o.ty, o.dir); await ui.fade(false, 350);
  },
  async legend(o) {
    const s = S(); const sp = W().species[o.sp]; if (s.flags[o.key]) return;
    const rr = RARITY[sp.rarity];
    await ui.say([`${'★'.repeat(rr.stars)} ${rr.name.toUpperCase()} ${'★'.repeat(rr.stars)}`, `${sp.name}, ${sp.title}, opens its eyes…`, sp.rarity === 'mythic' ? 'The air hums with every lesson you have ever learned.' : 'It will test everything you know.']);
    if (!(await ui.confirm(`Challenge ${sp.name} (Lv${o.lvl})? It can be caught — but it won\'t be easy.`))) return;
    G.busy++; audio.sfx('encounter'); const top = Math.max(...s.players.flatMap((p) => p.party.map((m) => m.lvl)), 1); const lvl = Math.min(100, Math.max(o.lvl, top + (sp.rarity === 'mythic' ? 5 : 3)));
    const r = await runBattle({ kind: 'wild', enemies: [{ sp: o.sp, lvl }], qci: 'final', biome: G.world.map.biome, music: 'gym', seed: o.key, legend: true });
    G.busy--;
    if (r === 'caught' || s.players.some((p) => [...p.party, ...(p.box || [])].some((m) => m.sp === o.sp))) { s.flags[o.key] = 1; await ui.say(`${sp.name} joined you! Its legend is now yours.`); G.autosave(); }
    else if (r === 'win') await ui.say(`${sp.name} dissolves into light… It will return to this place. Bring stronger cubes next time!`);
    await afterBattle(r);
  },
};

// ------------------------------------------------------------ Wonderland Park rides
import { healMon, badgeCount } from './state.js';
export const parkHandlers = {
  async rideop(o) {
    const s = S(); const ci = Math.min(badgeCount(s), 7);
    if (o.ride === 'wheel') {
      if (!(await ui.confirm('Ride the Ferris Wheel? From the top you can see the whole region!'))) return;
      audio.sfx('evolve'); await ui.fade(true, 500); await ui.fade(false, 500); await ui.say(['Up… up… up…', 'From the very top the whole region spreads out below you!']);
      const M = await import('./menus.js'); await M.regionMap(); return;
    }
    if (o.ride === 'coaster') {
      if (!(await ui.confirm('🎢 QUIZ COASTER — 6 questions, each one faster! Miss one and the ride ends. Ready?'))) return;
      let n = 0; for (; n < 6; n++) { const q = W().pickQ(ci, s, { review: 0, lvl: n < 2 ? 1 : n < 4 ? 2 : 3 }); const r = await ui.question(q, { tag: `Quiz Coaster · loop ${n + 1}/6`, quick: 9 - n }); recordAnswer(s, q, r.correct, r.quick); audio.sfx(r.correct ? 'correct' : 'wrong'); if (!r.correct) break; }
      await ui.say([n >= 6 ? '🎢 WHEEE! You rode the whole Quiz Coaster!' : `The coaster screeches to a stop after ${n} loop${n === 1 ? '' : 's'}.`, ...prize('coaster', 0, n, 6, 'the Quiz Coaster')]); return;
    }
    if (o.ride === 'carousel') {
      await ui.say(['Round and round you go on a painted monster…']); audio.sfx('heal');
      s.players.forEach((p) => p.party.forEach((m) => healMon(W(), m))); await ui.say('Your team feels completely refreshed!'); G.autosave?.(); return;
    }
    if (o.ride === 'tent') {
      if (!(await ui.confirm('🎪 BIG TOP TRIVIA SHOW — 4 questions from everywhere you\'ve been, in front of a live crowd! Ready?'))) return;
      let score = 0; for (let k = 0; k < 4; k++) { const q = W().pickQ(R.int(0, ci), s, { review: 0, lvl: 2 + (k >> 1), mix: false }); const r = await ui.question(q, { tag: `Big Top · act ${k + 1}/4 · ${score}` }); recordAnswer(s, q, r.correct, r.quick); if (r.correct) { score++; audio.sfx('correct'); } }
      await ui.say([score === 4 ? '👏 Standing ovation! A perfect show!' : `The crowd cheers! ${score}/4.`, ...prize('bigtop', 0, score, 4, 'the Big Top')]); return;
    }
  },
  async mascot(o) {
    const s = S(); const today = new Date().toDateString();
    if (s.flags.mascotDay === today) { await ui.say(['Parky waves enthusiastically and does a little dance.', 'Come back tomorrow for another surprise!'], { name: o.name }); return; }
    s.flags.mascotDay = today; const it = R.pick(['supertonic', 'cube2', 'revive', 'maxtonic']); s.bag[it] = (s.bag[it] || 0) + 1; audio.sfx('item');
    await ui.say(['Parky spins around and hands you a gift!', `Got 1× ${ITEMS[it]?.name || it}!`], { name: o.name }); G.autosave?.();
  },
};
