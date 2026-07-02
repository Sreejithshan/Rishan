// ─── Bump VERSION every time you upload new files ────────────────────────
const VERSION = 'rishan-v9';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
];

// ─── INSTALL: pre-cache shell, activate immediately ──────────────────────
self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(VERSION)
      .then(cache => {
        // Cache each file individually so one failure doesn't break all
        return Promise.all(
          SHELL.map(url =>
            cache.add(url).catch(err => console.warn('Cache miss:', url, err))
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE: remove old caches, claim all clients ──────────────────────
self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ─── FETCH: cache-first, always serve something ──────────────────────────
self.addEventListener('fetch', ev => {
  if (ev.request.method !== 'GET') return;

  // Only intercept same-origin requests
  const url = new URL(ev.request.url);
  if (url.origin !== self.location.origin) return;

  ev.respondWith(
    caches.match(ev.request, { ignoreSearch: true })
      .then(cached => {
        // ── Cached: serve immediately, refresh in background ──
        if (cached) {
          fetch(ev.request)
            .then(fresh => {
              if (fresh && fresh.status === 200 && fresh.type === 'basic') {
                caches.open(VERSION).then(c => c.put(ev.request, fresh.clone()));
              }
            })
            .catch(() => {/* offline – fine, we served from cache */});
          return cached;
        }

        // ── Not cached: fetch, cache, return ──
        return fetch(ev.request)
          .then(resp => {
            if (resp && resp.status === 200 && resp.type === 'basic') {
              const toStore = resp.clone();
              caches.open(VERSION).then(c => c.put(ev.request, toStore));
            }
            return resp;
          })
          .catch(() => {
            // Offline and not cached — return the app shell
            return caches.match('./index.html');
          });
      })
  );
});

// ─── MESSAGE: force immediate activation ─────────────────────────────────
self.addEventListener('message', ev => {
  if (ev.data === 'SKIP_WAITING') self.skipWaiting();
});
