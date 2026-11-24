import { TYPES } from '../content/types.js';
function hexToHsl(hex) { const [r, g, b] = hexToRgb(hex).map((v) => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, sat = 0; const l = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; sat = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  return [h, sat * 100, l * 100]; }
// Procedural pixel art: monsters (with shading, outlines, type accessories), people, tiles, buildings, items.
import { rng, hash, shade, mix, hsl, hexToRgb } from './rng.js';

const cache = new Map();
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; };
const OUT = '#14101c';

// ---------------------------------------------------------------- MONSTERS
const PLANS = ['biped', 'quad', 'blob', 'serpent', 'bird', 'floater', 'drake', 'insect', 'golem', 'fish', 'quad', 'biped'];
const TYPE_HUE = { logic: 212, cipher: 275, spark: 48, data: 140, structure: 26, flux: 8, normal: 0 };
// era: undefined (present), 'past' (ancient form) or 'future' (future form)
export function monsterCanvas(sp, back = false, era = '') {
  const tcol = (TYPES[sp.type] || TYPES.logic).color;
  const key = 'm4' + sp.uidKey + (back ? 'b' : 'f') + tcol + (era || '');
  const shiny = String(era || '').includes('*'); era = String(era || '').replace('*', '');
  const regal = sp.rarity === 'legendary' || sp.rarity === 'mythic';
  if (cache.has(key)) return cache.get(key);
  const U = 1.5; // render at 1.5x the old resolution for finer detail (callers scale to their own size)
  const S = 84, M = new Uint8Array(S * S);
  const lineR = rng(sp.lineSeed); const r = rng(sp.seed);
  const plan = sp.plan || PLANS[Math.floor(lineR() * PLANS.length)];
  const stages = sp.stages, st = sp.stage;
  const s = stages === 1 ? 0.92 : stages === 2 ? [0.74, 1][st] : [0.62, 0.82, 1][st];
  const G = S - 4; // ground line
  const set = (x, y, v) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= S || y >= S) return; M[y * S + x] = v; };
  const get = (x, y) => (x < 0 || y < 0 || x >= S || y >= S ? 0 : M[y * S + x]);
  // mirrored primitives (dx measured from centre line)
  const ell = (dx, cy, rx, ry, v, onlyEmpty = false) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = -Math.ceil(rx) - 1; x <= Math.ceil(rx) + 1; x++) {
      const nx = (x) / rx, ny = (y - cy) / ry; if (nx * nx + ny * ny > 1) continue;
      for (const sx of [S / 2 + dx + x, S / 2 - 1 - dx - x]) { if (onlyEmpty && get(sx, y)) continue; set(sx, y, v); }
    }
  };
  const tri = (x1, y1, x2, y2, x3, y3, v) => { // mirrored triangle, x relative to centre
    const minY = Math.floor(Math.min(y1, y2, y3)), maxY = Math.ceil(Math.max(y1, y2, y3));
    const minX = Math.floor(Math.min(x1, x2, x3)), maxX = Math.ceil(Math.max(x1, x2, x3));
    const sign = (ax, ay, bx, by, cx, cy) => (ax - cx) * (by - cy) - (bx - cx) * (ay - cy);
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const d1 = sign(x, y, x1, y1, x2, y2), d2 = sign(x, y, x2, y2, x3, y3), d3 = sign(x, y, x3, y3, x1, y1);
      const neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0;
      if (neg && pos) continue; set(S / 2 + x, y, v); set(S / 2 - 1 - x, y, v);
    }
  };
  const k = (v) => v * s * U;
  const ellA = (cx, cy, rx, ry, v, onlyEmpty = false) => { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const nx = (x - cx) / rx, ny = (y - cy) / ry; if (nx * nx + ny * ny > 1) continue; if (onlyEmpty && get(x, y)) continue; set(x, y, v); } };
  const bw = 0.86 + lineR() * 0.34, bh = 0.88 + lineR() * 0.26; // per-family body proportions (chunky / slim / tall / squat)
  const fWings = plan === 'drake' || (plan !== 'bird' && plan !== 'fish' && plan !== 'golem' && lineR() < 0.22);
  const fTail = !['serpent', 'floater', 'fish', 'insect'].includes(plan) && lineR() < 0.62; const tailKind = Math.floor(lineR() * 5);
  const fSpikes = sp.type === 'structure' || lineR() < 0.25;
  const eyeStyle = sp.type === 'cipher' && lineR() < 0.3 ? 3 : Math.floor(lineR() * 6); // 0 round 1 brows 2 slit 3 cyclops 4 sleepy 5 big-cute
  const mouthStyle = Math.floor(lineR() * 5); // 0 smile 1 open 2 fangs 3 beak 4 whiskers
  const extra = Math.floor(lineR() * 7); // 0 none 1 shell 2 mane 3 tusks 4 gem 5 back plates 6 cheek fluff
  // wings go behind everything
  if (fWings) { const wy = G - k(plan === 'quad' ? 16 : 22); tri(k(6), wy, k(22 + st * 2), wy - k(14 + st * 3), k(10), wy + k(8), 3); tri(k(14), wy - k(6), k(23 + st * 2), wy - k(12 + st * 3), k(20), wy + k(2), 7); }
  // tail (asymmetric, viewer's right)
  if (fTail) {
    let tx = S / 2 + k(8), ty = G - k(6);
    if (tailKind === 1) { ellA(tx + k(8), ty - k(10), k(6), k(8), 1); ellA(tx + k(9), ty - k(14), k(3.5), k(4), 2); } // big fluffy tail
    else for (let i = 0; i < 7; i++) { ellA(tx, ty, k(2.6 - i * 0.18), k(2.6 - i * 0.18), i > 4 && tailKind === 0 ? 7 : 1); tx += k(2.2); ty -= k(1.6 + i * 0.5); }
    if (tailKind === 2) { const sx = tx, sy = ty; for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) if (Math.abs(x) + Math.abs(y) <= k(4)) set(sx + x, sy + y, 3); } // spade tip
    if (tailKind === 3) { for (let i = 0; i < 3; i++) ellA(tx + (i - 1) * k(1.5), ty - k(2 + i * 1.6), k(2.6 - i * 0.6), k(3 - i * 0.6), 7); } // flame tip
    if (tailKind === 4) { ellA(tx, ty, k(3), k(3), 3); ellA(tx + k(2.5), ty + k(1), k(2), k(2), 3); } // club tail
  }
  let head = { y: G - k(30), rx: k(9), ry: k(8) };
  const big = st === stages - 1 && stages > 1;
  switch (plan) {
    case 'drake': case 'biped':
      ell(k(7) * bw, G - k(4), k(3.5), k(4.5), 3); ell(0, G - k(14) * bh, k(10.5) * bw, k(10) * bh, 1); ell(0, G - k(12) * bh, k(6) * bw, k(7) * bh, 2);
      ell(k(11.5), G - k(16), k(3.2), k(5.5), 3); head = { y: G - k(29), rx: k(9.5), ry: k(8.5) }; ell(0, head.y, head.rx, head.ry, 1);
      if (lineR() < 0.6) { for (let i = 0; i < 6; i++) ell(k(3 + i * 1.6), G - k(6) - i * k(1.2), k(1.6), k(1.6), 3, true); }
      break;
    case 'quad':
      ell(k(12) * bw, G - k(3.5), k(3), k(4), 3); ell(k(6) * bw, G - k(3), k(3), k(4), 3); ell(0, G - k(11), k(15) * bw, k(8) * bh, 1); ell(0, G - k(9), k(9) * bw, k(4.5), 2);
      head = { y: G - k(21), rx: k(10), ry: k(8.5) }; ell(0, head.y, head.rx, head.ry, 1); ell(0, head.y + k(4), k(5), k(3.5), 2);
      break;
    case 'blob':
      ell(0, G - k(13) * bh, k(15) * bw, k(13) * bh, 1); ell(0, G - k(8), k(10) * bw, k(7), 2); ell(k(9), G - k(2), k(4), k(2.5), 1); head = { y: G - k(17), rx: k(12), ry: k(9), inBody: true };
      break;
    case 'serpent':
      ell(0, G - k(5), k(16), k(5), 1); ell(0, G - k(4), k(10), k(2.5), 2); ell(0, G - k(13), k(11), k(5), 1); ell(0, G - k(20), k(6), k(5), 1);
      head = { y: G - k(30), rx: k(9), ry: k(7.5) }; ell(0, head.y, head.rx, head.ry, 1);
      tri(k(7), head.y - k(2), k(17), head.y - k(9), k(9), head.y + k(4), 3);
      break;
    case 'bird':
      tri(k(5), G - k(24), k(24), G - k(34) - (big ? k(6) : 0), k(8), G - k(10), 3); tri(k(6), G - k(18), k(22), G - k(14), k(6), G - k(8), 3);
      ell(0, G - k(16), k(8.5), k(11), 1); ell(0, G - k(13), k(5), k(7.5), 2); ell(k(4), G - k(2), k(1.2), k(3), 4);
      head = { y: G - k(31), rx: k(8), ry: k(7) }; ell(0, head.y, head.rx, head.ry, 1); tri(0, head.y + k(1), k(2.5), head.y + k(2), 0, head.y + k(6), 4);
      break;
    case 'insect': {
      for (const [lx, ly] of [[6, 2], [10, 5], [13, 9]]) { tri(k(lx - 1), G - k(10), k(lx + 3), G - k(ly) , k(lx + 1), G - k(9), 3); ell(k(lx + 3), G - k(ly) + k(1), k(1), k(1.5), 3); }
      ell(0, G - k(10), k(9) * bw, k(7) * bh, 1); ell(0, G - k(17), k(7) * bw, k(5), 8); ell(0, G - k(9), k(5), k(4), 2);
      head = { y: G - k(25), rx: k(8.5), ry: k(7) }; ell(0, head.y, head.rx, head.ry, 1);
      for (const d of [3, 6]) { const hy0 = head.y - head.ry; for (let i = 0; i < 7; i++) set(S / 2 + k(d) + i * 0.7, hy0 - i * 1.3, 4), set(S / 2 - 1 - k(d) - i * 0.7, hy0 - i * 1.3, 4); ell(k(d) + 5, hy0 - 9, k(1.4), k(1.4), 7); }
      break; }
    case 'golem': {
      const rect = (dx, y0, w, h, v) => { for (let y = Math.round(y0); y < y0 + h; y++) for (let x = 0; x < w; x++) { set(S / 2 + dx + x, y, v); set(S / 2 - 1 - dx - x, y, v); } };
      rect(k(4), G - k(7), k(5), k(7), 3); rect(0, G - k(22) * bh, k(12) * bw, k(16) * bh, 1); rect(0, G - k(18), k(6), k(9), 2);
      rect(k(12) * bw, G - k(21) * bh, k(5), k(13), 3); head = { y: G - k(29) * bh, rx: k(8), ry: k(6.5) }; rect(0, head.y - head.ry, head.rx, head.ry * 2, 1);
      for (let i = 0; i < 4; i++) set(S / 2 + k(3) + i * 3, G - k(15) - i * 2, 8);
      break; }
    case 'fish': {
      ell(0, G - k(14), k(15) * bw, k(10) * bh, 1); ell(0, G - k(10), k(9) * bw, k(5), 2);
      for (let i = 0; i <= k(11); i++) { const x = S / 2 + k(12) * bw + i, h = k(2) + i * 0.85; for (let y = -h; y <= h; y++) set(x, G - k(14) + y, 3); } // tail fin (one side)
      ell(k(9) * bw, G - k(9), k(3), k(1.6), 3); // pectoral fins
      tri(-k(3), G - k(23) * bh, k(2), G - k(32) * bh, k(6), G - k(22) * bh, 3); // dorsal fin
      ell(k(8), G - k(2), k(2.5), k(2), 7); // little bubbles
      head = { y: G - k(16), rx: k(10), ry: k(8), inBody: true };
      break; }
    case 'floater':
      for (const dx of [k(3), k(8)]) for (let i = 0; i < 9; i++) ell(dx + Math.sin(i * 0.9) * k(1.5), G - k(6) - i * k(1.6), k(1.6), k(1.6), 3);
      ell(0, G - k(22), k(12.5), k(12), 1); ell(0, G - k(18), k(8), k(6), 2); head = { y: G - k(24), rx: k(11), ry: k(9), inBody: true };
      break;
  }
  // ears / horns by line
  const earKind = Math.floor(lineR() * 8); // 0 pointy 1 round 2 small horns 3 none 4 bunny 5 curled horns 6 crest 7 side fins
  const hy = head.y - head.ry;
  if (earKind === 0) tri(k(3), hy + k(3), k(9), hy - k(7) - (big ? k(4) : 0), k(8), hy + k(4), 3);
  if (earKind === 1) ell(k(7), hy + k(1), k(3), k(4), 1);
  if (earKind === 2) { tri(k(2), hy + k(2), k(5), hy - k(6), k(6), hy + k(2), 3); }
  if (earKind === 4) { ell(k(4.5), hy - k(6), k(2.2), k(8), 1); ell(k(4.5), hy - k(6), k(1), k(6), 11); }
  if (earKind === 5) { for (let i = 0; i < 6; i++) ell(k(6 + i * 1.3), hy - k(i < 3 ? i * 2 : 6 - (i - 3) * 1.4), k(1.8 - i * 0.12), k(1.8 - i * 0.12), 12); }
  if (earKind === 6) { for (let i = 0; i < 4; i++) tri(-k(1.2) + 0, hy + k(1) + i * k(2.5) - k(6), k(1.2), hy - k(5) + i * k(2.5) - k(6), k(2.5), hy + k(2) + i * k(2.5) - k(6), 3); }
  if (earKind === 7) { tri(head.rx * 0.9, head.y - k(2), head.rx + k(7), head.y - k(7), head.rx + k(5), head.y + k(4), 3); }
  // type accessories (grow with stage)
  const n = st + 1 + (stages === 1 ? 1 : 0);
  switch (sp.type) {
    case 'flux': for (let i = 0; i < n + 1; i++) tri(k(-2 + i * 3), hy + k(2), k(i * 3 + 0.5), hy - k(6 + (n - i) * 2.5), k(2 + i * 3), hy + k(2), 7); break;
    case 'spark': for (let i = 0; i < n; i++) { const bx = k(5 + i * 3); tri(bx, hy + k(2), bx + k(4), hy - k(6 + i * 2), bx + k(2), hy + k(2), 3); tri(bx + k(2), hy - k(4 + i * 2), bx + k(6), hy - k(11 + i * 3), bx + k(3), hy - k(5 + i * 2), 7); } break;
    case 'structure': for (let i = 0; i < n + 1; i++) { const bx = k(8 + i * 3.5), by = G - k(18 + i * 3); tri(bx, by, bx + k(3), by - k(9), bx + k(5), by + k(2), 3); } break;
    case 'logic': ell(0, hy - k(4), k(0.8), k(4), 4); ell(0, hy - k(9), k(2.2), k(2.2), 7); if (n > 1) { ell(k(6), hy - k(2), k(0.8), k(3), 4); ell(k(6), hy - k(6), k(1.7), k(1.7), 7); } break;
    case 'data': if (n > 1) { tri(k(1), hy + k(1), k(6), hy - k(8), k(4), hy + k(2), 3); } ell(k(4), hy - k(3), k(2), k(2), 7); break;
    case 'cipher': tri(k(5), hy + k(3), k(13), hy - k(8), k(10), hy + k(5), 3); if (n > 2) tri(k(10), hy + k(5), k(18), hy - k(2), k(12), hy + k(8), 3); break;
  }
  if (fSpikes) { const n2 = 2 + st; for (let i = 0; i < n2; i++) { const by = head.y - head.ry * 0.2 + i * k(5), bx = head.rx * 0.9 + i * k(1.5); tri(bx - k(1), by, bx + k(5), by - k(4), bx, by + k(3), 3); } }
  // family extras
  if (extra === 1 && !['fish', 'bird', 'floater'].includes(plan)) { ell(0, G - k(17) * bh, k(9) * bw, k(7), 3, false); for (let i = -1; i <= 1; i++) ell(i * k(4), G - k(18) * bh, k(1.5), k(1.5), 8); } // shell / armour plate
  if (extra === 2) { for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.33; const rx = head.rx + k(2), ry = head.ry + k(2); tri(Math.cos(a) * rx * 0.6, head.y + Math.sin(a) * ry * 0.6, Math.cos(a) * (rx + k(4)), head.y + Math.sin(a) * (ry + k(4)), Math.cos(a + 0.2) * rx * 0.6, head.y + Math.sin(a + 0.2) * ry * 0.6, 3); } ell(0, head.y, head.rx, head.ry, 1); } // mane
  if (extra === 3 && !head.inBody) { tri(k(2), head.y + head.ry * 0.5, k(3.5), head.y + head.ry + k(4), k(4.5), head.y + head.ry * 0.6, 12); } // tusks
  if (extra === 4) { const gy = head.y - head.ry * 0.55; for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (Math.abs(x) + Math.abs(y) <= 3) set(S / 2 - 0.5 + x, gy + y, 7); } // forehead gem
  if (extra === 5 && plan !== 'fish') { for (let i = 0; i < 4; i++) { const by = G - k(9 + i * 4.5) * bh; tri(-k(1.5), by, 0, by - k(5), k(1.5), by, 3); } } // back plates (centre ridge)
  if (extra === 6 && !head.inBody) { ell(head.rx * 0.85, head.y + head.ry * 0.25, k(3), k(2.5), 2); } // cheek fluff
  // body pattern
  const pat = Math.floor(lineR() * 8); // 0 none 1 stripes 2 spots 3 plain 4 bands 5 mask 6 two-tone 7 rings
  if (pat === 1) for (let y = 0; y < S; y += 6) for (let x = 0; x < S; x++) if (get(x, y) === 1) set(x, y, 8);
  if (pat === 2) for (let i = 0; i < 26; i++) { const x = r.int(0, S - 1), y = r.int(0, S - 1); if (get(x, y) === 1) { set(x, y, 8); set(x + 1, y, 8); set(x, y + 1, 8); } }
  if (pat === 4) for (let x = 0; x < S; x++) if (Math.floor((x - S / 2 + 200) / 5) % 2 === 0) for (let y = 0; y < S; y++) if (get(x, y) === 1 && y > head.y + head.ry) set(x, y, 8);
  if (pat === 5 && !back) for (let y = Math.round(head.y - head.ry * 0.25); y < head.y + head.ry * 0.35; y++) for (let x = 0; x < S; x++) if (get(x, y) === 1) set(x, y, 8);
  if (pat === 6) { const mid = head.y + head.ry + k(6); for (let y = 0; y < mid; y++) for (let x = 0; x < S; x++) if (get(x, y) === 1) set(x, y, 13); }
  if (pat === 7) for (let i = 0; i < 6; i++) { const x = r.int(10, S - 10), y = r.int(20, S - 8); if (get(x, y) === 1) { for (let a = 0; a < 12; a++) { const px = x + Math.round(Math.cos(a / 2) * 2.4), py = y + Math.round(Math.sin(a / 2) * 2.4); if (get(px, py) === 1) set(px, py, 8); } } }
  if (sp.type === 'logic' && st > 0) for (let y = Math.floor(G - k(20)); y < G - k(6); y += 7) for (let x = 0; x < S; x++) if (get(x, y) === 1 && (x + y) % 7 < 4) set(x, y, 7);
  // face
  if (!back) {
    const ey = head.y + (head.inBody ? -k(1) : 0), ex = head.rx * 0.42, er = Math.max(1.6, k(2.6));
    if (eyeStyle === 3) { ell(0, ey, er * 1.6, er * 1.5, 5); ellA(S / 2 - 0.5, ey + er * 0.3, er * 0.7, er * 0.9, 6); set(S / 2 - er * 0.6, ey - er * 0.6, 9); }
    else {
      if (eyeStyle === 4) { for (const sx of [S / 2 + ex, S / 2 - 1 - ex]) for (let x = -er; x <= er; x++) { set(sx + x, ey, 4); set(sx + x, ey + 1, 4); } }
      if (eyeStyle !== 4) ell(ex, ey, er * (eyeStyle === 5 ? 1.35 : 1), er * (eyeStyle === 2 ? 0.8 : eyeStyle === 5 ? 1.5 : 1.15), 5);
      if (eyeStyle === 4) { /* sleepy line eyes */ } else if (eyeStyle === 2) ell(ex, ey, er * 0.3, er * 0.8, 6); else { ell(ex - er * 0.12, ey + er * 0.3, er * 0.72, er * 0.88, 10); ell(ex - er * 0.15, ey + er * 0.4, er * 0.42, er * 0.58, 6); }
      if (eyeStyle !== 4) for (const sx of [S / 2 + ex - er * 0.45, S / 2 - 1 - ex - er * 0.45]) { set(sx, ey - er * 0.45, 9); set(sx + 1, ey - er * 0.45, 9); set(sx, ey - er * 0.45 + 1, 9); set(sx + er * 0.7, ey + er * 0.5, 9); }
      if (lineR() < 0.55 && !head.inBody) ell(ex + er * 0.9, ey + er * 1.35, er * 0.7, er * 0.35, 11, false);
      if (eyeStyle === 1 || st >= 1) { for (let i = -1; i <= 1; i++) { set(S / 2 + ex + i, ey - er - 1 + i * 0.7, 4); set(S / 2 - 1 - ex - i, ey - er - 1 + i * 0.7, 4); } }
    }
    if (sp.type === 'cipher' && st >= 1 && eyeStyle !== 3) { ell(0, head.y - head.ry * 0.55, k(1.5), k(1.5), 7); }
    const my = ey + er + k(2.5);
    if (mouthStyle === 3 && !head.inBody) { tri(-k(2.2), my - k(1.5), 0, my + k(3.5), k(2.2), my - k(1.5), 12); } // beak
    else if (mouthStyle === 4) { for (let x = -Math.round(k(1.5)); x <= Math.round(k(1.5)); x++) set(S / 2 + x, my, 4); for (let i = 0; i < 3; i++) { set(S / 2 + head.rx * 0.6 + i * 2, my - 2 + i, 4); set(S / 2 - 1 - head.rx * 0.6 - i * 2, my - 2 + i, 4); } } // whiskers
    else if (mouthStyle === 1 && st >= 1) { ell(0, my + 1, k(2.6), k(1.6), 4); set(S / 2 + k(1.2), my, 5); set(S / 2 - 1 - k(1.2), my, 5); }
    else { for (let x = -Math.round(k(2.5)); x <= Math.round(k(2.5)); x++) set(S / 2 + x, my + (Math.abs(x) > k(1.5) ? -1 : 0), 4); if (st >= 1 || mouthStyle === 2) { set(S / 2 + k(1.5), my + 1, 5); set(S / 2 - 1 - k(1.5), my + 1, 5); } }
  }
  // palette
  // colours come from the TYPE colour of the current subject (so types are recognisable), varied per family
  const [th, ts, tl] = hexToHsl(tcol); const grey = ts < 22;
  const hv = (th + (hash(sp.lineSeed) % 36) - 18 + 360) % 360;
  let base = grey ? hsl(hv, 8 + (hash(sp.lineSeed + 's') % 14), 46 + (hash(sp.lineSeed + 'l') % 18)) : hsl(hv, 55 + (hash(sp.lineSeed + 's') % 30), 44 + (hash(sp.lineSeed + 'l') % 16));
  const scheme = hash(sp.lineSeed + 'c') % 6; // complementary, split, analogous, dark, light, metallic
  const ah = grey ? (hash(sp.lineSeed + 'g') % 360) : (hv + [180, 150, 35, 0, -30, 0][scheme] + 360) % 360;
  let accent = scheme === 3 ? shade(base, -0.45) : scheme === 4 ? hsl(ah, 40, 82) : scheme === 5 ? '#c8ccd8' : hsl(ah, 68, 44);
  let belly = scheme === 4 ? shade(base, 0.35) : shade(base, 0.55);
  let second = hsl((hv + 25) % 360, 50, 34); // two-tone pattern colour
  if (era === 'past') { const sep = (h) => mix(mix(h, '#8a7a5a', 0.45), '#6a6a6a', 0.15); base = sep(base); accent = mix(accent, '#b08a3a', 0.6); belly = sep(belly); second = sep(second); }
  if (era === 'future') { base = mix(mix(base, '#c8d4ee', 0.45), '#7a86a8', 0.15); accent = mix(accent, '#3ff6ff', 0.7); belly = mix(belly, '#ffffff', 0.5); second = mix(second, '#202840', 0.6); }
  if (shiny) { const hs = (h, d) => { const [a, b2, c2] = hexToHsl(h); return hsl((a + d + 360) % 360, Math.min(95, b2 + 15), Math.min(80, c2 + 6)); }; base = hs(base, 150); accent = mix(hs(accent, 150), '#ffe680', 0.35); belly = hs(belly, 150); second = hs(second, 150); }
  if (sp.rarity === 'mythic') { base = mix(base, '#f6f0ff', 0.25); accent = mix(accent, '#ffd23f', 0.5); }
  const glow = mix(tcol, '#ffffff', 0.55);
  const iris = hsl((hv + 180) % 360, 70, 45);
  const col = { 14: '#6aa040', 1: base, 2: belly, 3: accent, 4: '#2a1f33', 5: '#ffffff', 6: '#1b1530', 7: era === 'future' ? '#5ff8ff' : glow, 8: shade(base, -0.25), 9: '#ffffff', 10: iris, 11: mix(base, '#ff6a8a', 0.55), 12: era === 'past' ? '#d8c08a' : '#f4ecd8', 13: second };
  // claws: little pale tips where feet/legs touch the ground
  if (plan !== 'floater' && plan !== 'serpent') for (let x = 0; x < S; x++) for (const y of [G, G + 1]) if (get(x, y) === 3 && !get(x, y + 1) && x % 3 === 0) set(x, y, 12);
  if (era === 'past') { for (let i = 0; i < 40; i++) { const x = r.int(0, S - 1), y = r.int(0, S - 1); if (get(x, y) === 1 && !get(x, y - 2)) set(x, y, 14); } // moss on top edges
    for (let c2 = 0; c2 < 3; c2++) { let x = r.int(20, S - 20), y = r.int(30, S - 12); for (let i = 0; i < 8; i++) { if (get(x, y) === 1) set(x, y, 8); x += r.int(-1, 1); y += 1; } } } // cracks
  if (era === 'future') { // glowing circuit traces + a visor band across the eyes
    for (let y = 0; y < S; y += 4) for (let x = 0; x < S; x++) if (get(x, y) === 1 && (x * 7 + y) % 9 < 3) set(x, y, 7);
    for (let x = 0; x < S; x += 4) for (let y = 0; y < S; y++) if (get(x, y) === 1 && (y * 5 + x) % 13 < 2) set(x, y, 7);
    if (!back && !head.inBody) { const vy = Math.round(head.y - k(1)); for (let y = vy - 1; y <= vy + 1; y++) for (let x = Math.round(S / 2 - head.rx * 0.85); x < S / 2 + head.rx * 0.85; x++) if (get(x, y)) set(x, y, 7); }
  }
  // legendary / mythic regalia: a golden crown and a halo of light; shiny sparkles
  if (regal && !back) {
    const cx = S / 2, ty = Math.max(3, Math.round(head.y - head.ry - 2));
    for (let i = -2; i <= 2; i++) { const x = Math.round(cx + i * head.rx * 0.38); const hgt = i === 0 ? 7 : Math.abs(i) === 1 ? 5 : 4; for (let y = ty - hgt; y <= ty; y++) if (!get(x, y)) set(x, y, 15); if (!get(x - 1, ty)) set(x - 1, ty, 15); if (!get(x + 1, ty)) set(x + 1, ty, 15); }
    for (let x = Math.round(cx - head.rx * 0.9); x <= cx + head.rx * 0.9; x++) if (!get(x, ty + 1)) set(x, ty + 1, 15);
    if (sp.rarity === 'mythic') { const hy = ty - 10; for (let a = 0; a < 6.28; a += 0.06) { const x = Math.round(cx + Math.cos(a) * head.rx * 1.1), y = Math.round(hy + Math.sin(a) * 2.5); if (y >= 0 && !get(x, y)) set(x, y, 16); } }
  }
  if (regal || shiny) { for (let i = 0; i < (regal ? 26 : 14); i++) { const x = r.int(2, S - 3), y = r.int(2, S - 3); if (!get(x, y) && !get(x + 1, y) && !get(x - 1, y)) { set(x, y, 16); if (i % 3 === 0) { set(x + 1, y, 16); set(x - 1, y, 16); set(x, y + 1, 16); set(x, y - 1, 16); } } } }
  col[15] = '#ffd23f'; col[16] = shiny && !regal ? '#bff8ff' : '#fff6c0';
  // find each part's vertical extent for soft top-light gradient
  let top = S, bot = 0; for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (get(x, y)) { if (y < top) top = y; if (y > bot) bot = y; }
  const BAYER = [[0, 2], [3, 1]];
  const [c, g] = mk(S, S);
  const img = g.createImageData(S, S);
  const put = (x, y, hex) => { const [R, G2, B] = hexToRgb(hex); const i = (y * S + x) * 4; img.data[i] = R; img.data[i + 1] = G2; img.data[i + 2] = B; img.data[i + 3] = 255; };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const v = get(x, y);
    if (!v) { const n = get(x + 1, y) || get(x - 1, y) || get(x, y + 1) || get(x, y - 1); if (n && n !== 16) put(x, y, n <= 3 || n === 8 ? mix(OUT, col[n], 0.18) : OUT); continue; }
    let hex = col[v];
    if (back && (v === 1 || v === 3 || v === 8)) hex = shade(hex, -0.08);
    if (v <= 3 || v === 8 || v === 13) {
      // soft gradient (lighter on top), dithered so it reads as pixel art
      const gy = (y - top) / Math.max(1, bot - top); const d = (BAYER[y & 1][x & 1] / 4 - 0.375) * 0.08; hex = shade(hex, 0.1 - gy * 0.2 + d);
      if (!get(x, y - 1) || !get(x - 1, y - 1)) hex = shade(hex, 0.3);
      else if (!get(x, y - 2) && !get(x - 1, y - 2)) hex = shade(hex, 0.13);
      else if (!get(x, y + 1) || !get(x + 1, y + 2) || !get(x + 2, y + 1)) hex = shade(hex, -0.3);
      else if (!get(x + 2, y + 2) || !get(x + 3, y + 1)) hex = shade(hex, -0.13);
      // inner contour where two different body parts overlap (limb in front of body, accents)
      const nb = [get(x + 1, y), get(x, y + 1), get(x - 1, y), get(x, y - 1)];
      if (nb.some((q) => q && q !== v && q <= 3 && v < q)) hex = shade(hex, -0.38);
      if (v === 2 && y % 3 === 0) hex = shade(hex, -0.1); // belly plates
    }
    put(x, y, hex);
  }
  g.putImageData(img, 0, 0);
  cache.set(key, c);
  return c;
}

// ---------------------------------------------------------------- PEOPLE
export const SKIN = ['#f6d2b0', '#e8b48a', '#c98b5e', '#9a6440', '#6e4428', '#f0c8a0'];
export const HAIR = ['#2a1f1a', '#5a3820', '#c07a30', '#e8d070', '#a03030', '#30304a', '#e0e0f0', '#3a7ad0', '#d050a0', '#40a060'];
export const CLOTH = ['#d04040', '#3070d0', '#30a050', '#e0a020', '#8040c0', '#e06090', '#20a0a0', '#505060', '#f0f0f0', '#e07030'];
export function personPalette(seed, opt = {}) {
  const r = rng(seed);
  const pal = { skin: opt.skin || r.pick(SKIN), hair: opt.hair || r.pick(HAIR), shirt: opt.shirt || r.pick(CLOTH), pants: opt.pants || shade(r.pick(CLOTH), -0.4), shoes: opt.shoes || '#2a2230', hat: opt.hat ?? (r() < 0.25 ? r.pick(CLOTH) : null), coat: opt.coat || opt.outfit === 'coat' || false, long: opt.long ?? r() < 0.4 };
  if (opt.hairStyle) { pal.hairStyle = opt.hairStyle; pal.long = opt.hairStyle === 'long'; }
  if (opt.outfit) pal.outfit = opt.outfit;
  return pal;
}
// returns a sheet: 3 frames x 4 dirs (down, up, left, right) of 16x20 — shaded, with faces, collars, belts and hair shine
export function personSheet(pal) {
  const key = 'p2' + JSON.stringify(pal); if (cache.has(key)) return cache.get(key);
  const W = 16, H = 20; const [c, g] = mk(W * 3, H * 4);
  const dirs = ['down', 'up', 'left', 'right'];
  const skin = pal.skin, hair = pal.hair, shirtC = pal.coat ? '#f2f2f6' : pal.shirt, pants = pal.pants, shoes = pal.shoes || '#2a2230';
  const eye = '#1b1530', blush = mix(skin, '#ff7a8a', 0.35), mouth = shade(skin, -0.32), belt = '#3a2a22', buckle = '#e8c050';
  dirs.forEach((dir, di) => {
    for (let f = 0; f < 3; f++) {
      const C = [], Mt = []; for (let y = 0; y < H; y++) { C.push(new Array(W).fill(null)); Mt.push(new Array(W).fill(null)); }
      const P = (x, y, col, mat) => { if (x >= 0 && x < W && y >= 0 && y < H) { C[y][x] = col; Mt[y][x] = mat; } };
      const R = (x, y, w, h, col, mat) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) P(i, j, col, mat); };
      const side = dir === 'left' || dir === 'right';
      const step = f === 0 ? 0 : f === 1 ? 1 : -1;
      // ---- legs & shoes
      if (!side) {
        const lY = f === 1 ? -1 : 0, rY = f === 2 ? -1 : 0;
        R(5, 16, 6, 1, pants, 'pants'); R(5, 17 + lY, 2, 2, pants, 'pants'); R(9, 17 + rY, 2, 2, pants, 'pants');
        R(5, 19 + lY, 2, 1, shoes, 'shoes'); R(9, 19 + rY, 2, 1, shoes, 'shoes'); P(5, 19 + lY, shade(shoes, 0.5), 'shoes'); P(9, 19 + rY, shade(shoes, 0.5), 'shoes');
      } else if (f === 0) { R(6, 16, 4, 3, pants, 'pants'); P(8, 17, shade(pants, -0.25), 'pants'); P(8, 18, shade(pants, -0.25), 'pants'); R(6, 19, 4, 1, shoes, 'shoes'); P(9, 19, shade(shoes, 0.5), 'shoes'); }
      else { R(6, 16, 4, 1, pants, 'pants'); const a = 5 + (f === 1 ? -1 : 1), b2 = 9 - (f === 1 ? -1 : 1); R(a, 17, 2, 2, shade(pants, -0.2), 'pants'); R(b2, 17, 2, 2, pants, 'pants'); R(a, 19, 2, 1, shade(shoes, -0.1), 'shoes'); R(b2, 19, 2, 1, shoes, 'shoes'); P(b2 + 1, 19, shade(shoes, 0.5), 'shoes'); }
      // ---- torso, belt, arms
      if (!side) {
        R(5, 10, 6, 5, shirtC, 'shirt'); R(5, 15, 6, 1, belt, 'belt'); if (dir === 'down') { P(7, 15, buckle, 'belt'); P(8, 15, buckle, 'belt'); }
        const aL = f === 1 ? 1 : 0, aR = f === 2 ? 1 : 0;
        R(4, 10, 1, 4 - aL, shirtC, 'shirt'); R(11, 10, 1, 4 - aR, shirtC, 'shirt'); P(4, 14 - aL, skin, 'skin'); P(11, 14 - aR, skin, 'skin');
        if (dir === 'down') { R(6, 10, 4, 1, shade(shirtC, 0.25), 'collar'); P(7, 10, skin, 'skin'); P(8, 10, skin, 'skin'); P(7, 11, shade(shirtC, -0.2), 'shirt'); P(8, 11, shade(shirtC, -0.2), 'shirt'); }
        else R(6, 10, 4, 1, shade(shirtC, -0.15), 'collar');
        if (pal.coat) { R(7, 11, 2, 4, pal.shirt, 'shirt'); R(5, 15, 6, 1, '#f2f2f6', 'coat'); R(4, 14, 8, 2, '#f2f2f6', 'coat'); if (dir === 'down') { P(6, 13, '#c8c8d8', 'coat'); P(9, 13, '#c8c8d8', 'coat'); } }
      } else {
        R(6, 10, 4, 5, shirtC, 'shirt'); R(6, 15, 4, 1, belt, 'belt'); P(9, 10, shade(shirtC, 0.25), 'collar');
        const sw = step; R(7 + sw, 11, 2, 3, shade(shirtC, -0.18), 'arm'); P(7 + sw, 14, skin, 'skin'); P(8 + sw, 14, shade(skin, -0.1), 'skin');
        if (pal.coat) { R(6, 15, 4, 1, '#f2f2f6', 'coat'); R(6, 14, 1, 2, '#f2f2f6', 'coat'); }
      }
      // ---- outfit variations
      const outfit = pal.outfit || 'tee';
      if (outfit === 'jacket') {
        const inner = '#ecebf2';
        if (dir === 'down') { R(7, 10, 2, 5, inner, 'inner'); P(7, 10, skin, 'skin'); P(8, 10, skin, 'skin'); P(6, 10, shade(shirtC, 0.3), 'collar'); P(9, 10, shade(shirtC, 0.3), 'collar'); P(6, 12, shade(shirtC, -0.3), 'shirt'); P(9, 12, shade(shirtC, -0.3), 'shirt'); }
        if (side) { P(9, 11, inner, 'inner'); P(9, 12, inner, 'inner'); P(9, 13, inner, 'inner'); }
        if (dir === 'up') R(5, 14, 6, 1, shade(shirtC, -0.25), 'shirt');
      }
      if (outfit === 'hoodie') {
        if (dir === 'down') { R(5, 10, 6, 1, shade(shirtC, -0.25), 'hood'); P(7, 11, '#f4f4f8', 'inner'); P(8, 11, '#f4f4f8', 'inner'); P(7, 12, '#f4f4f8', 'inner'); P(8, 12, '#f4f4f8', 'inner'); R(6, 13, 4, 1, shade(shirtC, -0.18), 'shirt'); }
        if (dir === 'up') { R(5, 9, 6, 3, shade(shirtC, -0.12), 'hood'); R(6, 12, 4, 1, shade(shirtC, -0.3), 'hood'); }
        if (side) { R(5, 9, 2, 3, shade(shirtC, -0.15), 'hood'); }
      }
      if (outfit === 'dress') {
        if (!side) { R(4, 14, 8, 2, shirtC, 'shirt'); R(3, 15, 10, 1, shade(shirtC, -0.15), 'shirt'); if (dir === 'down') { P(7, 12, shade(shirtC, 0.3), 'collar'); P(8, 12, shade(shirtC, 0.3), 'collar'); } }
        else { R(5, 14, 6, 2, shirtC, 'shirt'); }
      }
      // ---- head
      if (!side) {
        R(4, 3, 8, 6, skin, 'skin'); R(5, 9, 6, 1, skin, 'skin'); P(7, 10, shade(skin, -0.15), 'skin'); P(8, 10, shade(skin, -0.15), 'skin');
        P(3, 6, shade(skin, -0.12), 'skin'); P(12, 6, shade(skin, -0.12), 'skin'); P(3, 7, shade(skin, -0.2), 'skin'); P(12, 7, shade(skin, -0.2), 'skin');
      } else { R(5, 3, 7, 6, skin, 'skin'); R(6, 9, 5, 1, skin, 'skin'); P(12, 6, skin, 'skin'); P(12, 7, shade(skin, -0.08), 'skin'); P(7, 6, shade(skin, -0.22), 'skin'); P(7, 7, shade(skin, -0.22), 'skin'); }
      if (dir === 'down') {
        R(4, 1, 8, 3, hair, 'hair'); R(5, 0, 6, 1, hair, 'hair'); P(4, 4, hair, 'hair'); P(5, 4, hair, 'hair'); P(6, 4, hair, 'hair'); P(9, 4, hair, 'hair'); P(10, 4, hair, 'hair'); P(11, 4, hair, 'hair'); P(8, 4, hair, 'hair');
        R(3, 3, 1, pal.long ? 8 : 3, hair, 'hair'); R(12, 3, 1, pal.long ? 8 : 3, hair, 'hair'); if (pal.long) { R(4, 5, 1, 4, hair, 'hair'); R(11, 5, 1, 4, hair, 'hair'); }
        P(6, 5, shade(hair, -0.2), 'brow'); P(9, 5, shade(hair, -0.2), 'brow');
        P(6, 6, eye, 'eye'); P(6, 7, eye, 'eye'); P(9, 6, eye, 'eye'); P(9, 7, eye, 'eye'); P(6, 6, '#3a4a8a', 'eye');  P(9, 6, '#3a4a8a', 'eye');
        P(5, 8, blush, 'skin'); P(10, 8, blush, 'skin'); P(7, 8, mouth, 'skin'); P(8, 8, mouth, 'skin');
      }
      if (dir === 'up') { R(4, 1, 8, 8, hair, 'hair'); R(5, 0, 6, 1, hair, 'hair'); R(3, 3, 1, 5, hair, 'hair'); R(12, 3, 1, 5, hair, 'hair'); P(7, 9, shade(skin, -0.15), 'skin'); P(8, 9, shade(skin, -0.15), 'skin'); if (pal.long) { R(4, 9, 8, 3, hair, 'hair'); } R(6, 4, 4, 1, shade(hair, -0.15), 'hair'); }
      if (side) {
        R(5, 1, 7, 3, hair, 'hair'); R(6, 0, 5, 1, hair, 'hair'); R(5, 4, 2, pal.long ? 6 : 4, hair, 'hair'); R(4, 3, 1, pal.long ? 7 : 4, hair, 'hair'); P(11, 4, hair, 'hair'); P(10, 4, hair, 'hair');
        P(10, 5, shade(hair, -0.2), 'brow'); P(10, 6, '#3a4a8a', 'eye'); P(10, 7, eye, 'eye'); P(12, 8, skin, 'skin'); P(11, 8, mouth, 'skin'); P(9, 8, blush, 'skin');
      }
      const hs = pal.hairStyle || (pal.long ? 'long' : 'short');
      if (hs === 'spiky') {
        for (let x = 4; x <= 11; x += 2) { P(x, 0, hair, 'hair'); } P(5, 0, null, null); P(7, 0, null, null); P(9, 0, null, null);
        if (dir !== 'up') { P(3, 2, hair, 'hair'); P(12, 2, hair, 'hair'); P(7, 4, hair, 'hair'); } else { P(3, 1, hair, 'hair'); P(12, 1, hair, 'hair'); }
      }
      if (hs === 'ponytail') {
        if (dir === 'down') { P(12, 4, shade(hair, -0.1), 'hair'); P(13, 5, hair, 'hair'); P(13, 6, hair, 'hair'); P(13, 7, shade(hair, -0.15), 'hair'); }
        if (dir === 'up') { P(7, 0, '#e04a6a', 'tie'); P(8, 0, '#e04a6a', 'tie'); R(7, 9, 2, 3, hair, 'hair'); P(7, 12, shade(hair, -0.2), 'hair'); }
        if (side) { P(4, 2, '#e04a6a', 'tie'); R(2, 3, 2, 5, hair, 'hair'); P(3, 8, shade(hair, -0.2), 'hair'); }
      }
      if (hs === 'curly') { for (let y = 0; y < 5; y++) for (let x = 3; x <= 12; x++) if (Mt[y][x] === 'hair' && (x + y * 2) % 3 === 0) C[y][x] = shade(hair, -0.22); if (dir === 'down') { P(3, 3, hair, 'hair'); P(12, 3, hair, 'hair'); P(3, 5, hair, 'hair'); P(12, 5, hair, 'hair'); } }
      if (hs === 'buzz') { for (let y = 0; y < 10; y++) for (let x = 0; x < W; x++) if (Mt[y][x] === 'hair') { if (y >= 2 || dir === 'up') { C[y][x] = mix(hair, skin, 0.55); } } if (dir === 'down') for (const x of [3, 12]) for (let y = 3; y < 11; y++) if (Mt[y][x] === 'hair') { C[y][x] = null; Mt[y][x] = null; } }
      if (pal.hat) {
        const hc = pal.hat; R(4, 0, 8, 2, hc, 'hat'); R(5, -1, 6, 1, hc, 'hat'); R(4, 2, 8, 1, shade(hc, -0.25), 'hatband');
        if (dir === 'down') R(3, 3, 10, 1, shade(hc, -0.35), 'brim'); if (side) R(9, 3, 5, 1, shade(hc, -0.35), 'brim');
        if (dir !== 'up') P(dir === 'down' ? 7 : 8, 0, shade(hc, 0.4), 'hat');
      }
      // ---- shading: light from top-left
      const SHADE = new Set(['hair', 'shirt', 'pants', 'hat', 'coat', 'skin', 'arm']);
      const out = C.map((row) => row.slice());
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const m = Mt[y][x]; if (!m || !SHADE.has(m)) continue; let col = C[y][x];
        const same = (xx, yy) => xx >= 0 && yy >= 0 && xx < W && yy < H && Mt[yy][xx] === m;
        if (m === 'skin') { if (!same(x + 1, y) && dir !== 'right' && dir !== 'left') col = shade(col, -0.12); out[y][x] = col; continue; }
        if (!same(x - 1, y)) col = shade(col, 0.16); else if (!same(x + 1, y)) col = shade(col, -0.2);
        if (!same(x, y + 1) && m !== 'pants') col = shade(col, -0.12);
        if ((m === 'hair' || m === 'hat') && !same(x, y - 1)) col = shade(col, 0.22);
        out[y][x] = col;
      }
      if (dir !== 'up') { const hy = 1; for (const hx of [5, 6]) if (Mt[hy][hx] === 'hair') out[hy][hx] = shade(hair, 0.45); } else { for (const hx of [6, 7, 8]) if (Mt[2][hx] === 'hair') out[2][hx] = shade(hair, 0.4); }
      if (dir === 'left') { for (const row of out) row.reverse(); for (const row of Mt) row.reverse(); }
      // ---- outline (tinted by the neighbouring colour) + blit
      const ox = f * W, oy = di * H;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const v = out[y][x];
        if (v) { g.fillStyle = v; g.fillRect(ox + x, oy + y, 1, 1); continue; }
        const n = (out[y][x - 1]) || (out[y][x + 1]) || (out[y - 1] && out[y - 1][x]) || (out[y + 1] && out[y + 1][x]);
        if (n) { g.fillStyle = mix(OUT, n, 0.16); g.fillRect(ox + x, oy + y, 1, 1); }
      }
    }
  });
  cache.set(key, c); return c;
}
export const DIR_ROW = { down: 0, up: 1, left: 2, right: 3 };

// ---------------------------------------------------------------- BIOMES & TILES
export const BIOMES = {
  meadow:  { g: '#6cc24f', g2: '#5aae40', path: '#e0c98e', path2: '#c9b077', tall: '#3e9b31', tree: '#2f8a3a', tree2: '#1f6128', trunk: '#6b4a2b', water: '#3f95e6', water2: '#6cb6f2', style: 'round', flower: ['#ff5d73', '#ffd23f', '#ffffff'], sky: ['#8fd3ff', '#e3f6ff'], hill: '#7fd06a', mood: 'town' },
  coast:   { g: '#8fd47a', g2: '#7bc466', path: '#f4e2a8', path2: '#e2cc8a', tall: '#4fb04a', tree: '#3a9a50', tree2: '#25703a', trunk: '#8a6236', water: '#24b0e8', water2: '#7ad8f6', style: 'palm', flower: ['#ff8a5c', '#ffffff', '#ffe066'], sky: ['#6fd0ff', '#f0fbff'], hill: '#5cc0e0', mood: 'bright' },
  forest:  { g: '#4f9a3e', g2: '#438a34', path: '#b8935e', path2: '#a07e4c', tall: '#2f7a28', tree: '#1f6a30', tree2: '#134a20', trunk: '#5a3a20', water: '#3a7fc0', water2: '#5f9fd6', style: 'pine', flower: ['#c080ff', '#ffffff', '#ffb0d0'], sky: ['#9fd8b0', '#e6f6e0'], hill: '#3f8a40', mood: 'mystic' },
  desert:  { g: '#ecc77e', g2: '#ddb36a', path: '#f6dea8', path2: '#e4c78c', tall: '#b88d3a', tree: '#4f9a4a', tree2: '#357a34', trunk: '#8a6236', water: '#3fb0d0', water2: '#7ad0e6', style: 'cactus', flower: ['#ff6a3d', '#ffd23f', '#ff9fd0'], sky: ['#ffd9a0', '#fff4dc'], hill: '#e0a860', mood: 'bright' },
  snow:    { g: '#e8f0fa', g2: '#d4e2f0', path: '#bccbdc', path2: '#a8b9cc', tall: '#9ec4d8', tree: '#2e5f52', tree2: '#1f443a', trunk: '#5a4030', water: '#8fd6f4', water2: '#c6ecfb', style: 'snowpine', flower: ['#80c0ff', '#ffffff', '#c0a0ff'], sky: ['#b8d8f0', '#f6fbff'], hill: '#d0e4f4', mood: 'calm' },
  volcano: { g: '#5c3b33', g2: '#4e312a', path: '#86604c', path2: '#734f3e', tall: '#a8492a', tree: '#3c2a2a', tree2: '#2a1c1c', trunk: '#2a1a14', water: '#ff7a2a', water2: '#ffc040', style: 'dead', flower: ['#ff6a3d', '#ffd23f', '#ff3d3d'], sky: ['#ff8a5c', '#3a1a20'], hill: '#6a3a30', mood: 'route' },
  crystal: { g: '#3d4272', g2: '#353a66', path: '#5c6294', path2: '#4f5584', tall: '#7f62c8', tree: '#8fd8ff', tree2: '#5aa0e0', trunk: '#3a3f6a', water: '#4a6fff', water2: '#8fa8ff', style: 'crystal', flower: ['#ff8bff', '#9ff3ff', '#ffffff'], sky: ['#2a2050', '#6a5ab0'], hill: '#4a4a8a', mood: 'cave' },
  neon:    { g: '#1f2446', g2: '#1a1f3e', path: '#2e3566', path2: '#283060', tall: '#22c6a8', tree: '#3b4176', tree2: '#2a2f5a', trunk: '#4cf0ff', water: '#22d8ff', water2: '#9ff3ff', style: 'tower', flower: ['#ff4fd8', '#4cf0ff', '#ffe14c'], sky: ['#0d1030', '#3a1f6a'], hill: '#2a2f60', mood: 'neon' },
  interior:{ g: '#d8c09a', g2: '#c8ad84', path: '#b84a4a', path2: '#a03c3c', tall: '#3e9b31', tree: '#2f8a3a', tree2: '#1f6128', trunk: '#6b4a2b', water: '#3f95e6', water2: '#6cb6f2', style: 'round', flower: ['#ff5d73'], sky: ['#c8d8f0', '#ffffff'], hill: '#a0b0c0', mood: 'calm' },
};
export const T = { GRASS: 0, PATH: 1, TALL: 2, TREE: 3, WATER: 4, FLOWER: 5, FENCE: 6, SIGN: 7, DOOR: 8, BWALL: 9, ROOF: 10, FLOOR: 11, IWALL: 12, COUNTER: 13, PC: 14, BED: 15, DESK: 16, SHELF: 17, RUG: 18, MAT: 19, TABLE: 20, PLANT: 21, ROCK: 22, BRIDGE: 23, GYMFLOOR: 24, STATUE: 25, BARRIER: 26, STAIRS: 27, CUTTREE: 28, CRACKROCK: 29 };
export const SOLID = new Set([3, 4, 6, 7, 9, 10, 12, 13, 14, 15, 16, 17, 20, 21, 22, 25, 26, 28, 29]);

export function tileAtlas(biomeKey, frame) {
  const key = 'tiles' + biomeKey + frame; if (cache.has(key)) return cache.get(key);
  const B = BIOMES[biomeKey] || BIOMES.meadow; const [c, g] = mk(16 * 30, 16);
  const r = rng(hash(biomeKey));
  const px = (x, y, col, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const ground = (ox) => { px(ox, 0, B.g, 16, 16); for (let i = 0; i < 10; i++) px(ox + r.int(0, 15), r.int(0, 15), B.g2); if (biomeKey === 'neon') { px(ox, 0, '#262c55', 16, 1); px(ox, 0, '#262c55', 1, 16); } };
  for (let code = 0; code < 30; code++) {
    const ox = code * 16;
    switch (code) {
      case T.GRASS: ground(ox); break;
      case T.PATH: px(ox, 0, B.path, 16, 16); for (let i = 0; i < 8; i++) px(ox + r.int(0, 15), r.int(0, 15), B.path2); if (biomeKey === 'neon') { px(ox + 7, 0, '#4cf0ff55', 2, 16); } break;
      case T.TALL: ground(ox); for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const bx = ox + i * 4 + (j ? 2 : 0), by = j * 8 + 2 + (frame && (i + j) % 2 ? 1 : 0); px(bx, by + 2, B.tall, 3, 6); px(bx + 1, by, B.tall, 1, 2); px(bx, by + 2, shade(B.tall, 0.25), 1, 4); px(bx + 2, by + 6, shade(B.tall, -0.35), 1, 2); } break;
      case T.TREE: ground(ox); drawTree(g, ox, B, frame); break;
      case T.WATER: px(ox, 0, B.water, 16, 16); for (let i = 0; i < 3; i++) { const wy = (i * 5 + frame * 2) % 16; px(ox + ((i * 6 + frame * 3) % 12), wy, B.water2, 4, 1); } break;
      case T.FLOWER: ground(ox); for (let i = 0; i < 3; i++) { const fx = ox + 2 + i * 5, fy = 3 + ((i * 7) % 9); const fc = B.flower[i % B.flower.length]; px(fx, fy + 1, fc, 3, 1); px(fx + 1, fy, fc, 1, 3); px(fx + 1, fy + 1, '#fff6a0'); px(fx + 1, fy + 3, shade(B.g, -0.3), 1, 2); } break;
      case T.FENCE: ground(ox); px(ox, 5, '#8a5a32', 16, 2); px(ox, 10, '#8a5a32', 16, 2); px(ox + 2, 3, '#a8703e', 3, 11); px(ox + 11, 3, '#a8703e', 3, 11); px(ox + 2, 13, '#5a3a20', 3, 1); px(ox + 11, 13, '#5a3a20', 3, 1); break;
      case T.SIGN: ground(ox); px(ox + 7, 8, '#5a3a20', 2, 7); px(ox + 2, 2, '#a8703e', 12, 7); px(ox + 2, 2, '#c8905e', 12, 1); px(ox + 4, 4, '#5a3a20', 8, 1); px(ox + 4, 6, '#5a3a20', 6, 1); px(ox + 1, 1, OUT, 14, 1); px(ox + 1, 9, OUT, 14, 1); break;
      case T.DOOR: px(ox, 0, '#4a2e1c', 16, 16); px(ox + 2, 1, '#6a4428', 12, 15); px(ox + 11, 8, '#ffd23f', 2, 2); px(ox + 2, 1, '#86583a', 12, 1); break;
      case T.BWALL: px(ox, 0, '#efe3cf', 16, 16); px(ox, 15, '#cdbfa8', 16, 1); break;
      case T.ROOF: px(ox, 0, '#c04848', 16, 16); break;
      case T.FLOOR: px(ox, 0, '#e0caa0', 16, 16); px(ox, 7, '#ccb488', 16, 1); px(ox, 15, '#ccb488', 16, 1); px(ox + 5, 0, '#ccb488', 1, 7); px(ox + 12, 8, '#ccb488', 1, 7); break;
      case T.IWALL: px(ox, 0, '#8aa0c8', 16, 16); px(ox, 12, '#6a80a8', 16, 4); px(ox, 11, '#5a6f96', 16, 1); for (let i = 0; i < 4; i++) px(ox + i * 4 + 1, 2, '#9cb2d8', 2, 8); break;
      case T.COUNTER: px(ox, 0, '#e0caa0', 16, 16); px(ox, 4, '#b07040', 16, 10); px(ox, 4, '#d09060', 16, 2); px(ox, 13, '#7a4a28', 16, 2); break;
      case T.PC: px(ox, 0, '#e0caa0', 16, 16); px(ox + 2, 1, '#3a3f5a', 12, 10); px(ox + 3, 2, frame ? '#4cf0ff' : '#3ad0e0', 10, 7); px(ox + 4, 3, '#ffffff', 4, 1); px(ox + 4, 5, '#ffffff', 6, 1); px(ox + 5, 11, '#3a3f5a', 6, 3); px(ox + 2, 14, '#2a2f4a', 12, 2); break;
      case T.BED: px(ox, 0, '#e0caa0', 16, 16); px(ox + 1, 0, '#7a4a28', 14, 16); px(ox + 2, 1, '#ffffff', 12, 4); px(ox + 2, 5, '#4a7adf', 12, 10); px(ox + 2, 5, '#6a9aff', 12, 2); break;
      case T.DESK: px(ox, 0, '#e0caa0', 16, 16); px(ox, 6, '#a0683a', 16, 8); px(ox, 6, '#c08858', 16, 2); px(ox + 3, 0, '#2a2f4a', 10, 7); px(ox + 4, 1, frame ? '#ffd23f' : '#ffb03f', 8, 4); px(ox + 1, 14, '#6a4428', 2, 2); px(ox + 13, 14, '#6a4428', 2, 2); break;
      case T.SHELF: px(ox, 0, '#7a4a28', 16, 16); for (let i = 0; i < 3; i++) { px(ox + 1, 1 + i * 5, '#5a3418', 14, 4); for (let j = 0; j < 6; j++) px(ox + 2 + j * 2, 1 + i * 5, ['#d04040', '#3070d0', '#30a050', '#e0a020', '#8040c0', '#f0f0f0'][(j + i * 2) % 6], 2, 4); } break;
      case T.RUG: px(ox, 0, '#b84a4a', 16, 16); px(ox + 2, 2, '#d86a5a', 12, 12); px(ox + 4, 4, '#b84a4a', 8, 8); break;
      case T.MAT: px(ox, 0, '#e0caa0', 16, 16); px(ox + 1, 4, '#5a8a4a', 14, 10); px(ox + 2, 5, '#7aaa6a', 12, 8); break;
      case T.TABLE: px(ox, 0, '#e0caa0', 16, 16); px(ox + 1, 2, '#a0683a', 14, 10); px(ox + 1, 2, '#c08858', 14, 2); px(ox + 2, 12, '#6a4428', 2, 4); px(ox + 12, 12, '#6a4428', 2, 4); break;
      case T.PLANT: px(ox, 0, '#e0caa0', 16, 16); px(ox + 4, 10, '#c06030', 8, 6); px(ox + 3, 2, '#3e9b31', 10, 9); px(ox + 5, 0, '#5ab84a', 6, 4); break;
      case T.ROCK: ground(ox); px(ox + 2, 5, '#8a8a96', 12, 9); px(ox + 3, 4, '#a0a0aa', 10, 3); px(ox + 4, 5, '#c0c0ca', 4, 2); px(ox + 2, 13, '#5a5a66', 12, 2); break;
      case T.GYMFLOOR: px(ox, 0, '#3a3f5a', 16, 16); px(ox, 0, '#4a5070', 8, 8); px(ox + 8, 8, '#4a5070', 8, 8); break;
      case T.STATUE: px(ox, 0, '#3a3f5a', 16, 16); px(ox + 3, 11, '#8a8a96', 10, 5); px(ox + 5, 2, '#b0b0bc', 6, 9); px(ox + 6, 0, '#d0d0da', 4, 4); px(ox + 6, 4, '#ffd23f', 4, 2); break;
      case T.BARRIER: px(ox, 0, '#3a3f5a', 16, 16); px(ox, 0, frame ? '#ff4fd880' : '#ff4fd850', 16, 16); px(ox, 7, '#ff9ff0', 16, 2); break;
      case T.CUTTREE: ground(ox); px(ox + 7, 10, B.trunk, 2, 5); px(ox + 3, 2, shade(B.tree, 0.15), 10, 9); px(ox + 5, 0, shade(B.tree, 0.15), 6, 3); px(ox + 4, 3, shade(B.tree, 0.35), 3, 2); px(ox + 9, 6, B.tree2, 4, 4); px(ox + 2, 5, B.tree, 1, 4); px(ox + 13, 5, B.tree2, 1, 4); px(ox + 6, 14, '#00000033', 5, 2); px(ox + 4, 8, '#ffffff55', 1, 1); px(ox + 11, 3, '#ffffff55', 1, 1); break;
      case T.CRACKROCK: ground(ox); px(ox + 1, 3, '#6a6a76', 14, 12); px(ox + 2, 2, '#8a8a96', 12, 4); px(ox + 3, 1, '#a0a0ac', 9, 3); px(ox + 4, 2, '#c4c4ce', 4, 2); px(ox + 1, 13, '#4a4a56', 14, 2); px(ox + 7, 3, '#2a2a36', 1, 4); px(ox + 6, 7, '#2a2a36', 1, 3); px(ox + 8, 7, '#2a2a36', 2, 1); px(ox + 9, 8, '#2a2a36', 1, 4); px(ox + 4, 9, '#2a2a36', 2, 1); break;
      case T.BRIDGE: px(ox, 0, B.water || '#3a7ac8', 16, 16); px(ox, 1, '#6a4428', 16, 14); for (let i = 0; i < 4; i++) px(ox, 1 + i * 4, i % 2 ? '#9a6a3a' : '#b07a48', 16, 3); px(ox, 1, '#4a2e1c', 1, 14); px(ox + 15, 1, '#4a2e1c', 1, 14); break;
      case T.STAIRS: px(ox, 0, '#e0caa0', 16, 16); for (let i = 0; i < 4; i++) px(ox + 1, i * 4, i % 2 ? '#8a6a4a' : '#aa8a6a', 14, 4); break;
    }
  }
  cache.set(key, c); return c;
}
function drawTree(g, ox, B, frame) {
  const px = (x, y, col, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(ox + x, y, w, h); };
  switch (B.style) {
    case 'pine': case 'snowpine':
      px(7, 12, B.trunk, 2, 4); for (let i = 0; i < 4; i++) px(7 - i * 1.5 - 1, 1 + i * 3, B.tree, 2 + i * 3 + 2, 3); px(6, 0, B.tree, 4, 2);
      for (let i = 0; i < 4; i++) px(8, 2 + i * 3, B.tree2, 3 + i, 2);
      if (B.style === 'snowpine') { px(6, 0, '#ffffff', 4, 1); px(4, 4, '#ffffff', 3, 1); px(3, 7, '#ffffff', 3, 1); px(2, 10, '#ffffff', 4, 1); }
      break;
    case 'palm': px(7, 6, B.trunk, 2, 10); px(8, 6, shade(B.trunk, -0.2), 1, 10); px(1, 3, B.tree, 14, 3); px(3, 1, B.tree, 10, 3); px(0, 5, B.tree2, 4, 3); px(12, 5, B.tree2, 4, 3); px(6, 5, '#7a4a20', 4, 2); break;
    case 'cactus': px(6, 2, B.tree, 4, 14); px(2, 6, B.tree, 3, 4); px(2, 4, B.tree, 2, 3); px(11, 7, B.tree, 3, 4); px(12, 5, B.tree, 2, 3); px(6, 2, shade(B.tree, 0.25), 1, 14); px(9, 2, B.tree2, 1, 14); break;
    case 'dead': px(7, 4, B.trunk, 2, 12); px(3, 3, B.trunk, 5, 1); px(3, 1, B.trunk, 1, 3); px(9, 6, B.trunk, 5, 1); px(13, 4, B.trunk, 1, 3); px(6, 15, '#ff7a2a', 4, 1); break;
    case 'crystal': for (const [x, w, h] of [[2, 4, 10], [6, 4, 15], [11, 3, 8]]) { px(x, 16 - h, B.tree, w, h); px(x, 16 - h, '#ffffff', 1, h); px(x + w - 1, 16 - h, B.tree2, 1, h); } break;
    case 'tower': px(2, 0, B.tree, 12, 16); px(2, 0, shade(B.tree, 0.2), 12, 1); for (let i = 0; i < 5; i++) { px(4, 2 + i * 3, (i + frame) % 2 ? '#4cf0ff' : '#ff4fd8', 2, 1); px(9, 2 + i * 3, (i + frame) % 3 ? '#3ddc84' : '#2a2f5a', 3, 1); } break;
    default: px(6, 11, B.trunk, 4, 5); px(1, 2, B.tree, 14, 10); px(3, 0, B.tree, 10, 3); px(2, 2, shade(B.tree, 0.18), 6, 3); px(8, 7, B.tree2, 7, 5); px(0, 5, B.tree, 1, 5); px(15, 5, B.tree2, 1, 5); px(1, 12, B.tree2, 14, 1);
  }
}

// ---------------------------------------------------------------- BUILDINGS
export const ROOF = { mend: '#2fb8a8', depot: '#4a7adf', lab: '#f0a030', house: '#c85a48', home: '#d8784a', prof: '#8a90a8', summit: '#6a4ad0' };
export function drawBuilding(g, b, x, y, gymColor) {
  const w = b.w * 16, h = b.h * 16; const roofH = (b.h - 2) * 16;
  const rc = b.kind === 'gym' ? gymColor : ROOF[b.kind] || '#c85a48';
  g.fillStyle = OUT; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  // roof with shingles
  g.fillStyle = rc; g.fillRect(x, y, w, roofH);
  for (let j = 0; j < roofH; j += 4) { g.fillStyle = shade(rc, j % 8 ? -0.12 : 0.05); g.fillRect(x, y + j, w, 2); }
  g.fillStyle = shade(rc, 0.35); g.fillRect(x, y, w, 2); g.fillStyle = shade(rc, -0.45); g.fillRect(x, y + roofH - 2, w, 2);
  // walls
  g.fillStyle = b.kind === 'gym' ? '#d8d4e8' : '#efe3cf'; g.fillRect(x, y + roofH, w, 32);
  g.fillStyle = '#cdbfa8'; g.fillRect(x, y + roofH + 30, w, 2);
  // windows
  for (let i = 0; i < b.w; i++) {
    const wx = x + i * 16; if (i === Math.floor(b.w / 2)) continue;
    g.fillStyle = '#3a4a6a'; g.fillRect(wx + 3, y + roofH + 7, 10, 9); g.fillStyle = '#8fd3ff'; g.fillRect(wx + 4, y + roofH + 8, 8, 7); g.fillStyle = '#d8f2ff'; g.fillRect(wx + 4, y + roofH + 8, 3, 2);
  }
  // door
  const dx = x + Math.floor(b.w / 2) * 16; g.fillStyle = '#4a2e1c'; g.fillRect(dx + 1, y + roofH + 6, 14, 26); g.fillStyle = b.kind === 'mend' || b.kind === 'depot' ? '#8fd3ff' : '#6a4428'; g.fillRect(dx + 3, y + roofH + 8, 10, 24); g.fillStyle = '#ffd23f'; g.fillRect(dx + 11, y + roofH + 19, 2, 2);
  // emblem on roof
  const em = { mend: '+', depot: '$', gym: '★', lab: '?', prof: 'P', summit: '▲' }[b.kind];
  if (em) {
    const cx = x + w / 2, cy = y + roofH / 2;
    g.fillStyle = '#ffffff'; g.fillRect(cx - 8, cy - 7, 16, 14); g.fillStyle = OUT; g.fillRect(cx - 8, cy - 7, 16, 1); g.fillRect(cx - 8, cy + 6, 16, 1);
    g.fillStyle = rc; g.font = '8px "Press Start 2P"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(em, cx + 0.5, cy + 1);
  }
}

// ---------------------------------------------------------------- OBJECTS & ICONS
export function drawObject(g, kind, x, y, t) {
  const px = (a, b, col, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(x + a, y + b, w, h); };
  if (kind === 'item' || kind === 'cache') { const bob = Math.round(Math.sin(t * 4) * 1); px(4, 4 + bob, OUT, 8, 9); px(5, 3 + bob, OUT, 6, 11); px(5, 4 + bob, '#ffd23f', 6, 9); px(6, 5 + bob, '#fff6b0', 2, 3); px(5, 9 + bob, '#e09020', 6, 3); px(4, 14, '#00000033', 8, 2); }
  if (kind === 'note') { px(3, 4, OUT, 10, 10); px(4, 5, '#fff8e8', 8, 8); for (let i = 0; i < 3; i++) px(5, 7 + i * 2, '#a08060', 6, 1); px(10, 4, '#d04040', 2, 4); }
  if (kind === 'chrono') { const c = `hsl(${(t * 80) % 360},90%,65%)`; px(1, -6, OUT, 14, 21); px(2, -5, '#8a8478', 12, 20); px(4, -3, OUT, 8, 16); px(5, -2, '#120a28', 6, 14); for (let i = 0; i < 5; i++) { const a = t * 3 + i * 1.26; px(7 + Math.round(Math.cos(a) * 2), 5 + Math.round(Math.sin(a) * 5), i % 2 ? c : '#ffffff', 1, 1); } px(2, -5, '#b0a898', 12, 1); px(6, -5, c, 4, 1); px(2, 14, '#5a5448', 12, 1); }
  if (kind === 'rift' || kind === 'riftdue') { const due = kind === 'riftdue'; const sp = due ? 4 : 1.5; const c1 = due ? '#b37bff' : '#7a6aa0', c2 = due ? '#ffffff' : '#c8c0e0';
    g.globalAlpha = due ? 0.35 + Math.sin(t * 4) * 0.15 : 0.18; px(2, -4, c1, 12, 20); px(0, 0, c1, 16, 12); g.globalAlpha = 1;
    for (let yy = -3; yy < 16; yy++) { const w2 = Math.max(1, Math.round((1 - Math.abs(yy - 6) / 10) * 4 + Math.sin(t * sp + yy * 0.7) * 1.2)); px(8 - w2, yy, OUT, w2 * 2, 1); px(8 - w2 + 1, yy, c1, Math.max(1, w2 * 2 - 2), 1); }
    px(7, 0 + Math.round(Math.sin(t * sp) * 3) + 3, c2, 2, 3);
    for (let i = 0; i < (due ? 6 : 2); i++) { const a = t * sp * 0.6 + i * 1.05; px(8 + Math.round(Math.cos(a) * 7), 6 + Math.round(Math.sin(a) * 9), c2, 1, 1); } }
  if (kind === 'ride_wheel') { const cx = x + 8, cy = y - 22, R2 = 30; g.fillStyle = '#5a4a6a'; g.fillRect(cx - 14, cy, 3, 34); g.fillRect(cx + 11, cy, 3, 34); g.fillRect(cx - 18, y + 12, 36, 3);
    g.strokeStyle = '#d8d0ff'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R2, 0, 7); g.stroke(); g.lineWidth = 1;
    for (let i = 0; i < 8; i++) { const a = t * 0.4 + (i * Math.PI) / 4; const ex = cx + Math.cos(a) * R2, ey = cy + Math.sin(a) * R2; g.strokeStyle = '#a098c8'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(ex, ey); g.stroke(); g.fillStyle = OUT; g.fillRect(ex - 4, ey - 1, 8, 7); g.fillStyle = ['#ff4fd8', '#4cf0ff', '#ffd23f', '#5fd068'][i % 4]; g.fillRect(ex - 3, ey, 6, 5); }
    g.fillStyle = '#ffd23f'; g.fillRect(cx - 2, cy - 2, 4, 4); }
  if (kind === 'ride_coaster') { const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([x + 8 + Math.cos(u * 6.283) * 34, y - 6 + Math.sin(u * 12.566) * 10 - Math.sin(u * 6.283) * 16]); }
    g.strokeStyle = '#3a2a4a'; g.lineWidth = 1; for (const [a, b] of pts.filter((_, i) => i % 4 === 0)) { g.beginPath(); g.moveTo(a, b); g.lineTo(a, y + 14); g.stroke(); }
    g.strokeStyle = '#ff5d73'; g.lineWidth = 3; g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.stroke(); g.lineWidth = 1;
    for (let c = 0; c < 3; c++) { const u = ((t * 0.25 + c * 0.03) % 1); const a = x + 8 + Math.cos(u * 6.283) * 34, b = y - 6 + Math.sin(u * 12.566) * 10 - Math.sin(u * 6.283) * 16; g.fillStyle = OUT; g.fillRect(a - 4, b - 5, 8, 6); g.fillStyle = ['#4cf0ff', '#ffd23f', '#5fd068'][c]; g.fillRect(a - 3, b - 4, 6, 4); } }
  if (kind === 'ride_carousel') { const cx = x + 8, cy = y - 4; g.fillStyle = OUT; g.beginPath(); g.moveTo(cx - 26, cy - 10); g.lineTo(cx, cy - 30); g.lineTo(cx + 26, cy - 10); g.fill(); for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#ff4fd8' : '#ffffff'; g.beginPath(); g.moveTo(cx, cy - 28); g.lineTo(cx - 24 + i * 8, cy - 11); g.lineTo(cx - 16 + i * 8, cy - 11); g.fill(); }
    g.fillStyle = '#ffd23f'; g.fillRect(cx - 26, cy - 11, 52, 3); g.fillStyle = '#b36bff'; g.fillRect(cx - 24, cy + 12, 48, 5);
    for (let i = 0; i < 5; i++) { const a = t * 1.2 + (i * Math.PI * 2) / 5; const hx = cx + Math.cos(a) * 18; if (Math.sin(a) < -0.2) continue; const hy = cy + Math.sin(t * 3 + i) * 2; g.fillStyle = '#c8c8d8'; g.fillRect(hx, cy - 8, 1, 20); g.fillStyle = OUT; g.fillRect(hx - 5, hy, 10, 6); g.fillStyle = ['#ffffff', '#ffd23f', '#4cf0ff', '#ff7ab8', '#5fd068'][i]; g.fillRect(hx - 4, hy + 1, 8, 4); g.fillRect(hx + 3, hy - 2, 3, 3); } }
  if (kind === 'ride_tent') { const cx = x + 8, by = y + 14; g.fillStyle = OUT; g.beginPath(); g.moveTo(cx - 30, by); g.lineTo(cx, by - 46); g.lineTo(cx + 30, by); g.fill(); for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#d04040' : '#f4ecd8'; g.beginPath(); g.moveTo(cx, by - 44); g.lineTo(cx - 28 + i * 9.3, by - 1); g.lineTo(cx - 28 + (i + 1) * 9.3, by - 1); g.fill(); }
    g.fillStyle = '#2a1a2a'; g.fillRect(cx - 5, by - 14, 10, 14); g.fillStyle = '#ffd23f'; g.fillRect(cx - 1, by - 54, 2, 10); g.fillStyle = `hsl(${(t * 90) % 360},90%,60%)`; g.fillRect(cx + 1, by - 54, 8, 5); }
  if (kind === 'secretdoor') { const glint = (Math.sin(t * 2.2 + x) + 1) / 2; px(2, -4, '#1b2a1b', 12, 20); px(4, 2, '#0a0f0a', 8, 14); px(5, 4, '#050805', 6, 12); if (glint > 0.85) { px(7, 6, '#ffffffcc', 2, 2); px(6, 7, '#ffffff88', 4, 1); } }
  if (kind === 'lessons') { px(0, -4, OUT, 16, 15); px(1, -3, '#8a5a30', 14, 13); px(2, -2, '#1f4a32', 12, 10); for (let i = 0; i < 4; i++) px(3, i * 2, '#e8f0e0', 3 + ((i * 5) % 7), 1); px(3, 12, OUT, 2, 4); px(11, 12, OUT, 2, 4); }
  if (kind === 'cabinet') { const c = `hsl(${(t * 60 + x * 7) % 360},85%,60%)`; px(2, -6, OUT, 12, 22); px(3, -5, '#2a2050', 10, 20); px(3, -5, c, 10, 2); px(4, -1, OUT, 8, 6); px(5, 0, '#102030', 6, 4); px(5 + (Math.floor(t * 4) % 5), 1 + (Math.floor(t * 3) % 3), c, 1, 1); px(4, 7, '#504080', 8, 3); px(5, 8, '#ff4040', 1, 1); px(8, 8, '#40ff80', 1, 1); px(10, 8, '#ffd040', 1, 1); }
  if (kind === 'starter') { px(3, 5, OUT, 10, 9); px(4, 6, '#f0f0f8', 8, 7); px(4, 6, '#4cf0ff', 8, 3); px(7, 8, OUT, 2, 2); }
}
const iconCache = {};
export function itemIcon(id) {
  if (iconCache[id]) return iconCache[id];
  const [c, g] = mk(16, 16); const px = (a, b, col, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(a, b, w, h); };
  const cubes = { cube: '#4cf0ff', cube2: '#ff4fd8', cube3: '#ffd23f' };
  if (cubes[id]) { px(3, 3, OUT, 10, 10); px(4, 4, cubes[id], 8, 8); px(4, 4, '#ffffff', 3, 2); px(7, 7, OUT, 2, 2); px(4, 8, shade(cubes[id], -0.35), 8, 4); }
  else if (id.includes('tonic')) { const col = id === 'tonic' ? '#3ddc84' : id === 'supertonic' ? '#4aa8ff' : '#b36bff'; px(6, 1, OUT, 4, 3); px(4, 4, OUT, 8, 11); px(5, 5, col, 6, 9); px(5, 5, '#ffffff99', 2, 5); px(7, 2, '#d0d0d0', 2, 2); }
  else if (id === 'revive') { px(7, 1, '#ffd23f', 2, 14); px(1, 7, '#ffd23f', 14, 2); px(4, 4, '#fff6b0', 8, 8); px(6, 6, '#ffffff', 4, 4); }
  else if (id.startsWith('tm_')) { const col = TYPES[id.slice(3)]?.color || '#ccc'; px(2, 2, OUT, 12, 12); px(3, 1, OUT, 10, 14); px(3, 3, col, 10, 10); px(4, 2, col, 8, 12); px(6, 6, '#14101c', 4, 4); px(7, 7, '#ffffff', 2, 2); px(4, 3, '#ffffffaa', 3, 2); }
  else if (id === 'shard') { px(6, 1, OUT, 4, 14); px(4, 4, OUT, 8, 8); px(7, 2, '#9ff3ff', 2, 12); px(5, 5, '#4cf0ff', 6, 6); px(6, 5, '#ffffff', 1, 3); }
  else { px(3, 3, '#ccc', 10, 10); }
  iconCache[id] = c.toDataURL(); return iconCache[id];
}
export function monsterDataURL(sp, back = false) { const c = monsterCanvas(sp, back); return c.toDataURL(); }
