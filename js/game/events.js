// Interaction scripts, quests and story flow.
import { G, ITEMS, makeMon, healAll, addMon, monName, maxHp, newPlayer, badgeCount, addCodex, recordAnswer } from './state.js';
import { getWorld, topics } from './content.js';
import { ui, fmt } from './ui.js';
import { audio } from '../core/audio.js';
import { R, sleep, esc, hash, clamp } from '../core/rng.js';
import { runBattle } from './battle.js';
import { personPalette } from '../core/sprites.js';
import { TYPES, beats, weakTo } from '../content/types.js';
import { SOLID } from '../core/sprites.js';
import * as menus from './menus.js';
import * as puzzles from './puzzles.js';

const LEAD = ['Here\'s something worth knowing:', 'Pro tip:', 'Interviewers love this one:', 'I wrote this down in my notes:', 'Remember this:', 'Fun fact:'];
const TRAINER_LINES = ['Let\'s see what you\'ve learned!', 'My monsters study every night. Do yours?', 'Answer fast or get flattened!', 'I just read the docs on this. Bring it!', 'Knowledge check! Ready?', 'You look like you need some practice!'];
const T_WIN = ['Ugh, you really know your stuff.', 'I need to go back to the books...', 'Okay, okay. You studied.', 'Next time I\'ll know the answers!'];

const say = (lines, name) => ui.say(lines, { name });
const W = () => G.W, S = () => G.save;

function termLine(id) { const t = W().terms.find((x) => x.id === id); return t ? `*${t.term}* — ${t.def}` : ''; }
function learn(id) { if (id && addCodex(S(), id)) ui.toast('📘 Codex updated'); }
function autosave() { G.autosave?.(); }

export const events = {
  openMenu(pi) { menus.mainMenu(pi); },
  async interact(o, pi) {
    G.busy++;
    try { await (handlers[o.kind] || handlers.npc)(o, pi); } catch (e) { console.error(e); }
    G.busy--; this.checkObjective();
  },
  async gateBlocked(m, p) {
    G.busy++;
    if (m.gateNorth.flag === 'starter') await say([`Wait! The tall grass is full of wild monsters.`, `Go see ${W().profName} in the lab first and get a partner.`], 'Ranger');
    else { const c = W().cities[m.gateNorth.badge]; await say([`Only trainers holding the *${c.badge}* may travel north.`, `Leader ${c.leader} at the ${c.name} Mastery Hall awards it.`], 'Gatekeeper'); }
    G.world.lp.forEach((q) => { q.dir = 'down'; });
    G.busy--;
  },
  doorBlocked(w) {
    const m = G.world.map; if (w.kind !== 'gym' || m.cityIdx === undefined) return false;
    if (S().flags['trial' + m.cityIdx]) return false;
    G.busy++; say([`Hold on, challenger! The Mastery Hall only admits those who pass the *Study Lab Trial*.`, `The Study Lab is just south-west of here.`], 'Hall Assistant').then(() => G.busy--);
    return true;
  },
  async onEnter(map, prevName) {
    if (map.name !== prevName) ui.banner(map.name);
    if (map.cityIdx !== undefined && map.kind === 'town' && !S().flags['visit' + map.cityIdx]) {
      S().flags['visit' + map.cityIdx] = true; const c = W().cities[map.cityIdx];
      ui.toast(`New city: ${c.name} — ${c.theme}`, 3200);
    }
    this.checkObjective(); autosave();
  },
  checkObjective() {
    const o = objective(); if (o !== G.lastObjective) { if (G.lastObjective !== undefined) ui.toast('★ ' + o, 3600); G.lastObjective = o; }
  },
  async wild(p) {
    const m = G.world.map; const rt = m.encounter || Math.min(9, (+G.world.chapter() || 0) + 1); const [lo, hi] = W().routeLevels(rt); const li = R.pick(W().routeLines(rt)); const lvl = R.int(lo, hi);
    G.busy++; audio.sfx('encounter'); await sleep(350);
    const r = await runBattle({ kind: 'wild', enemies: [{ sp: W().speciesFor(li, lvl), lvl }], qci: G.world.chapter(), biome: m.biome, music: 'battle', seed: W().id + m.id });
    G.world.noEnc = 4; G.busy--;
    await afterBattle(r);
  },
  checkSight(lp) {
    for (const o of G.world.objs) {
      if (o.kind !== 'trainer' || S().trainers[o.key]) continue;
      const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[o.dir];
      for (let k = 1; k <= (o.sight || 4); k++) {
        const x = o.x + d[0] * k, y = o.y + d[1] * k;
        const hit = lp.find((p) => p.x === x && p.y === y);
        if (hit) { spotted(o, hit, k); return; }
        if (SOLID.has(G.world.map.get(x, y)) || G.world.objAt(x, y)) break;
      }
    }
  },
};
G.events = events;

async function spotted(o, p, dist) {
  G.busy++; o.bang = G.world.t + 0.9; audio.sfx('encounter'); await sleep(800);
  const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[o.dir];
  for (let k = 1; k < dist; k++) { const fx = o.x, fy = o.y; o.x += d[0]; o.y += d[1]; const t0 = performance.now(); await new Promise((res) => { const step = () => { const t = Math.min(1, (performance.now() - t0) / 200); o.px = (fx + (o.x - fx) * t) * 16; o.py = (fy + (o.y - fy) * t) * 16; o.moving = t < 1; o.mt = t; if (t < 1) requestAnimationFrame(step); else res(); }; step(); }); }
  o.moving = false; p.dir = { up: 'down', down: 'up', left: 'right', right: 'left' }[o.dir];
  await trainerBattle(o);
  // trainers return to post
  o.x = o.ox; o.y = o.oy; o.px = o.x * 16; o.py = o.y * 16;
  G.busy--;
}
async function trainerBattle(o) {
  const title = `${o.cls} ${o.name}`;
  await say(R.pick(TRAINER_LINES), title);
  const r = await runBattle({ kind: 'trainer', enemies: o.team, trainerTitle: title, trainerPal: personPalette(hash(G.world.map.id + o.i + (o.name || '')), o.pal || {}), money: o.money, qci: o.qci, biome: G.world.map.biome, music: 'battle', seed: o.key, after: R.pick(T_WIN) });
  if (r === 'win') { S().trainers[o.key] = 1; if (o.tip) { await say([`Take this lesson with you:`, termLine(o.tip)], title); learn(o.tip); } }
  await afterBattle(r);
}
export async function afterBattle(r) {
  if (r === 'lose') await whiteout();
  autosave(); events.checkObjective();
}
async function whiteout() {
  const s = S(); const lost = Math.floor(s.money / 2); s.money -= lost;
  await ui.fade(true, 400); healAll(W(), s);
  const h = s.lastHeal || { map: 'home_house', x: 4, y: 5 };
  G.world.load(h.map, s.players.map((_, k) => ({ x: h.x + (k % 2), y: h.y + Math.floor(k / 2) * 0, dir: 'up' })));
  await ui.fade(false, 400);
  await say([`You hurried back to safety and patched up your team.`, lost ? `You dropped ¤${lost} in the rush...` : '', 'Tip: review your missed questions in the Codex before trying again!']);
}

// ------------------------------------------------------------ objective & quests
export function objective() {
  const s = S(); const w = W(); if (!s) return '';
  if (!s.flags.topic) return 'Choose your field of study at the terminal on your desk.';
  if (!s.flags.starter) return `Visit ${w.profName}'s lab and choose a partner monster.`;
  for (let i = 0; i < 8; i++) {
    if (s.badges[i]) continue; const c = w.cities[i];
    if (!s.flags['visit' + i]) return `Travel north to ${c.name} (${c.theme}).`;
    if (!s.flags['trial' + i]) return `Pass the Study Lab Trial in ${c.name}.`;
    return `Defeat Leader ${c.leader} at the ${c.name} Mastery Hall.`;
  }
  if (!s.champion) { const n = [0, 1, 2, 3].filter((k) => s.flags['elite' + k]).length; return n < 4 ? `Climb the Mastery Summit: defeat the Council (${n}/4).` : `Face Champion ${w.champion.name} at the top of the Summit!`; }
  return `You are a Master of ${w.topic.name}! Drill the Codex to stay sharp.`;
}
export function questList() {
  const s = S(), w = W(); const out = [{ title: 'Main Quest', desc: objective(), done: s.champion, main: true }];
  for (let i = 0; i < 8; i++) {
    if (!s.flags['visit' + i]) break; const c = w.cities[i];
    const notes = [0, 1, 2].filter((k) => s.taken[`r${i + 1}n${k}`]).length;
    out.push({ title: `${c.name}: Lost Notes`, desc: `Find the 3 lost notes on Route ${i + 1}. (${notes}/3)`, done: notes >= 3 });
    const li = researchLine(i); out.push({ title: `${c.name}: Field Research`, desc: `Capture a ${w.lines[li].names[0]}-line monster for the Field Researcher.`, done: !!s.flags['research' + i], ready: lineCaught(li) && !s.flags['research' + i] });
    out.push({ title: `${c.name}: Study Stations`, desc: 'Complete the Match, Sequence and Speed stations in the Study Lab.', done: ['match', 'sequence', 'speed'].every((g) => s.flags[`st_${g}${i}`]) });
    out.push({ title: `${c.name}: Mentor's Gift`, desc: 'Visit the house and talk to the Mentor.', done: !!s.flags['gift' + i] });
  }
  return out;
}
const researchLine = (i) => { const pool = W().routeLines(i + 1); return pool[hash(W().id + 'res' + i) % pool.length]; };
const lineCaught = (li) => W().lines[li].ids.some((id) => S().caught[id]);

// ------------------------------------------------------------ handlers
const handlers = {
  async npc(o) {
    if (o.tips && o.tips.length) {
      o.ti = (o.ti || 0); const id = o.tips[o.ti % o.tips.length]; o.ti++;
      await say([LEAD[(o.i + o.ti) % LEAD.length], termLine(id)], o.name); learn(id); return;
    }
    await say(o.lines || ['Hello there!'], o.name);
  },
  async sign(o) { await say(o.text); },
  async item(o) {
    const it = ITEMS[o.item]; S().bag[o.item] = (S().bag[o.item] || 0) + (o.count || 1); S().taken[o.key] = 1; audio.sfx('item');
    await say(`Found ${o.count > 1 ? o.count + '× ' : 'a '}*${it.name}*!`);
  },
  async note(o) {
    S().taken[o.key] = 1; audio.sfx('item'); learn(o.term);
    await say(['You found a lost note!', termLine(o.term)]);
    const r = G.world.map.noteRoute; const n = [0, 1, 2].filter((k) => S().taken[`r${r}n${k}`]).length;
    if (n >= 3 && !S().flags['notes' + r]) { S().flags['notes' + r] = 1; S().bag.shard = (S().bag.shard || 0) + 1; S().money += 300; audio.sfx('badge'); await say(['All 3 lost notes on this route recovered!', 'Reward: *Insight Shard* and ¤300.']); }
    else await say(`(${n}/3 notes found on this route.)`);
  },
  async terminal() {
    if (!S().flags.topic) { await chooseTopic(); return; }
    const c = await ui.choose(`Study Terminal — ${W().topic.name}. ${W().topic.blurb}`, ['Open the Codex', 'Review missed questions', 'Log off']);
    if (c === 0) await menus.codex(); if (c === 1) await menus.reviewDrill();
  },
  async guardian(o) {
    const s = S();
    if (!s.flags.metGuardian) { s.flags.metGuardian = 1; await say([`Morning, ${s.players[0].name}! Big day — you're starting your journey!`, `${W().profName} is waiting at the lab across town.`, 'Come home any time and I\'ll patch up your team.'], 'Guardian'); }
    else await say(['Welcome home! Let me take care of your team.'], 'Guardian');
    healAll(W(), s); s.lastHeal = { map: 'home_house', x: 4, y: 5 }; audio.sfx('heal'); await sleep(900); await say('Your team is fully healed!', 'Guardian');
  },
  async prof(o) {
    const s = S(), w = W(), t = w.topic;
    if (!s.flags.topic) { await say(['Ah, you haven\'t picked a field of study yet!', 'Use the terminal on your desk at home.'], w.profName); return; }
    if (!s.flags.starter) {
      if (!s.flags.profIntro) { s.flags.profIntro = 1; await say([`Welcome! I'm ${w.profName}. So you've chosen *${t.name}*!`, `In the ${w.region}, monsters are born from ideas. Each one embodies a concept from ${t.name}.`, 'They grow stronger when their trainer understands what they embody.', 'In battle you command attacks by answering questions. Right answers hit. Fast answers crit. Wrong answers teach you something.', `${w.cities.length} cities lie north, each teaching a deeper level of ${t.name}. Master them all and you'll be ready for anything — even an interview!`, 'Now — choose your partner from the three capsules on the table.'], w.profName); }
      else await say('Go on, pick a partner from the table!', w.profName);
      return;
    }
    const seen = Object.keys(s.seen).length, caught = Object.keys(s.caught).length;
    await say([`Your Dex: ${seen} seen, ${caught} captured out of ${Object.keys(w.species).length}.`, caught < 10 ? 'Capture more monsters! Each one is a concept you\'ve met.' : 'Splendid research! Keep going.'], w.profName);
  },
  async starter(o, pi) {
    const s = S(), w = W(); const sp = w.species[o.sp]; const p = s.players[pi] || s.players[0];
    if (!s.flags.profIntro) { await say('These capsules belong to the Professor. Better talk to them first.'); return; }
    if (p.party.length) { await say(`${p.name} already has a partner.`); return; }
    const yes = await previewChoose(sp, `${p.name}, will you choose *${sp.name}*?`);
    if (!yes) return;
    const mon = makeMon(w, sp.id, 5); addMon(s, pi, mon); s.seen[sp.id] = 1; s.caught[sp.id] = 1; audio.sfx('catch');
    await say(`${p.name} received *${sp.name}*!`);
    if (s.players.every((q) => q.party.length)) {
      s.flags.starter = 1; s.bag.cube = Math.max(s.bag.cube || 0, 5);
      await say([`A fine choice! ${sp.name} embodies *${sp.concept}*.`, 'Take these Capture Cubes. Weaken wild monsters, then answer the lock-on question to catch them.', 'Press START (Tab / ☰) any time for your menu: team, bag, Codex, quests and more.', `Now head north through Route 1 toward ${w.cities[0].name}. Good luck!`], w.profName);
    }
  },
  async nurse(o) {
    await say('Welcome to the Mend Station! Let me restore your team.', o.name);
    const prev = audio.key; audio.stop(); audio.sfx('heal'); healAll(W(), S()); await sleep(1300);
    const m = G.world.map; S().lastHeal = { map: m.id, x: m.entry?.x ?? 5, y: (m.entry?.y ?? 7) - 1 };
    audio.play(m.musicKey, m.musicKey, m.music); void prev;
    await say('Your monsters are fully healed. Keep learning!', o.name);
  },
  async pc() { await menus.archive(); },
  async clerk(o) { await menus.shop(); },
  async researcher(o) {
    const i = o.ci, s = S(), w = W(); const li = researchLine(i); const ln = w.lines[li];
    if (s.flags['research' + i]) { await say(`Thanks again! ${ln.names[0]} embodies *${ln.concept}*. Fascinating stuff.`, o.name); return; }
    if (lineCaught(li)) { s.flags['research' + i] = 1; s.bag.cube2 = (s.bag.cube2 || 0) + 3; s.bag.shard = (s.bag.shard || 0) + 1; audio.sfx('badge'); await say([`You caught a ${ln.names[0]}-line monster! Its concept is *${ln.concept}*.`, 'Here — 3 Prime Cubes and an Insight Shard for your help!'], o.name); return; }
    await say([`I'm studying ${ln.names[0]} — a ${TYPES[ln.type].name}-type that embodies *${ln.concept}*.`, `They live around Route ${ln.route || i + 1}. Could you capture one for me?`], o.name);
  },
  async labkeeper(o) {
    const i = o.ci, s = S(), c = W().cities[i];
    if (!s.flags['trial' + i]) {
      await say([`Welcome to the ${c.name} Study Lab! Here we study *${c.theme}*.`, 'The stations around the room are practice games. Try them — they reward you the first time!', 'When you\'re ready, take the Trial: 8 questions, get 6 right and you may challenge the Mastery Hall.'], o.name);
      if (await ui.confirm('Take the Study Lab Trial now?')) await puzzles.trial(i);
    } else {
      const ch = await ui.choose(`You passed the trial here! Want a practice round on ${c.theme}?`, ['Practice round', 'Not now']);
      if (ch === 0) await puzzles.trial(i, true);
    }
  },
  async station(o) { await puzzles.station(o.game, o.ci); },
  async gymguide(o) {
    const c = W().cities[o.ci]; const ty = TYPES[c.type]; const counter = weakTo(c.type);
    await say([`Leader ${c.leader} specializes in *${c.theme}*.`, `Their monsters are mostly ${ty.name}-type. ${TYPES[counter].name} moves hit them super hard!`, 'Remember: in here, every question is about ' + c.theme + '. Read the explanations on any you miss.'], o.name);
  },
  async gifter(o) {
    const s = S(), c = W().cities[o.ci];
    if (s.flags[o.key]) { const t = c.terms[(hash(o.key) + (o.ti = (o.ti || 0) + 1)) % c.terms.length]; await say(['Here\'s another thought to chew on:', `*${t.term}* — ${t.def}`], o.name); learn(t.id); return; }
    s.flags[o.key] = 1; s.bag.shard = (s.bag.shard || 0) + 2; audio.sfx('item');
    await say([`You're taking on ${c.name}? Learning beats grinding, every time.`, 'Take these 2 *Insight Shards*. Each one raises a monster by a level.', 'Use them from your Bag.'], o.name);
  },
  async guard(o) {
    if (o.gate === 'starter') { await say(S().flags.starter ? 'Stay on your toes out there!' : 'Get a partner monster from the Professor before you head out!', o.name); return; }
    const c = W().cities[o.ci]; const next = W().cities[o.ci + 1];
    await say(S().badges[o.ci] ? `You hold the ${c.badge}! The road ${next ? 'to ' + next.name : 'to the Mastery Summit'} is open.` : `North is closed to those without the ${c.badge}.`, o.name);
  },
  async trainer(o) {
    if (S().trainers[o.key]) { if (o.tip) { await say(termLine(o.tip), `${o.cls} ${o.name}`); learn(o.tip); } else await say(R.pick(T_WIN), `${o.cls} ${o.name}`); return; }
    await trainerBattle(o);
  },
  async leader(o) {
    const i = o.ci, s = S(), w = W(), c = w.cities[i]; const title = `Leader ${c.leader}`;
    const rematch = s.badges[i];
    if (rematch && !(await ui.confirm(`${title}: "Back for a practice battle?"`))) return;
    if (!rematch) await say(c.intro ? [c.intro] : [`I am ${c.leader}, Leader of the ${c.name} Mastery Hall.`, `Here we test your grasp of *${c.theme}*.`, 'Show me you truly understand!'], title);
    const team = w.leaderTeam(i).map((t) => rematch ? { ...t, lvl: t.lvl + 4 } : t);
    const r = await runBattle({ kind: 'leader', enemies: team, trainerTitle: title, trainerPal: personPalette(hash(G.world.map.id + o.i + o.name), { shirt: TYPES[c.type].color }), money: w.leaderLevel(i) * 60, qci: i, biome: G.world.map.biome, music: 'gym', seed: 'leader' + i, introMsg: `${title} wants to battle!` });
    if (r === 'win' && !rematch) {
      s.badges[i] = true; audio.sfx('badge'); s.bag.shard = (s.bag.shard || 0) + 2;
      await say([`Incredible. You've mastered ${c.theme}.`, `Take the *${c.badge}* as proof!`], title);
      await menus.badgeCeremony(i);
      const key = c.terms.slice(0, 3).map((t) => `• ${t.term}`).join('\n');
      await say([`Before you go, the core ideas of ${c.theme}:\n${key}`, `I'm also giving you 2 Insight Shards. ${w.cities[i + 1] ? `Next up: ${w.cities[i + 1].name}, where you'll study ${w.cities[i + 1].theme}.` : 'Only the Mastery Summit remains!'}`], title);
    }
    await afterBattle(r);
  },
  async elite(o) {
    const s = S(), w = W(); const e = w.elite[o.idx]; const title = `${e.title} ${e.name}`;
    await say([`Welcome to the Mastery Summit. I am ${e.name}.`, `I'll test everything you learned — and the ${TYPES[e.type].name} type is my specialty.`], title);
    let lines = w.lines.filter((l) => l.type === e.type).map((l) => l.li); if (lines.length < 2) lines = w.lines.map((l) => l.li);
    const team = w.makeTeam(hash(w.id + 'elite' + o.idx), lines, 5, 54 + o.idx * 2).map((t) => ({ ...t, sp: w.speciesFor(w.species[t.sp].li, t.lvl) }));
    const r = await runBattle({ kind: 'elite', enemies: team, trainerTitle: title, trainerPal: personPalette(hash('elite' + o.idx), { shirt: TYPES[e.type].color }), money: 4000, qci: 'final', music: 'gym', seed: 'elite' + o.idx });
    if (r === 'win') { s.flags['elite' + o.idx] = 1; await say(['Impressive. Proceed upward.'], title); }
    await afterBattle(r);
  },
  async champion(o) {
    const s = S(), w = W(); const title = `${w.champion.title} ${w.champion.name}`;
    if (s.champion) { if (await ui.confirm(`${title}: "A rematch, Master?"`)) { /* fallthrough */ } else return; }
    else await say([`So you've reached the peak. I'm ${w.champion.name}.`, `Everything about ${w.topic.name} — from the very first city to the hardest ideas — is fair game.`, 'Show me you are a true Master!'], title);
    const lines = w.lines.map((l) => l.li);
    const team = w.makeTeam(hash(w.id + 'champ'), lines, 6, 64).map((t) => ({ ...t, sp: w.speciesFor(w.species[t.sp].li, t.lvl) }));
    const r = await runBattle({ kind: 'champion', enemies: team, trainerTitle: title, trainerPal: personPalette(hash('champ'), { shirt: '#ffd23f', coat: true }), money: 10000, qci: 'final', music: 'gym', seed: 'champion' });
    if (r === 'win' && !s.champion) { s.champion = true; await say(['...Magnificent.', `You are a true Master of ${w.topic.name}.`], title); await menus.ending(); }
    await afterBattle(r);
  },
};

async function previewChoose(sp, text) {
  return new Promise((res) => {
    ui.panel({ title: 'Partner Capsule', cls: 'preview', render: () => `<div class="pv"><img class="big" src="${G.mini(sp, 4)}"><div><h3>${esc(sp.name)}</h3><p><span class="type t-${sp.type}">${TYPES[sp.type].name}</span></p><p>Embodies: <b>${esc(sp.concept)}</b></p><p class="dim">Strong vs ${TYPES[beats(sp.type)].name} · Weak vs ${TYPES[weakTo(sp.type)].name}</p><p>${fmt(esc(text))}</p><div class="row"><button data-nav data-act="yes">Choose</button><button data-nav data-act="no">Not yet</button></div></div></div>`,
      actions: { yes: () => { res(true); return 'close'; }, no: () => { res(false); return 'close'; } } }).then(() => res(false));
  });
}

export async function chooseTopic() {
  const list = topics(); const cats = [['tech', 'Tech & Engineering'], ['school', 'School Subjects']];
  const card = (t) => `<button data-nav data-act="pick" data-arg="${t.id}" class="tcard"><span class="ti">${esc(t.icon || '◆')}</span><b>${esc(t.name)}</b><small>${esc(t.level || '')}</small><span class="tb">${esc(t.blurb)}</span></button>`;
  const picked = await new Promise((res) => {
    ui.panel({ title: 'Choose your field of study', wide: true, cls: 'topics', cols: 3,
      render: () => `<p class="dim">This choice shapes the whole world: its monsters, cities, leaders and lessons. Each save slot studies one topic.</p>` + cats.map(([k, label]) => `<h4>${label}</h4><div class="tgrid">${list.filter((t) => (k === 'tech' ? t.cat === 'tech' : t.cat !== 'tech')).map(card).join('')}</div>`).join(''),
      actions: { pick: (id) => { res(id); return 'close'; } } }).then(() => res(null));
  });
  if (!picked) return;
  const t = list.find((x) => x.id === picked);
  if (!(await ui.confirm(`Study *${t.name}* for this adventure? (You can start other topics in other save slots.)`))) return;
  S().topic = picked; S().flags.topic = 1; G.W = getWorld(picked);
  G.world.load(G.world.map.id, S().pos);
  audio.sfx('badge');
  await say([`Field of study set: *${t.name}*.`, `The ${G.W.region} awaits. Head downstairs and out to ${G.W.profName}'s lab!`]);
  events.checkObjective(); autosave();
}
