// Overworld: tile movement for up to 4 local players, NPCs, warps, encounters, trainer sight, online peers.
import { G, PLAYER_COLORS } from './state.js';
import { view } from '../core/view.js';
import { getMap } from './maps.js';
import { input } from '../core/input.js';
import { audio } from '../core/audio.js';
import { tileAtlas, personSheet, personPalette, DIR_ROW, SOLID, T, drawBuilding, drawObject, BIOMES } from '../core/sprites.js';
import { TYPES } from '../content/types.js';
import { hash, R, clamp } from '../core/rng.js';
import { ui } from './ui.js';

const TS = 16;
const DX = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const PEOPLE = new Set(['npc', 'guardian', 'prof', 'nurse', 'clerk', 'trainer', 'leader', 'guard', 'researcher', 'labkeeper', 'gymguide', 'gifter', 'elite', 'champion']);

export class World {
  constructor() { this.t = 0; this.cam = { x: 0, y: 0 }; this.lp = []; this.objs = []; this.noEnc = 0; this.bumpT = 0; this.peerDraw = {}; }
  chapter() { const c = this.map?.ci; return c === 'final' ? 'final' : c ?? 0; }
  load(mapId, spots) {
    const W = G.W, S = G.save; const m = getMap(W, mapId); this.map = m; S.map = mapId;
    this.objs = m.objs.map((o, i) => ({ ...o, ox: o.x, oy: o.y, px: o.x * TS, py: o.y * TS, i, wt: 1 + R() * 3, sheet: PEOPLE.has(o.kind) ? personSheet(this.palFor(o, i)) : null }));
    this.lp = S.players.map((p, i) => { const s = (spots && spots[i]) || S.pos[i] || S.pos[0]; return { i, x: s.x, y: s.y, px: s.x * TS, py: s.y * TS, dir: s.dir || 'down', moving: false, sheet: personSheet(personPalette(hash(p.name + i), { shirt: p.color, hair: ['#2a1f1a', '#c07a30', '#30304a', '#a03030'][i], hat: shadeHat(p.color), long: i % 2 === 1 })) }; });
    // spread co-op players who would overlap
    const taken = new Set();
    for (const p of this.lp) {
      let k = p.x + ',' + p.y;
      if (taken.has(k)) { for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [2, 0], [-2, 0], [1, -1], [-1, -1]]) { const x = p.x + ox, y = p.y + oy; if (!taken.has(x + ',' + y) && !this.solid(x, y) && !m.warps.some((w) => w.x === x && w.y === y)) { p.x = x; p.y = y; p.px = x * 16; p.py = y * 16; break; } } k = p.x + ',' + p.y; }
      taken.add(k);
    }
    this.savePos();
    this.snapCam();
    audio.play(m.musicKey, m.musicKey, m.music);
    G.net?.sendPos?.();
  }
  palFor(o, i) {
    const base = { ...(o.pal || {}) };
    if (o.kind === 'leader') { const ty = G.W.cities[o.ci].type; base.shirt = TYPES[ty].color; base.hat = null; base.coat = false; }
    if (o.kind === 'elite') base.shirt = TYPES[o.type]?.color;
    if (o.kind === 'champion') { base.shirt = '#ffd23f'; base.hair = '#e0e0f0'; base.coat = true; }
    if (o.kind === 'trainer' || o.kind === 'guard') base.hat = base.hat ?? (o.kind === 'guard' ? '#305070' : undefined);
    return personPalette(hash(this.map.id + i + (o.name || '')), base);
  }
  savePos() { G.save.pos = this.lp.map((p) => ({ x: p.x, y: p.y, dir: p.dir })); }
  visible(o) {
    const S = G.save;
    if ((o.kind === 'item' || o.kind === 'note') && S.taken[o.key]) return false;
    if (o.kind === 'elite' && S.flags['elite' + o.idx]) return false;
    if (o.kind === 'starter' && S.flags.starter) return false;
    return true;
  }
  objAt(x, y) { return this.objs.find((o) => this.visible(o) && o.x === x && o.y === y); }
  solid(x, y, self) {
    const m = this.map; if (x < 0 || y < 0 || x >= m.w || y >= m.h) return true;
    if (SOLID.has(m.get(x, y))) return true;
    const o = this.objAt(x, y); if (o && o !== self && !o.walkable) return true;
    return false;
  }
  snapCam() { const t = this.camTarget(); this.cam.x = t.x; this.cam.y = t.y; }
  camTarget() {
    const m = this.map; let cx = 0, cy = 0; for (const p of this.lp) { cx += p.px; cy += p.py; } cx /= this.lp.length; cy /= this.lp.length;
    let x = cx + 8 - view.w / 2, y = cy + 8 - view.h / 2;
    const mw = m.w * TS, mh = m.h * TS;
    x = mw <= view.w ? (mw - view.w) / 2 : clamp(x, 0, mw - view.w); y = mh <= view.h ? (mh - view.h) / 2 : clamp(y, 0, mh - view.h);
    return { x, y };
  }
  canControl() { return !G.busy && !ui.open && G.scene === this; }
  update(dt) {
    this.t += dt; this.bumpT -= dt;
    const S = G.save;
    for (const p of this.lp) {
      if (p.moving) {
        p.mt += dt / p.stepT;
        const k = Math.min(1, p.mt); p.px = (p.fx + (p.x - p.fx) * k) * TS; p.py = (p.fy + (p.y - p.fy) * k) * TS;
        if (k >= 1) { p.moving = false; p.px = p.x * TS; p.py = p.y * TS; this.afterStep(p); }
        continue;
      }
      if (!this.canControl()) continue;
      const d = input.dir(p.i);
      if (d) this.tryMove(p, d, input.held(p.i, 'b'));
      if (input.pressed(p.i, 'a')) this.interact(p);
      if (input.pressed(p.i, 'start')) { G.events.openMenu(p.i); }
    }
    // NPC wander
    for (const o of this.objs) {
      if (!o.wander || !this.canControl()) continue;
      if (o.moving) { o.mt += dt / 0.3; const k = Math.min(1, o.mt); o.px = (o.fx + (o.x - o.fx) * k) * TS; o.py = (o.fy + (o.y - o.fy) * k) * TS; if (k >= 1) o.moving = false; continue; }
      o.wt -= dt; if (o.wt > 0) continue; o.wt = 1.5 + R() * 3;
      const d = R.pick(['up', 'down', 'left', 'right']); o.dir = d; const nx = o.x + DX[d][0], ny = o.y + DX[d][1];
      if (Math.abs(nx - o.ox) > 2 || Math.abs(ny - o.oy) > 2 || this.solid(nx, ny, o) || this.lp.some((p) => p.x === nx && p.y === ny) || this.map.warps.some((w) => w.x === nx && w.y === ny)) continue;
      o.fx = o.x; o.fy = o.y; o.x = nx; o.y = ny; o.mt = 0; o.moving = true;
    }
    // peers interpolate
    const peers = G.net?.peersHere?.() || [];
    for (const pr of peers) { const d = this.peerDraw[pr.id] || (this.peerDraw[pr.id] = { x: pr.x * TS, y: pr.y * TS }); d.x += (pr.x * TS - d.x) * Math.min(1, dt * 10); d.y += (pr.y * TS - d.y) * Math.min(1, dt * 10); }
    const ct = this.camTarget(); this.cam.x += (ct.x - this.cam.x) * Math.min(1, dt * 10); this.cam.y += (ct.y - this.cam.y) * Math.min(1, dt * 10);
    if (Math.abs(ct.x - this.cam.x) < 0.5) this.cam.x = ct.x; if (Math.abs(ct.y - this.cam.y) < 0.5) this.cam.y = ct.y;
    S.playtime += dt;
  }
  tryMove(p, d, run) {
    p.dir = d; const nx = p.x + DX[d][0], ny = p.y + DX[d][1]; const m = this.map;
    // gates
    if (m.gateNorth && ny <= m.gateNorth.y && d === 'up') {
      const g = m.gateNorth;
      if ((g.flag && !G.save.flags[g.flag]) || (g.badge !== undefined && !G.save.badges[g.badge])) { G.events.gateBlocked(m, p); return; }
    }
    const warp = m.warps.find((w) => w.x === nx && w.y === ny);
    if (this.solid(nx, ny) && !warp) { if (this.bumpT <= 0) { audio.sfx('bump'); this.bumpT = 0.3; } return; }
    // keep local co-op players on one screen
    if (this.lp.length > 1) {
      const xs = this.lp.map((q) => (q === p ? nx : q.x)), ys = this.lp.map((q) => (q === p ? ny : q.y));
      if (Math.max(...xs) - Math.min(...xs) > view.w / TS - 3 || Math.max(...ys) - Math.min(...ys) > view.h / TS - 3) { if (this.bumpT <= 0) { audio.sfx('bump'); this.bumpT = 0.4; } return; }
    }
    if (warp && warp.door && G.events.doorBlocked(warp)) return;
    p.fx = p.x; p.fy = p.y; p.x = nx; p.y = ny; p.mt = 0; p.moving = true; p.stepT = run ? 0.1 : 0.18;
  }
  afterStep(p) {
    const m = this.map; this.savePos(); G.net?.sendPos?.();
    const w = m.warps.find((q) => q.x === p.x && q.y === p.y);
    if (w) { this.warp(w.to, w.tx, w.ty, w.dir || p.dir, w); return; }
    if (G.busy) return;
    if (m.encounter && m.get(p.x, p.y) === T.TALL) {
      if (this.noEnc > 0) this.noEnc--; else if (R() < 0.085) { G.events.wild(p); return; }
    }
    G.events.checkSight(this.lp);
  }
  interact(p) {
    let tx = p.x + DX[p.dir][0], ty = p.y + DX[p.dir][1];
    let o = this.objAt(tx, ty);
    if (!o && this.map.get(tx, ty) === T.COUNTER) o = this.objAt(tx + DX[p.dir][0], ty + DX[p.dir][1]);
    if (o) { if (PEOPLE.has(o.kind) && !o.fixedDir) o.dir = { up: 'down', down: 'up', left: 'right', right: 'left' }[p.dir]; G.events.interact(o, p.i); }
  }
  async warp(to, tx, ty, dir, w) {
    G.busy++; audio.sfx(w && (w.door || w.stairs) ? 'door' : 'blip');
    await ui.fade(true, 220);
    const spots = this.lp.map((p, k) => ({ x: tx + (k % 2 ? (k === 1 ? 1 : -1) : 0) * (k ? 1 : 0), y: ty + (k >= 2 ? 1 : 0) * (dir === 'up' ? 1 : -1) * 0, dir }));
    // spread co-op players onto free tiles near the arrival point
    const m = getMap(G.W, to); const free = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && !SOLID.has(m.get(x, y)) && !m.objs.some((o) => o.x === x && o.y === y) && !m.warps.some((q) => q.x === x && q.y === y);
    const used = new Set();
    spots.forEach((s, k) => { if (k === 0) { used.add(tx + ',' + ty); s.x = tx; s.y = ty; return; } for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [2, 0], [-2, 0], [0, 0]]) { const x = tx + ox, y = ty + oy; if ((free(x, y) || (ox === 0 && oy === 0)) && !used.has(x + ',' + y)) { s.x = x; s.y = y; used.add(x + ',' + y); break; } } });
    const prevName = this.map?.name;
    this.load(to, spots);
    await ui.fade(false, 220);
    G.busy--;
    G.events.onEnter(this.map, prevName);
  }
  // ------------------------------------------------------------ render
  render(g) {
    const m = this.map; if (!m) return; const B = BIOMES[m.biome] ? m.biome : 'meadow';
    const frame = Math.floor(this.t * 2) % 2; const atlas = tileAtlas(m.kind === 'interior' ? 'interior' : B, frame);
    const cx = Math.round(this.cam.x), cy = Math.round(this.cam.y);
    g.fillStyle = m.kind === 'interior' ? '#0d0a14' : BIOMES[B].tree2; g.fillRect(0, 0, view.w, view.h);
    const x0 = Math.floor(cx / TS), y0 = Math.floor(cy / TS);
    for (let y = y0; y <= y0 + Math.ceil(view.h / TS); y++) for (let x = x0; x <= x0 + Math.ceil(view.w / TS); x++) {
      if (x < 0 || y < 0 || x >= m.w || y >= m.h) continue; const t = m.t[y * m.w + x];
      if (t === T.BWALL || t === T.DOOR) { g.drawImage(atlas, T.GRASS * TS, 0, TS, TS, x * TS - cx, y * TS - cy, TS, TS); continue; }
      g.drawImage(atlas, t * TS, 0, TS, TS, x * TS - cx, y * TS - cy, TS, TS);
    }
    const gymCol = m.cityIdx !== undefined ? TYPES[G.W.cities[m.cityIdx].type].color : '#c04848';
    for (const b of m.buildings) drawBuilding(g, b, b.x * TS - cx, b.y * TS - cy, gymCol);
    // entities sorted by y
    const ents = [];
    for (const o of this.objs) { if (!this.visible(o)) continue; ents.push({ y: o.py, draw: () => this.drawObj(g, o, cx, cy) }); }
    for (const p of this.lp) ents.push({ y: p.py + 0.1, draw: () => this.drawPerson(g, p.sheet, p.px - cx, p.py - cy, p.dir, p.moving ? (Math.floor(p.mt * 2) % 2) + 1 : 0, this.lp.length > 1 ? 'P' + (p.i + 1) : null, G.save.players[p.i].color, p) });
    for (const pr of G.net?.peersHere?.() || []) { const d = this.peerDraw[pr.id]; if (!d) continue; const sheet = pr.sheet || (pr.sheet = personSheet(personPalette(hash(pr.name), { shirt: pr.color || '#888' }))); const mv = Math.abs(d.x - pr.x * TS) + Math.abs(d.y - pr.y * TS) > 1; ents.push({ y: d.y, draw: () => { this.drawPerson(g, sheet, d.x - cx, d.y - cy, pr.dir || 'down', mv ? (Math.floor(this.t * 6) % 2) + 1 : 0, pr.name, pr.color || '#888', { x: Math.round(d.x / TS), y: Math.round(d.y / TS) }); if (pr.bubble && pr.bubbleUntil > Date.now()) this.bubble(g, d.x - cx + 8, d.y - cy - 14, pr.bubble); } }); }
    ents.sort((a, b) => a.y - b.y).forEach((e) => e.draw());
    if (m.kind !== 'interior' && (B === 'snow')) { g.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 40; i++) { const x = (i * 97 + this.t * 20 * (1 + (i % 3))) % view.w, y = (i * 53 + this.t * 30 * (1 + (i % 2))) % view.h; g.fillRect(x, y, 1, 1); } }
    if (m.kind !== 'interior' && B === 'neon') { g.fillStyle = 'rgba(40,0,80,0.12)'; g.fillRect(0, 0, view.w, view.h); }
    if (m.kind !== 'interior' && B === 'volcano') { g.fillStyle = 'rgba(255,80,20,0.08)'; g.fillRect(0, 0, view.w, view.h); }
  }
  drawPerson(g, sheet, x, y, dir, f, tag, col, p) {
    x = Math.round(x); y = Math.round(y);
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x + 3, y + 13, 10, 3);
    g.drawImage(sheet, f * 16, DIR_ROW[dir] * 20, 16, 20, x, y - 6, 16, 20);
    if (p && this.map.get(p.x, p.y) === T.TALL && !p.moving) { const atlas = tileAtlas(this.map.biome, Math.floor(this.t * 2) % 2); g.drawImage(atlas, T.TALL * TS, 8, TS, 8, x, y + 8, TS, 8); }
    if (tag) { g.font = '8px "VT323"'; g.textAlign = 'center'; const w = g.measureText(tag).width + 4; g.fillStyle = col; g.fillRect(x + 8 - w / 2, y - 15, w, 8); g.fillStyle = '#fff'; g.fillText(tag, x + 8, y - 8.5); }
  }
  drawObj(g, o, cx, cy) {
    const x = o.px - cx, y = o.py - cy;
    if (o.sheet) {
      this.drawPerson(g, o.sheet, x, y, o.dir || 'down', o.moving ? (Math.floor(o.mt * 2) % 2) + 1 : 0, null, null, o);
      if (o.bang && o.bang > this.t) { g.fillStyle = '#fff'; g.fillRect(x + 5, y - 20, 6, 11); g.fillStyle = '#e04848'; g.fillRect(x + 7, y - 19, 2, 6); g.fillRect(x + 7, y - 12, 2, 2); }
      if (o.kind === 'trainer' && !G.save.trainers[o.key]) { /* undefeated: subtle marker */ }
      return;
    }
    drawObject(g, o.kind, Math.round(x), Math.round(y), this.t);
    if (o.kind === 'station') { g.fillStyle = '#ffd23f'; g.font = '8px "Press Start 2P"'; g.textAlign = 'center'; g.fillText({ match: '≡', sequence: '#', speed: '!' }[o.game], Math.round(x) + 8, Math.round(y) - 1 + Math.sin(this.t * 3) * 1.5); }
  }
  bubble(g, x, y, text) { text = text.slice(0, 28); g.font = '8px "VT323"'; const w = g.measureText(text).width + 6; g.fillStyle = '#fff'; g.fillRect(x - w / 2, y - 9, w, 10); g.fillStyle = '#14101c'; g.textAlign = 'center'; g.fillText(text, x, y - 1.5); }
}
function shadeHat(c) { return c; }
export { PLAYER_COLORS };
