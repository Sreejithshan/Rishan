// ── Bump this version whenever you push new files ──
const VERSION = 'rishan-v6';
const ASSETS = [
  './',
  './index.html',
  './admin.html',
  './manifest.json',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png'
];

// Install: pre-cache everything immediately
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()) // activate without waiting
  );
});

// Activate: clear old caches, claim all clients immediately
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim()) // take control of all open tabs
  );
});

// Fetch: cache-first for app files, network-first for everything else
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Same-origin app files → cache first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) {
          // Serve from cache, update in background
          fetch(event.request).then(fresh => {
            if (fresh && fresh.status === 200) {
              caches.open(VERSION).then(c => c.put(event.request, fresh.clone()));
            }
          }).catch(() => {});
          return cached;
        }
        // Not cached — fetch and cache
        return fetch(event.request).then(resp => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(VERSION).then(c => c.put(event.request, clone));
          }
          return resp;
        }).catch(() => caches.match('./index.html'));
      })
    );
  }
  // Cross-origin → network only
});

// Listen for messages from the page (e.g. force update)
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
