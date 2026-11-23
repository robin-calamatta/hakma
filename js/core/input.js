// Unified input: keyboard, up to 4 gamepads, and on-screen touch controls, mapped to up to 4 local players.
const BTN = ['up', 'down', 'left', 'right', 'a', 'b', 'start'];

const SOLO_KEYS = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  KeyZ: 'a', Space: 'a', Enter: 'a', KeyF: 'a', KeyE: 'a',
  KeyX: 'b', Escape: 'b', Backspace: 'b', KeyG: 'b', KeyQ: 'b', ShiftLeft: 'b',
  Tab: 'start', KeyM: 'start', KeyP: 'start',
};
// When 2+ local players share a keyboard
const MULTI_KEYS = [
  { KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right', KeyF: 'a', KeyG: 'b', Tab: 'start', KeyR: 'start', Escape: 'b', Enter: 'a', Space: 'a' },
  { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Period: 'a', Comma: 'b', Slash: 'start', Numpad0: 'a', NumpadDecimal: 'b' },
  {}, {},
];

class Input {
  constructor() {
    this.players = 1;
    this.state = [0, 1, 2, 3].map(() => ({}));
    this.prev = [0, 1, 2, 3].map(() => ({}));
    this.keys = new Set(); this.taps = new Set();
    this.touch = {};
    this.padOwner = {}; // gamepad index -> player slot
    this.repeat = [0, 1, 2, 3].map(() => ({ dir: null, t: 0 }));
    this.textMode = false; // true while typing into an <input>
    this.lastDevice = 'keyboard';
    addEventListener('keydown', (e) => {
      if (this.textMode) return;
      this.keys.add(e.code); this.taps.add(e.code); this.lastDevice = 'keyboard';
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'Backspace'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
  }
  setPlayers(n) { this.players = Math.max(1, Math.min(4, n)); }
  assignPad(padIndex, slot) { this.padOwner[padIndex] = slot; }
  setTouch(btn, on) { this.touch[btn] = on; this.lastDevice = 'touch'; }

  update(dt) {
    for (let p = 0; p < 4; p++) { this.prev[p] = this.state[p]; this.state[p] = {}; }
    const map = this.players <= 1 ? [SOLO_KEYS] : MULTI_KEYS;
    for (const code of new Set([...this.keys, ...this.taps])) {
      for (let p = 0; p < map.length; p++) { const b = map[p][code]; if (b) this.state[p][b] = true; }
    }
    this.frameTaps = new Set(this.taps); this.taps.clear();
    for (const b of BTN) if (this.touch[b]) this.state[0][b] = true;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let auto = this.players <= 1 ? 0 : null;
    for (const gp of pads) {
      if (!gp) continue;
      let slot = this.padOwner[gp.index];
      if (slot === undefined) slot = auto !== null ? auto : Math.min(gp.index, 3);
      const s = this.state[slot];
      const B = (i) => gp.buttons[i] && gp.buttons[i].pressed;
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      if (B(12) || ay < -0.5) s.up = true;
      if (B(13) || ay > 0.5) s.down = true;
      if (B(14) || ax < -0.5) s.left = true;
      if (B(15) || ax > 0.5) s.right = true;
      if (B(0)) s.a = true;
      if (B(1) || B(2)) s.b = true;
      if (B(9) || B(8) || B(3)) s.start = true;
      if (gp.buttons.some((b) => b.pressed)) this.lastDevice = 'gamepad';
    }
    for (let p = 0; p < 4; p++) {
      const d = this.dir(p); const r = this.repeat[p];
      if (d !== r.dir) { r.dir = d; r.t = 0; r.fire = !!d; } else if (d) { r.t += dt; r.fire = r.t > 0.32 && ((r.t - 0.32) % 0.085) < dt; } else r.fire = false;
    }
  }
  held(p, b) { return !!this.state[p][b]; }
  pressed(p, b) { return !!this.state[p][b] && !this.prev[p][b]; }
  anyPressed(b) { for (let p = 0; p < 4; p++) if (this.pressed(p, b)) return p; return -1; }
  dir(p) { const s = this.state[p]; return s.up ? 'up' : s.down ? 'down' : s.left ? 'left' : s.right ? 'right' : null; }
  // menu navigation with key-repeat, from any player
  nav() { for (let p = 0; p < 4; p++) if (this.repeat[p].fire) return this.repeat[p].dir; return null; }
  clearEdges() { for (let p = 0; p < 4; p++) this.prev[p] = { ...this.state[p] }; }
}
export const input = new Input();
