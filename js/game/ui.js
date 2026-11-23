// DOM-based pixel UI. Every interactive element carries data-nav so keyboard/gamepad/touch/mouse all work the same.
import { input } from '../core/input.js';
import { audio } from '../core/audio.js';
import { esc, sleep } from '../core/rng.js';
import { G } from './state.js';

const root = () => document.getElementById('ui');

class Layer {
  constructor(html, opts = {}) {
    this.opts = opts; this.el = document.createElement('div'); this.el.className = 'layer ' + (opts.cls || '');
    this.el.innerHTML = html; root().appendChild(this.el); this.idx = opts.start || 0; this.closed = false;
    this.bind(); this.highlight();
  }
  navs() { return [...this.el.querySelectorAll('[data-nav]:not([disabled]):not(.hidden)')].filter((e) => e.offsetParent !== null || e.closest('.layer') === this.el); }
  bind() {
    this.el.querySelectorAll('[data-nav]').forEach((e) => {
      e.addEventListener('mouseenter', () => { const n = this.navs(); const i = n.indexOf(e); if (i >= 0) { this.idx = i; this.highlight(false); } });
    });
  }
  refresh(html) { if (html !== undefined) this.el.innerHTML = html; this.bind(); const n = this.navs(); if (this.idx >= n.length) this.idx = Math.max(0, n.length - 1); this.highlight(); }
  highlight(scroll = true) {
    const n = this.navs(); n.forEach((e, i) => e.classList.toggle('sel', i === this.idx));
    const s = n[this.idx]; if (s && scroll) s.scrollIntoView({ block: 'nearest' });
  }
  handle() {
    if (this.opts.handle && this.opts.handle(this) === true) return;
    const d = input.nav(); const n = this.navs();
    if (d && n.length) {
      const cols = this.opts.cols || 1; let step = 0;
      if (d === 'up') step = -cols; if (d === 'down') step = cols; if (d === 'left') step = -1; if (d === 'right') step = 1;
      if (this.opts.onLR && (d === 'left' || d === 'right')) { this.opts.onLR(d === 'left' ? -1 : 1, this); return; }
      if (step) { this.idx = (this.idx + step + n.length) % n.length; audio.sfx('blip'); this.highlight(); }
    }
    if (input.anyPressed('a') >= 0 && n[this.idx]) { audio.sfx('select'); n[this.idx].click(); return; }
    if (input.anyPressed('b') >= 0 || (this.opts.startCloses && input.anyPressed('start') >= 0)) { if (this.opts.onBack !== null) { audio.sfx('back'); (this.opts.onBack || (() => this.close()))(this); } }
  }
  close(v) { if (this.closed) return; this.closed = true; this.el.remove(); ui.stack = ui.stack.filter((l) => l !== this); if (this.opts.onClose) this.opts.onClose(v); }
}

export const ui = {
  stack: [],
  get open() { return this.stack.length > 0; },
  layer(html, opts) { const l = new Layer(html, opts); this.stack.push(l); return l; },
  update() { const top = this.stack[this.stack.length - 1]; document.body.classList.toggle('layer-open', !!top && !top.el.querySelector('.dialog:only-child')); if (top) top.handle(); },
  closeAll() { for (const l of [...this.stack]) l.close(); },

  // --- dialogue with typewriter
  say(lines, opt = {}) {
    if (!Array.isArray(lines)) lines = [lines];
    lines = lines.filter(Boolean);
    return new Promise((res) => {
      let i = 0, shown = 0, full = '', timer = null;
      const l = this.layer(`<div class="dialog ${opt.cls || ''}">${opt.name ? `<div class="dname">${esc(opt.name)}</div>` : ''}<div class="dtext"></div><div class="dmore">▼</div></div>`, { onBack: null, onClose: () => res(), handle: () => { if (input.anyPressed('a') >= 0 || input.anyPressed('b') >= 0) adv(); return true; } });
      const txt = l.el.querySelector('.dtext'); const more = l.el.querySelector('.dmore');
      const speed = [0, 40, 22, 10, 1][G.settings?.textSpeed ?? 2] || 22;
      const show = () => {
        full = lines[i]; shown = 0; more.style.visibility = 'hidden';
        clearInterval(timer);
        timer = setInterval(() => { shown += 1; txt.innerHTML = fmt(esc(full.slice(0, shown))); if (shown % 3 === 0) audio.sfx('tick'); if (shown >= full.length) { clearInterval(timer); timer = null; more.style.visibility = 'visible'; } }, speed);
      };
      const adv = () => {
        if (timer) { clearInterval(timer); timer = null; txt.innerHTML = fmt(esc(full)); more.style.visibility = 'visible'; return; }
        i++; if (i >= lines.length) { l.close(); res(); } else show();
      };
      l.el.addEventListener('click', adv);
      show();
    });
  },
  choose(prompt, options, opt = {}) {
    return new Promise((res) => {
      const items = options.map((o, i) => `<button data-nav data-i="${i}" ${o && o.disabled ? 'disabled' : ''}>${typeof o === 'string' ? esc(o) : o.html || esc(o.label)}</button>`).join('');
      const l = this.layer(`${prompt ? `<div class="dialog"><div class="dtext">${fmt(esc(prompt))}</div></div>` : ''}<div class="choice ${opt.cls || ''}">${items}</div>`, { onBack: opt.cancel === false ? null : () => { l.close(); res(-1); }, start: opt.start || 0, cols: opt.cols, onClose: () => res(-1) });
      l.el.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); res(+b.dataset.i); l.close(); }));
    });
  },
  async confirm(text) { return (await this.choose(text, ['Yes', 'No'])) === 0; },
  // generic panel: render() returns html; actions map data-act to handlers
  panel({ title, render, actions = {}, cls = '', cols, onLR, wide }) {
    return new Promise((res) => {
      const shell = (body) => `<div class="panel ${wide ? 'wide' : ''} ${cls}"><div class="ptitle"><span>${title}</span><button class="x" data-act="__close">✕</button></div><div class="pbody">${body}</div></div>`;
      const l = this.layer(shell(render()), { cols, onLR: onLR && ((d) => onLR(d, rerender)), onBack: () => { l.close(); res(); }, onClose: () => res() });
      const rerender = () => { if (!l.closed) { l.refresh(shell(render())); wire(); } };
      const wire = () => l.el.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', async (e) => {
        e.stopPropagation(); const a = b.dataset.act; if (a === '__close') { l.close(); res(); return; }
        const fn = actions[a]; if (fn) { const r = await fn(b.dataset.arg, b, rerender, l); if (r === 'close') { res(); l.close(); } else rerender(); }
      }));
      wire(); l.rerender = rerender;
    });
  },
  toast(text, ms = 2200) {
    const box = document.getElementById('toasts'); if ([...box.children].some((c) => c.dataset.t === text)) return; while (box.children.length >= 2) box.firstChild.remove();
    const t = document.createElement('div'); t.className = 'toast'; t.dataset.t = text; t.innerHTML = fmt(esc(text)); box.appendChild(t);
    setTimeout(() => t.classList.add('out'), ms); setTimeout(() => t.remove(), ms + 500);
  },
  banner(text) {
    const b = document.getElementById('banner'); b.textContent = text; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  },
  prompt(label, def = '', max = 12) {
    return new Promise((res) => {
      const l = this.layer(`<div class="panel small"><div class="ptitle"><span>${esc(label)}</span></div><div class="pbody"><input class="txt" maxlength="${max}" value="${esc(def)}" autocomplete="off"><div class="row"><button data-nav class="ok">OK</button></div></div></div>`, { onBack: null, handle: () => true });
      const inp = l.el.querySelector('input'); input.textMode = true; setTimeout(() => inp.focus(), 30);
      const done = () => { input.textMode = false; input.keys.clear(); const v = inp.value.trim() || def; l.close(); res(v); };
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); done(); } e.stopPropagation(); });
      l.el.querySelector('.ok').addEventListener('click', done);
    });
  },
  // --- the learning core: a timed multiple-choice question
  question(q, opt = {}) {
    return new Promise((res) => {
      const limit = G.settings.timer ? (opt.time || G.settings.timerSec || 25) : 0;
      const quickT = opt.quick ?? 6;
      const keys = ['1', '2', '3', '4'];
      const long = q.opts.some((o) => String(o).length > 48) || q.q.length > 120;
      const html = `<div class="quiz ${opt.cls || ''} ${long ? 'long' : ''} ${q.q.includes('```') ? 'code' : ''}">
        <div class="qhead"><span class="qtag">${esc(opt.tag || 'Question')}${q.review ? ' · <b>Review</b>' : ''}</span>${opt.who ? `<span class="qwho">${esc(opt.who)}</span>` : ''}</div>
        <div class="qtext">${fmt(esc(q.q))}</div>
        <div class="qopts">${q.opts.map((o, i) => `<button data-nav data-i="${i}"><span class="k">${keys[i] || ''}</span>${esc(o)}</button>`).join('')}</div>
        ${limit ? '<div class="qtimer"><div></div></div>' : ''}
        <div class="qfeedback hidden"></div></div>`;
      const t0 = performance.now(); let done = false, raf, lsel = false, learning = false, wantFinish = false; let term = null; const initHeld = new Set(input.keys);
      const l = this.layer(html, { onBack: null, cols: q.opts.length === 4 && opt.grid !== false ? 2 : 1, handle: (L) => {
        if (done) {
          const lb = l.el.querySelector('.lmore');
          if (lb) { const d = input.nav(); if (d) { lsel = !lsel; lb.classList.toggle('sel', lsel); l.el.querySelector('.cont')?.classList.toggle('sel', !lsel); audio.sfx('blip'); } }
          if (input.anyPressed('a') >= 0) { if (lb && lsel) openLearn(); else finish(); } else if (input.anyPressed('b') >= 0) finish();
          return true;
        }
        for (let i = 0; i < 4; i++) { const c = 'Digit' + (i + 1); const down = input.keys.has(c) || (input.frameTaps && input.frameTaps.has(c)); if (!down) initHeld.delete(c); else if (!initHeld.has(c) && q.opts[i] !== undefined) { pick(i); return true; } }
        return false;
      } });
      const bar = l.el.querySelector('.qtimer div');
      const tick = () => { if (done) return; const el = (performance.now() - t0) / 1000; if (bar) { bar.style.width = Math.max(0, 100 - (el / limit) * 100) + '%'; bar.classList.toggle('quick', el < quickT); } if (limit && el >= limit) pick(-1); else raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
      let result;
      const pick = (i) => {
        if (done) return; done = true; cancelAnimationFrame(raf);
        const time = (performance.now() - t0) / 1000; const correct = i === q.answer; const quick = correct && time < quickT;
        result = { correct, quick, time, choice: i };
        l.el.querySelectorAll('[data-i]').forEach((b) => { const k = +b.dataset.i; b.disabled = true; if (k === q.answer) b.classList.add('right'); else if (k === i) b.classList.add('wrongpick'); });
        audio.sfx(correct ? (quick ? 'quick' : 'correct') : 'wrong');
        l.el.querySelector('.quiz').classList.add('answered'); const fb = l.el.querySelector('.qfeedback'); fb.classList.remove('hidden');
        fb.innerHTML = correct ? `<b class="ok">${quick ? '⚡ Quick Recall!' : '✔ Correct!'}</b> <span>${fmt(esc(q.expl || ''))}</span><div class="cont">▶ Continue</div>` : `<b class="bad">${i < 0 ? '⏱ Time\'s up!' : '✘ Not quite.'}</b> Answer: <b>${esc(q.a)}</b><br><span>${fmt(esc(q.expl || ''))}</span><div class="cont">▶ Continue</div>`;
        try { term = G.termForQuestion && opt.learn !== false ? G.termForQuestion(q) : null; } catch { term = null; }
        if (term) { const lb = document.createElement('button'); lb.className = 'lmore'; lb.innerHTML = '📖 Learn more: ' + esc(term.term); lb.addEventListener('click', (e) => { e.stopPropagation(); openLearn(); }); fb.appendChild(lb); }
        fb.addEventListener('click', finish);
        if (opt.autoClose) setTimeout(finish, correct ? 900 : (term ? 4200 : 2600));
      };
      const finish = () => { if (l.closed) return; if (learning) { wantFinish = true; return; } res(result); l.close(); };
      const openLearn = async () => { if (learning || !term || !G.learnMore) return; learning = true; await G.learnMore(term); learning = false; lsel = false; l.el.querySelector('.lmore')?.classList.remove('sel'); l.el.querySelector('.cont')?.classList.add('sel'); if (wantFinish) finish(); };
      l.el.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); if (!done) pick(+b.dataset.i); else finish(); }));
    });
  },
  fade(on, ms = 250) { const f = document.getElementById('fade'); f.style.transitionDuration = ms + 'ms'; f.classList.toggle('on', on); return sleep(ms); },
};
// lightweight markup: *bold* and line breaks
export function fmt(s) { return String(s).split('```').map((part, i) => (i % 2 ? `<pre class="qcode">${part.replace(/^\n|\n$/g, '')}</pre>` : part.replace(/\*([^*]+)\*/g, '<b>$1</b>').replace(/\n/g, '<br>').replace(/`([^`]+)`/g, '<code>$1</code>'))).join(''); }
G.ui = ui;
