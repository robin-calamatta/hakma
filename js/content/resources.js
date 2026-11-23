// External "learn more" resources per topic. {q} is replaced with the URL-encoded term.
// Only reputable, free sources. Links open in a new tab and can be disabled by the admin (CONFIG.EXTERNAL_LINKS).
const ddg = (site) => `https://duckduckgo.com/?q={q}+site%3A${site}`;
const wiki = { name: 'Wikipedia', url: 'https://en.wikipedia.org/w/index.php?search={q}' };
const simple = { name: 'Simple Wikipedia', url: 'https://simple.wikipedia.org/w/index.php?search={q}' };
const khan = { name: 'Khan Academy', url: 'https://www.khanacademy.org/search?page_search_query={q}' };
const mw = { name: 'Dictionary', url: 'https://www.merriam-webster.com/dictionary/{q}' };

export const RESOURCES = {
  cs: [wiki, { name: 'GeeksforGeeks', url: ddg('geeksforgeeks.org') }, { name: 'MIT OCW', url: ddg('ocw.mit.edu') }],
  kubernetes: [{ name: 'kubernetes.io docs', url: 'https://kubernetes.io/search/?q={q}' }, wiki],
  python: [{ name: 'Python docs', url: 'https://docs.python.org/3/search.html?q={q}' }, { name: 'Real Python', url: 'https://realpython.com/search?q={q}' }],
  softeng: [{ name: 'Refactoring.Guru', url: ddg('refactoring.guru') }, { name: 'Martin Fowler', url: ddg('martinfowler.com') }, wiki],
  devops: [{ name: 'Google SRE books', url: ddg('sre.google') }, { name: 'Docker docs', url: ddg('docs.docker.com') }, wiki],
  golang: [{ name: 'go.dev', url: 'https://go.dev/search?q={q}' }, { name: 'Go by Example', url: ddg('gobyexample.com') }],
  terraform: [{ name: 'Terraform docs', url: ddg('developer.hashicorp.com/terraform') }, { name: 'OpenTofu docs', url: ddg('opentofu.org') }],
  electrical: [{ name: 'All About Circuits', url: ddg('allaboutcircuits.com') }, wiki, khan],
  electrician: [{ name: 'ESA (Ontario)', url: ddg('esasafe.com') }, { name: 'All About Circuits', url: ddg('allaboutcircuits.com') }, wiki],
  'math-elem': [khan, simple],
  'math-middle': [khan, simple],
  'math-high': [khan, { name: 'Wolfram MathWorld', url: ddg('mathworld.wolfram.com') }, wiki],
  'ela-elem': [mw, khan, simple],
  'ela-high': [mw, { name: 'Purdue OWL', url: ddg('owl.purdue.edu') }, wiki],
  'science-elem': [simple, khan],
  physics: [khan, { name: 'HyperPhysics', url: ddg('hyperphysics.phy-astr.gsu.edu') }, wiki],
  chemistry: [khan, { name: 'LibreTexts', url: ddg('chem.libretexts.org') }, wiki],
  biology: [khan, { name: 'LibreTexts', url: ddg('bio.libretexts.org') }, wiki],
};

export function resourceLinks(topicId, term) {
  const q = encodeURIComponent(term.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim());
  return (RESOURCES[topicId] || [wiki]).map((r) => ({ name: r.name, url: r.url.replace('{q}', q) }));
}
