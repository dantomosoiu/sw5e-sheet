/*
 * The web version's service worker: the sheet works offline and installs as an app (manifest.webmanifest).
 *
 * dev/build.py writes dist/web/sw.js from this file, filling in VERSION (a hash of every file) and FILES (every
 * file of the sheet, SW5E's data and books included). On install every file is kept in a cache named after the
 * version; pages and data are then answered from it, so the sheet opens without a connection. A new version
 * installs beside the old one and waits: the page offers "Reload" (pwa.js), which asks it to take over.
 *
 * Characters aren't here: they're in IndexedDB (platform.js), which a new version leaves alone. Requests to other
 * sites (SW5E's data service) go to the network as they are.
 */
const VERSION = 'dev';
const FILES = [];
const CACHE = 'sw5e-sheet-' + VERSION;

self.addEventListener('install', (event) => {
  // cache: 'reload' skips the browser's HTTP cache, so the files kept are this version's, not older copies.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('sw5e-sheet-') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'take-over') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // ?id=… and the like pick a character; the file is the same.
    const hit = await cache.match(req, { ignoreSearch: true })
      || (req.mode === 'navigate' && await cache.match('index.html'));
    return hit || fetch(req);
  })());
});
