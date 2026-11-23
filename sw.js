// Offline + auto-update: when online, always fetch the latest files (network-first) and refresh the cache;
// when offline, serve the cached copy. The API is never cached.
const VERSION = 'hakma-2a3bfd66db';
const FILES = ["./","css/style.css","fonts/pressstart2p.woff2","fonts/vt323.woff2","icons/icon-192.png","icons/icon-512-maskable.png","icons/icon-512.png","index.html","js/config.js","js/content/examples/biology.js","js/content/examples/chemistry.js","js/content/examples/cs.js","js/content/examples/devops.js","js/content/examples/ela-elem.js","js/content/examples/ela-high.js","js/content/examples/electrical.js","js/content/examples/electrician.js","js/content/examples/golang.js","js/content/examples/index.js","js/content/examples/kubernetes.js","js/content/examples/math-elem.js","js/content/examples/math-high.js","js/content/examples/math-middle.js","js/content/examples/physics.js","js/content/examples/python.js","js/content/examples/science-elem.js","js/content/examples/softeng.js","js/content/examples/terraform.js","js/content/generators.js","js/content/index.js","js/content/resources.js","js/content/topics/cs.js","js/content/topics/devops.js","js/content/topics/ela.js","js/content/topics/electrical.js","js/content/topics/electrician.js","js/content/topics/golang.js","js/content/topics/kubernetes.js","js/content/topics/math.js","js/content/topics/python.js","js/content/topics/science.js","js/content/topics/softeng.js","js/content/topics/terraform.js","js/content/types.js","js/core/audio.js","js/core/input.js","js/core/rng.js","js/core/scenery.js","js/core/sprites.js","js/core/touchlayout.js","js/core/view.js","js/game/battle.js","js/game/content.js","js/game/events.js","js/game/learn.js","js/game/maps.js","js/game/menus.js","js/game/net.js","js/game/puzzles.js","js/game/state.js","js/game/ui.js","js/game/world.js","js/main.js","legal/credits.html","legal/eula.html","legal/privacy.html","legal/terms.html","manifest.webmanifest"];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => Promise.all(FILES.map((f) => fetch(f, { cache: 'reload' }).then((r) => r.ok && c.put(f, r)).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/') || u.pathname.startsWith('/ws')) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 4000);
      const r = await fetch(e.request, { cache: 'no-cache', signal: ctrl.signal }); clearTimeout(t);
      if (r.ok) cache.put(e.request, r.clone());
      return r;
    } catch {
      return (await caches.match(e.request, { ignoreSearch: true })) || (e.request.mode === 'navigate' ? caches.match('./') : Response.error());
    }
  })());
});
