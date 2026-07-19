const CACHE = 'glass-cinema-v10-2';
const CORE = [
  './',
  'index.html',
  'styles.css?v=10.2',
  'player.js?v=10.2',
  'manifest.webmanifest',
  'catalogues/curated-movie.json',
  'catalogues/curated-tv.json',
  'icons/icon180.png',
  'icons/icon192.png',
  'icons/icon512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.includes('/catalogues/')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(event.request, { ignoreSearch: true })));
    return;
  }

  // Network first prevents an old iPad Home Screen cache from preserving a broken layout.
  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match('index.html')))
  );
});
