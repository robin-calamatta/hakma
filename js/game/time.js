// Time travel & real-time systems: Learning Echoes, the Chrono Gate eras, eggs, time capsules, daily streak, seasons.
import { G, ITEMS, makeMon, addMon, monName, badgeCount, dueEchoes, ECHO_INT, ERA_PREFIX } from './state.js';
import { ui, fmt } from './ui.js';
import { audio } from '../core/audio.js';
import { R, shuffle, esc, hash, clamp, sleep } from '../core/rng.js';
import { runBattle } from './battle.js';
import { personPalette } from '../core/sprites.js';
import { eraSetFor } from '../content/eras.js';
import { afterBattle } from './events.js';
import { getMap } from './maps.js';

const S = () => G.save, W = () => G.W;
const say = (lines, name) => ui.say(lines, { name });
const H = 3600e3, D = 864e5;
export const EGG_MS = 2 * H, CAPSULE_MS = 3 * D, MAX_EGGS = 3;
export const dayKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
export function fmtLeft(ms) {
  if (ms <= 0) return 'ready!'; const m = Math.ceil(ms / 60e3);
  if (m < 60) return `${m} min`; const h = Math.floor(m / 60); if (h < 48) return `${h} h ${m % 60} min`; return `${Math.floor(h / 24)} d ${h % 24} h`;
}
const chapterNow = () => Math.min(badgeCount(S()), 7);
const partyLevel = () => { const p = S().players[0].party; return p.length ? Math.round(p.reduce((a, m) => a + m.lvl, 0) / p.length) : 5; };
const give = (id, n = 1) => { S().bag[id] = (S().bag[id] || 0) + n; return `${n > 1 ? n + '× ' : ''}${ITEMS[id]?.name || id}`; };

// ------------------------------------------------------------ seasons (real calendar month)
export function season(d = new Date()) {
  const m = d.getMonth();
  if (m === 9) return { key: 'spooky', name: 'Spooky Season', fx: 'spooky', icon: '🎃', line: 'Ghostly lights drift through the towns this month…' };
  if (m === 11) return { key: 'festival', name: 'Winter Festival', fx: 'snow', icon: '🎄', line: 'Snow is falling and the Winter Festival is on!' };
  if (m <= 1) return { key: 'winter', name: 'Winter', fx: 'snow', icon: '❄️', line: 'A cold snap — snow drifts over the region.' };
  if (m <= 4) return { key: 'spring', name: 'Spring Bloom', fx: 'petals', icon: '🌸', line: 'Blossom petals ride the spring breeze.' };
  if (m <= 7) return { key: 'summer', name: 'Summer Nights', fx: 'fireflies', icon: '☀️', line: 'Warm days, and fireflies after dark.' };
  return { key: 'autumn', name: 'Autumn Harvest', fx: 'leaves', icon: '🍂', line: 'Falling leaves blanket the routes.' };
}
const SEASON_GIFT = { spooky: [['cube3', 1], ['supertonic', 2]], festival: [['cube3', 1], ['maxtonic', 2]], winter: [['maxtonic', 2], ['tonic', 3]], spring: [['cube2', 3], ['tonic', 2]], summer: [['revive', 2], ['supertonic', 2]], autumn: [['maxtonic', 1], ['tonic', 3]] };
export function drawSeason(g, t, view, fx, biome) {
  if (fx === 'snow' && biome !== 'snow') { g.fillStyle = 'rgba(255,255,255,0.85)'; for (let i = 0; i < 46; i++) { const x = (i * 97 + t * 14 * (1 + (i % 3)) + Math.sin(t + i) * 6) % view.w, y = (i * 53 + t * 24 * (1 + (i % 2))) % view.h; g.fillRect(x, y, i % 4 ? 1 : 2, i % 4 ? 1 : 2); } }
  if (fx === 'petals') { for (let i = 0; i < 22; i++) { const x = (i * 83 + t * 22) % view.w, y = (i * 47 + t * 16 * (1 + (i % 3))) % view.h; g.fillStyle = i % 3 ? '#ffb6d9' : '#ffe0f0'; g.fillRect(x + Math.sin(t * 2 + i) * 4, y, 2, 1); } }
  if (fx === 'leaves') { const C = ['#e07020', '#c84020', '#e0b030', '#a05a20']; for (let i = 0; i < 20; i++) { const x = (i * 71 + t * 18) % view.w, y = (i * 59 + t * 20 * (1 + (i % 2))) % view.h; g.fillStyle = C[i % 4]; const s = Math.sin(t * 3 + i); g.fillRect(x + s * 6, y, s > 0 ? 2 : 1, 2); } }
  if (fx === 'fireflies') { for (let i = 0; i < 14; i++) { const a = Math.sin(t * 2.5 + i * 1.7); if (a < 0.2) continue; const x = (i * 131 + Math.sin(t * 0.4 + i) * 30 + view.w) % view.w, y = (i * 67 + Math.cos(t * 0.5 + i) * 20 + view.h) % view.h; g.fillStyle = `rgba(255,240,120,${a * 0.9})`; g.fillRect(x, y, 2, 2); g.fillStyle = `rgba(255,240,120,${a * 0.2})`; g.fillRect(x - 2, y - 2, 6, 6); } }
  if (fx === 'spooky') { g.fillStyle = 'rgba(50,0,80,0.13)'; g.fillRect(0, 0, view.w, view.h); for (let i = 0; i < 8; i++) { const x = (i * 157 + t * 12) % view.w, y = (i * 61 + Math.sin(t + i) * 12 + view.h) % view.h; const a = 0.35 + Math.sin(t * 2 + i) * 0.25; g.fillStyle = `rgba(190,140,255,${a})`; g.fillRect(x, y, 3, 3); g.fillRect(x + 1, y + 3, 1, 2); } }
}
export function drawEraTint(g, t, view, era) {
  if (era === 'past') { g.fillStyle = 'rgba(150,105,40,0.18)'; g.fillRect(0, 0, view.w, view.h); g.fillStyle = 'rgba(255,230,170,0.35)'; for (let i = 0; i < 16; i++) { const x = (i * 89 + t * 6) % view.w, y = (i * 41 + Math.sin(t * 0.7 + i) * 10 + view.h) % view.h; g.fillRect(x, y, 1, 1); } }
  if (era === 'future') { g.fillStyle = 'rgba(0,190,255,0.08)'; g.fillRect(0, 0, view.w, view.h); g.fillStyle = 'rgba(120,255,255,0.06)'; for (let y = Math.floor(t * 30) % 4; y < view.h; y += 4) g.fillRect(0, y, view.w, 1); }
}

// ------------------------------------------------------------ era questions
// Shuffle-bag: every era question is asked once before any repeats, and the
// last few asked are pushed to the back of the next bag so they never come back-to-back.
const ERA_DECKS = {};
function drawEra(key, qs) {
  let d = ERA_DECKS[key];
  if (!d || !d.bag.length || d.n !== qs.length) {
    const last = d?.last || []; const order = shuffle(qs.map((_, i) => i));
    d = ERA_DECKS[key] = { n: qs.length, last, bag: order.filter((i) => !last.includes(i)).concat(order.filter((i) => last.includes(i))) };
  }
  const i = d.bag.shift(); d.last = [...d.last, i].slice(-Math.max(1, Math.floor(qs.length / 2)));
  return qs[i];
}
export function eraQFn(era, share = 0.6) {
  const set = eraSetFor(W().id)[era]; if (!set) return undefined;
  return () => {
    if (R() > share) return null;
    const [q, a, w1, w2, w3, expl] = drawEra(W().id + ':' + era, set.qs); const opts = shuffle([a, w1, w2, w3]);
    return { id: 'era', q: `⏳ ${q}`, opts, answer: opts.indexOf(a), expl, ci: chapterNow(), a };
  };
}
export const eraInfo = (era) => eraSetFor(W().id)[era];

// ------------------------------------------------------------ Learning Echoes
export function nextEchoIn(save) { const E = save.echoes || []; if (!E.length) return null; return Math.min(...E.map((e) => e.due)) - Date.now(); }
export async function echoBattle() {
  const s = S(); const due = dueEchoes(s);
  if (!due.length) {
    const n = nextEchoIn(s); G.busy++;
    await say(n == null ? ['The rift is still.', 'When you miss a question, its *echo* returns here later — answering it again at spaced intervals locks it into long-term memory.'] : [`The rift is quiet. The next echo returns in *${fmtLeft(n)}*.`, `Echoes waiting: ${s.echoes.length}. Mastered so far: ${s.echoMastered || 0}.`], 'Echo Rift');
    G.busy--; return;
  }
  G.busy++; audio.sfx('encounter'); await sleep(300);
  await say([`${due.length} learning echo${due.length > 1 ? 'es' : ''} ripple${due.length > 1 ? '' : 's'} out of the rift!`, 'Answer what you once missed. Each correct answer pushes it further into the future.'], 'Echo Rift');
  const pool = shuffle(due).slice(0, 8); let asked = 0;
  const qfn = () => { const e = pool.shift(); if (!e) return null; asked++; const opts = shuffle([e.q.a, ...e.q.wrong]); return { id: 'echo', echo: true, q: e.q.q, opts, answer: opts.indexOf(e.q.a), expl: e.q.expl, ci: e.q.ci ?? chapterNow(), a: e.q.a }; };
  const lvl = clamp(partyLevel() + 1, 3, 70); const rt = Math.min(9, chapterNow() + 1); const lines = W().routeLines(rt);
  const n = clamp(Math.ceil(pool.length / 3), 1, 3);
  const enemies = Array.from({ length: n }, (_, k) => ({ sp: W().speciesFor(R.pick(lines), lvl - (n - 1 - k)), lvl: lvl - (n - 1 - k), era: R() < 0.5 ? 'past' : 'future' }));
  const before = s.echoMastered || 0;
  const r = await runBattle({ kind: 'trainer', enemies, trainerTitle: 'Echo of Yourself', trainerPal: personPalette(hash(s.players[0].name + 'echo'), { shirt: '#7a5cff', hair: '#d8d0ff' }), money: 30 * lvl, qci: chapterNow(), biome: G.world.map.biome, music: 'battle', seed: 'echo', after: 'The echo fades… but what you learned stays with you.', qfn });
  G.busy--;
  const left = dueEchoes(s).length; const mastered = (s.echoMastered || 0) - before;
  if (r === 'win') { G.busy++; await say([`Echoes answered: ${asked}.${mastered ? ` *${mastered} mastered for good!*` : ''}`, left ? `${left} still waiting in the rift.` : 'The rift falls silent for now.'], 'Echo Rift'); G.busy--; }
  await afterBattle(r);
}

// ------------------------------------------------------------ eggs, capsule, streak
export function timeTick(quiet = false) {
  const s = S(); if (!s) return; const now = Date.now(); const w = W();
  for (const egg of [...(s.eggs || [])]) {
    if (egg.hatch > now || !w.species[egg.sp]) continue;
    s.eggs.splice(s.eggs.indexOf(egg), 1);
    const mon = makeMon(w, egg.sp, egg.lvl || 5); if (egg.era) mon.era = egg.era; mon.met = now;
    const where = addMon(s, 0, mon); s.seen[egg.sp] = 1; s.caught[egg.sp] = 1; if (mon.era) { s.eraDex = s.eraDex || {}; s.eraDex[egg.sp + ':' + mon.era] = 1; }
    if (!quiet) { audio.sfx('catch'); ui.toast(`🥚 Your egg hatched into ${monName(w, mon)}!${where === 'box' ? ' (sent to the Box)' : ''}`, 4200); }
  }
}
export function dailyCheck() {
  const s = S(); if (!s || !s.flags?.starter) return; const today = dayKey(); const st = s.streak || (s.streak = { day: '', n: 0, best: 0 });
  if (st.day === today) return;
  st.n = st.day === dayKey(Date.now() - D) ? st.n + 1 : 1; st.day = today; st.best = Math.max(st.best, st.n);
  const cash = 50 * Math.min(st.n, 10); s.money += cash; let extra = '';
  if (st.n % 7 === 0) extra = ' + ' + give('cube2', 2);
  setTimeout(() => { audio.sfx('item'); ui.toast(`🔥 Day ${st.n} study streak! +¤${cash}${extra}`, 4200); }, 900);
}
function newEgg(era) {
  const w = W(); const rt = clamp(chapterNow() + 1, 1, 9); const line = R.pick(w.routeLines(rt));
  return { sp: w.speciesFor(line, 5), lvl: 5, laid: Date.now(), hatch: Date.now() + EGG_MS, era: era || (R() < 0.15 ? R.pick(['past', 'future']) : '') };
}
const eggLabel = (e) => `${e.era === 'past' ? 'Ancient ' : e.era === 'future' ? 'Neo ' : ''}Egg — ${fmtLeft(e.hatch - Date.now())}`;

// ------------------------------------------------------------ handlers merged into events
export const timeHandlers = {
  async chrono(o) {
    const s = S(); const set = eraSetFor(W().id);
    if (o.back) {
      if (!(await ui.confirm('Step back through the gate to the present day?'))) return;
      const gate = getMap(W(), 'hometown').objs.find((q) => q.kind === 'chrono');
      audio.sfx('evolve'); await G.world.warp('hometown', gate.x, gate.y + 1, 'down'); return;
    }
    if (badgeCount(s) < 4) { await say(['An ancient stone gate. Strange symbols — some old, some impossibly new — flicker across it.', 'It hums faintly, as if waiting for a trainer with *4 badges*.'], 'Chrono Gate'); return; }
    if (!s.flags.chrono) { s.flags.chrono = 1; await say(['The gate blazes to life! Through it you glimpse two worlds…', `⏪ *${set.past.name}* — how ${W().topic.name} began.`, `⏩ *${set.future.name}* — where it is heading.`, 'Hakma there have taken on *era forms*. Catch them all!'], 'Chrono Gate'); }
    const c = await ui.choose('Where in time will you travel?', [`⏪ The Past — ${esc(set.past.name)} (${esc(set.past.years)})`, `⏩ The Future — ${esc(set.future.name)}`, 'Stay in the present']);
    if (c !== 0 && c !== 1) return; const era = c === 0 ? 'past' : 'future';
    audio.sfx('evolve'); await ui.fade(true, 500); await G.world.warp('era_' + era, 14, 33, 'up'); await ui.fade(false, 400);
  },
  async rift() { await echoBattle(); },
  async keeper(o) {
    timeTick(); const s = S(); s.eggs = s.eggs || [];
    if (!s.flags.keeper) { s.flags.keeper = 1; await say(['I am the Keeper of Time. Some things simply can\'t be rushed.', 'I give out *one egg a day* — it hatches after a couple of real hours.', 'I can also bury a *time capsule* for you. Come back in three real days and it will be full of treasure.'], o.name); }
    for (;;) {
      const today = dayKey(); const capT = s.capsule ? s.capsule.opens - Date.now() : null;
      const opts = [
        s.eggDay === today ? '🥚 Today\'s egg — already collected' : s.eggs.length >= MAX_EGGS ? `🥚 Egg nest full (${MAX_EGGS})` : '🥚 Collect today\'s egg',
        `🔍 Check my eggs (${s.eggs.length})`,
        s.capsule ? (capT <= 0 ? '📦 Open the time capsule!' : `📦 Capsule opens in ${fmtLeft(capT)}`) : '📦 Bury a time capsule',
        'Bye',
      ];
      const c = await ui.choose('Keeper of Time', opts); if (c < 0 || c === 3) break;
      if (c === 0) {
        if (s.eggDay === today) { await say('Patience! Come back tomorrow for another egg.', o.name); continue; }
        if (s.eggs.length >= MAX_EGGS) { await say('Your nest is full. Let some hatch first!', o.name); continue; }
        s.eggDay = today; const e = newEgg(); s.eggs.push(e); audio.sfx('item');
        await say([`You received ${e.era ? (e.era === 'past' ? 'an *Ancient Egg*' : 'a *Neo Egg*') : 'an *Egg*'}!`, `It will hatch in about ${fmtLeft(e.hatch - Date.now())} of real time — even while the game is closed.`], o.name); G.autosave();
      }
      if (c === 1) { await say(s.eggs.length ? s.eggs.map((e, i) => `${i + 1}. ${eggLabel(e)}`) : ['You have no eggs right now.'], o.name); }
      if (c === 2) {
        if (!s.capsule) { s.capsule = { at: Date.now(), opens: Date.now() + CAPSULE_MS }; audio.sfx('item'); await say(['You bury the capsule beneath the old oak.', 'Return in *3 real days* to open it!'], o.name); G.autosave(); }
        else if (capT > 0) await say(`The capsule isn't ready. Come back in ${fmtLeft(capT)}.`, o.name);
        else {
          s.capsule = null; audio.sfx('evolve'); const b = badgeCount(s); s.money += 300 + b * 120;
          const got = [give('supertonic', 3), give(b >= 5 ? 'cube3' : 'cube2', 3), give('revive', 1), give('tm_' + R.pick(['logic', 'cipher', 'spark', 'data', 'structure', 'flux']))];
          await say(['You dig up the time capsule and pop it open!', `Inside: ¤${300 + b * 120}, ${got.join(', ')}.`, 'Bury another whenever you like.'], o.name); G.autosave();
        }
      }
    }
  },
  async seasonal(o) {
    const s = S(); const se = season(); const key = new Date().getFullYear() + '-' + se.key;
    if (s.flags['season_' + key]) { await say([se.line, `Happy ${se.name}! Come back next season for another gift.`], o.name); return; }
    s.flags['season_' + key] = 1; audio.sfx('item');
    const got = SEASON_GIFT[se.key].map(([id, n]) => give(id, n));
    let lines = [`${se.icon} Happy ${se.name}!`, se.line, `Here's a seasonal gift: ${got.join(', ')}.`];
    if (se.key === 'spooky' || se.key === 'festival') { s.eggs = s.eggs || []; if (s.eggs.length < MAX_EGGS) { s.eggs.push(newEgg(se.key === 'spooky' ? 'past' : 'future')); lines.push(`And a special *${se.key === 'spooky' ? 'Ancient' : 'Neo'} Egg*! It hatches in a couple of hours.`); } }
    await say(lines, o.name); G.autosave();
  },
};

// ------------------------------------------------------------ Chrono Log (main menu)
export async function chronoLog() {
  timeTick(); const s = S(); const se = season(); const due = dueEchoes(s).length; const nx = nextEchoIn(s); const st = s.streak || { n: 0, best: 0 };
  const eraForms = Object.keys(s.eraDex || {}).length; let go = null;
  const stages = [0, 0, 0, 0, 0]; (s.echoes || []).forEach((e) => stages[Math.min(e.st, 4)]++);
  await ui.panel({ title: '⏳ Chrono Log', wide: true, cls: 'chrono', render: () => `
    <div class="clog">
      <section><h3>🔁 Learning Echoes</h3><p>${due ? `<b>${due} due now!</b>` : nx == null ? 'No echoes yet — missed questions return here later.' : `Next echo in <b>${fmtLeft(nx)}</b>.`}</p>
        <p class="dim">Waiting: ${(s.echoes || []).length} · Mastered: ${s.echoMastered || 0}<br>Spaced steps: ${['10 min', '1 day', '3 days', '1 week', '3 weeks'].map((l, i) => `${l} <b>${stages[i]}</b>`).join(' · ')}</p>
        ${due ? '<button data-nav data-act="echo">Battle the echoes</button>' : ''}</section>
      <section><h3>🔥 Study streak</h3><p>Day <b>${st.n}</b> · best ${st.best}</p><p class="dim">Play each day for bonus money; every 7th day earns Prime Cubes.</p></section>
      <section><h3>🥚 Eggs</h3>${(s.eggs || []).length ? `<ul>${s.eggs.map((e) => `<li>${esc(eggLabel(e))}</li>`).join('')}</ul>` : '<p class="dim">No eggs. The Keeper of Time in Origin Town gives one a day.</p>'}</section>
      <section><h3>📦 Time capsule</h3><p>${s.capsule ? (s.capsule.opens <= Date.now() ? '<b>Ready to open!</b> Visit the Keeper of Time.' : `Opens in <b>${fmtLeft(s.capsule.opens - Date.now())}</b>.`) : '<span class="dim">None buried. Ask the Keeper of Time.</span>'}</p></section>
      <section><h3>${se.icon} ${esc(se.name)}</h3><p class="dim">${esc(se.line)}</p></section>
      <section><h3>🌀 Chrono Gate</h3><p>${badgeCount(s) >= 4 ? 'Open — in Origin Town.' : `Opens at 4 badges (${badgeCount(s)}/4).`}</p><p class="dim">Era forms caught: ${eraForms}</p></section>
    </div>`,
    actions: { echo: () => { go = 'echo'; return 'close'; } } });
  return go;
}
export { ECHO_INT, ERA_PREFIX };
