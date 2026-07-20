const CACHE_NAME = 'prime-authority-v1';
const ASSETS_TO_CACHE = [
  '/',
  'index.html',
  'join.html',
  'tournament.html',
  'scrims.html',
  'style.css',
  'script.js',
  'modal.js',
  'loading.js',
  'modal.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
          return Promise.resolve();
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Only handle GET requests
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // cache same-origin responses
          try {
            const resClone = res.clone();
            if (req.url.startsWith(self.location.origin)) {
              caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
            }
          } catch (e) {}
          return res;
        })
        .catch(() => caches.match('index.html'));
    })
  );
});
