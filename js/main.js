// Boot, title screen, game loop.
import { CONFIG } from './config.js';
import { view } from './core/view.js';
import { applyLayout, editingControls } from './core/touchlayout.js';
import { G, loadSettings, newSave, listSlots, readSlot, writeSlot, deleteSlot, migrate, badgeCount } from './game/state.js';
import { input } from './core/input.js';
import { audio } from './core/audio.js';
import { ui } from './game/ui.js';
import { getWorld, topics } from './game/content.js';
import { World } from './game/world.js';
import { setWorldSeed } from './game/maps.js';
import './game/events.js';
import './game/learn.js';
import { net, netui } from './game/net.js';
import { monsterCanvas, itemIcon } from './core/sprites.js';
import { esc, R, hash } from './core/rng.js';
import * as menus from './game/menus.js';


const cv = document.getElementById('screen'); const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
G.version = CONFIG.VERSION; G.settings = loadSettings(); G.topicsCount = topics().length;
audio.setVolume('music', G.settings.music); audio.setVolume('sfx', G.settings.sfx);
const miniCache = new Map();
G.mini = (sp) => { const k = sp.uidKey; if (!miniCache.has(k)) miniCache.set(k, monsterCanvas(sp, false).toDataURL()); return miniCache.get(k); };
G.icons = itemIcon;
G.autosave = (force) => { if (!G.save || G.title) return; writeSlot(G.slot, G.save); if (CONFIG.ONLINE) net.pushSave(G.slot, G.save, force); };
setInterval(() => G.autosave(), 30000);
addEventListener('beforeunload', () => G.autosave(true));
document.addEventListener('visibilitychange', () => { if (document.hidden) G.autosave(true); });

// ------------------------------------------------------------ layout & touch
const stage = document.getElementById('stage');
function resize() {
  const ww = innerWidth, wh = innerHeight; const touch = matchMedia('(pointer: coarse)').matches; document.body.classList.toggle('touch', touch);
  const portrait = touch && wh > ww; document.body.classList.toggle('portrait', portrait);
  // Portrait phones: a taller handheld-style screen that spans the full width; controls sit underneath.
  let w = 384, h = 216;
  if (portrait) { w = 320; const controls = Math.min(240, wh * 0.32); h = Math.max(216, Math.min(380, Math.round((w * (wh - controls)) / ww))); }
  if (view.w !== w || view.h !== h) { view.w = w; view.h = h; cv.width = w; cv.height = h; g.imageSmoothingEnabled = false; if (G.world?.map) G.world.snapCam(); }
  let s = portrait ? ww / w : Math.min(ww / w, wh / h);
  if (!touch && s >= 2) s = Math.floor(s * 2) / 2;
  stage.style.width = Math.floor(w * s) + 'px'; stage.style.height = Math.floor(h * s) + 'px';
  document.documentElement.style.setProperty('--px', s + 'px');
  requestAnimationFrame(applyLayout);
}
addEventListener('resize', resize); resize();
document.querySelectorAll('#touch [data-b]').forEach((b) => {
  const k = b.dataset.b; const on = (e) => { if (editingControls()) return; e.preventDefault(); audio.init(); input.setTouch(k, true); b.classList.add('down'); }; const offf = (e) => { e.preventDefault(); input.setTouch(k, false); b.classList.remove('down'); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', offf); b.addEventListener('pointerleave', offf); b.addEventListener('pointercancel', offf);
});
// d-pad: slide between directions
const pad = document.getElementById('dpad');
if (pad) { const dirs = ['up', 'down', 'left', 'right']; const setDir = (e) => { const r = pad.getBoundingClientRect(); const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2; for (const d of dirs) input.setTouch(d, false); if (Math.hypot(x, y) < 8) return; input.setTouch(Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : y > 0 ? 'down' : 'up', true); };
  pad.addEventListener('pointerdown', (e) => { if (editingControls()) return; e.preventDefault(); audio.init(); pad.setPointerCapture(e.pointerId); setDir(e); }); pad.addEventListener('pointermove', (e) => { if (e.buttons && !editingControls()) setDir(e); }); const end = () => dirs.forEach((d) => input.setTouch(d, false)); pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end); }
const unlock = () => audio.init(); addEventListener('keydown', unlock); addEventListener('pointerdown', unlock);
input.onRunToggle = (p, on) => { audio.sfx(on ? 'select' : 'back'); ui.toast(on ? '🏃 Auto-run ON (double-tap Run to turn off)' : '🚶 Auto-run OFF', 1600); document.querySelector('#touch [data-b="run"]')?.classList.toggle('on', input.runLock[0]); };
addEventListener('gamepadconnected', (e) => ui.toast(`🎮 Controller ${e.gamepad.index + 1} connected`));

// ------------------------------------------------------------ PWA
let installEvt = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; if (G.title) titleMenu(); });
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  // Auto-update: check for a new version on launch, when the app comes back to the foreground, and every 30 minutes.
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    const check = () => { if (navigator.onLine) reg.update().catch(() => {}); };
    check(); setInterval(check, 30 * 60 * 1000); document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  }).catch(() => {});
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    if (G.title || !G.save) { reloading = true; location.reload(); return; }
    G.autosave?.(true); G.updateReady = true; ui.toast('✨ Hakma was updated — it loads next time you return to the title screen', 6000);
  });
}

// ------------------------------------------------------------ title scene
const parade = [];
const titleScene = {
  t: 0,
  update(dt) {
    this.t += dt;
    if (parade.length < 7 && R() < dt * 0.9) { const tp = R.pick(topics()); const w = getWorld(tp.id); const ids = Object.keys(w.species); const sp = w.species[R.pick(ids)]; parade.push({ sp, x: -60, y: 150 + R.int(0, 50), v: 25 + R() * 25 }); }
    for (const p of parade) p.x += p.v * dt; while (parade.length && parade[0].x > view.w + 60) parade.shift();
  },
  render(g) {
    const t = this.t; const gr = g.createLinearGradient(0, 0, 0, view.h); gr.addColorStop(0, '#120a2a'); gr.addColorStop(0.6, '#2a1a5a'); gr.addColorStop(1, '#4a2a6a'); g.fillStyle = gr; g.fillRect(0, 0, view.w, view.h);
    for (let i = 0; i < 70; i++) { const x = (i * 71 + t * (4 + (i % 5))) % view.w, y = (i * 37) % 120; g.fillStyle = i % 7 ? 'rgba(255,255,255,0.6)' : '#4cf0ff'; g.fillRect(x, y, 1, 1); }
    g.fillStyle = '#1a1040'; for (let x = 0; x < view.w; x += 2) { const y = 140 + Math.sin(x * 0.03 + t * 0.2) * 8 + Math.sin(x * 0.011) * 10; g.fillRect(x, y, 2, view.h); }
    g.fillStyle = '#2a1a50'; for (let x = 0; x < view.w; x += 2) { const y = 170 + Math.sin(x * 0.05 + 1) * 5; g.fillRect(x, y, 2, view.h); }
    for (const p of [...parade].sort((a, b) => a.y - b.y)) { const c = monsterCanvas(p.sp); g.drawImage(c, Math.round(p.x), Math.round(p.y - 56 + Math.abs(Math.sin(t * 6 + p.v)) * -3), 56, 56); }
    g.save(); g.textAlign = 'center'; g.font = '32px "Press Start 2P"';
    const y = 62 + Math.sin(t * 1.5) * 2;
    g.fillStyle = '#000'; g.fillText('HAKMA', view.w / 2 + 3, y + 3);
    const lg = g.createLinearGradient(0, y - 30, 0, y); lg.addColorStop(0, '#ffe14c'); lg.addColorStop(1, '#ff4fd8'); g.fillStyle = lg; g.shadowColor = '#ff4fd8'; g.shadowBlur = 12; g.fillText('HAKMA', view.w / 2, y); g.shadowBlur = 0;
    g.font = '8px "Press Start 2P"'; g.fillStyle = '#9ff3ff'; g.fillText('LEARN ANYTHING. MASTER EVERYTHING.', view.w / 2, y + 18);
    g.restore();
  },
};
function slotLabel(s, i) {
  if (!s) return `Slot ${i + 1} — empty`;
  const tp = topics().find((t) => t.id === s.topic); const h = Math.floor(s.playtime / 3600), m = Math.floor((s.playtime % 3600) / 60);
  return `Slot ${i + 1} — <b>${esc(s.players.map((p) => p.name).join(' & '))}</b> · ${esc(tp ? tp.name : 'No topic yet')} · ${badgeCount(s)} badges · ${h}h${String(m).padStart(2, '0')}`;
}
async function titleMenu() {
  if (!G.title) return; ui.closeAll();
  const slots = listSlots(); const any = slots.some(Boolean);
  const items = [];
  if (any) items.push(['continue', '▶ Continue']);
  items.push(['new', '✚ New Game']); if (CONFIG.ONLINE) items.push(['online', net.authed ? `👥 Online: ${esc(net.user.username)}` : '👥 Log in / Create account']); items.push(['settings', '⚙ Settings'], ['help', '? Help & Legal']);
  if (installEvt) items.push(['install', '⬇ Install app']);
  else if (/iphone|ipad/i.test(navigator.userAgent) && !navigator.standalone) items.push(['ios', '⬇ Install on iPhone/iPad']);
  const c = await ui.choose(null, items.map(([, h]) => ({ html: h })), { cls: 'titlemenu', cancel: false });
  if (c < 0 || !G.title) return; // menu was replaced (e.g. the install option appeared)
  const k = items[c][0];
  if (k === 'continue') { const pick = await ui.choose('Choose a save', slots.map((s, i) => ({ html: slotLabel(s, i), disabled: !s })), { cls: 'slots' }); if (pick >= 0) return startGame(pick, readSlot(pick)); }
  if (k === 'new') return newGameFlow();
  if (k === 'online') await netui.friends();
  if (k === 'settings') await menus.settings();
  if (k === 'help') await menus.help();
  if (k === 'install' && installEvt) { installEvt.prompt(); await installEvt.userChoice.catch(() => {}); installEvt = null; }
  if (k === 'ios') await ui.say(['To install Hakma on iPhone or iPad:', 'Tap the Share button in Safari, then choose *Add to Home Screen*.', 'Hakma then runs full-screen and works offline.']);
  titleMenu();
}
async function newGameFlow() {
  const slots = listSlots(); let slot = slots.findIndex((s) => !s);
  const pick = await ui.choose('Choose a save slot for your new adventure', slots.map((s, i) => ({ html: slotLabel(s, i) })), { cls: 'slots' });
  if (pick < 0) return titleMenu(); slot = pick;
  if (slots[slot] && !(await ui.confirm('Overwrite this save? This cannot be undone.'))) return titleMenu();
  await ui.say(['Welcome to the world of *Hakma*!', 'Here, monsters are born from ideas — every creature embodies a concept you can learn.', 'Trainers who truly understand their monsters become unstoppable.', 'First, tell me about yourself.']);
  const name = await ui.prompt('What is your name?', '', 12);
  deleteSlot(slot); const s = newSave(name);
  await ui.say([`${name || 'Trainer'}! What a great name.`, 'Your journey begins in your bedroom. On your desk is a Study Terminal — use it to choose what you want to master.', 'Every city, monster, leader and lesson will be built around your choice. Let\'s begin!']);
  startGame(slot, s);
}
function startGame(slot, save) {
  save = migrate(save); G.slot = slot; G.save = save; G.title = false; G.busy = 0;
  setWorldSeed(save.seed); G.W = getWorld(save.topic || topics()[0].id);
  input.setPlayers(save.players.length); save.players.forEach((_, i) => input.assignPad(i, i));
  if (!G.world) G.world = new World();
  ui.closeAll(); G.scene = G.world; G.world.load(save.map, save.pos);
  G.lastObjective = undefined; G.events.checkObjective();
  ui.banner(G.world.map.name); writeSlot(slot, save);
  if (!save.flags.topic) setTimeout(() => ui.toast('★ Walk to the desk (top of the room) and press A to choose your topic.', 5000), 600);
}
G.toTitle = () => { if (G.updateReady) { G.autosave?.(true); location.reload(); return; } G.title = true; G.save = null; G.scene = titleScene; document.getElementById('hud').innerHTML = ''; audio.play('title', 'hakma-title', 'title'); titleMenu(); };

// ------------------------------------------------------------ loop
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; G.t += dt;
  input.update(dt); ui.update();
  // safety net: never leave the player frozen if something finished without releasing control
  if (G.busy < 0) G.busy = 0;
  if (G.busy > 0 && !ui.open && !G.battle && G.scene === G.world && !G.warping) { G.stuckT = (G.stuckT || 0) + dt; if (G.stuckT > 5) { console.warn('Hakma: releasing stuck input lock'); G.busy = 0; G.stuckT = 0; } } else G.stuckT = 0;
  try { G.scene?.update(dt); G.scene?.render(g); } catch (e) { console.error(e); }
  requestAnimationFrame(frame);
}
document.fonts?.load('8px "Press Start 2P"').finally(() => {
  document.getElementById('boot')?.remove();
  G.title = true; G.scene = titleScene; audio.play('title', 'hakma-title', 'title'); titleMenu(); if (CONFIG.ONLINE) { net.init(); fetch((CONFIG.SERVER_URL || '') + '/api/info').then((r) => r.json()).then((i) => { if (typeof i.externalLinks === 'boolean') CONFIG.EXTERNAL_LINKS = i.externalLinks; }).catch(() => {}); }
  requestAnimationFrame(frame);
});
window.HAKMA = G; // handy for debugging from the console
