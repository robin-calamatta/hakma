// "Learn more" outside resources for a term. Every link goes to a real page, never a site's search box:
//  - official docs: a hand-picked page per term (content/doclinks.js)
//  - Wikipedia: asks Wikipedia's search API for the best article for "<term> <subject>" and opens that article
//  - specialist sites: DuckDuckGo's "jump to first result" (\ prefix) limited to that site
// The admin can turn all of these off (CONFIG.EXTERNAL_LINKS / EXTERNAL_LINKS var on Cloudflare).
import { DOCS } from './doclinks.js';

// words added to searches so results stay on-topic ("Pod" → Kubernetes pods, not peas)
const CTX = {
  cs: 'computer science', kubernetes: 'Kubernetes', python: 'Python programming', softeng: 'software engineering', devops: 'DevOps',
  golang: 'Go programming language', terraform: 'Terraform HashiCorp', electrical: 'electrical engineering', electrician: 'electrical wiring',
  'math-elem': 'mathematics', 'math-middle': 'mathematics', 'math-high': 'mathematics', 'ela-elem': 'English grammar', 'ela-high': 'English grammar',
  'science-elem': 'science', physics: 'physics', chemistry: 'chemistry', biology: 'biology',
};
const SIMPLE_WIKI = new Set(['math-elem', 'ela-elem', 'science-elem']);
// one specialist site per topic (opened via "first result")
const SITE = {
  cs: ['GeeksforGeeks', 'geeksforgeeks.org'], kubernetes: null, python: ['Real Python', 'realpython.com'], softeng: ['Refactoring.Guru', 'refactoring.guru'],
  devops: ['Atlassian DevOps guides', 'atlassian.com'], golang: ['Go by Example', 'gobyexample.com'], terraform: ['Spacelift blog', 'spacelift.io'],
  electrical: ['All About Circuits', 'allaboutcircuits.com'], electrician: ['Electrical Safety Authority', 'esasafe.com'],
  'math-elem': ['Khan Academy', 'khanacademy.org'], 'math-middle': ['Khan Academy', 'khanacademy.org'], 'math-high': ['Khan Academy', 'khanacademy.org'],
  'ela-elem': ['Khan Academy', 'khanacademy.org'], 'ela-high': ['Purdue OWL', 'owl.purdue.edu'], 'science-elem': ['Khan Academy', 'khanacademy.org'],
  physics: ['Khan Academy', 'khanacademy.org'], chemistry: ['LibreTexts', 'chem.libretexts.org'], biology: ['Khan Academy', 'khanacademy.org'],
};
const clean = (term) => term.replace(/[()]/g, ' ').replace(/\s+\/\s+/g, ' ').replace(/\s+/g, ' ').trim();
const lucky = (q, site) => `https://duckduckgo.com/?q=${encodeURIComponent('\\' + q + (site ? ' site:' + site : ''))}`;

export function resourceLinks(topicId, term) {
  const out = []; const q = clean(term); const ctx = CTX[topicId] || '';
  const doc = DOCS[topicId]?.map[term];
  if (doc) out.push({ name: DOCS[topicId].name, url: doc });
  const wiki = SIMPLE_WIKI.has(topicId) ? 'simple' : 'en';
  out.push({ name: wiki === 'simple' ? 'Simple Wikipedia' : 'Wikipedia', wiki, q: `${q} ${ctx}`.trim(), fallback: lucky(`${q} ${ctx}`, `${wiki}.wikipedia.org`) });
  const s = SITE[topicId]; if (s) out.push({ name: s[0], url: lucky(`${q} ${ctx}`, s[1]) });
  if (topicId.startsWith('ela')) out.push({ name: 'Dictionary', url: `https://www.merriam-webster.com/dictionary/${encodeURIComponent(q.split(' ')[0].toLowerCase())}` });
  return out;
}

// Resolve a link to its final URL (Wikipedia links ask the Wikipedia API for the best-matching article).
export async function resolveLink(l) {
  if (l.url) return l.url;
  if (l.wiki) {
    try {
      const api = `https://${l.wiki}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(l.q)}&srlimit=1&format=json&origin=*`;
      const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 4000);
      const j = await (await fetch(api, { signal: ctl.signal })).json(); clearTimeout(to);
      const title = j?.query?.search?.[0]?.title;
      if (title) return `https://${l.wiki}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
    } catch {}
    return l.fallback;
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
