// Character creator / wardrobe: hair style & colour, skin tone, outfit & colours, hat. Saved on the player as p.look.
import { G } from './state.js';
import { ui } from './ui.js';
import { audio } from '../core/audio.js';
import { esc, R } from '../core/rng.js';
import { personSheet, HAIR, SKIN, CLOTH } from '../core/sprites.js';
import { playerPalette, refreshPlayerSheets } from './world.js';

const PANTS = ['#2a3a6a', '#3a2a22', '#22222a', '#4a5a3a', '#6a6a78', '#8a6a4a', '#5a2a4a', '#e8e4d8'];
const STYLES = [['short', 'Short'], ['long', 'Long'], ['spiky', 'Spiky'], ['ponytail', 'Ponytail'], ['curly', 'Curly'], ['buzz', 'Buzz cut']];
const OUTFITS = [['tee', 'T-shirt'], ['jacket', 'Jacket'], ['hoodie', 'Hoodie'], ['dress', 'Dress'], ['coat', 'Lab coat']];
const HATS = [null, ...CLOTH];

const ROWS = [
  { k: 'hairStyle', label: 'Hair style', opts: STYLES.map((s) => s[0]), name: (v) => STYLES.find((s) => s[0] === v)?.[1] },
  { k: 'hair', label: 'Hair colour', opts: HAIR, swatch: true },
  { k: 'skin', label: 'Skin tone', opts: SKIN, swatch: true },
  { k: 'outfit', label: 'Outfit', opts: OUTFITS.map((o) => o[0]), name: (v) => OUTFITS.find((o) => o[0] === v)?.[1] },
  { k: 'shirt', label: 'Outfit colour', opts: CLOTH, swatch: true },
  { k: 'pants', label: 'Pants colour', opts: PANTS, swatch: true },
  { k: 'hat', label: 'Cap', opts: HATS, swatch: true, name: (v) => (v ? '' : 'None') },
];

function frameURL(sheet, dirRow, f) {
  const c = document.createElement('canvas'); c.width = 16; c.height = 20; c.getContext('2d').drawImage(sheet, f * 16, dirRow * 20, 16, 20, 0, 0, 16, 20); return c.toDataURL();
}

// Opens the wardrobe for player pi. Returns when the player presses Done.
export async function wardrobe(pi = 0, { intro = false, save = G.save } = {}) {
  const p = save.players[pi];
  // start from what the player looks like now
  const cur = playerPalette(p, pi);
  const look = { hairStyle: p.look?.hairStyle || (cur.long ? 'long' : 'short'), hair: cur.hair, skin: cur.skin, outfit: p.look?.outfit || (cur.coat ? 'coat' : 'tee'), shirt: cur.shirt, pants: cur.pants, hat: cur.hat ?? null, ...(p.look || {}) };
  let sel = 0, frame = 0;
  const timer = setInterval(() => { frame = (frame + 1) % 4; const imgs = document.querySelectorAll('.wd-prev img'); if (!imgs.length) return; const sheet = personSheet(playerPalette({ ...p, look }, pi)); imgs.forEach((im, k) => { im.src = frameURL(sheet, k, [0, 1, 0, 2][frame]); }); }, 260);
  const step = (row, d) => { const r = ROWS[row]; const i = r.opts.indexOf(look[r.k]); look[r.k] = r.opts[(i + d + r.opts.length) % r.opts.length]; audio.sfx('blip'); };
  const valueHtml = (r) => { const v = look[r.k]; return `${r.swatch && v ? `<i class="sw" style="background:${v}"></i>` : ''}${esc((r.name && r.name(v)) || (r.swatch ? '' : String(v)))}`; };
  await ui.panel({ title: intro ? 'What do you look like?' : `👕 Wardrobe${save.players.length > 1 ? ' — P' + (pi + 1) : ''}`, wide: true, cls: 'wardrobe',
    onLR: (d, rr) => { const l = ui.stack[ui.stack.length - 1]; sel = l.idx; if (sel < ROWS.length) { step(sel, d); rr(); } },
    render: () => { const sheet = personSheet(playerPalette({ ...p, look }, pi));
      return `<div class="wd"><div class="wd-prev">${[0, 2, 1, 3].map((row) => `<img src="${frameURL(sheet, row, 0)}" alt="">`).join('')}</div>
        <div class="slist">${ROWS.map((r, i) => `<button data-nav data-act="row" data-arg="${i}" class="srow"><span>${r.label}</span><b>◀ ${valueHtml(r)} ▶</b></button>`).join('')}
        <div class="row"><button data-nav data-act="rand">🎲 Random</button><button data-nav data-act="done">✔ Done</button></div></div></div>
        <p class="dim">Left/right (or tap a row) to change. You can change your look any time from the menu.</p>`; },
    actions: {
      row: (i) => { step(+i, 1); },
      rand: () => { for (const r of ROWS) look[r.k] = R.pick(r.opts); if (R() < 0.6) look.hat = null; audio.sfx('select'); },
      done: () => 'close',
    } });
  clearInterval(timer);
  p.look = { ...look };
  if (G.save === save) { refreshPlayerSheets(); G.autosave?.(); }
}
G.wardrobe = wardrobe;
