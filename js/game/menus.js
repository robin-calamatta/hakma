// Start menu and all sub-screens.
import { chronoLog, echoBattle, timeTick } from './time.js';
import { dueEchoes } from './state.js';
import { G, ITEMS, stats, maxHp, movesOf, monName, xpToNext, gainXp, healMon, newPlayer, makeMon, addMon, badgeCount, chapter, writeSlot, saveSettings, recordAnswer, addCodex } from './state.js';
import { ui, fmt } from './ui.js';
import { audio } from '../core/audio.js';
import { input } from '../core/input.js';
import { esc, clamp, R, sleep } from '../core/rng.js';
import { TYPES, beats, weakTo, typeCycleText } from '../content/types.js';
import { questList, objective } from './events.js';
import { monRow, evolveScene } from './battle.js';
import { checkEvolve, evolve, FIELD_SKILLS, tmMove } from './state.js';
import { BIOMES } from '../core/sprites.js';
import { biomeOf, worldSeed } from './maps.js';
import { learnMore, externalOn } from './learn.js';
import { hash, rng } from '../core/rng.js';
import { itemIcon } from '../core/sprites.js';
import { CONFIG } from '../config.js';
import { editControls } from '../core/touchlayout.js';

const S = () => G.save, W = () => G.W;

export async function mainMenu(pi = 0) {
  G.busy++; timeTick();
  for (;;) {
    const online = G.net?.online;
    let items = [
      ['team', '◈ Team'], ['map', '🗺 Map'], ['dex', '◉ Dex'], ['bag', '🎒 Bag'], ['codex', '📘 Codex & Drills'], ['quests', '★ Quests'], ['time', `⏳ Chrono Log${dueEchoes(S()).length ? ` <i class="badge">${dueEchoes(S()).length}</i>` : ''}`], ['mastery', '▲ Mastery'],
      ['friends', `👥 Friends & Co-op${online ? ' <i class="dot on"></i>' : ''}`], ['look', '👕 Wardrobe'], ['players', '🎮 Local Players'], ['save', '💾 Save'], ['settings', '⚙ Settings'], ['help', '? Help & Legal'], ['title', '⏏ Title Screen'],
    ];
    if (!CONFIG.ONLINE) items = CONFIG.CLOUD_SAVES ? items.map((it) => (it[0] === 'friends' ? ['friends', G.net?.authed ? '☁ Account & Cloud' : '☁ Log in / Cloud Save'] : it)) : items.filter(([k]) => k !== 'friends');
    const c = await ui.choose(`${S().players[pi]?.name || ''} · ¤${S().money} · Badges ${badgeCount(S())}/8 — ${objective()}`, items.map(([, h]) => ({ html: h })), { cls: 'mainmenu', start: G.menuIdx || 0, cols: 2 });
    if (c < 0) break; G.menuIdx = c; const k = items[c][0];
    if (k === 'map') { const dest = await regionMap(); if (dest) { ui.closeAll(); G.busy--; await G.events.fly(dest); return; } }
    if (k === 'time') { const go = await chronoLog(); if (go === 'echo') { ui.closeAll(); G.busy--; await echoBattle(); return; } }
    if (k === 'team') await team(pi); if (k === 'dex') await dex(); if (k === 'bag') await bag(pi); if (k === 'codex') await codex(); if (k === 'quests') await quests(); if (k === 'mastery') await mastery();
    if (k === 'friends') await G.netui.friends(); if (k === 'look') { const pi = G.save.players.length > 1 ? await ui.choose('Whose look?', G.save.players.map((p, i) => `P${i + 1} ${esc(p.name)}`)) : 0; if (pi >= 0) await G.wardrobe(pi); } if (k === 'players') await players(); if (k === 'settings') await settings(); if (k === 'help') await help();
    if (k === 'save') { G.autosave(true); ui.toast('Game saved' + (CONFIG.ONLINE && G.net?.authed ? ' · synced to cloud' : '')); }
    if (k === 'title') { if (await ui.confirm('Save and return to the title screen?')) { G.autosave(true); ui.closeAll(); G.busy = 0; G.toTitle(); return; } }
  }
  G.busy--;
}

// ------------------------------------------------------------ team & summary
export async function team(pi = 0) {
  let p = pi;
  await ui.panel({ title: 'Team', wide: true, onLR: S().players.length > 1 ? (d, rr) => { p = (p + d + S().players.length) % S().players.length; rr(); } : null,
    render: () => { const P = S().players[p]; return `${S().players.length > 1 ? `<div class="tabs">${S().players.map((q, k) => `<button data-nav data-act="pl" data-arg="${k}" class="${k === p ? 'on' : ''}" style="border-color:${q.color}">P${k + 1} ${esc(q.name)}</button>`).join('')}</div>` : ''}
      <div class="mlist">${P.party.map((m, k) => `<button data-nav data-act="mon" data-arg="${k}" class="mrow">${monRow(W(), m)}</button>`).join('') || '<p>No monsters yet.</p>'}</div><p class="dim">Select a monster for details, item use, nicknames and order. Your first healthy monster leads in battle.</p>`; },
    actions: { pl: (k) => { p = +k; }, mon: async (k) => { await monMenu(p, +k); } } });
}
async function monMenu(p, k) {
  const P = S().players[p]; const m = P.party[k]; if (!m) return;
  const walking = p === 0 && S().follower === m.uid;
  const opts = ['Summary', 'Move to front', 'Give nickname', 'Use item', ...(p === 0 ? [walking ? '🐾 Stop walking with me' : '🐾 Walk with me'] : []), 'Back'];
  const c = await ui.choose(`${monName(W(), m)} — Lv ${m.lvl}`, opts);
  if (opts[c] && opts[c].startsWith('🐾')) { S().follower = walking ? null : m.uid; G.world?.initFollower(); if (!walking) G.world?.emote('♥'); ui.toast(walking ? `${monName(W(), m)} hops back into its capsule.` : `${monName(W(), m)} will walk with you!`); return; }
  if (c === 0) await summary(m);
  if (c === 1) { P.party.splice(k, 1); P.party.unshift(m); }
  if (c === 2) { const n = await ui.prompt('Nickname (blank to reset)', m.nick || '', 12); m.nick = n && n !== W().species[m.sp].name ? n : null; }
  if (c === 3) await useItemOn(p, m);
}
export async function summary(m, readonly) {
  const w = W(); const sp = w.species[m.sp]; const st = stats(w, m); const mv = movesOf(w, m); const all = sp.moves.concat((m.tms || []).filter((id) => ITEMS[id]).map(tmMove));
  const line = w.lines[sp.li]; const term = w.terms.find((t) => t.id === sp.termId) || w.terms.find((t) => t.term.toLowerCase() === sp.concept.toLowerCase());
  await ui.panel({ title: esc(monName(w, m)), wide: true, cls: 'summary', render: () => `<div class="pv"><img class="big" src="${G.mini(sp, m.era)}"><div>
    <h3>${esc(sp.name)} <span class="lv">Lv${m.lvl}</span></h3><p><span class="type t-${sp.type}">${TYPES[sp.type].name}</span> <span class="dim">Stage ${sp.stage + 1}/${sp.stages}${sp.evolveAt ? ` · evolves at Lv ${sp.evolveAt}` : ''}</span></p>
    <p>Embodies: <b>${esc(sp.concept)}</b>${term ? `<br><span class="dim">${esc(term.def)}</span>` : sp.dex ? `<br><span class="dim">${esc(sp.dex)}</span>` : ''}</p>${term ? `<p class="dim">Chapter ${term.ci + 1}: ${esc(w.cities[term.ci].theme)}</p>` : ''}
    <p class="dim">Strong vs ${TYPES[beats(sp.type)].name} · Weak vs ${TYPES[weakTo(sp.type)].name} · Line: ${line.names.map(esc).join(' → ')}</p>
    <div class="stats"><span>HP ${Math.ceil(m.hp)}/${st.hp}</span><span>ATK ${st.atk}</span><span>DEF ${st.def}</span><span>SPD ${st.spd}</span></div>
    <div class="xpbar"><i style="width:${(m.xp / xpToNext(m.lvl)) * 100}%"></i></div><p class="dim">XP ${m.xp}/${xpToNext(m.lvl)}</p>
    <div class="moves">${all.map((x) => `<div class="mv ${x.lvl > m.lvl ? 'locked' : ''}"><b>${x.tm ? '💿 ' : ''}${esc(x.name)}</b> <span class="type t-${x.type}">${x.kind === 'boost' ? 'Boost' : TYPES[x.type].name + ' ' + x.power}</span>${x.lvl > m.lvl ? ` <small>Lv ${x.lvl}</small>` : ''}</div>`).join('')}</div>
    </div></div><div class="row">${term ? '<button data-nav data-act="learn">📖 Learn more</button>' : ''}<button data-nav data-act="__close">Close</button></div>`, actions: { learn: async () => { await learnMore(term); } } });
  void mv; void readonly;
}

// ------------------------------------------------------------ region map + Soar
function regionNodes() {
  const w = W(); const r = rng(hash(w.id + worldSeed() + 'regionmap')); const nodes = [];
  let x = 0.5;
  nodes.push({ id: 'hometown', name: 'Origin Town', x, y: 0.93, biome: biomeOf(w, 0), home: true });
  for (let i = 0; i < 8; i++) { x = Math.max(0.16, Math.min(0.84, x + (r() - 0.5) * 0.5)); nodes.push({ id: 'city' + i, ci: i, name: w.cities[i].name, theme: w.cities[i].theme, x, y: 0.82 - i * 0.095, biome: biomeOf(w, i) }); }
  nodes.push({ id: 'summit', name: 'Mastery Summit', x: 0.5, y: 0.05, biome: 'crystal', summit: true });
  return nodes;
}
function whereNow() { const id = S().map; let m; if ((m = id.match(/^city(\d)/))) return 'city' + m[1]; if ((m = id.match(/^route(\d)/))) return 'route' + m[1]; if (id === 'summit') return 'summit'; return 'hometown'; }
function drawRegion(cv, sel) {
  const g = cv.getContext('2d'); const Wd = cv.width, Ht = cv.height; const nodes = regionNodes(); const here = whereNow(); const s = S();
  const P = (n) => [n.x * Wd, n.y * Ht];
  g.fillStyle = '#16304a'; g.fillRect(0, 0, Wd, Ht);
  const rr = rng(hash(W().id + worldSeed() + 'coast')); for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(120,180,220,' + (0.05 + rr() * 0.08) + ')'; g.fillRect(rr() * Wd, rr() * Ht, 2, 1); }
  // land: a blob around each node, coloured by that place's biome
  nodes.forEach((n) => { const [x, y] = P(n); const B = BIOMES[n.biome] || BIOMES.meadow; for (let k = 0; k < 7; k++) { g.fillStyle = k % 2 ? B.g : B.g2; g.beginPath(); g.ellipse(x + (k - 3) * 7, y + ((k * 5) % 9) - 4, 34 - k, 22 - (k % 3) * 2, 0, 0, 7); g.fill(); } });
  // routes
  g.setLineDash([4, 3]); g.lineWidth = 3;
  for (let i = 1; i < nodes.length; i++) { const [a, b] = [P(nodes[i - 1]), P(nodes[i])]; const r = i; const known = r === 1 || s.flags['visit' + (i - 2)]; g.strokeStyle = known ? '#f4e2a8' : 'rgba(244,226,168,0.3)'; g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo((a[0] + b[0]) / 2 + (i % 2 ? 18 : -18), (a[1] + b[1]) / 2, b[0], b[1]); g.stroke(); g.setLineDash([]); g.fillStyle = '#ffffffaa'; g.font = '7px "Press Start 2P"'; g.textAlign = 'center'; g.fillText('R' + r, (a[0] + b[0]) / 2 + (i % 2 ? 22 : -22), (a[1] + b[1]) / 2); g.setLineDash([4, 3]); }
  g.setLineDash([]);
  nodes.forEach((n) => {
    const [x, y] = P(n); const visited = n.home || (n.summit ? s.badges.every(Boolean) : s.flags['visit' + n.ci]); const badge = n.ci !== undefined && s.badges[n.ci];
    g.fillStyle = '#14101c'; g.fillRect(x - 7, y - 7, 14, 14); g.fillStyle = visited ? (n.summit ? '#b36bff' : '#ff5d73') : '#555a6a'; g.fillRect(x - 5, y - 5, 10, 10);
    if (badge) { g.fillStyle = '#ffd23f'; g.fillRect(x + 4, y - 8, 4, 4); }
    if (n.id === sel) { g.strokeStyle = '#ffe14c'; g.lineWidth = 2; g.strokeRect(x - 10, y - 10, 20, 20); }
    g.font = '8px "VT323"'; g.textAlign = x > Wd * 0.6 ? 'right' : 'left'; const tx = x > Wd * 0.6 ? x - 12 : x + 12;
    g.fillStyle = '#000000aa'; g.fillText(visited ? n.name : '???', tx + 1, y + 4); g.fillStyle = visited ? '#ffffff' : '#9a9aaa'; g.fillText(visited ? n.name : '???', tx, y + 3);
    if (here === n.id) { g.fillStyle = '#4cf0ff'; g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x - 5, y - 17); g.lineTo(x + 5, y - 17); g.fill(); }
  });
  const m = here.match(/^route(\d)/); if (m) { const i = +m[1]; const [a, b] = [P(nodes[i - 1]), P(nodes[i])]; g.fillStyle = '#4cf0ff'; g.beginPath(); g.arc((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 5, 0, 7); g.fill(); }
  g.fillStyle = '#ffffffcc'; g.font = '8px "Press Start 2P"'; g.textAlign = 'left'; g.fillText(W().region.toUpperCase(), 8, 14);
}
export async function regionMap() {
  const nodes = regionNodes().filter((n) => !n.summit); const s = S(); const canFly = !!s.skills?.fly; let sel = whereNow(); let dest = null;
  const visited = (n) => n.home || s.flags['visit' + n.ci];
  await ui.panel({ title: `Region Map${canFly ? ' — choose a city to Soar' : ''}`, wide: true, cls: 'regionmap',
    render: () => `<div class="rmap"><canvas width="300" height="270"></canvas><div class="rlist"><p class="dim">${canFly ? 'Soar instantly to any place you have visited.' : 'Earn the Soar Disc from the 5th Mastery Hall Leader to fly between cities.'}</p>${nodes.map((n) => `<button data-nav data-act="go" data-arg="${n.id}" ${visited(n) ? '' : 'disabled'}>${visited(n) ? (canFly ? '✈ ' : '◆ ') + esc(n.name) : '??? (not visited)'}${n.theme && visited(n) ? `<small> · ${esc(n.theme)}</small>` : ''}</button>`).join('')}<div class="skills">${Object.entries(FIELD_SKILLS).map(([k, v]) => `<span class="${s.skills?.[k] ? 'on' : ''}">${s.skills?.[k] ? '✔' : '✖'} ${v.name}</span>`).join('')}</div></div></div>`,
    actions: { go: async (id) => { if (!canFly) { sel = id; ui.toast('You need the Soar Disc to fly.'); return; } const n = nodes.find((q) => q.id === id); if (await ui.confirm(`Soar to ${n.name}?`)) { dest = id; return 'close'; } } } });
  return dest;
}
function hookRegionCanvas() { const obs = new MutationObserver(() => { const cv = document.querySelector('.regionmap canvas'); if (cv && !cv.dataset.drawn) { cv.dataset.drawn = 1; drawRegion(cv, whereNow()); } }); obs.observe(document.getElementById('ui'), { childList: true, subtree: true }); }
if (typeof document !== 'undefined') setTimeout(hookRegionCanvas, 0);

// ------------------------------------------------------------ dex
export async function dex() {
  const w = W(); const ids = Object.keys(w.species);
  await ui.panel({ title: `Dex — ${Object.keys(S().caught).length} caught · ${Object.keys(S().seen).length} seen · ${ids.length} total`, wide: true, cols: 6, cls: 'dexp',
    render: () => `<div class="dexgrid">${ids.map((id, n) => { const sp = w.species[id]; const seen = S().seen[id], caught = S().caught[id];
      return `<button data-nav data-act="sp" data-arg="${id}" class="dexc ${caught ? 'c' : seen ? 's' : 'u'}"><img src="${seen ? G.mini(sp) : G.mini(sp)}" class="${seen ? '' : 'shadow'}"><small>#${String(n + 1).padStart(3, '0')}</small><span>${seen ? esc(sp.name) : '???'}</span></button>`; }).join('')}</div>`,
    actions: { sp: async (id) => { if (!S().seen[id]) { ui.toast('Not yet encountered.'); return; } const fake = makeMon(w, id, 1); await summary(fake, true); } } });
}

// ------------------------------------------------------------ bag & items
export async function bag(pi = 0) {
  await ui.panel({ title: `Bag · ¤${S().money}`, render: () => { const ids = Object.keys(S().bag).filter((id) => S().bag[id] > 0 && ITEMS[id]);
    return ids.length ? `<div class="ilist">${ids.map((id) => `<button data-nav data-act="use" data-arg="${id}" class="irow"><img class="ico" src="${itemIcon(id)}"><b>${ITEMS[id].name}</b><span class="cnt">×${S().bag[id]}</span><small>${ITEMS[id].desc}</small></button>`).join('')}</div>` : '<p>Empty.</p>'; },
    actions: { use: async (id) => { const it = ITEMS[id]; if (it.kind === 'cube') { ui.toast('Use cubes during wild battles.'); return; }
      if (it.kind === 'tm') { let p = pi; if (S().players.length > 1) { const c = await ui.choose('Whose team?', S().players.map((q) => q.name)); if (c < 0) return; p = c; } await teachTM(p, id); return; } let p = pi; if (S().players.length > 1) { const c = await ui.choose('Whose team?', S().players.map((q) => q.name)); if (c < 0) return; p = c; } await itemTarget(p, id); } } });
}
async function teachTM(p, id) {
  const it = ITEMS[id], w = W(); const P = S().players[p];
  const c = await ui.choose(`Teach ${it.move} (${TYPES[it.type].name}, 85 power) to which monster?`, P.party.map((m) => ({ html: monRow(w, m), disabled: (m.tms || []).includes(id) })), { cls: 'teamlist' }); if (c < 0) return;
  const m = P.party[c]; m.tms = m.tms || [];
  if (m.tms.length >= 2) { const r = await ui.choose(`${monName(w, m)} already knows 2 disc moves. Forget one?`, m.tms.map((t) => ITEMS[t]?.move || t)); if (r < 0) return; m.tms.splice(r, 1); }
  m.tms.push(id); audio.sfx('levelup'); ui.toast(`${monName(w, m)} learned ${it.move}!`); G.autosave();
}
async function useItemOn(p, m) {
  const ids = Object.keys(S().bag).filter((id) => S().bag[id] > 0 && ITEMS[id] && ITEMS[id].kind !== 'cube' && ITEMS[id].kind !== 'tm');
  if (!ids.length) { ui.toast('No usable items.'); return; }
  const c = await ui.choose('Use which item?', ids.map((id) => `${ITEMS[id].name} ×${S().bag[id]}`)); if (c < 0) return;
  await applyItem(ids[c], m);
}
async function itemTarget(p, id) {
  const P = S().players[p]; const c = await ui.choose(`Use ${ITEMS[id].name} on?`, P.party.map((m) => ({ html: monRow(W(), m) })), { cls: 'teamlist' }); if (c < 0) return;
  await applyItem(id, P.party[c]);
}
async function applyItem(id, m) {
  const it = ITEMS[id], w = W(); const nm = monName(w, m);
  if (it.kind === 'heal') { if (m.hp <= 0 || (m.hp >= maxHp(w, m) && !m.status)) { ui.toast('It would have no effect.'); return; } const cured = !!m.status; delete m.status; m.hp = Math.min(maxHp(w, m), m.hp + it.amt); S().bag[id]--; audio.sfx('heal'); ui.toast(`${nm} recovered HP${cured ? ' and feels better' : ''}!`); }
  if (it.kind === 'revive') { if (m.hp > 0) { ui.toast('It would have no effect.'); return; } m.hp = Math.floor(maxHp(w, m) / 2); S().bag[id]--; audio.sfx('heal'); ui.toast(`${nm} was revived!`); }
  if (it.kind === 'level') {
    if (m.lvl >= 100) return; S().bag[id]--; const ev = gainXp(w, m, xpToNext(m.lvl) - m.xp); audio.sfx('levelup'); ui.toast(`${nm} grew to Lv ${m.lvl}!`);
    for (const e of ev) if (e.type === 'move') ui.toast(`${nm} learned ${e.move}!`);
    const to = checkEvolve(w, m); if (to) { ui.closeAll(); const prev = G.scene; await evolveScene(null, m, to); G.scene = prev; document.getElementById('hud').innerHTML = ''; document.getElementById('hud').className = ''; G.world.load(S().map, S().pos); }
  }
}

// ------------------------------------------------------------ codex & drills
export async function codex() {
  const w = W(); const reach = Math.max(chapter(S()), ...Object.keys(S().flags).filter((k) => k.startsWith('visit')).map((k) => +k.slice(5)));
  let ci = Math.min(reach, 7);
  await ui.panel({ title: 'Codex — your study notes', wide: true, cls: 'codexp', onLR: (d, rr) => { ci = clamp(ci + d, 0, reach); rr(); },
    render: () => { const c = w.cities[ci]; const learned = c.terms.filter((t) => S().codex[t.id]).length;
      return `<div class="tabs">${w.cities.slice(0, reach + 1).map((x, k) => `<button data-nav data-act="city" data-arg="${k}" class="${k === ci ? 'on' : ''}">${k + 1}</button>`).join('')}</div>
      <h3>${esc(c.name)} — ${esc(c.theme)} <span class="dim">(${learned}/${c.terms.length} learned)</span></h3>
      <div class="row"><button data-nav data-act="drill" data-arg="${ci}">▶ Drill this chapter</button><button data-nav data-act="interview">🎤 Mock interview</button><button data-nav data-act="review">↺ Review missed (${S().missed.length})</button></div>
      <p class="dim">Tap a term for examples${externalOn() ? ' and links' : ''}.</p>
      <div class="terms">${c.terms.map((t) => `<button data-nav data-act="learn" data-arg="${t.id}" class="term tbtn ${S().codex[t.id] ? 'got' : ''}"><b>${S().codex[t.id] ? '✔ ' : ''}${esc(t.term)} <i class="more">📖</i></b><span>${esc(t.def)}</span></button>`).join('')}
      ${(c.pool || []).filter((q) => !q.term).slice(0, 40).map((q) => `<div class="term qa"><b>Q: ${esc(q.q)}</b><span>A: ${esc(q.a)} — <i>${esc(q.expl)}</i></span></div>`).join('')}</div>`; },
    actions: { city: (k) => { ci = +k; }, learn: async (id) => { await learnMore(w.terms.find((t) => t.id === id)); }, drill: async (k) => { await drill(`${w.cities[+k].name} drill`, () => w.pickQ(+k, S(), { mix: false, review: 0.15 }), 10); }, interview: async () => { await drill('Mock interview', () => w.pickQ(reach >= 7 && S().champion ? 'final' : reach, S(), { review: 0.3 }), 15, true); }, review: async () => { await reviewDrill(); } } });
}
export async function reviewDrill() {
  const w = W(); const ids = S().missed.filter((id) => w.qIndex[id]); if (!ids.length) { await ui.say('No missed questions to review. Nice!'); return; }
  const pool = [...ids].sort(() => R() - 0.5).slice(0, 10);
  let k = 0; await drill('Review: missed questions', () => { const Q = w.qIndex[pool[k++ % pool.length]]; const opts = [Q.a, ...Q.wrong].sort(() => R() - 0.5); return { id: Q.id, q: Q.q, opts, answer: opts.indexOf(Q.a), expl: Q.expl, ci: Q.ci, a: Q.a, review: true }; }, pool.length);
}
export async function drill(title, gen, n, interview) {
  let score = 0, quick = 0;
  for (let i = 0; i < n; i++) {
    const q = gen(); const r = await ui.question(q, { tag: `${title} · ${i + 1}/${n}`, cls: interview ? 'interview' : '' });
    if (!r) break; recordAnswer(S(), q, r.correct, r.quick); if (r.correct) score++; if (r.quick) quick++;
  }
  const pct = Math.round((score / n) * 100); const reward = score * 15;
  S().money += reward; G.autosave();
  await ui.say([`${title} complete: *${score}/${n}* (${pct}%), ${quick} quick recalls.`, reward ? `Study credits earned: ¤${reward}.` : '', pct >= 80 ? 'Excellent — you\'re really getting this!' : pct >= 50 ? 'Solid progress. Missed questions will come back for review.' : 'Keep at it — read the explanations and drill again.']);
}

// ------------------------------------------------------------ quests & mastery
export async function quests() {
  await ui.panel({ title: 'Quest Log', wide: true, render: () => `<div class="qlist">${questList().map((q) => `<div class="quest ${q.done ? 'done' : ''} ${q.main ? 'main' : ''}"><b>${q.done ? '✔' : q.ready ? '!' : '○'} ${esc(q.title)}</b><span>${fmt(esc(q.desc))}${q.ready ? ' <b class="ok">Ready to turn in!</b>' : ''}</span></div>`).join('')}</div>` });
}
export function readiness() {
  const s = S(); let tot = 0, n = 0;
  for (let i = 0; i < 8; i++) { const pc = s.stats.perCity[i]; const acc = pc && pc.a ? pc.c / pc.a : 0; const cov = Math.min(1, (pc?.a || 0) / 25); tot += acc * cov; n++; }
  return Math.round((tot / n) * 100);
}
export async function mastery() {
  const s = S(), w = W(); const st = s.stats; const acc = st.answered ? Math.round((st.correct / st.answered) * 100) : 0;
  await ui.panel({ title: 'Mastery', wide: true, render: () => `<div class="mast"><div class="big3"><div><b>${st.answered}</b><small>answered</small></div><div><b>${acc}%</b><small>accuracy</small></div><div><b>${st.quick}</b><small>quick recalls</small></div><div><b>${readiness()}%</b><small>readiness</small></div></div>
    ${w.cities.map((c, i) => { const pc = st.perCity[i] || { a: 0, c: 0 }; const a = pc.a ? Math.round((pc.c / pc.a) * 100) : 0; const learned = c.terms.filter((t) => s.codex[t.id]).length;
      return `<div class="mrow2"><span class="mc">${s.badges[i] ? '🏅' : '·'} ${esc(c.name)}</span><span class="mt">${esc(c.theme)}</span><span class="bar"><i style="width:${a}%"></i></span><span class="pct">${pc.a ? a + '%' : '—'}</span><span class="dim">${learned}/${c.terms.length} notes</span></div>`; }).join('')}
    <p class="dim">Readiness blends accuracy and how much of each chapter you've practised. Aim for 80%+ across all eight before your interview or exam. Playtime: ${Math.floor(s.playtime / 3600)}h ${Math.floor((s.playtime % 3600) / 60)}m.</p></div>` });
}

// ------------------------------------------------------------ local co-op
export async function players() {
  await ui.panel({ title: 'Local Players (same screen)', wide: true, render: () => `<div class="plist">${S().players.map((p, k) => `<div class="prow"><span class="sw" style="background:${p.color}"></span><b>P${k + 1} ${esc(p.name)}</b><span class="dim">${p.party.length} in team · ${p.box.length} in box</span>${k > 0 ? `<button data-nav data-act="rm" data-arg="${k}">Remove</button>` : ''}</div>`).join('')}</div>
    ${S().players.length < 4 ? '<button data-nav data-act="add">+ Add a local player</button>' : ''}
    <div class="ctrl"><h4>Controls</h4><p><b>1 player:</b> Arrows/WASD move · Z/Space/Enter = A · X/Esc = B · Shift/C = Run (double-tap to lock running on/off; on touch, double-tap RUN) · Tab/M = Menu</p><p><b>Field skills:</b> leaders teach <i>Slice</i> (cut thin trees), <i>Smash</i> (break cracked rocks) and <i>Soar</i> (fly from the 🗺 Map to towns you've visited). Face the obstacle and press A. Leaders also hand out reusable 💿 Technique Discs.</p><p><b>Conditions:</b> ${TYPES.flux.name} attacks can <i>burn</i> (weaker attacks + chip damage), ${TYPES.cipher.name} attacks can <i>poison</i>, and ${TYPES.data.name} attacks can make a monster <i>sick</i> (may skip turns). Any healing item or a Mend Station cures them. Insight Shards are very rare (one per badge) and only work outside battle.</p><p><b>Partner:</b> your chosen monster walks behind you — talk to it for tips. Pick a partner in Team → 🐾 Walk with me.</p><p><b>Learn more:</b> after any question, or by tapping a Codex term, see extra examples, worked questions and (if enabled) outside resources.</p><p><b>2+ players:</b> P1 WASD + F (A) / G (B) / Tab (menu) · P2 Arrows + . (A) / , (B) / / (menu) · P3 &amp; P4 use gamepads (each new pad joins the next slot). Touch controls drive P1.</p><p>Everyone shares one screen and travels together. In battle, every player's lead monster fights side by side and each player answers their own questions.</p></div>`,
    actions: { add: async () => { await addLocal(); }, rm: async (k) => { if (await ui.confirm(`Remove P${+k + 1} ${S().players[+k].name}? Their monsters will be lost.`)) { S().players.splice(+k, 1); S().players.forEach((p, i) => { p.color = ['#e04848', '#3a7ae0', '#30b060', '#e0a020'][i]; }); input.setPlayers(S().players.length); G.world.load(S().map, S().pos); } } } });
}
async function addLocal() {
  const k = S().players.length; const name = await ui.prompt(`Name for Player ${k + 1}`, 'Player ' + (k + 1));
  const p = newPlayer(name, k); S().players.push(p); input.setPlayers(S().players.length); input.assignPad(k, k);
  S().pos.push({ ...S().pos[0] });
  if (S().flags.starter) {
    const w = W(); const lead = S().players[0].party[0]; const lvl = Math.max(5, (lead?.lvl || 5) - 3);
    const c = await ui.choose(`${name}, choose your partner!`, w.starters.map((id) => ({ html: `<img class="mini" src="${G.mini(w.species[id])}"> ${esc(w.species[id].name)} <span class="type t-${w.species[id].type}">${TYPES[w.species[id].type].name}</span>` })), { cancel: false, cls: 'teamlist' });
    const mon = makeMon(w, w.speciesFor(w.species[w.starters[c]].li, lvl), lvl); addMon(S(), k, mon); S().caught[mon.sp] = 1; S().seen[mon.sp] = 1;
  }
  G.world.load(S().map, S().pos); ui.toast(`${name} joined!`);
}

// ------------------------------------------------------------ settings & help
export async function settings() {
  const st = G.settings; const keys = ['music', 'sfx', 'timer', 'timerSec', 'textSpeed', 'daynight', 'seasonFx', 'full'];
  const lbl = { music: 'Music volume', sfx: 'Sound volume', timer: 'Question timer', timerSec: 'Timer length', textSpeed: 'Text speed', daynight: 'Day / night cycle', seasonFx: 'Seasonal effects', full: 'Fullscreen' };
  const val = (k) => k === 'music' || k === 'sfx' ? '▮'.repeat(Math.round(st[k] * 10)) + '▯'.repeat(10 - Math.round(st[k] * 10)) : k === 'timer' ? (st.timer ? 'On' : 'Off (relaxed)') : k === 'timerSec' ? st.timerSec + 's' : k === 'textSpeed' ? ['', 'Slow', 'Normal', 'Fast', 'Instant'][st.textSpeed] : k === 'seasonFx' ? (st.seasonFx === false ? 'Off' : 'On') : k === 'daynight' ? (st.daynight === false ? 'Off (always day)' : 'On (real time)') : document.fullscreenElement ? 'On' : 'Off';
  const change = (k, d) => {
    if (k === 'music' || k === 'sfx') { st[k] = clamp(Math.round((st[k] + d * 0.1) * 10) / 10, 0, 1); audio.setVolume(k, st[k]); }
    if (k === 'timer') st.timer = !st.timer; if (k === 'daynight') st.daynight = st.daynight === false; if (k === 'seasonFx') st.seasonFx = st.seasonFx === false; if (k === 'timerSec') st.timerSec = clamp(st.timerSec + d * 5, 10, 60); if (k === 'textSpeed') st.textSpeed = clamp(st.textSpeed + d, 1, 4);
    if (k === 'full') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); }
    saveSettings(st); audio.sfx('blip');
  };
  let cur = 0;
  await ui.panel({ title: 'Settings', onLR: (d, rr) => { const l = ui.stack[ui.stack.length - 1]; cur = l.idx; if (keys[cur]) change(keys[cur], d); rr(); },
    render: () => `<div class="slist">${keys.map((k, i) => `<button data-nav data-act="t" data-arg="${k}" class="srow"><span>${lbl[k]}</span><b>◀ ${val(k)} ▶</b></button>`).join('')}${document.body.classList.contains('touch') ? '<button data-nav data-act="ctl" class="srow"><span>Touch controls</span><b>Move &amp; resize ▶</b></button>' : ''}</div><p class="dim">Left/right to change. Turn the timer off for a relaxed, accessible pace — you can still earn Quick Recall bonuses.</p>`,
    actions: { t: (k) => change(k, 1), ctl: async () => { setTimeout(async () => { G.busy++; await editControls(); G.busy--; }, 50); return 'close'; } } });
}
export async function help() {
  await ui.panel({ title: 'Help & Legal', wide: true, render: () => `<div class="help"><h4>How to play</h4><p>Walk with the arrows/WASD (or the on-screen pad). Talk and interact with A. Open the menu with START. In battle choose a move, then answer its question: correct = hit, fast = ⚡ Quick Recall critical, wrong = miss + explanation. Weaken wild monsters and throw a Capture Cube, answering the lock-on question for a better catch rate.</p><h4>Time travel ⏳</h4><p><b>Learning Echoes:</b> every question you miss comes back as an echo after 10 minutes, then 1, 3, 7 and 21 days. Battle echoes at an Echo Rift or from the ⏳ Chrono Log — answer all five steps to master it for good.<br><b>Chrono Gate:</b> with 4 badges, the gate in Origin Town opens trips to the past and future of your subject, with history questions and Ancient / Neo- era forms of monsters.<br><b>Real time:</b> the Keeper of Time gives a daily egg (hatches in ~2 hours) and buries time capsules (open after 3 days). Play daily to build your streak, and the Season Herald brings gifts each real season.</p>
    <p>Each city teaches one chapter of your topic. Talk to everyone (tips go into your Codex), pass the Study Lab Trial, then beat the Mastery Hall Leader for a badge. Badges open the road north. Eight badges lead to the Mastery Summit.</p>
    <h4>Types</h4><p>${typeCycleText()}. Each type beats the next one. Super-effective hits do double damage.</p>
    <h4>Legal</h4><p>Hakma is an original work. All monsters, characters, music and art are generated by the game itself. Educational content is provided as-is for learning; always verify safety-critical information (e.g. electrical work) against official codes and licensed professionals.</p>
    <div class="row"><a data-nav class="btn" href="legal/eula.html" target="_blank">EULA</a><a data-nav class="btn" href="legal/privacy.html" target="_blank">Privacy Policy</a><a data-nav class="btn" href="legal/terms.html" target="_blank">Terms of Service</a><a data-nav class="btn" href="legal/credits.html" target="_blank">Credits &amp; Licenses</a></div>
    <p class="dim">Version ${G.version}</p></div>` });
}

// ------------------------------------------------------------ archive box & shop
export async function archive() {
  let p = 0;
  await ui.panel({ title: 'Archive Box Terminal', wide: true, cls: 'archive', onLR: S().players.length > 1 ? (d, rr) => { p = (p + d + S().players.length) % S().players.length; rr(); } : null,
    render: () => { const P = S().players[p]; return `${S().players.length > 1 ? `<p>Player: <b>P${p + 1} ${esc(P.name)}</b> (◀ ▶ to switch)</p>` : ''}<div class="cols"><div><h4>Team (${P.party.length}/6)</h4>${P.party.map((m, k) => `<button data-nav data-act="dep" data-arg="${k}" class="mrow">${monRow(W(), m)}</button>`).join('')}</div>
      <div><h4>Box (${P.box.length})</h4>${P.box.map((m, k) => `<button data-nav data-act="wd" data-arg="${k}" class="mrow">${monRow(W(), m)}</button>`).join('') || '<p class="dim">Empty</p>'}</div></div><p class="dim">Select a team monster to store it, or a boxed monster to bring it along. Boxed monsters are healed automatically.</p>`; },
    actions: {
      dep: (k) => { const P = S().players[p]; if (P.party.length <= 1) { ui.toast('You must keep at least one monster.'); return; } const [m] = P.party.splice(+k, 1); healMon(W(), m); P.box.push(m); audio.sfx('door'); },
      wd: (k) => { const P = S().players[p]; if (P.party.length >= 6) { ui.toast('Your team is full.'); return; } const [m] = P.box.splice(+k, 1); healMon(W(), m); P.party.push(m); audio.sfx('door'); },
    } });
}
export async function shop() {
  const b = badgeCount(S()); const stock = Object.keys(ITEMS).filter((id) => ITEMS[id].price > 0 && (ITEMS[id].badge || 0) <= b);
  await ui.panel({ title: 'Supply Depot', render: () => `<p>Credits: <b>¤${S().money}</b></p><div class="ilist">${stock.map((id) => `<button data-nav data-act="buy" data-arg="${id}" class="irow"><img class="ico" src="${itemIcon(id)}"><b>${ITEMS[id].name}</b><span class="cnt">¤${ITEMS[id].price}</span><small>${ITEMS[id].desc} (have ${S().bag[id] || 0})</small></button>`).join('')}</div><p class="dim">New stock arrives as you earn badges.</p>`,
    actions: { buy: async (id) => { const it = ITEMS[id]; const max = Math.floor(S().money / it.price); if (!max) { ui.toast('Not enough credits.'); return; } const qs = [1, 5, 10].filter((q) => q <= max); const c = await ui.choose(`Buy how many ${it.name}?`, qs.map((q) => `${q} — ¤${q * it.price}`)); if (c < 0) return; const q = qs[c]; S().money -= q * it.price; S().bag[id] = (S().bag[id] || 0) + q; audio.sfx('buy'); ui.toast(`Bought ${q}× ${it.name}`); } } });
}

// ------------------------------------------------------------ ceremonies
export async function badgeCeremony(i) {
  const c = W().cities[i]; const col = TYPES[c.type].color;
  await ui.panel({ title: 'Badge earned!', cls: 'badgecer', render: () => `<div class="badgeshow"><div class="badge-ico" style="--c:${col}"><span>${TYPES[c.type].icon}</span></div><h3>${esc(c.badge)}</h3><p>${esc(c.theme)}</p><p class="dim">${S().badges.filter(Boolean).length}/8 badges</p><div class="badgerow">${W().cities.map((x, k) => `<span class="mini-badge ${S().badges[k] ? 'on' : ''}" style="--c:${TYPES[x.type].color}"></span>`).join('')}</div><button data-nav data-act="__close">Continue</button></div>` });
}
export async function ending() {
  const s = S(), w = W(); const acc = s.stats.answered ? Math.round((s.stats.correct / s.stats.answered) * 100) : 0; const date = new Date().toLocaleDateString();
  audio.play('ending', w.id, 'title');
  const cert = `<div class="cert"><div class="cbrd"><h2>HAKMA</h2><h3>Certificate of Mastery</h3><p>This certifies that</p><h1>${esc(s.players.map((p) => p.name).join(' & '))}</h1><p>has conquered all eight Mastery Halls and the Summit of</p><h2 class="topic">${esc(w.topic.name)}</h2><p>${s.stats.answered} questions answered · ${acc}% accuracy · ${s.stats.quick} quick recalls · readiness ${readiness()}%</p><p class="dim">${esc(date)} · ${esc(w.region)}</p></div></div>`;
  await ui.panel({ title: 'Congratulations, Master!', wide: true, cls: 'certp', render: () => `${cert}<div class="row"><button data-nav data-act="print">🖨 Print / Save PDF</button><button data-nav data-act="__close">Roll credits</button></div>`,
    actions: { print: () => { const wnd = window.open('', '_blank'); if (!wnd) return; wnd.document.write(`<html><head><title>Hakma Certificate</title><link rel="stylesheet" href="${location.origin}${location.pathname.replace(/[^/]*$/, '')}css/style.css"></head><body class="printcert">${cert}<script>setTimeout(()=>print(),400)<\/script></body></html>`); wnd.document.close(); } } });
  const credits = ['HAKMA', '', `Master of ${w.topic.name}`, '', 'Design, code, music & art', 'generated by the Hakma engine', '', 'Created for Robin Calamatta', '', 'Topics: ' + G.topicsCount + ' fields of study', '', 'Fonts: Press Start 2P & VT323 (SIL Open Font License)', '', 'Thank you for learning with us.', '', 'Keep drilling the Codex — mastery is a habit.'];
  await ui.panel({ title: 'Credits', cls: 'credits', render: () => `<div class="roll">${credits.map((l) => `<p>${esc(l)}</p>`).join('')}</div><button data-nav data-act="__close">Continue your journey</button>` });
}
