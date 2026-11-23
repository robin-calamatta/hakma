// On-screen controls you can drag anywhere and resize. Layout is saved per orientation in localStorage.
const KEY = 'hakma.touchLayout.v1';
const IDS = { dpad: 'D-pad', a: 'A button', b: 'B button', start: 'Menu button', run: 'Run button' };
let saved = {};
try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch {}
const orient = () => (innerHeight > innerWidth ? 'portrait' : 'landscape');
const els = () => ({ dpad: document.getElementById('dpad'), a: document.querySelector('#touch [data-b="a"]'), b: document.querySelector('#touch [data-b="b"]'), start: document.querySelector('#touch [data-b="start"]'), run: document.querySelector('#touch [data-b="run"]') });

function defaults() {
  const vw = innerWidth, vh = innerHeight;
  if (orient() === 'portrait') {
    const st = document.getElementById('stage').getBoundingClientRect(); const top = st.bottom, cy = (top + vh) / 2;
    return { dpad: { x: 0.24, y: cy / vh, s: 1.1 }, b: { x: 0.64, y: (cy + 26) / vh, s: 1.05 }, a: { x: 0.84, y: (cy - 26) / vh, s: 1.05 }, start: { x: 0.36, y: (top + 34) / vh, s: 1 }, run: { x: 0.64, y: (top + 34) / vh, s: 1 }, op: 1 };
  }
  return { dpad: { x: 0.085, y: 0.62, s: 0.85 }, b: { x: 0.9, y: 0.74, s: 0.85 }, a: { x: 0.94, y: 0.46, s: 0.85 }, start: { x: 0.08, y: 0.12, s: 0.8 }, run: { x: 0.92, y: 0.12, s: 0.8 }, op: 0.6 };
}
export function layout() { const d = defaults(); const s = saved[orient()]; return s ? { ...d, ...s } : d; }
export function applyLayout() {
  const L = layout(); const E = els();
  for (const k in IDS) { const e = E[k]; if (!e) continue; const p = L[k]; e.style.left = p.x * 100 + '%'; e.style.top = p.y * 100 + '%'; e.style.transform = `translate(-50%, -50%) scale(${p.s})`; }
  const t = document.getElementById('touch'); if (t) t.style.setProperty('--op', L.op ?? 1);
}
function save(L) { saved[orient()] = L; try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch {} }

export function editControls() {
  return new Promise((done) => {
    document.body.classList.add('editctl');
    let L = JSON.parse(JSON.stringify(layout())); let sel = 'a';
    const bar = document.createElement('div'); bar.id = 'ctlbar';
    const render = () => { bar.innerHTML = `<b>Drag controls to move them</b><span>Selected: ${IDS[sel]}</span><div class="r"><button data-k="minus">− Smaller</button><button data-k="plus">+ Bigger</button><button data-k="op">Opacity ${Math.round((L.op ?? 1) * 100)}%</button><button data-k="reset">Reset</button><button data-k="done">✔ Done</button></div>`; };
    render(); document.body.appendChild(bar);
    const E = els(); const mark = () => { for (const k in IDS) E[k]?.classList.toggle('ctlsel', k === sel); };
    const apply = () => { saved[orient()] = L; applyLayout(); mark(); };
    bar.addEventListener('click', (ev) => {
      const k = ev.target.dataset?.k; if (!k) return; ev.stopPropagation();
      if (k === 'plus') L[sel].s = Math.min(2.2, +(L[sel].s + 0.1).toFixed(2));
      if (k === 'minus') L[sel].s = Math.max(0.5, +(L[sel].s - 0.1).toFixed(2));
      if (k === 'op') { const steps = [1, 0.8, 0.6, 0.4, 0.25]; const i = steps.indexOf(L.op ?? 1); L.op = steps[(i + 1) % steps.length]; }
      if (k === 'reset') { delete saved[orient()]; L = JSON.parse(JSON.stringify(defaults())); }
      if (k === 'done') { save(L); cleanup(); return; }
      apply(); render();
    });
    const drags = [];
    for (const k in IDS) {
      const e = E[k]; if (!e) continue;
      const down = (ev) => { if (!document.body.classList.contains('editctl')) return; ev.preventDefault(); ev.stopPropagation(); sel = k; render(); mark(); e.setPointerCapture?.(ev.pointerId);
        const move = (m) => { L[k].x = Math.max(0.03, Math.min(0.97, m.clientX / innerWidth)); L[k].y = Math.max(0.03, Math.min(0.97, m.clientY / innerHeight)); applyLayout(); };
        const up = () => { e.removeEventListener('pointermove', move); e.removeEventListener('pointerup', up); e.removeEventListener('pointercancel', up); };
        e.addEventListener('pointermove', move); e.addEventListener('pointerup', up); e.addEventListener('pointercancel', up); };
      e.addEventListener('pointerdown', down, true); drags.push([e, down]);
    }
    const wheel = (ev) => { ev.preventDefault(); L[sel].s = Math.max(0.5, Math.min(2.2, +(L[sel].s + (ev.deltaY < 0 ? 0.05 : -0.05)).toFixed(2))); apply(); render(); };
    addEventListener('wheel', wheel, { passive: false });
    const cleanup = () => { for (const [e, f] of drags) e.removeEventListener('pointerdown', f, true); removeEventListener('wheel', wheel); bar.remove(); for (const k in IDS) E[k]?.classList.remove('ctlsel'); document.body.classList.remove('editctl'); applyLayout(); done(); };
    apply();
  });
}
export const editingControls = () => document.body.classList.contains('editctl');
