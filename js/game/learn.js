// "Learn more" — deeper look at one term: definition, worked examples, related questions, the monster that embodies it,
// and (if the admin allows it) links to outside resources that open in a new browser tab.
import { G } from './state.js';
import { ui, fmt } from './ui.js';
import { esc } from '../core/rng.js';
import { CONFIG } from '../config.js';
import { resourceLinks } from '../content/resources.js';
import { monsterDataURL } from '../core/sprites.js';

const W = () => G.W;
export const externalOn = () => CONFIG.EXTERNAL_LINKS !== false;

const norm = (s) => String(s || '').toLowerCase();
function mentions(text, term) {
  const t = norm(term).replace(/\s*\(.*?\)\s*/g, ' ').trim();
  const parts = t.split(/\s*\/\s*/).filter((p) => p.length >= 3);
  const hay = norm(text);
  return parts.some((p) => { const i = hay.indexOf(p); if (i < 0) return false; const a = hay[i - 1], b = hay[i + p.length]; return !(a && /[a-z0-9]/.test(a)) && !(b && /[a-z0-9]/.test(b)); });
}

// Best term for a question (used by the "Learn more" button after answering).
export function termForQuestion(q) {
  const w = W(); if (!w || !q) return null;
  const base = q.id && /^t\d+\.\d+[dr]$/.test(q.id) ? q.id.slice(0, -1) : null;
  if (base) return w.terms.find((t) => t.id === base) || null;
  const text = [q.q, q.a, q.expl].join(' ');
  const cands = w.terms.filter((t) => mentions(text, t.term));
  if (!cands.length) return null;
  cands.sort((a, b) => (b.ci === q.ci) - (a.ci === q.ci) || b.term.length - a.term.length);
  return cands[0];
}

function related(T) {
  const w = W(); const out = [];
  for (const Q of Object.values(w.qIndex)) { if (Q.term) continue; if (mentions([Q.q, Q.a, Q.expl].join(' '), T.term)) out.push(Q); if (out.length >= 3) break; }
  return out;
}

export async function learnMore(T) {
  if (!T) return;
  const w = W(); const sp = Object.values(w.species).find((s) => s.termId === T.id && s.stage === 0) || Object.values(w.species).find((s) => s.termId === T.id);
  const links = externalOn() ? resourceLinks(w.id, T.term) : [];
  const rel = related(T); const city = w.cities[T.ci];
  let img = ''; try { if (sp) img = monsterDataURL(sp); } catch {}
  await ui.panel({ title: '📖 ' + esc(T.term), wide: true, cls: 'learnp',
    render: () => `<div class="lm">
      <p class="lm-def">${fmt(esc(T.def))}</p>
      <p class="dim">Chapter ${T.ci + 1}: ${esc(city ? city.theme : '')}</p>
      ${T.ex && T.ex.length ? `<h3>Examples</h3><ol class="lm-ex">${T.ex.map((e) => `<li>${fmt(esc(e))}</li>`).join('')}</ol>` : ''}
      ${rel.length ? `<h3>Worked questions</h3>${rel.map((Q) => `<div class="term qa"><b>Q: ${esc(Q.q)}</b><span>A: ${esc(Q.a)} — <i>${esc(Q.expl)}</i></span></div>`).join('')}` : ''}
      ${sp ? `<h3>Embodied by</h3><div class="lm-mon">${img ? `<img src="${img}" alt="">` : ''}<span><b>${esc(sp.name)}</b> · ${esc(sp.type)} type<br><span class="dim">Catch it to keep this idea close.</span></span></div>` : ''}
      ${links.length ? `<h3>Go deeper (opens your browser)</h3><div class="row lm-links">${links.map((l, i) => `<button data-nav data-act="open" data-arg="${i}">🔗 ${esc(l.name)}</button>`).join('')}</div>` : ''}
      <div class="row"><button data-nav data-act="__close">Done</button></div></div>`,
    actions: { open: (i) => { const l = links[+i]; if (l && externalOn()) window.open(l.url, '_blank', 'noopener'); } } });
}

G.learnMore = learnMore; G.termForQuestion = termForQuestion;
