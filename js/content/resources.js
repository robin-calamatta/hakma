// "Learn more" outside resources for a term. Every link goes straight to a real page, never a search box:
//  - official docs: a hand-picked page per term (content/doclinks.js)
//  - chapter guides: hand-picked best pages for each chapter of every course (content/chapterlinks.js)
//  - Wikipedia: the best-matching article, chosen by title match + subject context (disambiguation pages skipped)
//  - language courses: the word's own dictionary pages (Wiktionary, WordReference, SpanishDict)
// The admin can turn all of these off (CONFIG.EXTERNAL_LINKS / EXTERNAL_LINKS var on Cloudflare).
import { DOCS } from './doclinks.js';
import { CHAPTER_LINKS } from './chapterlinks.js';

// words added to Wikipedia searches so results stay on-topic ("Pod" → Kubernetes pods, not peas)
const CTX = {
  cs: 'computer science', kubernetes: 'Kubernetes', python: 'Python programming', softeng: 'software engineering', devops: 'DevOps',
  golang: 'Go programming language', terraform: 'Terraform infrastructure', electrical: 'electrical engineering', electrician: 'electrical wiring',
  'math-elem': 'mathematics', 'math-middle': 'mathematics', 'math-high': 'mathematics', 'ela-elem': 'English grammar', 'ela-high': 'English grammar',
  'science-elem': 'science', physics: 'physics', chemistry: 'chemistry', biology: 'biology',
  java: 'Java programming', french: 'French language', spanish: 'Spanish language', maltese: 'Maltese language', automotive: 'automobile', finance: 'finance',
  networking: 'computer networking', cybersec: 'computer security', hacking: 'computer security', trading: 'stock market', systemdesign: 'distributed computing', engmanager: 'management',
};
const SIMPLE_WIKI = new Set(['math-elem', 'ela-elem', 'science-elem']);
const LANG = { french: ['French', 'fren'], spanish: ['Spanish', 'esen'], maltese: ['Maltese', null] };
const clean = (term) => term.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+\/\s+.*$/, '').replace(/[…?!¿¡.]/g, '').replace(/\s+/g, ' ').trim();

export function resourceLinks(topicId, term, ci) {
  const out = []; const q = clean(term); const ctx = CTX[topicId] || '';
  const doc = DOCS[topicId]?.map[term];
  if (doc) out.push({ name: DOCS[topicId].name + ': ' + q, url: doc, kind: 'term' });
  const L = LANG[topicId];
  if (L) {
    const word = q.toLowerCase();
    out.push({ name: 'Wiktionary: ' + q, url: `https://en.wiktionary.org/wiki/${encodeURIComponent(word.replace(/ /g, '_'))}#${L[0]}`, kind: 'term' });
    if (L[1]) out.push({ name: 'WordReference: ' + q, url: `https://www.wordreference.com/${L[1]}/${encodeURIComponent(word)}`, kind: 'term' });
    if (topicId === 'spanish') out.push({ name: 'SpanishDict: ' + q, url: `https://www.spanishdict.com/translate/${encodeURIComponent(word)}`, kind: 'term' });
  } else if (!doc) {
    const wiki = SIMPLE_WIKI.has(topicId) ? 'simple' : 'en';
    out.push({ name: (wiki === 'simple' ? 'Simple Wikipedia' : 'Wikipedia') + ': ' + q, wiki, term: q, ctx, kind: 'term' });
  }
  if (topicId.startsWith('ela') && !q.includes(' ')) out.push({ name: 'Merriam-Webster: ' + q.toLowerCase(), url: `https://www.merriam-webster.com/dictionary/${encodeURIComponent(q.toLowerCase())}`, kind: 'term' });
  for (const [name, url] of (CHAPTER_LINKS[topicId]?.[ci] || [])) {
    const m = url.match(/^https:\/\/(en|simple)\.wikipedia\.org\/wiki\/(.+)$/);
    out.push(m ? { name, wiki: m[1], title: decodeURIComponent(m[2]), url0: url, kind: 'chapter' } : { name, url, kind: 'chapter' });
  }
  return out;
}

async function getJSON(url) {
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 4500);
  try { return await (await fetch(url, { signal: ctl.signal })).json(); } finally { clearTimeout(to); }
}
const norm = (t) => String(t || '').toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9à-ÿ ]+/g, ' ').replace(/\s+/g, ' ').trim();
// Pick the Wikipedia article that best matches a term within its subject.
async function wikiBest(lang, term, ctx) {
  const base = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srlimit=8&format=json&origin=*&srsearch=`;
  const [a, b] = await Promise.all([getJSON(base + encodeURIComponent(`${term} ${ctx}`.trim())).catch(() => null), getJSON(base + encodeURIComponent(term)).catch(() => null)]);
  const seen = new Map(); const T = norm(term); const C = norm(ctx).split(' ').filter((w) => w.length > 3);
  [[a, 1], [b, 0]].forEach(([j, withCtx]) => (j?.query?.search || []).forEach((r, i) => {
    const title = r.title; const nt = norm(title.replace(/\s*\(.*\)$/, '')); const qual = norm((title.match(/\((.*)\)$/) || [])[1] || ''); const snip = norm(r.snippet);
    let sc = (8 - i) * 0.3 + (withCtx ? 1 : 0);
    if (nt === T) sc += 10; else if (nt.startsWith(T) || T.startsWith(nt)) sc += 4; else if (T.split(' ').every((w) => nt.includes(w))) sc += 3;
    if (C.some((w) => qual.includes(w))) sc += 4; if (C.some((w) => snip.includes(w))) sc += 2;
    if (/disambiguation/i.test(title) || /may refer to/.test(snip)) sc -= 50; if (/^list of/i.test(title)) sc -= 4;
    seen.set(title, Math.max(seen.get(title) ?? -1e9, sc));
  }));
  const best = [...seen.entries()].sort((x, y) => y[1] - x[1])[0];
  return best && best[1] > 0 ? best[0] : null;
}

// Resolve a link to its final URL.
export async function resolveLink(l) {
  if (l.url) return l.url;
  if (l.wiki && l.title) { // hand-picked article: confirm it exists (follows redirects), else find the closest article
    try { const j = await getJSON(`https://${l.wiki}.wikipedia.org/w/api.php?action=query&redirects=1&format=json&origin=*&titles=${encodeURIComponent(l.title.split('#')[0])}`);
      const pg = Object.values(j?.query?.pages || {})[0]; if (pg && !('missing' in pg)) return l.url0;
      const t = await wikiBest(l.wiki, l.title.replace(/_/g, ' ').replace(/#.*/, ''), ''); if (t) return `https://${l.wiki}.wikipedia.org/wiki/${encodeURIComponent(t.replace(/ /g, '_'))}`; } catch {}
    return l.url0;
  }
  if (l.wiki) {
    try { const t = await wikiBest(l.wiki, l.term, l.ctx); if (t) return `https://${l.wiki}.wikipedia.org/wiki/${encodeURIComponent(t.replace(/ /g, '_'))}`; } catch {}
    return `https://${l.wiki}.wikipedia.org/wiki/${encodeURIComponent(l.term.replace(/ /g, '_'))}`;
  }
  return null;
}

// Open in a new tab. The tab is opened immediately (so pop-up blockers allow it), then pointed at the resolved page.
export async function openLink(l) {
  if (l.url) { window.open(l.url, '_blank', 'noopener'); return; }
  const w = window.open('about:blank', '_blank');
  try { if (w) { w.opener = null; w.document.title = 'Opening…'; w.document.body.style.cssText = 'font:16px sans-serif;background:#1a1040;color:#fff;padding:2em'; w.document.body.textContent = `Opening ${l.name}…`; } } catch {}
  const url = await resolveLink(l);
  if (url) { if (w) w.location.replace(url); else window.open(url, '_blank', 'noopener'); }
  else if (w) w.close();
}
