// Battles: every attack is a question. Correct = hit, fast = Quick Recall crit, wrong = miss + explanation.
import { RARITY } from './content.js';
import { STATUS, lookOf } from './state.js';
import { G, ITEMS, xpToNext, makeMon, stats, maxHp, movesOf, monName, gainXp, checkEvolve, evolve, addMon, recordAnswer, badgeCount } from './state.js';
import { view } from '../core/view.js';
import { ui, fmt } from './ui.js';
import { input } from '../core/input.js';
import { audio } from '../core/audio.js';
import { monsterCanvas, BIOMES, personSheet, personPalette } from '../core/sprites.js';
import { TYPES, effectiveness } from '../content/types.js';
import { R, sleep, clamp, esc, shade, hash, rng } from '../core/rng.js';


const tween = (ms, fn) => new Promise((res) => { const t0 = performance.now(); const step = () => { const k = Math.min(1, (performance.now() - t0) / ms); fn(k); if (k < 1) requestAnimationFrame(step); else res(); }; requestAnimationFrame(step); });
const ease = (k) => 1 - Math.pow(1 - k, 3);

function makeBg(biome, kind) {
  const c = document.createElement('canvas'); c.width = view.w; c.height = view.h; const g = c.getContext('2d');
  const B = BIOMES[biome] || BIOMES.meadow; const r = rng(hash(biome + kind));
  const arena = kind === 'leader' || kind === 'elite' || kind === 'champion';
  const sky = arena ? (kind === 'leader' ? ['#1a1f3a', '#3a3f6a'] : ['#1a0f30', '#5a2a8a']) : B.sky;
  const gr = g.createLinearGradient(0, 0, 0, 130); gr.addColorStop(0, sky[0]); gr.addColorStop(1, sky[1]); g.fillStyle = gr; g.fillRect(0, 0, view.w, view.h);
  if (arena) {
    for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(255,255,255,${0.04 + i * 0.01})`; g.beginPath(); g.moveTo(40 + i * 60, 0); g.lineTo(10 + i * 60, 130); g.lineTo(70 + i * 60, 130); g.fill(); }
    g.fillStyle = shade(sky[1], -0.3); g.fillRect(0, 118, view.w, 98); g.fillStyle = shade(sky[1], 0.1); for (let x = 0; x < view.w; x += 24) g.fillRect(x, 118, 12, 2);
  } else {
    g.fillStyle = shade(B.hill, -0.1);
    for (let x = 0; x < view.w; x += 2) { const y = 92 + Math.sin(x * 0.02 + r() * 0.05) * 10 + Math.sin(x * 0.05) * 5; g.fillRect(x, y, 2, 40); }
    if (B.style === 'tower') { for (let i = 0; i < 14; i++) { const x = i * 28 + r.int(0, 10), h = r.int(30, 80); g.fillStyle = '#20264a'; g.fillRect(x, 118 - h, 20, h); for (let j = 0; j < h; j += 6) { g.fillStyle = r() < 0.5 ? '#4cf0ff' : '#ff4fd8'; g.fillRect(x + 3 + r.int(0, 12), 120 - h + j, 2, 2); } } }
    if (B.style === 'crystal') for (let i = 0; i < 10; i++) { const x = r.int(0, view.w), h = r.int(20, 60); g.fillStyle = '#6a8ae0'; g.beginPath(); g.moveTo(x, 120); g.lineTo(x + 8, 120 - h); g.lineTo(x + 16, 120); g.fill(); }
    if (B.style === 'snowpine' || B.style === 'pine') for (let i = 0; i < 18; i++) { const x = r.int(0, view.w); g.fillStyle = shade(B.tree, -0.2); g.beginPath(); g.moveTo(x, 120); g.lineTo(x + 8, 92 - r.int(0, 10)); g.lineTo(x + 16, 120); g.fill(); }
    g.fillStyle = B.g; g.fillRect(0, 118, view.w, 98); g.fillStyle = B.g2; for (let i = 0; i < 160; i++) g.fillRect(r.int(0, view.w), r.int(120, view.h), 2, 1);
    if (biome === 'coast') { g.fillStyle = B.water; g.fillRect(0, 108, view.w, 10); g.fillStyle = B.water2; for (let x = 0; x < view.w; x += 16) g.fillRect(x, 110, 8, 1); }
    if (biome === 'neon') { g.strokeStyle = '#4cf0ff44'; for (let y = 120; y < view.h; y += 10) { g.beginPath(); g.moveTo(0, y); g.lineTo(view.w, y); g.stroke(); } for (let x = -400; x < view.w + 400; x += 30) { g.beginPath(); g.moveTo(view.w / 2 + (x - view.w / 2) * 0.2, 118); g.lineTo(x, view.h); g.stroke(); } }
  }
  const plat = (cx, cy, rx, ry, col) => { g.fillStyle = shade(col, -0.3); g.beginPath(); g.ellipse(cx, cy + 3, rx, ry, 0, 0, 7); g.fill(); g.fillStyle = col; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.fill(); g.fillStyle = shade(col, 0.2); g.beginPath(); g.ellipse(cx - 8, cy - 2, rx * 0.6, ry * 0.45, 0, 0, 7); g.fill(); };
  const pc = arena ? '#5a5f8a' : shade(B.path, -0.05);
  plat(view.w - 92, 92, 66, 12, pc); plat(118, Math.round(view.h * 0.75) - 4, 104, 16, pc);
  return c;
}

class BattleScene {
  constructor(opts) {
    this.o = opts; this.t = 0; this.parts = []; this.shake = 0; this.flashT = 0;
    const map = G.world?.map; this.bg = makeBg(opts.biome || map?.biome || 'meadow', opts.kind);
    this.sprites = {}; this.trainerX = null; this.msgWait = null;
  }
  spr(key) { return this.sprites[key] || (this.sprites[key] = { x: 0, y: 0, a: 1, s: 1, flash: 0, glow: 0 }); }
  allyPos(k, n) { const xs = [[110], [72, 170], [56, 122, 188], [46, 104, 162, 220]][n - 1]; const sc = [2, 1.7, 1.5, 1.35][n - 1]; return { x: xs[k] + 8 - (view.w < 384 ? 20 : 0), y: Math.round(view.h * 0.75), s: sc }; }
  update(dt) {
    this.t += dt;
    for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; p.life -= dt; }
    this.parts = this.parts.filter((p) => p.life > 0);
    this.shake = Math.max(0, this.shake - dt * 30);
    if (this.msgWait && (input.anyPressed('a') >= 0 || input.anyPressed('b') >= 0)) { const w = this.msgWait; this.msgWait = null; w(); }
    const B = BIOMES[this.o.biome || G.world?.map?.biome]; // ambient particles
    if (B && R() < 0.25 && !['leader', 'elite', 'champion'].includes(this.o.kind)) {
      if (B.style === 'snowpine') this.parts.push({ x: R() * view.w, y: -4, vx: R() * 10 - 5, vy: 20 + R() * 15, life: 10, c: '#ffffff', s: 2 });
      if (B.style === 'dead') this.parts.push({ x: R() * view.w, y: view.h, vx: R() * 10 - 5, vy: -20 - R() * 20, life: 6, c: R() < 0.5 ? '#ff7a2a' : '#ffd23f', s: 1 });
      if (B.style === 'tower') this.parts.push({ x: R() * view.w, y: R() * 110, vx: 0, vy: -8, life: 1.2, c: R() < 0.5 ? '#4cf0ff' : '#ff4fd8', s: 1 });
    }
  }
  render(g) {
    g.save();
    if (this.shake > 0) g.translate((R() - 0.5) * this.shake, (R() - 0.5) * this.shake);
    if (this.bg.width !== view.w || this.bg.height !== view.h) this.bg = makeBg(this.o.biome || G.world?.map?.biome || 'meadow', this.o.kind);
    g.drawImage(this.bg, 0, 0);
    const bob = (ph) => Math.round(Math.sin(this.t * 2.4 + ph) * 1.5);
    const drawMon = (sp, back, x, y, s, st, ph, mon, enemy) => {
      let c = monsterCanvas(sp, back, lookOf(mon)); const regal = sp.rarity === 'legendary' || sp.rarity === 'mythic'; const w = 56 * s * st.s * (regal ? 1.22 : 1); let h = 56 * s * st.s * (regal ? 1.22 : 1);
      if (regal || mon?.shiny) { const t = performance.now() / 600; g.save(); g.globalAlpha = 0.18 + Math.sin(t) * 0.08; g.fillStyle = sp.rarity === 'mythic' ? '#ff9ff0' : regal ? '#ffd23f' : '#9ff8ff'; g.beginPath(); g.ellipse(x, y - h * 0.45, w * 0.55, h * 0.5, 0, 0, 7); g.fill(); g.restore(); }
      // ---- condition looks: injured (low HP), poisoned, burned, sick
      const hpPct = mon ? clamp(mon.hp / this.hpMax(mon, enemy), 0, 1) : 1; const status = mon && mon.hp > 0 ? mon.status : null;
      let dx = 0, dy = 0; let tint = null, ta = 0;
      if (mon && mon.hp > 0 && hpPct < 0.5) { const sq = hpPct < 0.25 ? 0.93 : 0.97; dy += h * (1 - sq); h *= sq; } // slumped
      if (status === 'sick') { dx = Math.sin(this.t * 4.5) * 1.8; tint = '#86c240'; ta = 0.28 + Math.sin(this.t * 2) * 0.06; }
      if (status === 'psn') { tint = '#a040d8'; ta = 0.22 + (Math.sin(this.t * 3.2) + 1) * 0.1; }
      if (status === 'brn') { tint = '#ff5a1a'; ta = 0.16 + (Math.sin(this.t * 13) + Math.sin(this.t * 7.3)) * 0.05 + 0.06; }
      if (!tint && mon && mon.hp > 0 && hpPct < 0.25) { tint = '#5a0a14'; ta = 0.14 + (Math.sin(this.t * 5) + 1) * 0.05; }
      if (tint) { const tc = this.tintCv || (this.tintCv = document.createElement('canvas')); tc.width = c.width; tc.height = c.height; const tg = tc.getContext('2d'); tg.imageSmoothingEnabled = false; tg.drawImage(c, 0, 0); tg.globalCompositeOperation = 'source-atop'; tg.fillStyle = tint; tg.globalAlpha = ta; tg.fillRect(0, 0, tc.width, tc.height); tg.globalAlpha = 1; tg.globalCompositeOperation = 'source-over'; c = tc; }
      const bobv = hpPct < 0.25 ? Math.round(Math.sin(this.t * 5 + ph) * 1.2) : bob(ph);
      g.globalAlpha = st.a;
      if (sp.stage === sp.stages - 1 && sp.stages > 1 && hpPct >= 0.25) { g.shadowColor = TYPES[sp.type].color; g.shadowBlur = 8 + Math.sin(this.t * 3) * 3; }
      const X = Math.round(x + st.x - w / 2 + dx), Y = Math.round(y + st.y - h + bobv + dy);
      g.drawImage(c, X, Y, Math.round(w), Math.round(h));
      g.shadowBlur = 0;
      if (mon && mon.hp > 0 && st.a > 0.5) this.drawCondition(g, X, Y, w, h, hpPct, status, ph);
      if (st.flash > 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = st.flash; g.drawImage(c, Math.round(x + st.x - w / 2), Math.round(y + st.y - h), w, h); g.globalCompositeOperation = 'source-over'; }
      g.globalAlpha = 1;
    };
    if (this.trainerX !== null && this.o.trainerPal) { const sh = personSheet(this.o.trainerPal); g.drawImage(sh, 0, 0, 16, 20, this.trainerX - 24, 30, 48, 60); }
    if (this.enemy && this.enemyVisible) drawMon(G.W.species[this.enemy.mon.sp], false, view.w - 92, 96 + (view.h > 216 ? 14 : 0), 1.6, this.spr('e'), 0, this.enemy.mon, true);
    const n = this.allies.length;
    this.allies.forEach((al, k) => { if (!al.visible) return; const p = this.allyPos(k, n); drawMon(G.W.species[al.mon.sp], true, p.x, p.y, p.s, this.spr('a' + k), k + 1, al.mon, false); });
    if (this.cube) { const c = this.cube; g.fillStyle = '#14101c'; g.fillRect(c.x - 5, c.y - 5, 10, 10); g.fillStyle = c.col; g.fillRect(c.x - 4, c.y - 4, 8, 8); g.fillStyle = '#fff'; g.fillRect(c.x - 4, c.y - 4, 3, 2); }
    for (const p of this.parts) { g.globalAlpha = Math.min(1, p.life * 3); g.fillStyle = p.c; g.fillRect(Math.round(p.x), Math.round(p.y), p.s || 2, p.s || 2); }
    g.globalAlpha = 1;
    if (this.flashT > 0) { g.fillStyle = `rgba(255,255,255,${this.flashT})`; g.fillRect(0, 0, view.w, view.h); this.flashT = Math.max(0, this.flashT - 0.08); }
    if (this.wipe !== undefined) { g.fillStyle = '#000'; for (let i = 0; i < 12; i++) { const w = view.w * this.wipe; g.fillRect(i % 2 ? view.w - w : 0, i * 18, w, 18); } }
    g.restore();
  }
  // overlays + particles that show a monster's condition
  drawCondition(g, X, Y, w, h, hpPct, status, ph) {
    const t = this.t, cx = X + w / 2, u = w / 56;
    if (hpPct < 0.5) { // bandage plaster on the upper body
      const bx = Math.round(X + w * 0.58), by = Math.round(Y + h * 0.42);
      g.save(); g.translate(bx, by); g.rotate(-0.5); g.fillStyle = '#14101c'; g.fillRect(-4 * u - 1, -1.5 * u - 1, 8 * u + 2, 3 * u + 2); g.fillStyle = '#f2d8b0'; g.fillRect(-4 * u, -1.5 * u, 8 * u, 3 * u); g.fillStyle = '#d8b088'; g.fillRect(-1 * u, -1.5 * u, 2 * u, 3 * u); g.restore();
    }
    if (hpPct < 0.25) { // scratches + sweat drop
      g.fillStyle = '#b01828'; for (let i = 0; i < 3; i++) { const sx = X + w * 0.32 + i * 3 * u, sy = Y + h * 0.55; for (let j = 0; j < 5; j++) g.fillRect(Math.round(sx + j * u), Math.round(sy + j * u * 0.9), Math.max(1, Math.round(u)), Math.max(1, Math.round(u))); }
      const sw = (t * 0.9 + ph * 0.3) % 1.6; if (sw < 1) { g.globalAlpha = 1 - sw; g.fillStyle = '#9fdcff'; const sx = Math.round(X + w * 0.78), sy = Math.round(Y + h * 0.2 + sw * 10); g.fillRect(sx, sy, 2, 3); g.fillRect(sx - 1, sy + 1, 4, 2); g.globalAlpha = 1; }
    }
    if (status === 'psn' && R() < 0.25) this.parts.push({ x: X + w * (0.25 + R() * 0.5), y: Y + h * (0.3 + R() * 0.5), vx: (R() - 0.5) * 8, vy: -18 - R() * 16, life: 0.9, c: R() < 0.5 ? '#c060ff' : '#7a20b0', s: R() < 0.3 ? 3 : 2 });
    if (status === 'brn') {
      if (R() < 0.45) this.parts.push({ x: X + w * (0.2 + R() * 0.6), y: Y + h * (0.45 + R() * 0.4), vx: (R() - 0.5) * 14, vy: -30 - R() * 30, life: 0.6, c: R() < 0.4 ? '#ffd23f' : R() < 0.5 ? '#ff7a2a' : '#ff3d1a', s: 2 });
      if (R() < 0.08) this.parts.push({ x: cx + (R() - 0.5) * w * 0.4, y: Y + h * 0.2, vx: 0, vy: -14, life: 1.2, c: 'rgba(80,70,70,0.7)', s: 3 });
    }
    if (status === 'sick') { // dizzy swirl above the head
      g.fillStyle = '#9fe060'; for (let i = 0; i < 3; i++) { const a = t * 3 + i * 2.09; g.fillRect(Math.round(cx + Math.cos(a) * 10 * u), Math.round(Y - 2 + Math.sin(a) * 3 * u), 2, 2); }
      if (R() < 0.06) this.parts.push({ x: cx + (R() - 0.5) * w * 0.5, y: Y + h * 0.3, vx: 0, vy: -10, life: 1, c: '#7cbf3a', s: 2 });
    }
  }
  // ---------------------------------------------------- HUD
  hud() {
    const el = document.getElementById('hud'); const W = G.W;
    const box = (m, cls, extra = '') => { const sp = W.species[m.sp]; const mh = this.hpMax(m, cls === 'enemy'); const pct = clamp(m.hp / mh, 0, 1) * 100; const col = pct > 50 ? 'g' : pct > 20 ? 'y' : 'r';
      return `<div class="bhud ${cls}"><div class="nm">${esc(monName(W, m))}${m.shiny ? ' <span class="shinymark">✦</span>' : ''} <span class="lv">Lv${m.lvl}</span></div><div class="rar" style="color:${RARITY[sp.rarity]?.color}">${'★'.repeat(RARITY[sp.rarity]?.stars || 1)} ${RARITY[sp.rarity]?.name || ''}</div><div class="tt"><span class="type t-${sp.type}">${TYPES[sp.type].name}</span>${m.status ? `<span class="stat st-${m.status}">${STATUS[m.status].tag}</span>` : ''}${extra}</div><div class="hp"><i class="${col}" style="width:${pct}%"></i></div>${cls !== 'enemy' ? `<div class="hpn">${Math.max(0, Math.ceil(m.hp))}/${mh}</div>` : ''}</div>`; };
    let h = '';
    if (this.enemy && this.enemyVisible) h += box(this.enemy.mon, 'enemy', this.o.kind === 'wild' && G.save.caught[this.enemy.mon.sp] ? ' <span class="caughtmark">◆</span>' : '');
    h += `<div class="allyhuds ${this.allies.length > 1 ? 'compact' : ''}">` + this.allies.map((a, k) => a.visible ? box(a.mon, 'ally', this.allies.length > 1 ? ` <span class="pl" style="background:${G.save.players[a.pi].color}">P${a.pi + 1}</span>` : '') : '').join('') + '</div>';
    h += `<div class="btext">${this.text ? fmt(esc(this.text)) : ''}</div>`;
    if (this.o.kind !== 'wild' && this.team) h += `<div class="teamdots">${this.team.map((t, i) => `<i class="${i < this.ei ? 'out' : ''}"></i>`).join('')}</div>`;
    el.innerHTML = h; el.className = 'battle';
  }
  hpMax(m, enemy) { return Math.round(maxHp(G.W, m) * (enemy ? this.hpMul : 1)); }
  msg(text, ms) { this.text = text; this.hud(); const t = ms ?? clamp(500 + text.length * 28, 900, 2600); return new Promise((res) => { const to = setTimeout(() => { this.msgWait = null; res(); }, t); this.msgWait = () => { clearTimeout(to); res(); }; }); }
  async hpTo(m, enemy, to) { const from = m.hp; await tween(380, (k) => { m.hp = from + (to - from) * ease(k); this.hud(); }); m.hp = to; this.hud(); }
  burst(x, y, col, n = 18, sp = 90) { for (let i = 0; i < n; i++) { const a = R() * 6.28, v = sp * (0.3 + R()); this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 60, life: 0.4 + R() * 0.4, c: R() < 0.3 ? '#fff' : col, s: R() < 0.5 ? 2 : 3 }); } }
  posOf(side) { if (side === 'e') return { x: view.w - 92, y: 60 + (view.h > 216 ? 14 : 0) }; const k = +side.slice(1); const p = this.allyPos(k, this.allies.length); return { x: p.x, y: p.y - 50 }; }
  async animAttack(src, dst, type) {
    const s = this.spr(src), S = this.posOf(src), D = this.posOf(dst); const col = TYPES[type]?.color || '#fff';
    const dx = Math.sign(D.x - S.x) * 16, dy = Math.sign(D.y - S.y) * 8;
    await tween(120, (k) => { s.x = dx * k; s.y = dy * k; });
    audio.sfx('throw');
    const n = 14; for (let i = 0; i < n; i++) setTimeout(() => this.parts.push({ x: S.x, y: S.y, vx: (D.x - S.x) * 3.2 + (R() - 0.5) * 40, vy: (D.y - S.y) * 3.2 + (R() - 0.5) * 40, life: 0.3, c: i % 3 ? col : '#ffffff', s: 3 }), i * 12);
    tween(160, (k) => { s.x = dx * (1 - k); s.y = dy * (1 - k); });
    await sleep(300);
  }
  async animHit(dst, type, big) {
    const d = this.spr(dst), D = this.posOf(dst); this.burst(D.x, D.y, TYPES[type]?.color || '#fff', big ? 30 : 16, big ? 140 : 90); this.shake = big ? 10 : 5; if (big) this.flashT = 0.6;
    for (let i = 0; i < 3; i++) { d.flash = 0.9; await sleep(60); d.flash = 0; d.a = 0.3; await sleep(50); d.a = 1; }
  }
  async animFaint(side) { const s = this.spr(side); audio.sfx('faint'); await tween(450, (k) => { s.y = 40 * k; s.a = 1 - k; }); }
  async animEnter(side) { const s = this.spr(side); s.a = 1; s.y = 0; s.s = 0.1; this.burst(this.posOf(side).x, this.posOf(side).y + 20, '#ffffff', 14, 70); await tween(260, (k) => { s.s = 0.1 + 0.9 * ease(k); }); }
  async animBoost(side) { const P = this.posOf(side); audio.sfx('boost'); for (let i = 0; i < 24; i++) this.parts.push({ x: P.x + (R() - 0.5) * 50, y: P.y + 40, vx: 0, vy: -60 - R() * 60, life: 0.7, c: R() < 0.5 ? '#ffd23f' : '#ffffff', s: 2 }); const s = this.spr(side); s.glow = 1; await sleep(500); }

  // ---------------------------------------------------- flow
  async run() {
    const W = G.W, o = this.o; this.hpMul = 1;
    this.allies = []; G.save.players.forEach((p, pi) => { const m = p.party.find((x) => x.hp > 0); if (m) this.allies.push({ pi, mon: m, boost: 0, visible: false, part: new Set([m.uid]) }); });
    if (!this.allies.length) return 'lose';
    this.team = o.enemies; this.ei = 0;
    if (o.kind === 'wild' && this.allies.length > 1) this.hpMul = 1 + 0.65 * (this.allies.length - 1);
    // intro wipe
    audio.play('battle:' + (o.music || 'battle') + ':' + (o.seed || W.id), o.seed || W.id, o.music || 'battle');
    this.wipe = 1; await tween(380, (k) => { this.wipe = 1 - k; }); this.wipe = undefined;
    const spawnEnemy = (k) => { const e = o.enemies[k]; const mon = makeMon(W, e.sp, e.lvl); if (e.era) mon.era = e.era; if (e.shiny) mon.shiny = true; mon.hp = this.hpMax(mon, true); this.enemy = { mon, boost: 0 }; G.save.seen[e.sp] = 1; };
    spawnEnemy(0);
    if (o.kind === 'wild') { this.enemyVisible = true; this.spr('e').x = 160; this.hud(); await tween(400, (k) => { this.spr('e').x = 160 * (1 - ease(k)); }); const esp = W.species[this.enemy.mon.sp]; const rr = esp.rarity;
      if (this.enemy.mon.shiny || rr === 'epic' || rr === 'legendary' || rr === 'mythic') { audio.sfx('evolve'); const ep = this.posOf('e'); for (let i = 0; i < 4; i++) this.burst(ep.x, ep.y, RARITY[rr]?.color || '#ffd23f', 14, 90); }
      await this.msg(rr === 'mythic' ? `✦✦ The MYTHIC ${esp.name}, ${esp.title}, descends! ✦✦` : rr === 'legendary' ? `★ The legendary ${esp.name}, ${esp.title}, appeared! ★` : this.enemy.mon.shiny ? `✦ A shimmering PRISMATIC ${esp.name} appeared! ✦` : rr === 'epic' ? `A wild EPIC ${esp.name} appeared!` : `A wild ${esp.name} appeared!`); }
    else {
      this.trainerX = view.w + 36; await tween(400, (k) => { this.trainerX = view.w + 36 - 128 * ease(k); });
      await this.msg(o.introMsg || `${o.trainerTitle} wants to battle!`);
      await tween(300, (k) => { this.trainerX = view.w - 92 + 140 * k; }); this.trainerX = null;
      this.enemyVisible = true; this.spr('e').a = 0; this.hud(); await this.animEnter('e'); await this.msg(`${o.trainerTitle} sent out ${W.species[this.enemy.mon.sp].name}!`, 1100);
    }
    for (let k = 0; k < this.allies.length; k++) { this.allies[k].visible = true; this.hud(); await this.animEnter('a' + k); }
    await this.msg(this.allies.length > 1 ? 'Team, go!' : `Go, ${monName(W, this.allies[0].mon)}!`, 800);
    // main loop
    for (;;) {
      for (let k = 0; k < this.allies.length; k++) {
        const al = this.allies[k]; if (!al.mon || al.mon.hp <= 0) continue;
        const r = await this.allyTurn(al, k);
        if (r === 'run' || r === 'caught') return this.finish(r);
        if (this.enemy.mon.hp <= 0) { const over = await this.enemyFainted(); if (over) return this.finish('win'); }
      }
      if (this.enemy.mon.hp > 0) { const lost = await this.enemyTurn(); if (lost) return this.finish('lose'); }
      const t = await this.statusTick(); if (t) return this.finish(t);
    }
  }
  async allyTurn(al, k) {
    const W = G.W; const pname = G.save.players[al.pi].name;
    if (al.mon.status === 'sick' && R() < 0.25) { this.statusBurst('a' + k, STATUS.sick.col); await this.msg(`${monName(W, al.mon)} feels too sick to move!`, 1100); return; }
    for (;;) {
      const who = this.allies.length > 1 ? `P${al.pi + 1} ${pname}: ` : '';
      this.text = `${who}What will ${monName(W, al.mon)} do?`; this.hud();
      const c = await ui.choose(null, ['⚔ Fight', '🎒 Bag', '◈ Team', this.o.kind === 'wild' ? '➜ Run' : { label: '➜ Run', disabled: true }], { cls: 'bmenu', cancel: false, cols: 2 });
      if (c === 0) {
        const mv = movesOf(W, al.mon); const opts = mv.map((m) => ({ html: `<span class="mvn">${esc(m.name)}</span><span class="mvt t-${m.type}">${m.kind === 'boost' ? 'Boost' : TYPES[m.type].name + ' · ' + m.power}</span>${m.kind !== 'boost' ? effTag(effectiveness(m.type, W.species[this.enemy.mon.sp].type)) : ''}` }));
        const mi = await ui.choose(null, opts, { cls: 'bmenu moves', cols: 2 }); if (mi < 0) continue;
        await this.useMove(al, k, mv[mi]); return;
      }
      if (c === 1) { const r = await this.bag(al, k); if (r === 'back') continue; return r; }
      if (c === 2) { const ok = await this.switchMenu(al, k, true); if (ok) return; continue; }
      if (c === 3) {
        const mine = stats(W, al.mon).spd, theirs = stats(W, this.enemy.mon).spd;
        if (R() < 0.55 + (mine - theirs) / 100) { audio.sfx('door'); await this.msg('Got away safely!'); return 'run'; }
        await this.msg("Couldn't get away!"); return;
      }
    }
  }
  async ask(al, tag) {
    const W = G.W; const q = this.o.qfn?.() || W.pickQ(this.o.qci ?? G.world.chapter(), G.save, { review: this.o.kind === 'wild' ? 0.25 : 0.15 });
    const res = await ui.question(q, { tag, who: this.allies.length > 1 ? `P${al.pi + 1} ${G.save.players[al.pi].name}` : null });
    recordAnswer(G.save, q, res.correct, res.quick);
    if (res.correct) { const bonus = Math.round(4 + al.mon.lvl * 1.6 + (res.quick ? 4 : 0)); const ev = gainXp(W, al.mon, bonus); al.xpLog = (al.xpLog || 0) + bonus; await this.levelEvents(al.mon, ev); }
    G.world?.questTick?.('answer', res.correct);
    return res;
  }
  async useMove(al, k, mv) {
    const W = G.W; const nm = monName(W, al.mon);
    const res = await this.ask(al, mv.kind === 'boost' ? `${mv.name} — answer to power up` : `${mv.name} — answer to attack`);
    if (mv.kind === 'boost') {
      if (res.correct) { al.boost = Math.min(3, al.boost + (res.quick ? 2 : 1)); await this.animBoost('a' + k); await this.msg(`${nm} used ${mv.name}! Attack rose${res.quick ? ' sharply' : ''}!`); }
      else await this.msg(`${nm} lost focus...`);
      return;
    }
    if (!res.correct) { await this.msg(`${nm} used ${mv.name}... but it missed!`); return; }
    await this.msg(`${nm} used ${mv.name}!`, 600);
    await this.animAttack('a' + k, 'e', mv.type);
    const { dmg, eff } = this.damage(al.mon, al.boost, this.enemy.mon, this.enemy.boost, mv, res.quick ? 1.5 : 1);
    audio.sfx(eff > 1 ? 'super' : eff < 1 ? 'weak' : 'hit');
    await this.animHit('e', mv.type, eff > 1 || res.quick);
    await this.hpTo(this.enemy.mon, true, Math.max(0, this.enemy.mon.hp - dmg));
    if (res.quick) await this.msg('⚡ Quick Recall! A critical hit!', 900);
    if (eff > 1) await this.msg("It's super effective!", 900); else if (eff < 1) await this.msg("It's not very effective...", 900);
    await this.tryInflict(this.enemy.mon, mv.type, (this.o.kind === 'wild' ? 'The wild ' : 'Foe ') + W.species[this.enemy.mon.sp].name, 'e');
  }
  async tryInflict(m, type, who, side) {
    if (!m || m.hp <= 0 || m.status) return;
    const [id, st] = Object.entries(STATUS).find(([, s]) => s.from === type) || []; if (!id) return;
    if (G.W.species[m.sp].type === type || R() >= st.chance) return;
    m.status = id; audio.sfx('weak'); this.statusBurst(side, st.col); this.hud(); await this.msg(`${who} ${st.verb}!`, 1100);
  }
  statusBurst(side, col) { const P = this.posOf(side); for (let i = 0; i < 26; i++) this.parts.push({ x: P.x + (R() - 0.5) * 46, y: P.y + 10 + R() * 30, vx: (R() - 0.5) * 30, vy: -30 - R() * 50, life: 0.9, c: col, s: 2 }); }
  // end of each round: poison / burn / sickness chip away HP
  async statusTick() {
    const W = G.W;
    for (let k = 0; k < this.allies.length; k++) {
      const al = this.allies[k]; const m = al.mon; if (!m || m.hp <= 0 || !m.status || !al.visible) continue; const st = STATUS[m.status];
      const dmg = Math.max(1, Math.round(maxHp(W, m) * st.tick)); this.statusBurst('a' + k, st.col); this.spr('a' + k).flash = 0.4;
      await this.hpTo(m, false, Math.max(0, m.hp - dmg)); await this.msg(`${monName(W, m)} is hurt by being ${st.name.toLowerCase()}!`, 1000); this.spr('a' + k).flash = 0;
      if (m.hp <= 0) {
        m.hp = 0; await this.animFaint('a' + k); await this.msg(`${monName(W, m)} fainted!`); const p = G.save.players[al.pi];
        if (p.party.some((x) => x.hp > 0)) await this.switchMenu(al, k, false); else { al.visible = false; al.mon = null; this.hud(); }
      }
    }
    if (!this.allies.some((a) => a.mon && a.mon.hp > 0)) return 'lose';
    const e = this.enemy.mon;
    if (e && e.hp > 0 && e.status) {
      const st = STATUS[e.status]; const dmg = Math.max(1, Math.round(this.hpMax(e, true) * st.tick)); this.statusBurst('e', st.col);
      await this.hpTo(e, true, Math.max(0, e.hp - dmg)); await this.msg(`${W.species[e.sp].name} is hurt by being ${st.name.toLowerCase()}!`, 1000);
      if (e.hp <= 0) { const over = await this.enemyFainted(); if (over) return 'win'; }
    }
    return null;
  }
  damage(a, aBoost, d, dBoost, mv, crit) {
    const A = stats(G.W, a), D = stats(G.W, d); const L = a.lvl;
    const stab = G.W.species[a.sp].type === mv.type ? 1.5 : 1; const eff = effectiveness(mv.type, G.W.species[d.sp].type);
    const base = (((2 * L) / 5 + 2) * mv.power * (A.atk * (1 + 0.5 * aBoost)) / D.def) / 50 + 2;
    const burn = a.status === 'brn' ? 0.75 : 1;
    return { dmg: Math.max(1, Math.round(base * stab * eff * crit * burn * (0.85 + R() * 0.15))), eff };
  }
  async enemyTurn() {
    const W = G.W; const e = this.enemy; const alive = this.allies.filter((a) => a.mon && a.mon.hp > 0); if (!alive.length) return true;
    const tgt = R.pick(alive); const k = this.allies.indexOf(tgt);
    const mv = movesOf(W, e.mon); const hits = mv.filter((m) => m.kind === 'hit');
    const ename = (this.o.kind === 'wild' ? 'The wild ' : 'Foe ') + W.species[e.mon.sp].name;
    if (e.mon.status === 'sick' && R() < 0.25) { this.statusBurst('e', STATUS.sick.col); await this.msg(`${ename} feels too sick to move!`, 1100); return false; }
    if (e.boost < 2 && R() < 0.18) { const b = mv.find((m) => m.kind === 'boost'); if (b) { e.boost++; await this.animBoost('e'); await this.msg(`${ename} used ${b.name}! Its attack rose!`); return false; } }
    let best = hits[0], bs = -1; for (const m of hits) { const s = m.power * effectiveness(m.type, W.species[tgt.mon.sp].type) * (0.7 + R() * 0.6); if (s > bs) { bs = s; best = m; } }
    await this.msg(`${ename} used ${best.name}!`, 650);
    await this.animAttack('e', 'a' + k, best.type);
    const lvlScale = this.o.kind === 'wild' ? 0.9 : 1;
    const { dmg, eff } = this.damage(e.mon, e.boost, tgt.mon, tgt.boost, best, lvlScale);
    audio.sfx(eff > 1 ? 'super' : eff < 1 ? 'weak' : 'hit');
    await this.animHit('a' + k, best.type, eff > 1);
    await this.hpTo(tgt.mon, false, Math.max(0, tgt.mon.hp - dmg));
    if (eff > 1) await this.msg("It's super effective!", 800); else if (eff < 1) await this.msg("It's not very effective...", 800);
    await this.tryInflict(tgt.mon, best.type, monName(W, tgt.mon), 'a' + k);
    if (tgt.mon.hp <= 0) {
      tgt.mon.hp = 0; await this.animFaint('a' + k); await this.msg(`${monName(W, tgt.mon)} fainted!`);
      const p = G.save.players[tgt.pi];
      if (p.party.some((m) => m.hp > 0)) { await this.switchMenu(tgt, k, false); }
      else { tgt.visible = false; tgt.mon = null; this.hud(); if (this.allies.length > 1) await this.msg(`${p.name} is out of usable monsters!`); }
    }
    return !this.allies.some((a) => a.mon && a.mon.hp > 0);
  }
  async enemyFainted() {
    const W = G.W; const e = this.enemy; await this.animFaint('e'); this.enemyVisible = false; this.hud();
    await this.msg(`${this.o.kind === 'wild' ? 'The wild' : 'Foe'} ${W.species[e.mon.sp].name} fainted!`);
    const sp = W.species[e.mon.sp]; const mult = this.o.kind === 'wild' ? 1 : this.o.kind === 'trainer' ? 1.5 : 1.8;
    const xp = Math.round(((15 + 10 * sp.stage) * e.mon.lvl / 3) * mult);
    for (const al of this.allies) {
      if (!al.mon) continue; const p = G.save.players[al.pi];
      for (const m of p.party) { if (m.hp <= 0 || !al.part.has(m.uid)) continue; const amt = m === al.mon ? xp : Math.round(xp / 2); await this.msg(`${monName(W, m)} gained ${amt} XP!`, 800); await this.levelEvents(m, gainXp(W, m, amt)); }
    }
    this.ei++;
    if (this.ei >= this.team.length) return true;
    const nx = this.team[this.ei]; const mon = makeMon(W, nx.sp, nx.lvl); mon.hp = this.hpMax(mon, true); this.enemy = { mon, boost: 0 }; G.save.seen[nx.sp] = 1;
    // tell the player what's coming and let them swap before it arrives
    const nsp = W.species[nx.sp]; const info = `${nsp.name} (${TYPES[nsp.type]?.name || nsp.type} type) · Lv ${nx.lvl}`;
    for (let k = 0; k < this.allies.length; k++) { const al = this.allies[k]; if (!al.mon || al.mon.hp <= 0) continue; const p = G.save.players[al.pi];
      if (!p.party.some((m) => m.hp > 0 && m !== al.mon)) continue;
      const c = await ui.choose(`${this.o.trainerTitle} is about to send out *${info}*. ${this.allies.length > 1 ? p.name + ': ' : ''}Switch monsters, or keep ${monName(W, al.mon)} in?`, [`Keep ${monName(W, al.mon)}`, 'Switch monster'], { cancel: false });
      if (c === 1) await this.switchMenu(al, k, true, info); }
    this.spr('e').y = 0; this.spr('e').a = 0; this.enemyVisible = true; this.hud(); await this.animEnter('e');
    await this.msg(`${this.o.trainerTitle} sent out ${W.species[nx.sp].name}!`);
    return false;
  }
  async levelEvents(m, ev) {
    for (const x of ev) {
      if (x.type === 'level') { audio.sfx('levelup'); this.hud(); await this.msg(`${monName(G.W, m)} grew to Lv ${x.lvl}!`, 1000); }
      if (x.type === 'move') await this.msg(`${monName(G.W, m)} learned ${x.move}!`, 1200);
    }
  }
  async switchMenu(al, k, cancel, foeInfo) {
    const W = G.W; const p = G.save.players[al.pi];
    const opts = p.party.map((m) => ({ html: monRow(W, m), disabled: m.hp <= 0 || m === al.mon }));
    const fm = this.enemy?.mon; const fsp = fm && W.species[fm.sp]; const foe = foeInfo || (fm && fm.hp > 0 && this.enemyVisible !== false ? `${fsp.name} (${TYPES[fsp.type]?.name || fsp.type} type) · Lv ${fm.lvl}` : '');
    const fainted = al.mon && al.mon.hp <= 0;
    const title = `${this.allies.length > 1 ? p.name + ': ' : ''}${fainted ? `${monName(W, al.mon)} fainted — who goes out next?` : 'Choose a monster.'}${foe ? ` Facing: *${foe}*` : ''}`;
    const i = await ui.choose(title, opts, { cancel, cls: 'teamlist' });
    if (i < 0) return false;
    if (al.mon && al.mon.hp > 0) { await this.msg(`Come back, ${monName(W, al.mon)}!`, 700); }
    al.mon = p.party[i]; al.boost = 0; al.part.add(al.mon.uid); al.visible = true; const s = this.spr('a' + k); s.y = 0; s.a = 0; this.hud();
    await this.animEnter('a' + k); await this.msg(`Go, ${monName(W, al.mon)}!`, 700);
    return true;
  }
  async bag(al, k) {
    const W = G.W; const bag = G.save.bag; const ids = Object.keys(bag).filter((id) => bag[id] > 0 && ITEMS[id] && ITEMS[id].kind !== 'tm' && ITEMS[id].kind !== 'level'); // shards are field-only: no levelling up mid-battle
    if (!ids.length) { await this.msg('Your bag is empty!', 900); return 'back'; }
    const i = await ui.choose(null, ids.map((id) => ({ html: `<img class="ico" src="${itemIconSafe(id)}">${esc(ITEMS[id].name)} <span class="cnt">×${bag[id]}</span>`, disabled: ITEMS[id].kind === 'cube' && this.o.kind !== 'wild' })), { cls: 'bmenu bag' });
    if (i < 0) return 'back';
    const id = ids[i], it = ITEMS[id]; const p = G.save.players[al.pi];
    if (it.kind === 'cube') return this.capture(al, k, id);
    const cand = p.party.map((m) => ({ html: monRow(W, m), disabled: it.kind === 'revive' ? m.hp > 0 : (m.hp <= 0 || (it.kind === 'heal' && m.hp >= maxHp(W, m) && !m.status)) }));
    const t = await ui.choose(`Use ${it.name} on which monster?`, cand, { cls: 'teamlist' }); if (t < 0) return 'back';
    const m = p.party[t]; bag[id]--;
    if (it.kind === 'heal') { audio.sfx('heal'); const cured = !!m.status; delete m.status; const to = Math.min(maxHp(W, m), m.hp + it.amt); if (m === al.mon) await this.hpTo(m, false, to); else m.hp = to; await this.msg(`${monName(W, m)} recovered HP${cured ? ' and feels better' : ''}!`); }
    if (it.kind === 'revive') { m.hp = Math.floor(maxHp(W, m) / 2); audio.sfx('heal'); await this.msg(`${monName(W, m)} was revived!`); }
  }
  async capture(al, k, cubeId) {
    const W = G.W; const e = this.enemy; const sp = W.species[e.mon.sp]; G.save.bag[cubeId]--;
    await this.msg(`${G.save.players[al.pi].name} readies a ${ITEMS[cubeId].name}! Answer to lock on!`, 1000);
    const res = await this.ask(al, 'Lock-on — answer to boost the capture rate');
    const hpF = e.mon.hp / this.hpMax(e.mon, true);
    let p = (1 - 0.72 * hpF) * ITEMS[cubeId].rate * (res.correct ? (res.quick ? 2.1 : 1.7) : 0.55) * [0.9, 0.62, 0.4][sp.stage] * 0.55 * (RARITY[sp.rarity]?.catch ?? 1);
    if (this.o.kind !== 'wild') p = 0; p = clamp(p, sp.rarity === 'mythic' || sp.rarity === 'legendary' ? 0.02 : 0.04, 0.97);
    // throw animation
    const from = this.posOf('a' + k), to = this.posOf('e'); audio.sfx('throw');
    this.cube = { x: from.x, y: from.y, col: cubeId === 'cube' ? '#4cf0ff' : cubeId === 'cube2' ? '#ff4fd8' : '#ffd23f' };
    await tween(450, (t) => { this.cube.x = from.x + (to.x - from.x) * t; this.cube.y = from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * 60; });
    this.burst(to.x, to.y, '#ffffff', 20, 80); const s = this.spr('e'); await tween(220, (t) => { s.s = 1 - t; s.a = 1 - t; });
    await tween(250, (t) => { this.cube.y = to.y + t * 28; });
    const shakes = R() < p ? 3 : R() < p * 1.5 ? 2 : R() < 0.5 ? 1 : 0;
    for (let i = 0; i < shakes; i++) { await sleep(350); audio.sfx('shake'); const bx = this.cube.x; await tween(260, (t) => { this.cube.x = bx + Math.sin(t * Math.PI * 2) * 4; }); }
    await sleep(350);
    if (shakes === 3) {
      audio.sfx('catch'); for (let i = 0; i < 3; i++) this.burst(this.cube.x, this.cube.y, '#ffd23f', 10, 60);
      await this.msg(`Gotcha! ${sp.name} was captured!`, 1500);
      const mon = e.mon; mon.hp = Math.min(maxHp(W, mon), Math.ceil(e.mon.hp / this.hpMul)); mon.hp = Math.max(1, mon.hp);
      const fresh = !G.save.caught[mon.sp]; G.save.caught[mon.sp] = 1; if (mon.era) { G.save.eraDex = G.save.eraDex || {}; G.save.eraDex[mon.sp + ':' + mon.era] = 1; }
      if (fresh) await this.msg(`${sp.name}'s data was added to the Dex!`, 1100);
      if (sp.termId && !G.save.codex[sp.termId]) { G.save.codex[sp.termId] = Date.now(); const T = W.terms.find((x) => x.id === sp.termId); if (T) await this.msg(`📘 Codex: ${T.term} — ${T.def}`, 3200); }
      const where = addMon(G.save, al.pi, mon);
      if (where === 'box') await this.msg(`Party full — ${sp.name} was sent to the Archive Box.`, 1400);
      this.cube = null; G.world?.questTick?.('catch', mon.sp);
      return 'caught';
    }
    this.cube = null; s.s = 1; s.a = 1; this.burst(to.x, to.y, '#ffffff', 16, 80); audio.sfx('hit');
    await this.msg(['Oh no! It broke free!', 'Argh! So close!', 'It escaped the cube!'][Math.min(2, shakes)]);
  }
  async finish(r) {
    const W = G.W; const o = this.o;
    if (r === 'win' && o.kind !== 'wild') {
      audio.play('victory' + R(), 'v', 'title');
      await this.msg(`You defeated ${o.trainerTitle}!`, 1300);
      if (o.after) await this.msg(o.after, 2600);
      if (o.money) { G.save.money += o.money; await this.msg(`You earned ¤${o.money}.`, 1100); }
    } else if (r === 'win') { audio.play('victory' + R(), 'v', 'bright'); const coins = Math.round(5 + this.team[0].lvl * 3); G.save.money += coins; await this.msg(`Found ¤${coins} of research credits.`, 900); }
    if (r === 'lose') await this.msg('You have no monsters left that can fight...', 1600);
    // evolutions
    const evos = [];
    for (const p of G.save.players) for (const m of p.party) { const to = checkEvolve(W, m); if (to && m.hp > 0) evos.push([m, to]); }
    this.wipe = 0; await tween(300, (k) => { this.wipe = k; });
    for (const [m, to] of evos) await evolveScene(this, m, to);
    document.getElementById('hud').innerHTML = ''; document.getElementById('hud').className = '';
    return r;
  }
}
const effTag = (e) => (e > 1 ? '<span class="eff up">▲ Super</span>' : e < 1 ? '<span class="eff dn">▼ Weak</span>' : '');
function itemIconSafe(id) { try { return G.icons(id); } catch { return ''; } }
export function monRow(W, m) {
  const sp = W.species[m.sp]; const mh = maxHp(W, m); const pct = clamp(m.hp / mh, 0, 1) * 100;
  return `<img class="mini" src="${G.mini(sp, lookOf(m))}"><span class="mrn">${esc(monName(W, m))}</span><span class="lv">Lv${m.lvl}</span><span class="type t-${sp.type}">${TYPES[sp.type].name}</span>${m.status ? `<span class="stat st-${m.status}">${STATUS[m.status].tag}</span>` : ''}<span class="minihp"><i class="${pct > 50 ? 'g' : pct > 20 ? 'y' : 'r'}" style="width:${pct}%"></i></span><span class="hpn">${Math.ceil(m.hp)}/${mh}</span>`;
}
export async function evolveScene(scene, m, to) {
  const W = G.W; const from = W.species[m.sp], dest = W.species[to];
  const el = document.getElementById('hud'); el.className = 'battle'; el.innerHTML = '<div class="btext"></div>';
  const say = (t) => { el.querySelector('.btext').innerHTML = esc(t); };
  const prevScene = G.scene; const cv = { t: 0, form: 0, white: 0 };
  G.scene = { update: (dt) => { cv.t += dt; }, render: (g) => {
    g.fillStyle = '#0d0820'; g.fillRect(0, 0, view.w, view.h);
    for (let i = 0; i < 40; i++) { const a = i * 0.7 + cv.t * 0.6, rr = 40 + (i * 13) % 120; g.fillStyle = i % 2 ? TYPES[dest.type].color : '#ffffff'; g.fillRect(view.w / 2 + Math.cos(a) * rr, view.h / 2 + Math.sin(a) * rr * 0.6, 2, 2); }
    const sp = cv.form ? dest : from; const c = monsterCanvas(sp, false, lookOf(m)); const s = 2.2;
    g.drawImage(c, view.w / 2 - 28 * s, view.h / 2 + 50 - 56 * s, 56 * s, 56 * s);
    if (cv.white > 0) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(255,255,255,${cv.white})`; g.fillRect(0, 0, view.w, view.h); g.globalCompositeOperation = 'source-over'; }
  } };
  audio.play('evolve' + to, to, 'mystic');
  say(`What? ${monName(W, m)} is evolving!`); await sleep(1400);
  for (let i = 0; i < 9; i++) { cv.form = i % 2; audio.sfx('blip'); await sleep(Math.max(80, 320 - i * 30)); }
  cv.form = 1; cv.white = 1; audio.sfx('evolve'); await tween(900, (k) => { cv.white = 1 - k; });
  const oldName = monName(W, m); evolve(W, m, to); G.save.seen[to] = 1; G.save.caught[to] = 1;
  say(`Congratulations! ${oldName} evolved into ${dest.name}!`); await sleep(2200);
  G.scene = prevScene;
}

export async function runBattle(opts) {
  const prev = G.scene; G.busy++;
  const sc = new BattleScene(opts); G.scene = sc; G.battle = sc;
  let r;
  try { r = await sc.run(); } catch (e) { console.error(e); r = 'run'; }
  ui.closeAll(); G.scene = prev; G.battle = null; G.busy--; input.clearEdges();
  return r;
}
