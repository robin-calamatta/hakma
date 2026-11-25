// Start menu and all sub-screens.
import { lessonBoard, cabinet, CABINETS } from './arcade.js';
import { levelFor, LEVEL_NAME, RARITY } from './content.js';
import { chronoLog, echoBattle, timeTick } from './time.js';
import { dueEchoes, lookOf } from './state.js';
import { G, ITEMS, stats, maxHp, movesOf, monName, xpToNext, gainXp, healMon, newPlayer, makeMon, addMon, badgeCount, chapter, writeSlot, saveSettings, recordAnswer, addCodex } from './state.js';
import { ui, fmt } from './ui.js';
import { audio } from '../core/audio.js';
import { input } from '../core/input.js';
import { esc, clamp, R, sleep, uid } from '../core/rng.js';
import { TYPES, beats, weakTo, typeCycleText } from '../content/types.js';
import { questList, objective } from './events.js';
import { monRow, evolveScene } from './battle.js';
import { checkEvolve, evolve, FIELD_SKILLS, tmMove, BOX_COUNT, BOX_SIZE } from './state.js';
import { BIOMES } from '../core/sprites.js';
import { biomeOf, worldSeed, getMap, routeLayout, LAIR_ROUTE, zoneInfo, LINKS, seaZone, linksFor } from './maps.js';
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
      ['team', '◈ Team'], ['map', '🗺 Map'], ...(S().skills?.teleport ? [['tele', '✨ Teleport']] : []), ...(S().flags?.longboard ? [['board', `🛹 Longboard: ${S().flags.boardOn ? 'ON' : 'OFF'}`]] : []), ['dex', '◉ Dex'], ['bag', '🎒 Bag'], ['codex', '📘 Codex & Drills'], ['quests', '★ Quests'], ['time', `⏳ Chrono Log${dueEchoes(S()).length ? ` <i class="badge">${dueEchoes(S()).length}</i>` : ''}`], ['mastery', '▲ Mastery'],
      ['friends', `👥 Friends & Co-op${online ? ' <i class="dot on"></i>' : ''}`], ['look', '👕 Wardrobe'], ['players', '🎮 Local Players'], ['save', '💾 Save'], ['settings', '⚙ Settings'], ['help', '? Help & Legal'], ['title', '⏏ Title Screen'],
    ];
    if (!CONFIG.ONLINE) items = CONFIG.CLOUD_SAVES ? items.map((it) => (it[0] === 'friends' ? ['friends', G.net?.authed ? '☁ Account & Cloud' : '☁ Log in / Cloud Save'] : it)) : items.filter(([k]) => k !== 'friends');
    const c = await ui.choose(`${S().players[pi]?.name || ''} · ¤${S().money} · Badges ${badgeCount(S())}/8 — ${objective()}`, items.map(([, h]) => ({ html: h })), { cls: 'mainmenu', start: G.menuIdx || 0, cols: 2 });
    if (c < 0) break; G.menuIdx = c; const k = items[c][0];
    if (k === 'map') { const dest = await regionMap(); if (dest) { ui.closeAll(); G.busy--; await G.events.fly(dest); return; } }
    if (k === 'board') { S().flags.boardOn = !S().flags.boardOn; ui.toast(S().flags.boardOn ? '🛹 Riding the longboard — zoom!' : 'You picked up your longboard.'); continue; }
    if (k === 'tele') { const sp = G.events.teleportSpots(); const i = await ui.choose('Teleport where?', sp.map((q) => ({ html: `${q.icon} ${esc(q.name)}` }))); if (i >= 0) { ui.closeAll(); G.busy--; await G.events.teleport(sp[i].id); return; } continue; }
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
  const opts = ['Summary', '🔀 Swap position with…', '⬆ Move up', '⬇ Move down', 'Give nickname', 'Use item', ...(p === 0 ? [walking ? '🐾 Stop walking with me' : '🐾 Walk with me'] : []), 'Back'];
  const c = await ui.choose(`${monName(W(), m)} — Lv ${m.lvl} (slot ${k + 1})`, opts);
  const swap = (a2, b2) => { if (b2 < 0 || b2 >= P.party.length) return; [P.party[a2], P.party[b2]] = [P.party[b2], P.party[a2]]; audio.sfx('select'); };
  if (c === 1) { const t = await ui.choose(`Swap ${monName(W(), m)} with…`, P.party.map((q, j) => ({ html: monRow(W(), q), disabled: j === k })), { cls: 'teamlist' }); if (t >= 0) swap(k, t); return; }
  if (c === 2) { swap(k, k - 1); return; } if (c === 3) { swap(k, k + 1); return; }
  if (c === 4) { const n = await ui.prompt('Nickname (blank to reset)', m.nick || '', 12); m.nick = n && n !== W().species[m.sp].name ? n : null; return; }
  if (c === 5) { await useItemOn(p, m); return; }
  if (opts[c] && opts[c].startsWith('🐾')) { S().follower = walking ? null : m.uid; G.world?.initFollower(); if (!walking) G.world?.emote('♥'); ui.toast(walking ? `${monName(W(), m)} hops back into its capsule.` : `${monName(W(), m)} will walk with you!`); return; }
  if (c === 0) await summary(m);
}
export async function summary(m, readonly) {
  const w = W(); const sp = w.species[m.sp]; const st = stats(w, m); const mv = movesOf(w, m); const all = sp.moves.concat((m.tms || []).filter((id) => ITEMS[id]).map(tmMove));
  const line = w.lines[sp.li]; const term = w.terms.find((t) => t.id === sp.termId) || w.terms.find((t) => t.term.toLowerCase() === sp.concept.toLowerCase());
  await ui.panel({ title: esc(monName(w, m)), wide: true, cls: 'summary', render: () => `<div class="pv"><img class="big" src="${G.mini(sp, lookOf(m))}"><div><p class="rarline" style="color:${RARITY[sp.rarity]?.color}">${'★'.repeat(RARITY[sp.rarity]?.stars || 1)} ${RARITY[sp.rarity]?.name || ''}${m.shiny ? ' · ✦ Prismatic' : ''}${sp.title ? ` · ${esc(sp.title)}` : ''}</p>
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
const MAPW = 360, MAPH = 880;
function regionNodes() {
  const w = W(); const r = rng(hash(w.id + worldSeed() + 'regionmap2')); const nodes = []; let x = 180;
  const Y = (i) => MAPH - 46 - i * 88;
  nodes.push({ id: 'hometown', name: 'Origin Town', x, y: Y(0), biome: biomeOf(w, 0), home: true, idx: 0 });
  for (let i = 0; i < 8; i++) { x = Math.max(95, Math.min(265, x + (r() - 0.5) * 150)); nodes.push({ id: 'city' + i, ci: i, name: w.cities[i].name, theme: w.cities[i].theme, x, y: Y(i + 1), biome: biomeOf(w, i), idx: i + 1 }); }
  nodes.push({ id: 'summit', name: 'Mastery Summit', x: 180, y: Y(9) + 8, biome: 'crystal', summit: true, idx: 9 });
  return nodes;
}
function whereNow() { const id = S().map; let m; if ((m = id.match(/^city(\d)/))) return 'city' + m[1]; if ((m = id.match(/^(route\d|grove\d|lair\d|garden\d|zone\d|link\d)/))) return m[1]; if (id === 'sea') return 'sea'; if (id === 'summit' || id === 'sanctum') return id; if (id.startsWith('era_')) return 'gate'; return 'hometown'; }
// the road for route r, following the real winding path of that route's map
function routePoints(nodes, r) {
  const a = nodes[r - 1], b = nodes[r]; const { w, h, px } = routeLayout(W(), r); const mean = px.reduce((s2, v) => s2 + v, 0) / px.length; const pts = [];
  for (let k = 0; k <= 24; k++) { const t = k / 24; const yy = Math.round((1 - t) * (h - 1)); const dev = (px[yy] - mean) / w; pts.push([a.x + (b.x - a.x) * t + dev * 110 * Math.sin(Math.PI * t), a.y + (b.y - a.y) * t]); }
  return pts;
}
// loop trails bulge out to the side of the chain between the two towns they join
function linkPoints(nodes, k) {
  const L = linksFor()[k]; const nd = (id) => nodes.find((n) => n.id === id); const a = nd(L.a), b = nd(L.b); const east = L.aSide === 'east';
  const cxp = 2 * (east ? MAPW - 30 : 30) - (a.x + b.x) / 2; const pts = [];
  for (let i = 0; i <= 24; i++) { const t = i / 24, u = 1 - t; pts.push([u * u * a.x + 2 * u * t * cxp + t * t * b.x, u * u * a.y + 2 * u * t * ((a.y + b.y) / 2) + t * t * b.y]); }
  return pts;
}
function seaSpot(nodes) { const r = seaZone(); const [, zy] = along(routePoints(nodes, r), ZONE_F); return [MAPW - 40, zy - 30]; }
const along = (pts, f) => { const i = Math.min(pts.length - 1, Math.max(0, Math.round(f * (pts.length - 1)))); return pts[i]; };
function secretsOnMap(nodes) {
  const w = W(); const out = [];
  for (let r = 1; r <= 9; r++) {
    const m = getMap(w, 'route' + r); const pts = routePoints(nodes, r);
    const gw = m.warps.find((q) => String(q.to).startsWith('grove'));
    if (gw) { const [x, y] = along(pts, (1 - gw.y / m.h) * 0.6); out.push({ id: 'grove' + r, kind: 'grove', name: 'Grove', x: x + (m.groveSide === 'west' ? -38 : 38), y, from: [x, y], route: r }); }
    if (m.lairDoor) { const k = LAIR_ROUTE.indexOf(r); const [x, y] = along(pts, (1 - m.lairDoor.y / m.h) * 0.6); out.push({ id: 'lair' + k, kind: 'lair', name: 'Lair', x: x + (m.lairDoor.side === 'west' ? -44 : 44), y, from: [x, y], route: r }); }
  }
  nodes.filter((n) => n.ci !== undefined).forEach((n) => out.push({ id: 'garden' + n.ci, kind: 'garden', name: 'Garden', x: n.x + (n.x < 180 ? -40 : 40), y: n.y + 16, from: [n.x, n.y], city: n.ci }));
  const home = nodes[0]; out.push({ id: 'sanctum', kind: 'sanctum', name: 'Sanctum', x: home.x - 58, y: home.y + 20, from: [home.x, home.y] });
  // keep icons from piling on top of each other or on towns
  for (let pass = 0; pass < 4; pass++) for (let i = 0; i < out.length; i++) { const a2 = out[i];
    for (const b2 of out.slice(0, i)) if (Math.abs(a2.x - b2.x) < 30 && Math.abs(a2.y - b2.y) < 22) a2.y = b2.y + 22;
    for (const n of nodes) if (Math.abs(a2.x - n.x) < 26 && Math.abs(a2.y - n.y) < 20) a2.x += a2.x < n.x ? -16 : 16;
    for (let r = 1; r <= 9; r++) { const [zx, zy] = along(routePoints(nodes, r), ZONE_F); if (Math.abs(a2.x - zx) < 60 && Math.abs(a2.y - zy) < 16) a2.y = zy + (a2.y < zy ? -18 : 18); }
    a2.x = Math.max(14, Math.min(MAPW - 14, a2.x)); }
  return out;
}
function drawRegion(cv) {
  const g = cv.getContext('2d'); const Z = 2; cv.width = MAPW * Z; cv.height = MAPH * Z; g.scale(Z, Z); g.imageSmoothingEnabled = false;
  const nodes = regionNodes(); const here = whereNow(); const s = S(); const w = W(); const rr = rng(hash(w.id + worldSeed() + 'deco'));
  const visited = (n) => n.home || (n.summit ? s.badges.every(Boolean) : s.flags['visit' + n.ci]);
  const routeKnown = (r) => r === 1 || s.flags['visit' + (r - 2)];
  // sea
  g.fillStyle = '#17466b'; g.fillRect(0, 0, MAPW, MAPH);
  for (let i = 0; i < 340; i++) { const x = rr() * MAPW, y = rr() * MAPH; g.fillStyle = `rgba(160,210,240,${0.08 + rr() * 0.12})`; g.fillRect(x, y, 3 + rr() * 4, 1); }
  // island outline that hugs the whole chain of towns and roads
  const allPts = []; for (let r = 1; r <= 9; r++) allPts.push(...routePoints(nodes, r)); for (let k = 0; k < linksFor().length; k++) allPts.push(...linkPoints(nodes, k));
  const left = [], right = []; for (let y = 10; y <= MAPH - 8; y += 10) { const near = allPts.filter((p) => Math.abs(p[1] - y) < 40); const xs = near.length ? near.map((p) => p[0]) : [180]; const n1 = Math.sin(y * 0.05) * 8 + Math.sin(y * 0.13 + 1) * 5; left.push([Math.max(8, Math.min(...xs) - 70 + n1), y]); right.push([Math.min(MAPW - 8, Math.max(...xs) + 70 - n1), y]); }
  const land = new Path2D(); land.moveTo(left[0][0], left[0][1]); for (const p of left) land.lineTo(p[0], p[1]); for (const p of right.slice().reverse()) land.lineTo(p[0], p[1]); land.closePath();
  g.save(); g.strokeStyle = '#e8d49a'; g.lineWidth = 7; g.stroke(land); g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 12; g.globalAlpha = 0.4; g.stroke(land); g.restore();
  // biome bands, clipped to the island
  g.save(); g.clip(land);
  nodes.forEach((n, i) => { const top = i === nodes.length - 1 ? 0 : (n.y + nodes[i + 1].y) / 2; const bot = i === 0 ? MAPH : (n.y + nodes[i - 1].y) / 2; const B = BIOMES[n.biome] || BIOMES.meadow; g.fillStyle = B.g; g.fillRect(0, top, MAPW, bot - top); g.fillStyle = B.g2; for (let k = 0; k < 60; k++) g.fillRect(rr() * MAPW, top + rr() * (bot - top), 2, 2);
    // decorations by biome
    for (let k = 0; k < 9; k++) { const x = 20 + rr() * (MAPW - 40), y = top + 8 + rr() * (bot - top - 16); if (allPts.some((p) => Math.abs(p[0] - x) < 22 && Math.abs(p[1] - y) < 14) || Math.hypot(x - n.x, y - n.y) < 34) continue; decorate(g, n.biome, x, y); } });
  g.restore();
  // roads
  for (let r = 1; r <= 9; r++) { const pts = routePoints(nodes, r); const known = routeKnown(r);
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = '#3a2a1a'; g.lineWidth = 7; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
    g.strokeStyle = known ? '#e8c987' : '#8a7a62'; g.lineWidth = 4; g.stroke();
    if (known) { g.setLineDash([3, 4]); g.strokeStyle = '#fff6d8'; g.lineWidth = 1; g.stroke(); g.setLineDash([]); }
    const [mx2, my2] = along(pts, 0.36); g.fillStyle = '#1b1530'; g.fillRect(mx2 - 9, my2 - 6, 18, 11); g.fillStyle = known ? '#ffd23f' : '#777'; g.font = '7px "Press Start 2P"'; g.textAlign = 'center'; g.fillText('R' + r, mx2, my2 + 3); }
  // loop trails, with the field skill each one needs
  linksFor().forEach((L, k) => { const pts = linkPoints(nodes, k); const seen = s.flags['lvisit' + k]; const near = s.flags['visit' + (+L.b.slice(4))] || (L.a === 'hometown' ? true : s.flags['visit' + (+L.a.slice(4))]);
    if (!seen && !near) return;
    g.lineCap = 'round'; g.strokeStyle = '#3a2a1a'; g.lineWidth = 6; g.setLineDash(seen ? [] : [6, 5]); g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
    g.strokeStyle = seen ? '#d8b878' : '#8a7a62'; g.lineWidth = 3; g.stroke(); g.setLineDash([]);
    [[L.needs[0], 0.2], [L.needs[1] || L.needs[0], 0.82]].forEach(([nd, f]) => { const [ox, oy] = along(pts, f); obstacleIcon(g, nd, ox, oy, !!s.skills?.[nd]); });
    let [lx, ly] = along(pts, 0.5); g.font = '6px "Press Start 2P"'; g.textAlign = 'center'; const nm = seen ? L.name : '???'; const tw = g.measureText(nm).width; lx = Math.max(tw / 2 + 4, Math.min(MAPW - tw / 2 - 4, lx)); ly -= 12;
    g.fillStyle = 'rgba(20,16,28,0.75)'; g.fillRect(lx - tw / 2 - 2, ly - 6, tw + 4, 9); g.fillStyle = seen ? '#ffe9a8' : '#aaa'; g.fillText(nm, lx, ly + 1); });
  // the Azure Sea and its islands (reached by Swim)
  { const [sx, sy] = seaSpot(nodes); const fz = s.flags.lvisit_sea; if (fz || s.skills?.swim) { g.fillStyle = 'rgba(40,120,190,0.9)'; g.beginPath(); g.ellipse(sx, sy, 26, 30, 0, 0, 7); g.fill();
    for (const [dx, dy] of [[-10, -14], [10, -12], [-9, 12], [11, 14], [0, 0]]) { g.fillStyle = '#e8d49a'; g.beginPath(); g.arc(sx + dx, sy + dy, 5, 0, 7); g.fill(); g.fillStyle = '#5fd068'; g.beginPath(); g.arc(sx + dx, sy + dy, 3, 0, 7); g.fill(); }
    g.font = '6px "Press Start 2P"'; g.textAlign = 'center'; g.fillStyle = '#000a'; g.fillText(fz ? 'Azure Sea' : '???', sx + 1, sy + 41); g.fillStyle = '#c8f0ff'; g.fillText(fz ? 'Azure Sea' : '???', sx, sy + 40); } }
  // in-between zones sit on every road, just before the next town
  for (let r = 1; r <= 9; r++) { const Zi = zoneInfo(r); const [zx, zy] = along(routePoints(nodes, r), ZONE_F); const seenZ = s.flags['zvisit' + r];
    if (!seenZ && !routeKnown(r)) continue;
    zoneIcon(g, Zi, zx, zy, !!seenZ); g.font = '6px "Press Start 2P"'; const nm2 = seenZ ? Zi.name : '???'; const tw = g.measureText(nm2).width; const onLeft = zx < 180 ? zx - 13 - tw > 4 : zx + 13 + tw > MAPW - 4; g.textAlign = onLeft ? 'right' : 'left'; const lx = onLeft ? zx - 13 : zx + 13;
    g.fillStyle = 'rgba(20,16,28,0.7)'; g.fillRect(onLeft ? lx - tw - 2 : lx - 2, zy - 6, tw + 4, 9); g.fillStyle = seenZ ? '#c8ffd8' : '#aaa'; g.fillText(nm2, lx, zy + 1); }
  // hidden places: dotted trails + icons (shown once discovered, otherwise a faint "?")
  const secrets = secretsOnMap(nodes); let found = 0;
  for (const sc of secrets) { const f = !!s.flags['found_' + sc.id]; if (f) found++;
    const show = f || (sc.route ? routeKnown(sc.route) : sc.city !== undefined ? s.flags['visit' + sc.city] : true);
    if (!show) continue;
    g.setLineDash([2, 3]); g.strokeStyle = f ? '#fff6d8' : 'rgba(255,255,255,0.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(sc.from[0], sc.from[1]); g.lineTo(sc.x, sc.y); g.stroke(); g.setLineDash([]);
    if (!f) { g.fillStyle = 'rgba(20,16,28,0.7)'; g.beginPath(); g.arc(sc.x, sc.y, 6, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.7)'; g.font = '7px "Press Start 2P"'; g.textAlign = 'center'; g.fillText('?', sc.x + 0.5, sc.y + 3.5); continue; }
    secretIcon(g, sc.kind, sc.x, sc.y);
    g.font = '6px "Press Start 2P"'; g.textAlign = 'center'; g.fillStyle = '#000a'; g.fillText(sc.name, sc.x + 1, sc.y + 15); g.fillStyle = '#fff'; g.fillText(sc.name, sc.x, sc.y + 14); }
  // Chrono Gate beside Origin Town
  const home = nodes[0]; if (badgeCount(s) >= 4) { const gx = home.x + 48, gy = home.y + 10; g.setLineDash([2, 3]); g.strokeStyle = '#d8c8ff'; g.beginPath(); g.moveTo(home.x, home.y); g.lineTo(gx, gy); g.stroke(); g.setLineDash([]); secretIcon(g, 'gate', gx, gy); g.font = '6px "Press Start 2P"'; g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText('Chrono Gate', gx, gy + 14); }
  // towns
  nodes.forEach((n) => { const v = visited(n); townIcon(g, n, v, n.ci !== undefined && s.badges[n.ci]);
    g.font = '8px "Press Start 2P"'; const label = v ? n.name : '???'; const right2 = n.x < 180; g.textAlign = right2 ? 'left' : 'right'; const tx = right2 ? n.x + 18 : n.x - 18;
    const tw = g.measureText(label).width; g.fillStyle = 'rgba(20,16,28,0.75)'; g.fillRect(right2 ? tx - 3 : tx - tw - 3, n.y - 9, tw + 6, 12); g.fillStyle = v ? '#ffffff' : '#9a9aaa'; g.fillText(label, tx, n.y);
    if (v && n.theme) { g.font = '6px "Press Start 2P"'; g.fillStyle = '#ffe9a8'; g.fillText(n.theme.length > 26 ? n.theme.slice(0, 25) + '…' : n.theme, tx, n.y + 10); } });
  // you are here
  const t = (performance.now() / 300) % (Math.PI * 2); let hx = null, hy = null; const hm = here.match(/^route(\d)$/);
  if (hm) { const m = G.world.map; const f = (1 - (G.world.lp[0].y / m.h)) * (ZONE_F - 0.06); [hx, hy] = along(routePoints(nodes, +hm[1]), f); }
  const lm = here.match(/^link(\d)$/); if (lm) { const m = G.world.map; [hx, hy] = along(linkPoints(nodes, +lm[1]), 1 - G.world.lp[0].y / m.h); hy -= 6; }
  if (here === 'sea') { [hx, hy] = seaSpot(nodes); hy -= 10; }
  const zm = here.match(/^zone(\d)$/); if (zm) { [hx, hy] = along(routePoints(nodes, +zm[1]), ZONE_F); hy -= 8; }
  else if (!lm && here !== 'sea') { const n = nodes.find((q) => q.id === here); const sc = secrets.find((q) => q.id === here); if (n) { hx = n.x; hy = n.y - 12; } else if (sc) { hx = sc.x; hy = sc.y - 8; } else if (here === 'gate') { hx = home.x + 48; hy = home.y; } }
  if (hy !== null) cv.dataset.hy = hy;
  if (hx !== null) { g.fillStyle = '#4cf0ff'; g.beginPath(); g.moveTo(hx, hy - 2 + Math.sin(t) * 2); g.lineTo(hx - 6, hy - 12 + Math.sin(t) * 2); g.lineTo(hx + 6, hy - 12 + Math.sin(t) * 2); g.closePath(); g.fill(); g.strokeStyle = '#003a44'; g.lineWidth = 1; g.stroke(); }
  // title + compass + legend
  g.fillStyle = 'rgba(20,16,28,0.8)'; g.fillRect(6, 6, 150, 30); g.fillStyle = '#ffd23f'; g.font = '8px "Press Start 2P"'; g.textAlign = 'left'; g.fillText(w.region.toUpperCase(), 12, 19); g.fillStyle = '#cfc8e8'; g.font = '6px "Press Start 2P"'; g.fillText(`Secrets found: ${found}/${secrets.length}`, 12, 30);
  const cx = MAPW - 24, cy = 26; g.fillStyle = 'rgba(20,16,28,0.8)'; g.beginPath(); g.arc(cx, cy, 15, 0, 7); g.fill(); g.fillStyle = '#ff5d73'; g.beginPath(); g.moveTo(cx, cy - 12); g.lineTo(cx - 4, cy); g.lineTo(cx + 4, cy); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(cx, cy + 12); g.lineTo(cx - 4, cy); g.lineTo(cx + 4, cy); g.fill(); g.font = '6px "Press Start 2P"'; g.textAlign = 'center'; g.fillText('N', cx, cy - 15 + 22 - 22 + 0);
}
function decorate(g, biome, x, y) {
  if (biome === 'forest' || biome === 'meadow') { g.fillStyle = '#1f5a2a'; g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x - 5, y + 3); g.lineTo(x + 5, y + 3); g.fill(); g.fillStyle = '#2f7a3a'; g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x - 4, y - 1); g.lineTo(x + 4, y - 1); g.fill(); g.fillStyle = '#5a3a1a'; g.fillRect(x - 1, y + 3, 2, 2); }
  else if (biome === 'snow' || biome === 'volcano') { g.fillStyle = biome === 'snow' ? '#7a8aa0' : '#5a3a30'; g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x - 9, y + 4); g.lineTo(x + 9, y + 4); g.fill(); g.fillStyle = biome === 'snow' ? '#ffffff' : '#ff6a2a'; g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x - 3, y - 4); g.lineTo(x + 3, y - 4); g.fill(); }
  else if (biome === 'desert') { g.strokeStyle = '#c8a050'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y + 4, 7, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  else if (biome === 'coast') { g.fillStyle = '#7a5a2a'; g.fillRect(x, y - 6, 2, 9); g.fillStyle = '#2f9a5a'; g.fillRect(x - 4, y - 8, 10, 2); g.fillRect(x - 2, y - 10, 6, 2); }
  else if (biome === 'crystal') { g.fillStyle = '#b8a8ff'; g.beginPath(); g.moveTo(x, y - 8); g.lineTo(x - 3, y + 2); g.lineTo(x + 3, y + 2); g.fill(); g.fillStyle = '#e8e0ff'; g.fillRect(x - 1, y - 5, 1, 5); }
  else if (biome === 'neon') { g.fillStyle = ['#ff4fd8', '#4cf0ff', '#ffd23f'][Math.abs(Math.round(x + y)) % 3]; g.fillRect(x - 3, y - 6, 6, 10); g.fillStyle = '#1b1530'; g.fillRect(x - 2, y - 4, 1, 1); g.fillRect(x + 1, y - 1, 1, 1); }
}
function townIcon(g, n, v, badge) {
  const { x, y } = n;
  if (n.summit) { g.fillStyle = v ? '#d8d0ff' : '#666a7a'; g.beginPath(); g.moveTo(x, y - 14); g.lineTo(x - 16, y + 8); g.lineTo(x + 16, y + 8); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x, y - 14); g.lineTo(x - 5, y - 6); g.lineTo(x + 5, y - 6); g.fill(); g.fillStyle = '#ff5d73'; g.fillRect(x, y - 22, 1, 8); g.fillRect(x + 1, y - 22, 6, 4); return; }
  g.fillStyle = '#1b1530'; g.fillRect(x - 15, y - 11, 30, 21); g.fillStyle = v ? (n.home ? '#c9e8a0' : '#e8dcc0') : '#6a6a78'; g.fillRect(x - 13, y - 9, 26, 17);
  const roofs = v ? ['#d04848', '#3a6ad0', '#3aa060'] : ['#555', '#555', '#555'];
  [[-9, 0], [-1, -3], [7, 1]].forEach(([dx, dy], k) => { g.fillStyle = roofs[k]; g.beginPath(); g.moveTo(x + dx - 4, y + dy); g.lineTo(x + dx, y + dy - 5); g.lineTo(x + dx + 4, y + dy); g.fill(); g.fillStyle = v ? '#fff6e0' : '#888'; g.fillRect(x + dx - 3, y + dy, 6, 5); g.fillStyle = '#3a2a1a'; g.fillRect(x + dx - 1, y + dy + 2, 2, 3); });
  if (n.home) { g.fillStyle = '#ff5d73'; g.font = '7px "Press Start 2P"'; g.textAlign = 'center'; g.fillText('♥', x, y - 12); }
  if (badge) { g.fillStyle = '#ffd23f'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr2 = i % 2 ? 2.5 : 6; g.lineTo(x + 15 + Math.cos(a) * rr2, y - 11 + Math.sin(a) * rr2); } g.fill(); g.strokeStyle = '#7a5a00'; g.lineWidth = 0.8; g.stroke(); }
}
const ZONE_F = 0.68;
function zoneIcon(g, Z, x, y, seen) {
  g.fillStyle = '#1b1530'; g.fillRect(x - 10, y - 10, 20, 20); g.fillStyle = seen ? '#2a3a2a' : '#555a6a'; g.fillRect(x - 9, y - 9, 18, 18);
  if (!seen) { g.fillStyle = '#ddd'; g.font = '8px "Press Start 2P"'; g.textAlign = 'center'; g.fillText('?', x + 1, y + 4); return; }
  const k = Z.icon;
  if (k === 'forest') { g.fillStyle = Z.night ? '#2a4a5a' : '#2f8a3a'; for (const [dx, dy] of [[-4, 2], [4, 2], [0, -3]]) { g.beginPath(); g.moveTo(x + dx, y + dy - 6); g.lineTo(x + dx - 4, y + dy + 3); g.lineTo(x + dx + 4, y + dy + 3); g.fill(); } }
  if (k === 'maze') { g.fillStyle = Z.crystal ? '#b8a8ff' : '#3aa050'; g.fillRect(x - 8, y - 8, 16, 2); g.fillRect(x - 8, y - 8, 2, 16); g.fillRect(x + 6, y - 8, 2, 12); g.fillRect(x - 8, y + 6, 12, 2); g.fillRect(x - 4, y - 4, 2, 8); g.fillRect(x - 4, y - 4, 8, 2); g.fillRect(x + 2, y - 4, 2, 6); g.fillStyle = '#ffd23f'; g.fillRect(x - 1, y, 2, 2); }
  if (k === 'lake' || k === 'sky') { g.fillStyle = k === 'sky' ? '#e8f0ff' : '#3a7ac8'; g.fillRect(x - 8, y - 8, 16, 16); g.fillStyle = '#9a6a3a'; g.fillRect(x - 8, y - 1, 16, 3); g.fillRect(x - 1, y - 8, 3, 16); }
  if (k === 'cave') { g.fillStyle = '#8a8098'; g.beginPath(); g.arc(x, y + 6, 9, Math.PI, 0); g.fill(); g.fillStyle = '#0a0812'; g.beginPath(); g.arc(x, y + 6, 4.5, Math.PI, 0); g.fill(); }
  if (k === 'ruins') { g.fillStyle = '#d8c08a'; g.fillRect(x - 7, y - 6, 3, 12); g.fillRect(x + 4, y - 6, 3, 12); g.fillRect(x - 8, y - 8, 16, 3); g.fillRect(x - 1, y, 3, 6); }
  if (k === 'park') { const t = performance.now() / 800; g.strokeStyle = '#ffd23f'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y - 1, 7, 0, 7); g.stroke(); for (let i = 0; i < 6; i++) { const a = t + i; g.fillStyle = ['#ff4fd8', '#4cf0ff', '#5fd068'][i % 3]; g.fillRect(x + Math.cos(a) * 7 - 1, y - 1 + Math.sin(a) * 7 - 1, 3, 3); } g.fillStyle = '#b36bff'; g.fillRect(x - 2, y + 4, 4, 5); }
}
function obstacleIcon(g, need, x, y, have) {
  g.fillStyle = 'rgba(20,16,28,0.85)'; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); g.strokeStyle = have ? '#5fd068' : '#ff5d73'; g.lineWidth = 1.2; g.stroke();
  if (need === 'cut') { g.fillStyle = '#3aa050'; g.beginPath(); g.moveTo(x, y - 5); g.lineTo(x - 4, y + 2); g.lineTo(x + 4, y + 2); g.fill(); g.fillStyle = '#7a5a2a'; g.fillRect(x - 1, y + 2, 2, 3); }
  if (need === 'smash') { g.fillStyle = '#a0a0ac'; g.beginPath(); g.arc(x, y + 1, 4.5, 0, 7); g.fill(); g.strokeStyle = '#3a3a4a'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 2, y - 2); g.lineTo(x, y + 1); g.lineTo(x - 1, y + 4); g.stroke(); }
  if (need === 'swim') { g.strokeStyle = '#4cb8ff'; g.lineWidth = 1.5; for (const dy of [-2, 2]) { g.beginPath(); g.moveTo(x - 5, y + dy); g.quadraticCurveTo(x - 2.5, y + dy - 3, x, y + dy); g.quadraticCurveTo(x + 2.5, y + dy + 3, x + 5, y + dy); g.stroke(); } }
}
function secretIcon(g, kind, x, y) {
  g.fillStyle = 'rgba(20,16,28,0.8)'; g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill();
  if (kind === 'grove') { g.fillStyle = '#2f9a4a'; for (const [dx, dy] of [[-3, 1], [3, 1], [0, -3]]) { g.beginPath(); g.arc(x + dx, y + dy, 3.5, 0, 7); g.fill(); } }
  if (kind === 'lair') { g.fillStyle = '#8a8098'; g.beginPath(); g.arc(x, y + 3, 6, Math.PI, 0); g.fill(); g.fillStyle = '#0a0812'; g.beginPath(); g.arc(x, y + 3, 3, Math.PI, 0); g.fill(); g.fillStyle = '#ffd23f'; g.fillRect(x - 1, y - 7, 2, 2); }
  if (kind === 'garden') { for (const [dx, dy, c] of [[-3, -2, '#ff7ab8'], [3, -1, '#ffd23f'], [0, 3, '#b37bff']]) { g.fillStyle = c; g.beginPath(); g.arc(x + dx, y + dy, 2.5, 0, 7); g.fill(); } }
  if (kind === 'sanctum') { g.fillStyle = '#ff9ff0'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r2 = i % 2 ? 2.5 : 6.5; g.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2); } g.fill(); }
  if (kind === 'gate') { g.strokeStyle = '#b37bff'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 5, 0, 7); g.stroke(); g.fillStyle = '#4cf0ff'; g.fillRect(x - 1, y - 1, 2, 2); }
}
export async function regionMap() {
  const nodes = regionNodes().filter((n) => !n.summit); const s = S(); const canFly = !!s.skills?.fly; let sel = whereNow(); let dest = null;
  const visited = (n) => n.home || s.flags['visit' + n.ci];
  await ui.panel({ title: `Region Map${canFly ? ' — choose a city to Soar' : ''}`, wide: true, cls: 'regionmap',
    render: () => `<div class="rmap"><div class="rmapwrap"><canvas width="720" height="1760"></canvas></div><div class="rlist"><p class="dim">${canFly ? 'Soar instantly to any place you have visited.' : 'Earn the Soar Disc from the 5th Mastery Hall Leader to fly between cities.'}</p>${nodes.map((n) => `<button data-nav data-act="go" data-arg="${n.id}" ${visited(n) ? '' : 'disabled'}>${visited(n) ? (canFly ? '✈ ' : '◆ ') + esc(n.name) : '??? (not visited)'}${n.theme && visited(n) ? `<small> · ${esc(n.theme)}</small>` : ''}</button>`).join('')}<div class="skills">${Object.entries(FIELD_SKILLS).map(([k, v]) => `<span class="${s.skills?.[k] ? 'on' : ''}">${s.skills?.[k] ? '✔' : '✖'} ${v.name}</span>`).join('')}</div></div></div>`,
    actions: { go: async (id) => { if (!canFly) { sel = id; ui.toast('You need the Soar Disc to fly.'); return; } const n = nodes.find((q) => q.id === id); if (await ui.confirm(`Soar to ${n.name}?`)) { dest = id; return 'close'; } } } });
  return dest;
}
function hookRegionCanvas() { const obs = new MutationObserver(() => { const cv = document.querySelector('.regionmap canvas'); if (cv && !cv.dataset.drawn) { cv.dataset.drawn = 1; drawRegion(cv, whereNow()); const wrap = cv.parentElement; requestAnimationFrame(() => { const yy = (cv.dataset.hy || 0) * (cv.clientHeight / MAPH); wrap.scrollTop = Math.max(0, yy - wrap.clientHeight / 2); }); } }); obs.observe(document.getElementById('ui'), { childList: true, subtree: true }); }
if (typeof document !== 'undefined') setTimeout(hookRegionCanvas, 0);

// ------------------------------------------------------------ dex
export async function dex() {
  const w = W(); const ids = Object.keys(w.species);
  await ui.panel({ title: `Dex — ${Object.keys(S().caught).length} caught · ${Object.keys(S().seen).length} seen · ${ids.length} total`, wide: true, cols: 6, cls: 'dexp',
    render: () => `<div class="dexgrid">${ids.map((id, n) => { const sp = w.species[id]; const seen = S().seen[id], caught = S().caught[id];
      return `<button data-nav data-act="sp" data-arg="${id}" class="dexc ${caught ? 'c' : seen ? 's' : 'u'} rar-${sp.rarity}" style="${seen ? `border-color:${RARITY[sp.rarity]?.color}` : ''}"><img src="${seen ? G.mini(sp) : G.mini(sp)}" class="${seen ? '' : 'shadow'}"><small>#${String(n + 1).padStart(3, '0')}${seen ? ` <i class="stars" style="color:${RARITY[sp.rarity]?.color}">${'★'.repeat(RARITY[sp.rarity]?.stars || 1)}</i>` : ''}</small><span>${seen ? esc(sp.name) : '???'}</span></button>`; }).join('')}</div>`,
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
      <p class="dim">Level here: <b>${LEVEL_NAME[levelFor(S(), ci)]}</b>${S().flags['mastery' + ci] ? ' · 🎓 Mastered' : ''} · ${c.terms.length} terms · ${(c.vocab || []).length ? c.vocab.length + ' words · ' : ''}${c.pool.filter((q) => !q.term).length} questions</p>
      <div class="row"><button data-nav data-act="lessons" data-arg="${ci}">📖 Lessons</button><button data-nav data-act="arcade" data-arg="${ci}">🕹 Arcade games</button><button data-nav data-act="drill" data-arg="${ci}">▶ Drill this chapter</button><button data-nav data-act="interview">🎤 Mock interview</button><button data-nav data-act="review">↺ Review missed (${S().missed.length})</button></div>
      <p class="dim">Tap a term for examples${externalOn() ? ' and links' : ''}.</p>
      <div class="terms">${c.terms.map((t) => `<button data-nav data-act="learn" data-arg="${t.id}" class="term tbtn ${S().codex[t.id] ? 'got' : ''}"><b>${S().codex[t.id] ? '✔ ' : ''}${esc(t.term)} <i class="more">📖</i></b><span>${esc(t.def)}</span></button>`).join('')}
      ${(c.pool || []).filter((q) => !q.term).slice(0, 40).map((q) => `<div class="term qa"><b>Q: ${esc(q.q)}</b><span>A: ${esc(q.a)} — <i>${esc(q.expl)}</i></span></div>`).join('')}</div>`; },
    actions: { lessons: async (k) => { await lessonBoard(+k); }, arcade: async (k) => { const games = ['unscramble', 'blitz', 'guess', 'ladder', 'listen']; const g = await ui.choose('Which game?', games.map((x) => CABINETS[x])); if (g >= 0) await cabinet(games[g], +k); }, city: (k) => { ci = +k; }, learn: async (id) => { await learnMore(w.terms.find((t) => t.id === id)); }, drill: async (k) => { await drill(`${w.cities[+k].name} drill`, () => w.pickQ(+k, S(), { mix: false, review: 0.15 }), 10); }, interview: async () => { await drill('Mock interview', () => w.pickQ(reach >= 7 && S().champion ? 'final' : reach, S(), { review: 0.3 }), 15, true); }, review: async () => { await reviewDrill(); } } });
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
    <div class="ctrl"><h4>Controls</h4><p><b>1 player:</b> Arrows/WASD move · Z/Space/Enter = A · X/Esc = B · Shift/C = Run (double-tap to lock running on/off; on touch, double-tap RUN) · Tab/M = Menu</p><p><b>Field skills:</b> leaders teach <i>Slice</i> (cut saplings, 1st badge), <i>Smash</i> (break cracked boulders, 3rd), <i>Teleport</i> (Menu → ✨ Teleport back to any town or area you've found, from anywhere — 4th), <i>Soar</i> (fly from the 🗺 Map, 5th) and <i>Swim</i> (face water and press A to ride your monster to islands, 6th). Face the obstacle and press A. <b>Loop trails</b> on the sides of towns join cities two apart, but saplings, boulders and rivers block them until you have the right skill — check the 🗺 Map for which ones. Swim out from Mirror Lake to find the islands of the <i>Azure Sea</i>. Leaders also hand out reusable 💿 Technique Discs.</p><p><b>Conditions:</b> ${TYPES.flux.name} attacks can <i>burn</i> (weaker attacks + chip damage), ${TYPES.cipher.name} attacks can <i>poison</i>, and ${TYPES.data.name} attacks can make a monster <i>sick</i> (may skip turns). Any healing item or a Mend Station cures them. Insight Shards are very rare (one per badge) and only work outside battle.</p><p><b>Partner:</b> your chosen monster walks behind you — talk to it for tips. Pick a partner in Team → 🐾 Walk with me.</p><p><b>Learn more:</b> after any question, or by tapping a Codex term, see extra examples, worked questions and (if enabled) outside resources.</p><p><b>2+ players:</b> P1 WASD + F (A) / G (B) / Tab (menu) · P2 Arrows + . (A) / , (B) / / (menu) · P3 &amp; P4 use gamepads (each new pad joins the next slot). Touch controls drive P1.</p><p>Everyone shares one screen and travels together. In battle, every player's lead monster fights side by side and each player answers their own questions.</p></div>`,
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
  const st = G.settings; const keys = ['music', 'sfx', 'timer', 'timerSec', 'textSpeed', 'daynight', 'seasonFx', 'speech', 'full'];
  const lbl = { music: 'Music volume', sfx: 'Sound volume', timer: 'Question timer', timerSec: 'Timer length', textSpeed: 'Text speed', daynight: 'Day / night cycle', seasonFx: 'Seasonal effects', speech: 'Pronunciation audio', full: 'Fullscreen' };
  const val = (k) => k === 'music' || k === 'sfx' ? '▮'.repeat(Math.round(st[k] * 10)) + '▯'.repeat(10 - Math.round(st[k] * 10)) : k === 'timer' ? (st.timer ? 'On' : 'Off (relaxed)') : k === 'timerSec' ? st.timerSec + 's' : k === 'textSpeed' ? ['', 'Slow', 'Normal', 'Fast', 'Instant'][st.textSpeed] : k === 'seasonFx' ? (st.seasonFx === false ? 'Off' : 'On') : k === 'speech' ? (st.speech === false ? 'Off' : 'On (languages)') : k === 'daynight' ? (st.daynight === false ? 'Off (always day)' : 'On (real time)') : document.fullscreenElement ? 'On' : 'Off';
  const change = (k, d) => {
    if (k === 'music' || k === 'sfx') { st[k] = clamp(Math.round((st[k] + d * 0.1) * 10) / 10, 0, 1); audio.setVolume(k, st[k]); }
    if (k === 'timer') st.timer = !st.timer; if (k === 'daynight') st.daynight = st.daynight === false; if (k === 'seasonFx') st.seasonFx = st.seasonFx === false; if (k === 'speech') st.speech = st.speech === false; if (k === 'timerSec') st.timerSec = clamp(st.timerSec + d * 5, 10, 60); if (k === 'textSpeed') st.textSpeed = clamp(st.textSpeed + d, 1, 4);
    if (k === 'full') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); }
    saveSettings(st); audio.sfx('blip');
  };
  let cur = 0;
  await ui.panel({ title: 'Settings', onLR: (d, rr) => { const l = ui.stack[ui.stack.length - 1]; cur = l.idx; if (keys[cur]) change(keys[cur], d); rr(); },
    render: () => `<div class="slist">${keys.map((k, i) => `<button data-nav data-act="t" data-arg="${k}" class="srow"><span>${lbl[k]}</span><b>◀ ${val(k)} ▶</b></button>`).join('')}${document.body.classList.contains('touch') ? '<button data-nav data-act="ctl" class="srow"><span>Touch controls</span><b>Move &amp; resize ▶</b></button>' : ''}${S() ? `<button data-nav data-act="reroll" class="srow"><span>🎲 New world layout</span><b>${S().seed === 'legacy' ? 'Classic map' : 'Shuffled'} ▶</b></button>` : ''}</div><p class="dim">Left/right to change. Turn the timer off for a relaxed, accessible pace — you can still earn Quick Recall bonuses.</p>`,
    actions: { t: (k) => change(k, 1), reroll: async () => { if (!S()) return; if (!(await ui.confirm('Reshuffle this save\'s world? Routes, towns, building spots, in-between areas, loop trails, islands and which wild monsters live where all change. You keep your team, bag, badges and progress, and return to Origin Town.'))) return; const s = S(); s.seed = uid(); s.map = 'hometown'; s.pos = s.players.map(() => ({ x: 11, y: 10, dir: 'down' })); G.autosave(true); ui.toast('🎲 A brand-new world awaits…'); setTimeout(() => location.reload(), 900); return 'close'; }, ctl: async () => { setTimeout(async () => { G.busy++; await editControls(); G.busy--; }, 50); return 'close'; } } });
}
export async function help() {
  await ui.panel({ title: 'Help & Legal', wide: true, render: () => `<div class="help"><h4>How to play</h4><p>Walk with the arrows/WASD (or the on-screen pad). Talk and interact with A. Open the menu with START. In battle choose a move, then answer its question: correct = hit, fast = ⚡ Quick Recall critical, wrong = miss + explanation. Weaken wild monsters and throw a Capture Cube, answering the lock-on question for a better catch rate.</p><h4>The Static Syndicate ⚡</h4><p>A gang called the Static Syndicate is causing mayhem across the region. In each new world they kidnap a child (rescue her from the top of the Old Watchtower), lock a town down, trap a Hall Leader in the twisting Tangle Caverns (ladders go up and down; holes drop you a level — you can get lost!), cause a blackout, hide a stolen relic in the Hollow Crypt (where undead wander and battle you on sight), and run a five-floor HQ tower. A Mastery Hall stays closed until you sort out that town's trouble. Beat Kingpin Vex for the special <i>Syndicate Breaker Badge</i> and a rare Prismatic monster.</p><h4>Double battles, side quests & more</h4><p>Some trainers stand in pairs — if one spots you, both battle you at once (choose which foe to hit). People with quests are everywhere: accept them, check your progress in the Quest Log and come back for a reward. Every city has its own style — a metropolis with a mall, a mountain town with a ski lodge, a frontier town with a saloon, a harbour, a farm village, an old town, hot springs and a tech campus. Buy a <i>Longboard</i> at the Skate Shop (free with 6 badges) to cruise faster than running — toggle it from the Menu.</p><h4>A new world every game 🎲</h4><p>Each new save rolls its own world: winding or zig-zag routes with forks and rivers, towns with buildings in different spots, the in-between areas in a new order, loop trails on different sides with different blockers, reshuffled islands, and different wild monsters, rarities and legends on every road. Older saves keep their classic map — change that under ⚙ Settings → 🎲 New world layout.</p><h4>Rarity & secrets ★</h4><p>Monsters come in tiers: <b style="color:#b8c0cc">★ Common</b>, <b style="color:#5fd068">★★ Uncommon</b>, <b style="color:#4aa8ff">★★★ Rare</b>, <b style="color:#b36bff">★★★★ Epic</b>, plus four <b style="color:#ffb020">★★★★★ Legendary</b> guardians and one <b style="color:#ff5fd2">★★★★★★ Mythic</b> per world. Rarer monsters are stronger and harder to catch. Any monster can appear as a shimmering <b>✦ Prismatic</b> variant. Secret places — Hidden Groves, Secret Gardens behind each city\'s east hedge, Legendary Lairs behind gaps in the trees on Routes 3, 5, 7 and 9, and the Starfall Sanctum — have rarer encounters. Between every pair of towns lies a special area — Whispering Woods, the Hedge Maze, Mirror Lake, Echo Caverns, <b>Wonderland Park</b> (a theme-park town with a Ferris Wheel, Quiz Coaster, Carousel and Big Top), the Sunken Ruins, the Crystal Labyrinth, Mistwood and the Cloudwalk Bridges. The Region Map shows every town, road, area and discovered secret.</p><h4>Learning to mastery 🎓</h4><p>Every city starts at <b>Easy</b> questions, moves to <b>Medium</b> after 8 correct answers and <b>Mastery</b> after 24. Visit each city's <b>Academy</b> (Learning Quarter, east side) to read lessons, take level checks and the Mastery Exam. The <b>Arcade</b> next door has Unscramble, True/False Blitz, Word Guess, Quiz Ladder and Listening — also playable from the Codex. Language worlds include pronunciation (🔊) when your device has a voice for that language.</p><h4>Time travel ⏳</h4><p><b>Learning Echoes:</b> every question you miss comes back as an echo after 10 minutes, then 1, 3, 7 and 21 days. Battle echoes at an Echo Rift or from the ⏳ Chrono Log — answer all five steps to master it for good.<br><b>Chrono Gate:</b> with 4 badges, the gate in Origin Town opens trips to the past and future of your subject, with history questions and Ancient / Neo- era forms of monsters.<br><b>Real time:</b> the Keeper of Time gives a daily egg (hatches in ~2 hours) and buries time capsules (open after 3 days). Play daily to build your streak, and the Season Herald brings gifts each real season.</p>
    <p>Each city teaches one chapter of your topic. Talk to everyone (tips go into your Codex), pass the Study Lab Trial, then beat the Mastery Hall Leader for a badge. Badges open the road north. Eight badges lead to the Mastery Summit.</p>
    <h4>Types</h4><p>${typeCycleText()}. Each type beats the next one. Super-effective hits do double damage.</p>
    <h4>Legal</h4><p>Hakma is an original work. All monsters, characters, music and art are generated by the game itself. Educational content is provided as-is for learning; always verify safety-critical information (e.g. electrical work) against official codes and licensed professionals.</p>
    <div class="row"><a data-nav class="btn" href="legal/eula.html" target="_blank">EULA</a><a data-nav class="btn" href="legal/privacy.html" target="_blank">Privacy Policy</a><a data-nav class="btn" href="legal/terms.html" target="_blank">Terms of Service</a><a data-nav class="btn" href="legal/credits.html" target="_blank">Credits &amp; Licenses</a></div>
    <p class="dim">Version ${G.version}</p></div>` });
}

// ------------------------------------------------------------ archive box & shop
export async function archive() {
  let p = 0, bx = 0; const P0 = () => S().players[p];
  const inBox = (b) => P0().box.filter((m) => (m.boxN || 0) === b);
  const cell = (m) => { const sp = W().species[m.sp]; return `<img class="mini" src="${G.mini(sp, lookOf(m))}"><span class="bn">${esc(monName(W(), m))}</span><span class="bl">Lv${m.lvl} <i class="type t-${sp.type}">${TYPES[sp.type].name}</i></span>`; };
  const pickBox = async (skip) => { const opts = Array.from({ length: BOX_COUNT }, (_, q) => `Box ${q + 1}  (${inBox(q).length}/${BOX_SIZE})${q === skip ? ' · here now' : inBox(q).length >= BOX_SIZE ? ' · full' : ''}`);
    const b = await ui.choose('Which box?', opts); if (b < 0) return -1; if (b === skip) return -1; if (inBox(b).length >= BOX_SIZE) { ui.toast(`Box ${b + 1} is full.`); return -1; } return b; };
  const store = (m) => { const P = P0(); if (P.party.length <= 1) { ui.toast('You must keep at least one monster.'); return false; } if (inBox(bx).length >= BOX_SIZE) { ui.toast(`Box ${bx + 1} is full — use ◀ ▶ to pick another box.`); return false; }
    P.party.splice(P.party.indexOf(m), 1); healMon(W(), m); m.boxN = bx; P.box.push(m); if (S().follower === m.uid) { S().follower = null; G.world?.initFollower(); } audio.sfx('door'); ui.toast(`${monName(W(), m)} was stored in Box ${bx + 1}.`); return true; };
  const take = (m, swapWith) => { const P = P0(); P.box.splice(P.box.indexOf(m), 1); healMon(W(), m);
    if (swapWith) { const k = P.party.indexOf(swapWith); P.party[k] = m; healMon(W(), swapWith); swapWith.boxN = bx; P.box.push(swapWith); if (S().follower === swapWith.uid) { S().follower = null; G.world?.initFollower(); } ui.toast(`${monName(W(), m)} swapped in for ${monName(W(), swapWith)}.`); }
    else { P.party.push(m); ui.toast(`${monName(W(), m)} joined your team!`); } audio.sfx('door'); };
  const focusBox = (L) => { const n = L.navs(); const i = n.findIndex((e) => e.classList.contains('bcell')); L.idx = i >= 0 ? i : Math.max(0, n.findIndex((e) => e.dataset.act === 'bx' && e.dataset.arg === '1')); L.highlight(); };
  await ui.panel({ title: 'Archive Box Terminal', wide: true, cls: 'archive', spatial: true,
    // right past the last box column flips to the next box; left past the team column flips back
    onEdge: (d, rr, L) => { const cur = L.navs()[L.idx]; if (d === 'right' && cur && (cur.classList.contains('bcell') || cur.dataset.act === 'bx')) { bx = (bx + 1) % BOX_COUNT; audio.sfx('select'); rr(); focusBox(L); } else if (d === 'left' && cur && cur.dataset.act === 'tm') { bx = (bx + BOX_COUNT - 1) % BOX_COUNT; audio.sfx('select'); rr(); L.idx = L.navs().indexOf(L.navs().find((e) => e.dataset.act === 'tm' && e.dataset.arg === cur.dataset.arg)); L.highlight(); } },
    render: () => { const P = P0(); const list = inBox(bx); return `${S().players.length > 1 ? `<div class="tabs">${S().players.map((q, k) => `<button data-nav data-act="pl" data-arg="${k}" class="${k === p ? 'on' : ''}" style="border-color:${q.color}">P${k + 1} ${esc(q.name)}</button>`).join('')}</div>` : ''}
      <div class="cols"><div><h4>Team (${P.party.length}/6)</h4>${P.party.map((m, k) => `<button data-nav data-act="tm" data-arg="${k}" class="mrow">${monRow(W(), m)}</button>`).join('')}</div>
      <div><div class="boxnav"><button data-nav data-act="bx" data-arg="-1">◀</button><h4>Box ${bx + 1} <small>(${list.length}/${BOX_SIZE})</small></h4><button data-nav data-act="bx" data-arg="1">▶</button></div>
      <div class="boxgrid">${list.map((m) => `<button data-nav data-act="bm" data-arg="${P.box.indexOf(m)}" class="bcell">${cell(m)}</button>`).join('') || '<p class="dim">This box is empty.</p>'}</div></div></div>
      <p class="dim">Pick a monster for options. Press → from your team to jump into the box; keep going → past the last column (or use ◀ ▶) to flip boxes, ← from your team goes back a box. Stored monsters are healed automatically. All boxes hold ${P.box.length} monsters.</p>`; },
    actions: {
      pl: (k) => { p = +k; },
      bx: (d) => { bx = (bx + +d + BOX_COUNT) % BOX_COUNT; audio.sfx('select'); },
      tm: async (k) => { const m = P0().party[+k]; if (!m) return; const c = await ui.choose(`${monName(W(), m)} · Lv ${m.lvl} ${TYPES[W().species[m.sp].type].name}`, [`📦 Store in Box ${bx + 1}`, '📦 Store in another box…', 'Summary', 'Cancel']); if (c === 0) store(m); if (c === 1) { const b = await pickBox(-1); if (b >= 0) { const keep = bx; bx = b; store(m); bx = keep; } } if (c === 2) await summary(m); },
      bm: async (k) => { const P = P0(); const m = P.box[+k]; if (!m) return; const full = P.party.length >= 6;
        const opts = [full ? '🔁 Swap with a team monster' : '➕ Add to team', '📦 Move to another box', 'Summary', 'Cancel'];
        const c = await ui.choose(`${monName(W(), m)} · Lv ${m.lvl} ${TYPES[W().species[m.sp].type].name}`, opts);
        if (c === 0) { if (!full) take(m); else { const t = await ui.choose(`Swap ${monName(W(), m)} with which team monster?`, P.party.map((q) => ({ html: monRow(W(), q) })), { cls: 'teamlist' }); if (t >= 0) take(m, P.party[t]); } }
        if (c === 1) { const b = await pickBox(bx); if (b >= 0) { m.boxN = b; audio.sfx('door'); ui.toast(`Moved to Box ${b + 1}.`); } }
        if (c === 2) await summary(m); },
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
