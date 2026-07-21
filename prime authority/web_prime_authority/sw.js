const CACHE_NAME = 'prime-authority-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './join.html',
  './tournament.html',
  './scrims.html',
  './style.css',
  './script.js',
  './modal.js',
  './loading.js',
  './modal.css'
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
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isHtmlPage = isSameOrigin && (url.pathname.endsWith('/join.html') || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/tournament.html') || url.pathname.endsWith('/scrims.html'));

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (isSameOrigin && res && res.status === 200) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
  );
});
