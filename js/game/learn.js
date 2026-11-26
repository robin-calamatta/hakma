// "Learn more" — deeper look at one term: definition, worked examples, related questions, the Hakma that embodies it,
// and (if the admin allows it) links to outside resources that open in a new browser tab.
import { G } from './state.js';
import { ui, fmt } from './ui.js';
import { esc } from '../core/rng.js';
import { CONFIG } from '../config.js';
import { resourceLinks, openLink } from '../content/resources.js';
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

// Extras shown after every answer: one or two examples and a different question on the same idea, with its answer.
const relCache = new Map();
const words = (t) => new Set(norm(t).replace(/[^a-z0-9à-ÿ ]+/g, ' ').split(' ').filter((x) => x.length > 3));
export function questionExtras(q) {
  const w = W(); if (!w || !q) return null;
  let T = null; try { T = termForQuestion(q); } catch {}
  if (!T) { // no term named in the question: pick the chapter term that shares the most words with it
    const mine = words([q.q, q.a, q.expl].join(' ')); let best = 0;
    for (const t of w.cities[Math.max(0, Math.min(7, q.ci ?? 0))]?.terms || []) { let sc = 0; for (const x of words([t.term, t.def, ...(t.ex || [])].join(' '))) if (mine.has(x)) sc++; if (sc > best) { best = sc; T = t; } }
    if (best < 2) T = null; }
  const ex = []; let alt = null, altId = null;
  if (T?.ex?.length && !q.regen) { const e = T.ex.slice(); while (e.length && ex.length < 2) ex.push(e.splice(Math.floor(Math.random() * e.length), 1)[0]); }
  if (q.regen) { // generated drills: make a fresh one of the same kind
    for (let i = 0; i < 6 && !alt; i++) { const n = q.regen(); if (n && n.q !== q.q) alt = { q: n.q, a: n.a, expl: n.expl }; }
    if (ex.length < 2) for (let i = 0; i < 6 && ex.length < (ex.length ? 2 : 1); i++) { const n = q.regen(); if (n && n.q !== q.q && n.q !== alt?.q) ex.push(`${n.q.replace(/\n/g, ' ')} → *${n.a}*`); }
  }
  if (!alt) {
    const same = (Q) => Q && Q.q !== q.q && !(Q.a === q.a && Q.ci === q.ci && Q.q.slice(0, 20) === q.q.slice(0, 20));
    let cand = [];
    if (T) { if (!relCache.has(T.id)) { const out = []; for (const Q of Object.values(w.qIndex)) { if (Q.id === T.id + 'd' || Q.id === T.id + 'r' || mentions([Q.q, Q.a].join(' '), T.term)) out.push(Q); } relCache.set(T.id, out); } cand = relCache.get(T.id).filter(same); }
    if (!cand.length) { // closest question in the same chapter by shared words
      const mine = words(q.q + ' ' + q.a); const pool = w.cities[Math.max(0, Math.min(7, q.ci ?? 0))]?.pool || [];
      let best = 0; for (const Q of pool) { if (!same(Q)) continue; let sc = 0; for (const x of words(Q.q + ' ' + Q.a)) if (mine.has(x)) sc++; if (sc > best) { best = sc; cand = [Q]; } else if (sc === best && sc > 0) cand.push(Q); }
      if (!cand.length) cand = pool.filter((Q) => same(Q) && (Q.lvl || 1) <= (q.lvl || 1) + 1);
    }
    if (cand.length) { const Q = cand[Math.floor(Math.random() * cand.length)]; alt = { q: Q.q, a: Q.a, expl: Q.expl }; altId = Q.id; }
  }
  if (!ex.length && alt && !T) { // no term of its own: borrow the examples of the idea the alternative question is about
    const T2 = (() => { try { return termForQuestion({ ...alt, id: altId }); } catch { return null; } })();
    if (T2?.ex?.length) ex.push(...T2.ex.slice(0, 2)); else if (T2) ex.push(`${T2.term}: ${T2.def}`); }
  if (!ex.length && T) ex.push(`${T.term}: ${T.def}`);
  if (!ex.length) { // last resort: a closely related worked question from the same chapter
    const mine = words([q.q, q.a].join(' ')); const pool = w.cities[Math.max(0, Math.min(7, q.ci ?? 0))]?.pool || []; let best = -1, pick = null;
    for (const Q of pool) { if (Q.q === q.q || Q.q === alt?.q) continue; let sc = Math.random() * 0.5; for (const x of words(Q.q + ' ' + Q.a)) if (mine.has(x)) sc++; if (sc > best) { best = sc; pick = Q; } }
    if (pick) ex.push(`${pick.q.replace(/\n/g, ' ')} → *${pick.a}*${pick.expl ? ' — ' + pick.expl : ''}`); }
  return (ex.length || alt) ? { ex, alt, T } : null;
}

function related(T) {
  const w = W(); const out = [];
  for (const Q of Object.values(w.qIndex)) { if (Q.term) continue; if (mentions([Q.q, Q.a, Q.expl].join(' '), T.term)) out.push(Q); if (out.length >= 3) break; }
  return out;
}

export async function learnMore(T) {
  if (!T) return;
  const w = W(); const sp = Object.values(w.species).find((s) => s.termId === T.id && s.stage === 0) || Object.values(w.species).find((s) => s.termId === T.id);
  const links = externalOn() ? resourceLinks(w.id, T.term, T.ci) : []; const tl = links.map((l, i) => [l, i]).filter(([l]) => l.kind !== 'chapter'), cl = links.map((l, i) => [l, i]).filter(([l]) => l.kind === 'chapter');
  const rel = related(T); const city = w.cities[T.ci];
  let img = ''; try { if (sp) img = monsterDataURL(sp); } catch {}
  await ui.panel({ title: '📖 ' + esc(T.term), wide: true, cls: 'learnp',
    render: () => `<div class="lm">
      <p class="lm-def">${fmt(esc(T.def))}</p>
      <p class="dim">Chapter ${T.ci + 1}: ${esc(city ? city.theme : '')}</p>
      ${T.ex && T.ex.length ? `<h3>Examples</h3><ol class="lm-ex">${T.ex.map((e) => `<li>${fmt(esc(e))}</li>`).join('')}</ol>` : ''}
      ${rel.length ? `<h3>Worked questions</h3>${rel.map((Q) => `<div class="term qa"><b>Q: ${esc(Q.q)}</b><span>A: ${esc(Q.a)} — <i>${esc(Q.expl)}</i></span></div>`).join('')}` : ''}
      ${sp ? `<h3>Embodied by</h3><div class="lm-mon">${img ? `<img src="${img}" alt="">` : ''}<span><b>${esc(sp.name)}</b> · ${esc(sp.type)} type<br><span class="dim">Catch it to keep this idea close.</span></span></div>` : ''}
      ${tl.length ? `<h3>Look it up (opens your browser)</h3><div class="row lm-links">${tl.map(([l, i]) => `<button data-nav data-act="open" data-arg="${i}">🔗 ${esc(l.name)}</button>`).join('')}</div>` : ''}
      ${cl.length ? `<h3>Best guides for this chapter</h3><div class="row lm-links">${cl.map(([l, i]) => `<button data-nav data-act="open" data-arg="${i}">📘 ${esc(l.name)}</button>`).join('')}</div>` : ''}
      <div class="row"><button data-nav data-act="__close">Done</button></div></div>`,
    actions: { open: (i) => { const l = links[+i]; if (l && externalOn()) openLink(l); } } });
}

G.learnMore = learnMore; G.termForQuestion = termForQuestion; G.questionExtras = questionExtras;
