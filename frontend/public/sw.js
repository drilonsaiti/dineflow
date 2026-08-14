// Minimal service worker: caches the app shell for fast reloads and
// installability. Deliberately does NOT cache/serve API responses or
// socket connections — order data, menu availability, and everything
// staff-facing must always come from the network. The one exception is
// the public menu GET, cached network-first so a customer's menu page
// doesn't go fully blank on a dropped connection (see registerSW.ts).
const SHELL_CACHE = 'qr-saas-shell-v1';
const SHELL_ASSETS = ['/', '/admin', '/manifest.json'];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)));
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k)))),
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Network-first for the public menu API so a customer sees the last
    // known menu if their connection drops — never for anything else.
    if (url.pathname.startsWith('/public/menu/')) {
        event.respondWith(
            fetch(event.request)
                .then((res) => {
                    const clone = res.clone();
                    caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, clone));
                    return res;
                })
                .catch(() => caches.match(event.request)),
        );
        return;
    }

    // Everything else: network-first, falling back to cache only for
    // same-origin navigations (page shell), never for API calls.
    if (event.request.mode === 'navigate') {
        event.respondWith(fetch(event.request).catch(() => caches.match('/')));
    }
});