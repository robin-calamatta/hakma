// Offline support: precache the whole game, serve cache-first, keep the API network-only.
const VERSION = 'hakma-29d610217c';
const FILES = ["./","css/style.css","fonts/pressstart2p.woff2","fonts/vt323.woff2","icons/icon-192.png","icons/icon-512-maskable.png","icons/icon-512.png","index.html","js/config.js","js/content/generators.js","js/content/index.js","js/content/topics/cs.js","js/content/topics/devops.js","js/content/topics/ela.js","js/content/topics/electrical.js","js/content/topics/electrician.js","js/content/topics/golang.js","js/content/topics/kubernetes.js","js/content/topics/math.js","js/content/topics/python.js","js/content/topics/science.js","js/content/topics/softeng.js","js/content/topics/terraform.js","js/content/types.js","js/core/audio.js","js/core/input.js","js/core/rng.js","js/core/sprites.js","js/game/battle.js","js/game/content.js","js/game/events.js","js/game/maps.js","js/game/menus.js","js/game/net.js","js/game/puzzles.js","js/game/state.js","js/game/ui.js","js/game/world.js","js/main.js","legal/credits.html","legal/eula.html","legal/privacy.html","legal/terms.html","manifest.webmanifest"];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/') || u.pathname.startsWith('/ws')) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => {
    const net = fetch(e.request).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, cp)); } return r; }).catch(() => hit || caches.match('./'));
    return hit || net;
  }));
});
