const CACHE = 'glass-cinema-v10-4';
const CORE = [
  './',
  'index.html',
  'styles.css?v=10.4',
  'player.js?v=10.4',
  'manifest.webmanifest',
  'library-m.json',
  'library-s.json',
  'icon180.png',
  'icon192.png',
  'icon512.png'
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

  if (url.pathname.endsWith('/library-m.json') || url.pathname.endsWith('/library-s.json')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(event.request, { ignoreSearch: true })));
    return;
  }

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
