// Richer overworld rendering: baked map layers with blended path edges, varied grass, tall shaded trees,
// building shadows, water shorelines, and a real-time day/night lighting pass.
import { rng, hash, shade, hexToRgb } from './rng.js';
import { BIOMES, T, tileAtlas, drawBuilding } from './sprites.js';

const TS = 16;
const cache = new Map();
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; };
export const ANIMATED = new Set([T.WATER, T.TALL, T.FLOWER, T.PC, T.DESK, T.BARRIER]);
const PATHISH = new Set([T.PATH, T.DOOR, T.MAT, T.BWALL, T.SIGN]);
const OUT = '#14101c';

// ---------------------------------------------------------------- pixel painter with automatic outline + shading
function painter(w, h) {
  const px = new Array(w * h).fill(null);
  const api = {
    set(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h) px[y * w + x] = c; },
    get(x, y) { return x < 0 || y < 0 || x >= w || y >= h ? null : px[y * w + x]; },
    ell(cx, cy, rx, ry, c, shadeIt) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, d = nx * nx + ny * ny; if (d > 1) continue; let col = c; if (shadeIt) { if (nx + ny < -0.75) col = shade(c, 0.22); else if (nx + ny > 0.55) col = shade(c, -0.28); } api.set(x, y, col); } },
    rect(x, y, rw, rh, c) { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) api.set(x + i, y + j, c); },
    tri(x1, y1, x2, y2, x3, y3, c) { const minY = Math.floor(Math.min(y1, y2, y3)), maxY = Math.ceil(Math.max(y1, y2, y3)); for (let y = minY; y <= maxY; y++) for (let x = Math.floor(Math.min(x1, x2, x3)); x <= Math.ceil(Math.max(x1, x2, x3)); x++) { const s = (ax, ay, bx, by) => (x + 0.5 - bx) * (ay - by) - (ax - bx) * (y + 0.5 - by); const d1 = s(x1, y1, x2, y2), d2 = s(x2, y2, x3, y3), d3 = s(x3, y3, x1, y1); if ((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)) continue; api.set(x, y, c); } },
    toCanvas(outline = true) {
      const [c, g] = mk(w, h); const img = g.createImageData(w, h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let col = px[y * w + x];
        if (!col && outline && (api.get(x - 1, y) || api.get(x + 1, y) || api.get(x, y - 1) || api.get(x, y + 1))) col = OUT;
        if (!col) continue; const [r, gg, b] = hexToRgb(col.slice(0, 7)); const i = (y * w + x) * 4; img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = col.length > 7 ? parseInt(col.slice(7, 9), 16) : 255;
      }
      g.putImageData(img, 0, 0); return c;
    },
  };
  return api;
}

// ---------------------------------------------------------------- tall trees (22×32, drawn so the trunk sits in its tile)
export function tallTree(biomeKey, variant, frame = 0) {
  const key = 'tree' + biomeKey + variant + (biomeKey === 'neon' ? frame : 0); if (cache.has(key)) return cache.get(key);
  const B = BIOMES[biomeKey] || BIOMES.meadow; const r = rng(hash(key)); const P = painter(22, 32);
  const leaf = variant % 2 ? shade(B.tree, 0.08) : B.tree, dark = B.tree2, trunk = B.trunk;
  switch (B.style) {
    case 'pine': case 'snowpine':
      P.rect(10, 24, 3, 7, trunk); P.rect(12, 24, 1, 7, shade(trunk, -0.3));
      for (let k = 0; k < 4; k++) { const top = 1 + k * 5, wd = 4 + k * 3; P.tri(11, top, 11 - wd, top + 9, 11 + wd, top + 9, leaf); P.tri(11, top + 2, 11, top + 9, 11 + wd, top + 9, dark); }
      if (B.style === 'snowpine') for (let k = 0; k < 4; k++) { const top = 1 + k * 5, wd = 4 + k * 3; for (let x = -wd + 1; x <= 0; x++) P.set(11 + x, top + 9 - Math.round(((x + wd) / wd) * 4) + 4, '#ffffff'); P.set(11, top, '#ffffff'); P.set(10, top + 1, '#ffffff'); }
      break;
    case 'palm':
      for (let y = 10; y < 31; y++) { const x = 11 + Math.round(Math.sin(y / 6) * 2); P.rect(x, y, 3, 1, y % 3 ? trunk : shade(trunk, -0.3)); }
      for (const [dx, dy] of [[-9, 4], [9, 4], [-7, -2], [7, -2], [0, -5]]) { P.ell(11 + dx * 0.55, 9 + dy * 0.5, Math.abs(dx) ? 6 : 3, 2.5, leaf, true); P.ell(11 + dx, 9 + dy + 2, 3, 2, dark); }
      P.ell(11, 10, 2.5, 2, '#7a4a20');
      break;
    case 'cactus':
      P.rect(8, 6, 6, 25, leaf); P.rect(8, 6, 1, 25, shade(leaf, 0.25)); P.rect(13, 6, 1, 25, dark); P.ell(11, 6, 3, 3, leaf);
      P.rect(2, 13, 4, 8, leaf); P.rect(2, 20, 7, 3, leaf); P.ell(4, 13, 2, 2, leaf); P.rect(16, 10, 4, 9, leaf); P.rect(13, 17, 7, 3, leaf); P.ell(18, 10, 2, 2, leaf);
      for (let y = 8; y < 30; y += 3) P.set(10, y, shade(leaf, 0.4)); if (variant % 2) { P.set(11, 3, '#ff6a9d'); P.set(10, 3, '#ff6a9d'); }
      break;
    case 'dead':
      P.rect(10, 8, 3, 23, trunk); P.rect(12, 8, 1, 23, shade(trunk, -0.4));
      P.tri(11, 14, 3, 6, 5, 5, trunk); P.tri(11, 11, 19, 3, 20, 5, trunk); P.rect(4, 3, 2, 4, trunk); P.rect(17, 1, 2, 4, trunk); P.set(11, 30, '#ff7a2a'); P.set(9, 30, '#ff7a2a');
      break;
    case 'crystal':
      for (const [x, wd, hg, c] of [[5, 5, 18, '#7ab8f0'], [10, 6, 28, B.tree], [16, 4, 14, '#b48cff']]) { P.tri(x + wd / 2, 31 - hg, x, 31 - hg + 4, x + wd, 31 - hg + 4, shade(c, 0.3)); P.rect(x, 31 - hg + 4, wd, hg - 4, c); P.rect(x, 31 - hg + 4, 1, hg - 4, '#ffffff'); P.rect(x + wd - 1, 31 - hg + 4, 1, hg - 4, shade(c, -0.35)); }
      break;
    case 'tower':
      P.rect(3, 2, 16, 29, '#2c3266'); P.rect(3, 2, 16, 1, '#4a52a0'); P.rect(18, 2, 1, 29, '#1a1f44');
      for (let k = 0; k < 8; k++) { const y = 5 + k * 3; P.rect(5, y, 12, 2, '#1d2246'); P.set(6, y, (k + frame) % 2 ? '#4cf0ff' : '#ff4fd8'); P.set(8, y, (k + frame) % 3 ? '#3ddc84' : '#1d2246'); P.set(14, y, (k * 7 + frame) % 4 ? '#ffe14c' : '#1d2246'); }
      break;
    default: // broad-leaf tree with layered, lit canopy
      P.rect(9, 21, 5, 10, trunk); P.rect(12, 21, 2, 10, shade(trunk, -0.3)); P.set(8, 30, trunk); P.set(14, 30, trunk);
      P.ell(11, 13, 10, 9, dark); P.ell(10, 11, 9, 8, leaf, true); P.ell(6, 14, 5, 4.5, leaf, true); P.ell(15, 14, 5.5, 4.5, shade(leaf, -0.08), true); P.ell(9, 7, 6, 4.5, shade(leaf, 0.12), true);
      for (let i = 0; i < 16; i++) { const x = r.int(3, 18), y = r.int(4, 19); if (P.get(x, y)) P.set(x, y, r() < 0.5 ? shade(leaf, 0.3) : shade(leaf, -0.3)); }
      if (variant === 3 && biomeKey !== 'snow') for (let i = 0; i < 5; i++) { const x = r.int(4, 17), y = r.int(5, 17); if (P.get(x, y)) P.set(x, y, '#ff6a6a'); }
  }
  const c = P.toCanvas(true); cache.set(key, c); return c;
}

// ---------------------------------------------------------------- grass variants for less repetition
function grassTiles(biomeKey) {
  const key = 'grass' + biomeKey; if (cache.has(key)) return cache.get(key);
  const B = BIOMES[biomeKey] || BIOMES.meadow; const [c, g] = mk(TS * 4, TS); const r = rng(hash(key));
  for (let v = 0; v < 4; v++) {
    const ox = v * TS; g.fillStyle = B.g; g.fillRect(ox, 0, TS, TS);
    for (let i = 0; i < 14; i++) { g.fillStyle = B.g2; g.fillRect(ox + r.int(0, 15), r.int(0, 15), 1, 1); }
    if (biomeKey === 'neon') { g.fillStyle = '#262c55'; g.fillRect(ox, 0, TS, 1); g.fillRect(ox, 0, 1, TS); }
    if (v === 1) for (let i = 0; i < 3; i++) { const x = ox + r.int(1, 13), y = r.int(3, 13); g.fillStyle = shade(B.g, -0.22); g.fillRect(x, y, 1, 2); g.fillRect(x + 2, y - 1, 1, 3); g.fillStyle = shade(B.g, 0.18); g.fillRect(x + 1, y, 1, 2); }
    if (v === 2) { g.fillStyle = shade(B.g, 0.07); g.fillRect(ox + r.int(2, 6), r.int(2, 6), 7, 5); g.fillRect(ox + r.int(3, 7), r.int(3, 7), 5, 6); }
    if (v === 3) { g.fillStyle = shade(B.path, -0.1); g.fillRect(ox + r.int(2, 12), r.int(2, 12), 2, 1); g.fillStyle = B.flower[0]; if (r() < 0.6) g.fillRect(ox + r.int(2, 13), r.int(2, 13), 1, 1); }
  }
  cache.set(key, c); return c;
}

// ---------------------------------------------------------------- bake the static layer of a map
export function bakeMap(m, biomeKey, interior, gymCol) {
  const W = m.w * TS, H = m.h * TS; const [c, g] = mk(W, H);
  const B = BIOMES[biomeKey] || BIOMES.meadow; const atlas = tileAtlas(interior ? 'interior' : biomeKey, 0); const grass = grassTiles(biomeKey);
  const at = (x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h ? -1 : m.t[y * m.w + x]);
  const ground = (x, y) => g.drawImage(grass, (hash(x * 73856093 ^ y * 19349663) % 4) * TS, 0, TS, TS, x * TS, y * TS, TS, TS);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const t = at(x, y);
    if (!interior && (t === T.GRASS || t === T.BWALL || t === T.DOOR || t === T.TREE || ANIMATED.has(t))) ground(x, y);
    else if (t === T.TREE || t === T.BWALL || t === T.DOOR) g.drawImage(atlas, T.GRASS * TS, 0, TS, TS, x * TS, y * TS, TS, TS);
    else g.drawImage(atlas, t * TS, 0, TS, TS, x * TS, y * TS, TS, TS);
  }
  if (!interior) {
    // soft path edges: darker rim on the path, grass tufts creeping over it, rounded outer corners
    const edgeDark = shade(B.path, -0.22), tuft = B.g, tuft2 = B.g2;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (at(x, y) !== T.PATH) continue; const X = x * TS, Y = y * TS; const h = (k) => hash(x * 31 + y * 977 + k) % 7;
      const open = (dx, dy) => { const n = at(x + dx, y + dy); return n !== -1 && !PATHISH.has(n); };
      const N = open(0, -1), S = open(0, 1), Wd = open(-1, 0), E = open(1, 0);
      g.fillStyle = edgeDark;
      if (N) g.fillRect(X, Y + 1, TS, 1); if (S) g.fillRect(X, Y + TS - 2, TS, 1); if (Wd) g.fillRect(X + 1, Y, 1, TS); if (E) g.fillRect(X + TS - 2, Y, 1, TS);
      for (let i = 0; i < TS; i++) {
        if (N && h(i) < 3) { g.fillStyle = h(i + 50) < 2 ? tuft2 : tuft; g.fillRect(X + i, Y, 1, 1 + (h(i + 9) < 2 ? 1 : 0)); }
        if (S && h(i + 20) < 3) { g.fillStyle = tuft; g.fillRect(X + i, Y + TS - 1 - (h(i + 29) < 2 ? 1 : 0), 1, 2); }
        if (Wd && h(i + 40) < 3) { g.fillStyle = tuft; g.fillRect(X, Y + i, 1 + (h(i + 49) < 2 ? 1 : 0), 1); }
        if (E && h(i + 60) < 3) { g.fillStyle = tuft2; g.fillRect(X + TS - 1 - (h(i + 69) < 2 ? 1 : 0), Y + i, 2, 1); }
      }
      g.fillStyle = tuft;
      if (N && Wd) g.fillRect(X, Y, 3, 2), g.fillRect(X, Y, 2, 3); if (N && E) g.fillRect(X + TS - 3, Y, 3, 2), g.fillRect(X + TS - 2, Y, 2, 3);
      if (S && Wd) g.fillRect(X, Y + TS - 2, 3, 2), g.fillRect(X, Y + TS - 3, 2, 3); if (S && E) g.fillRect(X + TS - 3, Y + TS - 2, 3, 2), g.fillRect(X + TS - 2, Y + TS - 3, 2, 3);
      if (h(99) === 0) { g.fillStyle = shade(B.path, -0.3); g.fillRect(X + 4 + h(3), Y + 5 + h(4), 2, 1); }
    }
    // ground shadows under trees, rocks, signs and fences (light comes from the top-left)
    g.fillStyle = 'rgba(0,0,0,0.22)';
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const t = at(x, y); const X = x * TS, Y = y * TS;
      if (t === T.TREE) { g.fillRect(X + 3, Y + 12, 13, 3); g.fillRect(X + 5, Y + 11, 10, 5); }
      if (t === T.ROCK || t === T.CRACKROCK || t === T.SIGN || t === T.CUTTREE) g.fillRect(X + 4, Y + 14, 11, 2);
    }
    // building drop shadows
    for (const b of m.buildings) { const X = b.x * TS, Y = b.y * TS, w = b.w * TS, h = b.h * TS; g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(X + 5, Y + h, w, 5); g.fillRect(X + w, Y + 6, 5, h); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(X + 9, Y + h + 5, w - 4, 3); }
  }
  for (const b of m.buildings) drawBuilding(g, b, b.x * TS, b.y * TS, gymCol);
  // water shoreline info for the animated pass
  const shore = [];
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (at(x, y) === T.WATER) { const s = [at(x, y - 1), at(x + 1, y), at(x, y + 1), at(x - 1, y)].map((n) => n !== -1 && n !== T.WATER); if (s.some(Boolean)) shore.push([x, y, s]); }
  m._shore = shore;
  return c;
}

// ---------------------------------------------------------------- animated overlays drawn every frame
export function drawShore(g, m, cx, cy, t, B) {
  const foam = 'rgba(255,255,255,0.55)', wave = Math.floor(t * 3) % 2;
  for (const [x, y, s] of m._shore || []) {
    const X = x * TS - cx, Y = y * TS - cy; if (X < -16 || Y < -16 || X > 2000 || Y > 2000) continue;
    g.fillStyle = shade(B.water, -0.25);
    if (s[0]) g.fillRect(X, Y, TS, 1); if (s[1]) g.fillRect(X + TS - 1, Y, 1, TS); if (s[2]) g.fillRect(X, Y + TS - 1, TS, 1); if (s[3]) g.fillRect(X, Y, 1, TS);
    g.fillStyle = foam;
    if (s[0]) for (let i = wave; i < TS; i += 3) g.fillRect(X + i, Y + 1, 2, 1);
    if (s[2]) for (let i = 1 - wave; i < TS; i += 3) g.fillRect(X + i, Y + TS - 2, 2, 1);
    if (s[3]) for (let i = wave; i < TS; i += 3) g.fillRect(X + 1, Y + i, 1, 2);
    if (s[1]) for (let i = 1 - wave; i < TS; i += 3) g.fillRect(X + TS - 2, Y + i, 1, 2);
  }
}

// ---------------------------------------------------------------- time of day
export function dayPhase(date = new Date()) {
  const h = globalThis.HAKMA_HOUR ?? date.getHours() + date.getMinutes() / 60; // HAKMA_HOUR lets you preview a time of day from the console
  const ramp = (a, b, x) => Math.max(0, Math.min(1, (x - a) / (b - a)));
  if (h >= 7 && h < 17) return { dark: 0, tint: null, name: 'day' };
  if (h >= 17 && h < 19.5) { const k = ramp(17, 19.5, h); return { dark: 0.18 * k, tint: `rgba(255,120,40,${0.16 * (1 - Math.abs(k - 0.5) * 1.2)})`, name: 'dusk' }; }
  if (h >= 19.5 && h < 21) { const k = ramp(19.5, 21, h); return { dark: 0.18 + 0.32 * k, tint: 'rgba(90,40,140,0.08)', name: 'evening' }; }
  if (h >= 5 && h < 7) { const k = ramp(5, 7, h); return { dark: 0.5 * (1 - k), tint: `rgba(255,150,170,${0.12 * k})`, name: 'dawn' }; }
  return { dark: 0.5, tint: null, name: 'night' };
}
let lightCv = null, vignetteCv = null;
export function drawLighting(g, w, h, phase, lights) {
  if (phase.tint) { g.fillStyle = phase.tint; g.fillRect(0, 0, w, h); }
  if (phase.dark > 0.01) {
    if (!lightCv || lightCv.width !== w || lightCv.height !== h) [lightCv] = mk(w, h);
    const lg = lightCv.getContext('2d'); lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, w, h);
    lg.fillStyle = `rgba(6,10,38,${phase.dark})`; lg.fillRect(0, 0, w, h);
    lg.globalCompositeOperation = 'destination-out';
    for (const L of lights) { const gr = lg.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r); gr.addColorStop(0, `rgba(0,0,0,${L.a ?? 1})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); lg.fillStyle = gr; lg.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2); }
    g.drawImage(lightCv, 0, 0);
    g.globalCompositeOperation = 'lighter';
    for (const L of lights) if (L.warm) { const gr = g.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r * 0.7); gr.addColorStop(0, `rgba(255,200,90,${0.35 * phase.dark})`); gr.addColorStop(1, 'rgba(255,200,90,0)'); g.fillStyle = gr; g.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2); }
    g.globalCompositeOperation = 'source-over';
  }
  if (!vignetteCv || vignetteCv.width !== w || vignetteCv.height !== h) { const [c, vg] = mk(w, h); const gr = vg.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.28)'); vg.fillStyle = gr; vg.fillRect(0, 0, w, h); vignetteCv = c; }
  g.drawImage(vignetteCv, 0, 0);
}
