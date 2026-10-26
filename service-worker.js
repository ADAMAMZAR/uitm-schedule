const CACHE = 'uitm-sunday-studio-v20';
const ASSETS = ['./', './index.html', './styles.css', './apel.css', './apel-actions.css', './dates.css', './catalogue.js', './calendar.js', './progress.js', './app.js', './manifest.webmanifest'];

// skipWaiting: a new version takes over on the next reload. cache: 'reload' skips the browser's HTTP cache so a deploy never caches stale files.
self.addEventListener('install', (event) => { self.skipWaiting(); event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))); });
self.addEventListener('activate', (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    const copy = response.clone();
    if (new URL(event.request.url).origin === self.location.origin) caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  })));
});
