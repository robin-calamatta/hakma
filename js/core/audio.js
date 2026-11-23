// Procedural 8-bit chiptune engine (Web Audio). Every city/route/battle gets its own seeded song in a mood
// that fits the scene, so there are no audio files to license and the world never sounds the same twice.
import { rng, hash } from './rng.js';

const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11], phrygian: [0, 1, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11], pentatonic: [0, 2, 4, 7, 9, 12, 14],
};
// mood -> generation parameters
const MOODS = {
  title:   { scale: 'major', bpm: 126, prog: [[0, 5, 3, 4], [0, 3, 4, 4], [5, 3, 0, 4]], drums: 'march', arp: true, root: 60, duty: 0.25 },
  calm:    { scale: 'lydian', bpm: 92, prog: [[0, 3, 0, 4], [0, 5, 3, 4]], drums: 'soft', arp: true, root: 62, duty: 0.5 },
  town:    { scale: 'major', bpm: 112, prog: [[0, 3, 4, 0], [0, 5, 3, 4], [3, 4, 0, 5]], drums: 'light', arp: true, root: 60, duty: 0.25 },
  mystic:  { scale: 'dorian', bpm: 100, prog: [[0, 3, 6, 0], [0, 6, 3, 4]], drums: 'soft', arp: true, root: 57, duty: 0.125 },
  bright:  { scale: 'mixolydian', bpm: 120, prog: [[0, 6, 3, 0], [0, 3, 6, 4]], drums: 'light', arp: true, root: 62, duty: 0.25 },
  route:   { scale: 'mixolydian', bpm: 136, prog: [[0, 6, 3, 4], [0, 3, 6, 0], [0, 4, 5, 3]], drums: 'drive', arp: false, root: 60, duty: 0.25 },
  cave:    { scale: 'phrygian', bpm: 96, prog: [[0, 1, 0, 6], [0, 5, 1, 0]], drums: 'soft', arp: true, root: 55, duty: 0.125 },
  neon:    { scale: 'dorian', bpm: 128, prog: [[0, 6, 5, 6], [0, 3, 6, 4]], drums: 'four', arp: true, root: 57, duty: 0.125 },
  battle:  { scale: 'harmonic', bpm: 156, prog: [[0, 5, 6, 4], [0, 0, 5, 4], [0, 3, 4, 4]], drums: 'battle', arp: true, root: 57, duty: 0.25 },
  gym:     { scale: 'phrygian', bpm: 164, prog: [[0, 1, 0, 6], [0, 5, 6, 1]], drums: 'battle', arp: true, root: 55, duty: 0.125 },
  epic:    { scale: 'minor', bpm: 120, prog: [[0, 5, 2, 6], [0, 3, 5, 4]], drums: 'march', arp: true, root: 55, duty: 0.25 },
  lab:     { scale: 'major', bpm: 104, prog: [[0, 4, 5, 3], [0, 3, 1, 4]], drums: 'light', arp: true, root: 64, duty: 0.5 },
  heal:    { scale: 'major', bpm: 100, prog: [[0, 3, 4, 0]], drums: 'soft', arp: true, root: 64, duty: 0.5 },
};

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function genSong(seed, moodKey) {
  const M = MOODS[moodKey] || MOODS.town;
  const r = rng(seed);
  const sc = SCALES[M.scale];
  const prog = r.pick(M.prog);
  const root = M.root + r.int(-2, 2);
  const bpm = M.bpm + r.int(-6, 6);
  const bars = 8, spb = 16, N = bars * spb;
  const deg = (d, oct = 0) => { const n = sc.length; const o = Math.floor(d / n); const i = ((d % n) + n) % n; return root + sc[i] + 12 * (o + oct); };
  const lead = new Array(N).fill(null), harm = new Array(N).fill(null), bass = new Array(N).fill(null), drum = new Array(N).fill(null);
  const rhythms = [
    [1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0], [1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0],
    [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0], [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0],
    [1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0], [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  ];
  // phrase A (bars 0-3) then varied A' (bars 4-7)
  let cur = 7 + r.int(0, 3);
  const phrase = [];
  for (let b = 0; b < 4; b++) {
    const chord = prog[b % prog.length];
    const rh = r.pick(moodKey === 'calm' || moodKey === 'heal' ? [rhythms[5], rhythms[3], rhythms[2]] : rhythms);
    const bar = [];
    for (let s = 0; s < 16; s++) {
      if (!rh[s]) { bar.push(null); continue; }
      const strong = s % 4 === 0;
      if (strong) { const tones = [chord, chord + 2, chord + 4, chord + 7]; let best = tones[0], bd = 99; for (const t of tones) { const dd = Math.abs(t - cur) + r() * 2; if (dd < bd) { bd = dd; best = t; } } cur = best; }
      else cur += r.pick([-1, 1, 1, -1, 2, -2, 0]);
      cur = Math.max(3, Math.min(14, cur));
      let len = 1; while (s + len < 16 && !rh[s + len] && len < 4) len++;
      bar.push({ d: cur, len });
    }
    phrase.push(bar);
  }
  for (let b = 0; b < bars; b++) {
    const chord = prog[b % prog.length];
    const src = phrase[b % 4];
    for (let s = 0; s < 16; s++) {
      const i = b * 16 + s; let n = src[s];
      if (n && b >= 4) { if (b === 7 && s >= 8) n = { d: s === 8 ? chord + 7 : null, len: 8 }; else if (r() < 0.25) n = { d: n.d + r.pick([-1, 1, 2]), len: n.len }; }
      if (n && n.d !== null) lead[i] = { m: deg(n.d), len: n.len };
      // bass
      const bp = M.drums === 'soft' ? [0, 8] : M.drums === 'battle' ? [0, 2, 4, 6, 8, 10, 12, 14] : [0, 4, 6, 8, 12, 14];
      if (bp.includes(s)) bass[i] = { m: deg(chord, -2) + (s === 6 || s === 14 ? 7 : s === 12 && r() < 0.3 ? 12 : 0), len: M.drums === 'soft' ? 6 : 2 };
      // harmony: chip arpeggio or sustained thirds
      if (M.arp) { const a = [0, 2, 4, 7][s % 4]; harm[i] = { m: deg(chord + a, -1), len: 1 }; }
      else if (s % 8 === 0) harm[i] = { m: deg(chord + 2, -1), len: 6 };
      // drums
      const st = s % 16; let d = null;
      switch (M.drums) {
        case 'soft': d = st === 0 ? 'k' : st === 8 ? 'h' : null; break;
        case 'light': d = st % 8 === 0 ? 'k' : st % 8 === 4 ? 's' : st % 2 === 0 ? 'h' : null; break;
        case 'four': d = st % 4 === 0 ? 'k' : st % 4 === 2 ? 'h' : null; if (st === 4 || st === 12) d = 's'; break;
        case 'march': d = st === 0 || st === 10 ? 'k' : st % 8 === 4 ? 's' : st % 2 === 0 ? 'h' : null; break;
        case 'drive': d = st % 8 === 0 || st === 6 ? 'k' : st % 8 === 4 ? 's' : 'h'; if (st % 2) d = st === 15 ? 's' : null; break;
        case 'battle': d = st % 4 === 0 ? 'k' : st % 8 === 4 ? 's' : 'h'; if (b % 4 === 3 && st >= 12) d = 's'; break;
      }
      drum[i] = d;
    }
  }
  return { bpm, N, lead, harm, bass, drum, duty: M.duty, moodKey };
}

class Chip {
  // Silence everything immediately when the app loses focus / goes to the background; pick up again when it's back.
  pause() {
    this.away = true; if (!this.ctx) return;
    try { const t = this.ctx.currentTime; this.master.gain.cancelScheduledValues(t); this.master.gain.setValueAtTime(0, t); } catch {}
    this.ctx.suspend?.().catch(() => {});
  }
  unpause() {
    if (!this.away) return; this.away = false; if (!this.ctx) return;
    this.ctx.resume?.().then(() => { const t = this.ctx.currentTime; this.master.gain.cancelScheduledValues(t); this.master.gain.setValueAtTime(0, t); this.master.gain.linearRampToValueAtTime(0.5, t + 0.25); if (this.cur) this.cur.t = Math.max(this.cur.t, t + 0.05); }).catch(() => {});
  }
  constructor() { this.ctx = null; this.vol = { music: 0.55, sfx: 0.7 }; this.cur = null; this.key = null; this.muted = false; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended' && !this.away) this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(ctx.destination);
    this.mg = ctx.createGain(); this.mg.gain.value = this.vol.music; this.mg.connect(this.master);
    this.sg = ctx.createGain(); this.sg.gain.value = this.vol.sfx; this.sg.connect(this.master);
    this.waves = {};
    for (const d of [0.125, 0.25, 0.5]) {
      const n = 32, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * d) * 1; // pulse wave fourier
      for (let k = 1; k < n; k++) { re[k] = im[k]; im[k] = 0; }
      this.waves[d] = ctx.createPeriodicWave(re, im);
    }
    const len = ctx.sampleRate; const buf = ctx.createBuffer(1, len, ctx.sampleRate); const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    this.noise = buf;
    this.timer = setInterval(() => this.tick(), 25);
    if (this.away) this.pause();
    if (this.pending) { const p = this.pending; this.pending = null; this.play(p.key, p.seed, p.mood); }
  }
  setVolume(kind, v) { this.vol[kind] = v; if (kind === 'music' && this.mg) this.mg.gain.value = v; if (kind === 'sfx' && this.sg) this.sg.gain.value = v; }
  play(key, seed, mood) {
    if (this.key === key) return;
    if (!this.ctx) { this.pending = { key, seed, mood }; this.key = null; return; }
    this.key = key;
    const song = genSong(hash(String(seed) + key), mood);
    this.cur = { song, step: 0, t: this.ctx.currentTime + 0.08 };
  }
  stop() { this.cur = null; this.key = null; }
  tick() {
    const c = this.cur; if (!c || !this.ctx) return;
    const sd = 60 / c.song.bpm / 4;
    while (c.t < this.ctx.currentTime + 0.15) {
      const i = c.step % c.song.N, s = c.song;
      if (s.lead[i]) this.tone(this.mg, s.lead[i].m, c.t, s.lead[i].len * sd * 0.92, 0.16, s.duty, true);
      if (s.harm[i]) this.tone(this.mg, s.harm[i].m, c.t, s.harm[i].len * sd * 0.9, 0.06, 0.5);
      if (s.bass[i]) this.tone(this.mg, s.bass[i].m, c.t, s.bass[i].len * sd * 0.9, 0.22, 'tri');
      if (s.drum[i]) this.drum(this.mg, s.drum[i], c.t);
      c.t += sd; c.step++;
    }
  }
  tone(dest, midi, t, dur, vol, wave, vib) {
    const ctx = this.ctx; const o = ctx.createOscillator(); const g = ctx.createGain();
    if (wave === 'tri') o.type = 'triangle'; else if (wave === 'saw') o.type = 'sawtooth'; else if (wave === 'sine') o.type = 'sine'; else o.setPeriodicWave(this.waves[wave] || this.waves[0.5]);
    o.frequency.setValueAtTime(mtof(midi), t);
    if (vib && dur > 0.2) { const l = ctx.createOscillator(); const lg = ctx.createGain(); l.frequency.value = 6; lg.gain.value = mtof(midi) * 0.008; l.connect(lg); lg.connect(o.frequency); l.start(t + 0.12); l.stop(t + dur + 0.05); }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.setTargetAtTime(vol * 0.7, t + 0.02, 0.08);
    g.gain.setTargetAtTime(0, t + dur, 0.02);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.15);
  }
  drum(dest, kind, t) {
    const ctx = this.ctx;
    if (kind === 'k') {
      const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.16); return;
    }
    const src = ctx.createBufferSource(); src.buffer = this.noise; const f = ctx.createBiquadFilter(); const g = ctx.createGain();
    const len = kind === 's' ? 0.12 : 0.035;
    f.type = kind === 's' ? 'bandpass' : 'highpass'; f.frequency.value = kind === 's' ? 1800 : 7000;
    g.gain.setValueAtTime(kind === 's' ? 0.3 : 0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
    src.connect(f); f.connect(g); g.connect(dest); src.start(t, Math.random() * 0.5); src.stop(t + len + 0.01);
  }
  // Sound effects ----------------------------------------------------------
  sfx(name) {
    if (!this.ctx) return; const t = this.ctx.currentTime + 0.01; const d = this.sg;
    const seq = (notes, step, vol = 0.18, wave = 0.25) => notes.forEach((m, i) => m && this.tone(d, m, t + i * step, step * 0.95, vol, wave));
    switch (name) {
      case 'blip': seq([84], 0.04, 0.12, 0.5); break;
      case 'select': seq([76, 88], 0.05, 0.15); break;
      case 'back': seq([72, 64], 0.05, 0.12); break;
      case 'bump': seq([40], 0.07, 0.15, 'tri'); break;
      case 'door': seq([60, 67, 72], 0.05, 0.12, 0.5); break;
      case 'correct': seq([72, 76, 79, 84], 0.07, 0.17, 0.25); break;
      case 'wrong': seq([52, 47], 0.14, 0.2, 0.125); break;
      case 'quick': seq([79, 84, 88, 91, 96], 0.05, 0.16, 0.125); break;
      case 'hit': this.drum(d, 's', t); seq([45, 38], 0.04, 0.2, 'tri'); break;
      case 'super': this.drum(d, 's', t); this.drum(d, 'k', t); seq([57, 50, 45], 0.04, 0.25, 0.125); break;
      case 'weak': seq([50, 48], 0.05, 0.12, 'tri'); break;
      case 'faint': seq([67, 64, 60, 55, 52, 48, 43], 0.07, 0.15, 0.5); break;
      case 'levelup': seq([72, 76, 79, 84, 0, 84, 88], 0.08, 0.17, 0.25); break;
      case 'heal': seq([72, 76, 79, 84, 79, 84, 88, 91], 0.12, 0.15, 0.5); break;
      case 'throw': seq([60, 64, 67, 72, 76], 0.03, 0.12, 0.5); break;
      case 'shake': seq([55, 50], 0.06, 0.15, 'tri'); break;
      case 'catch': seq([72, 79, 84, 0, 84, 91, 96], 0.09, 0.17, 0.25); break;
      case 'badge': seq([67, 72, 76, 79, 0, 76, 79, 84, 0, 84, 88, 91, 96], 0.1, 0.18, 0.25); break;
      case 'evolve': seq([60, 64, 67, 72, 64, 67, 72, 76, 67, 72, 76, 79, 84], 0.09, 0.16, 0.125); break;
      case 'item': seq([76, 79, 84, 88], 0.08, 0.15, 0.5); break;
      case 'encounter': seq([84, 0, 84, 0, 88, 84, 79, 76], 0.05, 0.14, 0.125); break;
      case 'buy': seq([84, 91], 0.06, 0.14, 0.5); break;
      case 'boost': seq([60, 64, 67, 72, 76, 79], 0.04, 0.14, 0.25); break;
      case 'tick': seq([96], 0.02, 0.06, 0.5); break;
      case 'chat': seq([79, 86], 0.04, 0.1, 0.5); break;
    }
  }
  jingle(name) { // short non-looping fanfare that pauses the music
    const prev = this.key; this.stop(); this.sfx(name); return prev;
  }
}
export const audio = new Chip();
export const MOOD_KEYS = Object.keys(MOODS);
