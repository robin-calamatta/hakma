// The Static Syndicate storyline, side quests, special shops/services and the longboard.
import { G, ITEMS, makeMon, healAll, addMon, monName, badgeCount, maxHp } from './state.js';
import { ui, fmt } from './ui.js';
import { audio } from '../core/audio.js';
import { R, esc, hash } from '../core/rng.js';
import { runBattle } from './battle.js';
import { TYPES } from '../content/types.js';
import { getMap, worldSeed, zoneInfo } from './maps.js';
import { SCEN, scenOf, scenActive, archOf } from './places.js';

const S = () => G.save, W = () => G.W;
const say = (lines, name) => ui.say(lines, { name });
const give = async (id, n = 1, who) => { S().bag[id] = (S().bag[id] || 0) + n; audio.sfx('item'); await say(`Received ${n > 1 ? n + '× ' : ''}*${ITEMS[id]?.name || id}*!`, who); };
const pay = (amt) => { if (S().money < amt) { ui.toast('Not enough credits.'); return false; } S().money -= amt; return true; };
const cityName = (i) => W().cities[i]?.name || 'town';

// ------------------------------------------------------------ scenarios
export function scenarioDesc(i) { const sc = scenOf(i); return sc ? sc.desc(cityName(i)) : ''; }
export function gymBlock(i) { // message when a scenario keeps the Hall shut, or null
  if (!scenActive(S(), i)) return null; const sc = scenOf(i); const c = cityName(i);
  return {
    kidnap: [['Please, you have to help! The Static Syndicate took my kid!', 'They dragged her up the Old Watchtower. The Hall Leader won\'t battle until she\'s safe — nobody can focus!'], 'Frantic Parent'],
    lockdown: [['LOCKDOWN. By order of the Static Syndicate, this Hall is closed.', 'Beat every grunt in town if you want it open. Ha!'], 'Syndicate Sign'],
    lost: [[`Leader ${W().cities[i].leader} went into the Tangle Caverns after the Syndicate and hasn't come back.`, 'The Hall can\'t open without them. Please — find them!'], 'Hall Assistant'],
    blackout: [['The power\'s out! The Hall\'s training machines are dead.', 'The Syndicate cut the breakers at the Power Plant. Someone has to turn them back on.'], 'Hall Assistant'],
    haunt: [[`The Hall's relic was stolen and hidden in the Hollow Crypt.`, 'No relic, no badge ceremony. And that crypt… people say the dead walk there.'], 'Hall Assistant'],
    hq: [[`The Syndicate is holding ${c}'s Hall hostage from their tower.`, 'Take down Kingpin Vex at the top and the Hall is yours to challenge.'], 'Hall Assistant'],
    laststand: [['Two Syndicate admins are camped in front of the Hall. Beat them both!'], 'Hall Assistant'],
  }[sc.id];
}
export async function cityArrive(i) {
  const s = S(); if (!worldSeed()) return; const a = archOf(W(), i);
  if (a && !s.flags['archgreet' + i]) { s.flags['archgreet' + i] = 1; ui.toast(`${a.label}: ${a.greet}`, 4200); }
  const sc = scenOf(i); if (sc && scenActive(s, i) && !s.flags['scenseen' + i]) { s.flags['scenseen' + i] = 1; await say([`⚠ ${sc.title}!`, sc.desc(cityName(i))], 'News Flash'); }
}
async function resolve(i, lines, who) {
  const s = S(); if (s.flags['mob' + i]) return; s.flags['mob' + i] = 1; audio.sfx('evolve');
  if (lines) await say(lines, who);
  ui.toast(`✔ ${SCEN[i].title} — the ${cityName(i)} Mastery Hall is open!`, 3600); G.autosave?.();
}
export async function onTrainerBeaten(o, mate) {
  const s = S(); const keys = [o.key, mate?.key].filter(Boolean);
  if (o.syndicate || mate?.syndicate) { s.stats.syndicate = (s.stats.syndicate || 0) + (mate ? 2 : 1); }
  for (const id of Object.keys(s.sq || {})) { const q = s.sq[id]; if (q.st === 'active' && (q.t === 'defeat' || (q.t === 'bounty' && (o.syndicate || mate?.syndicate)))) q.n = (q.n || 0) + (mate ? 2 : 1); }
  // lockdown: every grunt in that city beaten
  for (let i = 0; i < 8; i++) if (scenOf(i)?.id === 'lockdown' && scenActive(s, i) && keys.some((k) => k.startsWith(`mob${i}g`))) {
    const left = getMap(W(), 'city' + i).objs.filter((q) => q.key?.startsWith(`mob${i}g`) && !s.trainers[q.key]).length;
    if (!left) await resolve(i, ['That was the last of them! The lockdown is over!', 'The Mend Station and the Mastery Hall are open again.'], 'Townsfolk'); else ui.toast(`Lockdown: ${left} grunt${left > 1 ? 's' : ''} left in ${cityName(i)}`, 2600);
  }
  for (const k of keys) {
    let m;
    if ((m = k.match(/^crypt(\d)boss$/))) { await say(['The Grave Warden crumbles to dust… and the stolen Hall relic clatters to the floor.', 'You picked up the *Hall Relic*! Return it to town.'], 'Hollow Crypt'); await resolve(+m[1], null); }
    if ((m = k.match(/^hq(\d)boss$/))) await hqVictory(+m[1]);
    if ((m = k.match(/^mob(\d)a$/))) await resolve(+m[1], ['The admins scatter! The Syndicate is finished in this town for good.'], 'Hall Assistant');
  }
}
async function hqVictory(i) {
  const s = S(); const w = W(); if (s.flags.synbadge) return; s.flags.synbadge = 1;
  await say(['Vex: …Fine. The Static Syndicate is through.', 'Vex: Take my partner. It never liked working for me anyway.'], 'Kingpin Vex');
  // a fierce, rare, shimmering final-form Hakma
  const finals = Object.values(w.species).filter((sp) => sp.stage === sp.stages - 1 && sp.stages > 1 && !['legendary', 'mythic'].includes(sp.rarity));
  const pick = finals.sort((a, b) => hash(worldSeed() + a.id) - hash(worldSeed() + b.id)).find((sp) => sp.rarity === 'epic') || finals[0];
  if (pick) { const lvl = Math.max(...s.players.flatMap((p) => p.party.map((m) => m.lvl)), 20) + 2; const mon = makeMon(w, pick.id, lvl); mon.shiny = true; mon.nick = null; const where = addMon(s, 0, mon); s.caught[pick.id] = 1; s.seen[pick.id] = 1;
    audio.sfx('catch'); await say([`You received a Prismatic *${pick.name}* (Lv ${lvl})!`, where === 'box' ? 'Your team is full, so it went to the Archive Box.' : 'It joined your team, crackling with power.'], 'Syndicate Tower'); }
  await ui.panel({ title: 'Special badge!', cls: 'badgecer', render: () => `<div class="badgeshow"><div class="badge-ico" style="--c:#d8303a"><span>⚡</span></div><h3>Syndicate Breaker Badge</h3><p>You took down Kingpin Vex and the Static Syndicate.</p><div class="row"><button data-nav data-act="ok" class="primary">Awesome!</button></div></div>`, actions: { ok: () => 'close' } });
  await resolve(i, ['The Syndicate Tower is ours! The Hall is open again.'], 'Hall Assistant');
}

// ------------------------------------------------------------ side quests
const QT = [
  { t: 'catch', need: 1, text: (q) => `Could you catch a ${TYPES[q.type]?.name || q.type}-type Hakma? I've always wanted to see one up close.`, prog: (q) => (Object.keys(S().caught).some((id) => W().species[id]?.type === q.type) ? 1 : 0) },
  { t: 'defeat', need: 5, text: () => 'Win 5 trainer battles and come tell me about it. I need some inspiration!', prog: (q) => q.n || 0 },
  { t: 'answer', need: 20, text: () => 'Answer 20 questions correctly in battle. Knowledge is power, right?', prog: (q) => q.n || 0 },
  { t: 'fetch', need: 3, text: () => 'My Hakma are worn out. Could you bring me 3 Mend Tonics?', prog: () => S().bag.tonic || 0 },
  { t: 'visit', need: 1, text: (q) => `Have you been to ${zoneInfo(q.zone)?.name || 'the wilds'}? Go there and tell me what it's like!`, prog: (q) => (S().flags['zvisit' + q.zone] ? 1 : 0) },
  { t: 'lessons', need: 3, text: (q) => `Read 3 lessons at the ${cityName(q.ci)} Academy. Trust me, it helps.`, prog: (q) => Object.keys(S().read || {}).filter((k) => k.startsWith(q.ci + ':')).length },
  { t: 'pet', need: 5, text: () => 'Hakma love affection. Pet your partner 5 times — just walk up to it and press A!', prog: () => S().players.flatMap((p) => p.party).reduce((a, m) => a + (m.pets || 0), 0) - (S().sq?.__petBase || 0) },
  { t: 'bounty', need: 4, text: () => 'Bounty: defeat 4 Static Syndicate grunts anywhere in the region.', prog: (q) => q.n || 0 },
];
const REWARDS = [['cube2', 3], ['supertonic', 3], ['maxtonic', 1], ['revive', 2], ['cube3', 1]];
function questDef(qid) { const [, ci] = qid.match(/^q(\d)/) || [0, 0]; const h = hash(worldSeed() + qid); const sheriff = qid.endsWith('_sh'); const T = sheriff ? QT[7] : QT[h % 7];
  const types = Object.keys(TYPES).filter((k) => Object.values(W().species).some((sp) => sp.type === k));
  return { qid, t: T.t, T, ci: +ci, type: types[h % types.length], zone: Math.min(9, +ci + 1 + (h % 2)), reward: REWARDS[(h >> 3) % REWARDS.length], money: 200 + (+ci) * 120 }; }
export function questEntries() {
  const s = S(); const out = [];
  for (const [qid, q] of Object.entries(s.sq || {})) { if (qid.startsWith('__')) continue; const d = questDef(qid); const p = Math.min(d.T.need, d.T.prog(q)); out.push({ title: `Side quest: ${cityName(d.ci)}`, desc: `${d.T.text(d)} (${p}/${d.T.need})${q.st === 'done' ? '' : p >= d.T.need ? ' — go back and report!' : ''}`, done: q.st === 'done', ready: q.st !== 'done' && p >= d.T.need }); }
  if (worldSeed()) for (let i = 0; i < 8; i++) { const sc = scenOf(i); if (!sc || !s.flags['visit' + i]) continue; out.push({ title: `⚡ ${sc.title} (${cityName(i)})`, desc: sc.desc(cityName(i)), done: !!s.flags['mob' + i], main: true }); }
  if (s.flags.synbadge) out.push({ title: '⚡ Syndicate Breaker', desc: 'You defeated Kingpin Vex and the Static Syndicate.', done: true });
  return out;
}
export function tick(kind, v) { const s = S(); for (const q of Object.values(s.sq || {})) if (q && q.st === 'active' && kind === 'answer' && v && q.t === 'answer') q.n = (q.n || 0) + 1; }
async function questGiver(o) {
  const s = S(); s.sq = s.sq || {}; const d = questDef(o.qid); const q = s.sq[o.qid];
  if (!q) { await say(d.T.text(d), o.name); const c = await ui.choose('Accept this side quest?', ['Sure!', 'Maybe later']); if (c !== 0) return;
    s.sq[o.qid] = { st: 'active', t: d.t, n: 0 }; if (d.t === 'pet') s.sq.__petBase = S().players.flatMap((p) => p.party).reduce((a, m) => a + (m.pets || 0), 0); ui.toast('📜 Side quest added to your Quest Log', 2400); return; }
  if (q.st === 'done') { await say(['Thanks again for your help!', ...(R() < 0.5 ? [] : ['Have you tried every subject\'s arcade games? I\'m hooked.'])], o.name); return; }
  const p = d.T.prog(q);
  if (p < d.T.need) { await say([d.T.text(d), `So far: ${Math.min(p, d.T.need)}/${d.T.need}.`], o.name); return; }
  if (d.t === 'fetch') S().bag.tonic -= 3;
  q.st = 'done'; audio.sfx('levelup'); await say(['You did it! Thank you so much!', `Here's ¤${d.money} for your trouble.`], o.name); s.money += d.money; await give(d.reward[0], d.reward[1], o.name); G.autosave?.();
}

// ------------------------------------------------------------ shops & services
const SHOPS = { mart: null, cubes: ['cube', 'cube2', 'cube3'], tms: Object.keys(ITEMS).filter((k) => ITEMS[k].kind === 'tm'), fish: ['tonic', 'supertonic', 'revive'], farm: ['tonic', 'supertonic'], bazaar: null };
async function shopPanel(title, ids, mult = 1) {
  await ui.panel({ title, render: () => `<p>Credits: <b>¤${S().money}</b></p><div class="ilist">${ids.map((id) => `<button data-nav data-act="buy" data-arg="${id}" class="irow"><b>${esc(ITEMS[id].name)}</b><span class="cnt">¤${Math.round(ITEMS[id].price * mult)}</span><small>${esc(ITEMS[id].desc)}</small></button>`).join('')}</div>`,
    actions: { buy: async (id) => { const price = Math.round(ITEMS[id].price * mult); const max = Math.floor(S().money / price); if (!max) { ui.toast('Not enough credits.'); return; } const qs = [1, 5, 10].filter((n) => n <= max); const c = await ui.choose(`Buy how many ${ITEMS[id].name}?`, qs.map((n) => `${n} — ¤${n * price}`)); if (c < 0) return; S().money -= qs[c] * price; S().bag[id] = (S().bag[id] || 0) + qs[c]; audio.sfx('item'); ui.toast(`Bought ${qs[c]}× ${ITEMS[id].name}`); } } });
}
async function mallShop(o) {
  const b = badgeCount(S());
  if (o.shop === 'mart') return G.menus.shop();
  if (o.shop === 'food') { await say('Welcome to the Food Court! A hearty meal for your whole team is ¤150.', o.name); if ((await ui.choose('Buy a team meal (¤150)?', ['Yes please', 'No thanks'])) === 0 && pay(150)) { healAll(W(), S()); audio.sfx('heal'); await say('Your Hakma chowed down. Everyone is fully restored!', o.name); } return; }
  if (o.shop === 'books') { const terms = W().cities[Math.min(7, G.world.map.ci || 0)].terms; const T = terms[R.int(0, terms.length - 1)]; await say(['You flip through a study guide…', `*${T.term}* — ${T.def}`], o.name); return; }
  if (o.shop === 'bazaar') { const day = new Date().toDateString(); const pool = ['cube3', 'maxtonic', 'revive', 'cube2', ...SHOPS.tms]; const ids = [0, 1, 2].map((k) => pool[hash(day + worldSeed() + k) % pool.length]).filter((v, k, a) => a.indexOf(v) === k); await say('Rare wares from far away! My stock changes every day.', o.name); return shopPanel('Ember Bazaar', ids, 1.1); }
  const ids = (SHOPS[o.shop] || []).filter((id) => (ITEMS[id].badge || 0) <= b || o.shop === 'fish' || o.shop === 'farm');
  if (!ids.length) { await say('Come back when you have more badges — I only sell to proven trainers.', o.name); return; }
  return shopPanel(o.name, ids, o.shop === 'fish' || o.shop === 'farm' ? 0.8 : 1);
}

// ------------------------------------------------------------ handlers merged into the event system
export const storyHandlers = {
  quest: questGiver,
  mallshop: mallShop,
  async stylist(o) { await say('Welcome to the Style Studio! Let\'s find your look.', o.name); await G.wardrobe?.(0); },
  async deco(o) { if (o.scope) { await say(['You peer through the telescope… the whole region spreads out below.']); return G.menus.regionMap(); } if (o.text) await say(o.text); },
  async kid(o) {
    const s = S(); if (s.flags['mob' + o.ci]) { await say('Thanks for saving me! I\'m going home now.', o.name); return; }
    const capt = G.world.objs.find((q) => q.key === `watch${o.ci}boss`); if (capt && !s.trainers[capt.key]) { await say(['Help! The captain won\'t let me go!'], o.name); return; }
    S().flags['scenseen' + o.ci] = 1; await say(['You came for me!', 'Let\'s get out of here — my parent must be so worried!'], o.name); await G.world.warp('city' + o.ci, ...gymFront(o.ci), 'up');
    await resolve(o.ci, ['My kid is safe! Thank you, thank you!', 'The Hall Leader can finally focus. Go get that badge!'], 'Grateful Parent');
  },
  async hostage(o) {
    if (S().flags['mob' + o.ci]) return say('Thanks again. Meet me at the Hall!', o.name);
    S().flags['scenseen' + o.ci] = 1; await say(['Am I glad to see you! I\'ve been lost down here for days.', 'These tunnels loop back on themselves… Let\'s go!'], o.name); await G.world.warp('city' + o.ci, ...gymFront(o.ci), 'up');
    await resolve(o.ci, ['Phew! Fresh air. I\'ll be waiting in the Mastery Hall.'], `Leader ${W().cities[o.ci].leader}`);
  },
  async switch(o) {
    const s = S(); const k = `sw${o.ci}_${o.sw}`; if (s.flags[k]) { await say('This breaker is already ON.'); return; }
    const guards = G.world.objs.filter((q) => q.key?.startsWith(`power${o.ci}g`) && !s.trainers[q.key]); if (guards.length > 1) { await say('A grunt yells: "Hands off the breakers!" — beat the guards first.'); return; }
    s.flags[k] = 1; audio.sfx('boost'); const on = [0, 1, 2].filter((n) => s.flags[`sw${o.ci}_${n}`]).length;
    if (on < 3) { await say(`CLUNK! Breaker ${on} of 3 is back on.`); return; }
    await resolve(o.ci, ['CLUNK! The last breaker slams into place. The turbines roar back to life!', 'The lights come back on all over town.'], 'Power Plant');
  },
  async bartender(o) {
    await say('Howdy, stranger. What\'ll it be?', o.name);
    const c = await ui.choose('Saloon menu', ['🥤 Sarsaparilla — heals your team (¤80)', '⚡ Prairie Fizz — +1 attack next battle (¤120)', '🌵 Cactus Cooler — cures conditions (¤60)', 'Just looking']);
    if (c === 0 && pay(80)) { for (const p of S().players) for (const m of p.party) if (m.hp > 0) m.hp = Math.min(maxHp(W(), m), m.hp + Math.ceil(maxHp(W(), m) / 2)); audio.sfx('heal'); await say('You slide a frosty sarsaparilla down the bar. Your team perks right up!', o.name); }
    if (c === 1 && pay(120)) { S().flags.fizz = 1; audio.sfx('boost'); await say('That Prairie Fizz has a kick! Your Hakma will hit harder in the next battle.', o.name); }
    if (c === 2 && pay(60)) { for (const p of S().players) for (const m of p.party) delete m.status; audio.sfx('heal'); await say('Cool and refreshing. Any poison, burns or sickness are gone.', o.name); }
  },
  async sheriff(o) { await say(['These Syndicate outlaws have been runnin\' wild. I could use a deputy.'], o.name); return questGiver({ ...o, qid: `q${G.world.map.ci}_sh` }); },
  async cocoa(o) { await say('Cold out there! Hot cocoa warms everyone up — on the house.', o.name); healAll(W(), S()); audio.sfx('heal'); await say('Your team sips cocoa by the fire. Fully restored!', o.name); },
  async milk(o) { await say('Fresh milk, straight from the barn! It\'ll put the bounce back in your Hakma.', o.name); if ((await ui.choose('Buy a bottle for the team (¤50)?', ['Yes', 'No'])) === 0 && pay(50)) { healAll(W(), S()); audio.sfx('heal'); await say('Mmm! Everyone is fully restored.', o.name); } },
  async spring(o) { await say('Take a soak — the minerals heal anything.', o.name); healAll(W(), S()); for (const p of S().players) for (const m of p.party) delete m.status; audio.sfx('heal'); await say('Ahh… Your team is fully healed and refreshed.', o.name); },
  async cablecar(o) {
    const s = S(); const opts = W().cities.map((c, k) => ({ c, k })).filter(({ k }) => k !== o.ci && s.flags['visit' + k]);
    if (!opts.length) { await say('The cable car runs to other towns you\'ve visited. Come back once you\'ve explored a bit!', o.name); return; }
    const c = await ui.choose('Ride the cable car to…', [...opts.map(({ c }) => c.name), 'Cancel']); if (c < 0 || c >= opts.length) return;
    await say('All aboard! Enjoy the view.', o.name); await G.events.fly('city' + opts[c].k);
  },
  async vr(o) {
    await say(['Welcome to the VR Arena! Fight a simulated trainer at your level.', 'No credits here — but your Hakma earn real experience.'], o.name);
    if ((await ui.choose('Start a simulation?', ['Jack in!', 'Not now'])) !== 0) return;
    const w = W(); const lvl = Math.max(...S().players[0].party.map((m) => m.lvl)); const team = w.makeTeam(hash(Date.now() + 'vr'), w.routeLines(Math.min(9, (G.world.map.ci || 0) + 1)), 3, lvl);
    const r = await runBattle({ kind: 'trainer', enemies: team, trainerTitle: 'Sim Trainer', trainerPal: { shirt: '#4cf0ff', hat: '#202040', skin: '#9fe8ff' }, money: 0, qci: G.world.map.ci || 0, biome: 'neon', music: 'battle' });
    if (r === 'lose') { healAll(W(), S()); await say('Simulation ended. Don\'t worry — VR damage isn\'t real. Your team is restored.', o.name); }
  },
  async skater(o) {
    const s = S(); if (s.flags.longboard) { await say(['How\'s the board riding? Menu → 🛹 Longboard to hop on or off.', 'It\'s faster than running, but you\'ll step off indoors and in water.'], o.name); return; }
    await say(['Wanna cruise faster than you can run? Check out this LONGBOARD.', 'It\'s ¤2,500 — or free if you\'ve earned 6 badges. Riders gotta be legit.'], o.name);
    const free = badgeCount(s) >= 6; const c = await ui.choose(free ? 'Take the longboard (free)?' : 'Buy the longboard for ¤2,500?', ['Yes!', 'Not now']); if (c !== 0) return;
    if (!free && !pay(2500)) return; s.flags.longboard = 1; s.flags.boardOn = 1; audio.sfx('levelup');
    await say(['You got the *Longboard*! 🛹', 'You\'re riding it now. Turn it on or off any time from the Menu → 🛹 Longboard.'], o.name); G.autosave?.();
  },
};
function gymFront(i) { const cm = getMap(W(), 'city' + i); const d = cm.warps.find((q) => q.door && q.kind === 'gym'); return [d.x, d.y + 1]; }
G.story = { tick, onTrainerBeaten, questEntries, gymBlock, cityArrive };
