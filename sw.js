// Offline support: always ask the network first (revalidating the HTTP cache so
// updates show up straight away), and fall back to the saved copy when offline.
const CACHE = 'qalam-v29';
const FILES = ['./', 'index.html', 'teacher.html', 'css/style.css', 'css/mascot.css', 'css/animals.css', 'js/arabic-text.js', 'js/content.js', 'js/audio-manifest.js', 'js/logo.js', 'js/logo-component.js', 'assets/logo/qalam-icon.svg', 'assets/characters/zaid-poses.png', 'assets/characters/huda-poses.png', 'assets/animals/hoopoe-poses.png', 'assets/animals/bee-poses.png', 'assets/animals/ant-poses.png', 'assets/animals/camel-poses.png', 'assets/animals/elephant-poses.png', 'assets/animals/whale-poses.png', 'assets/animals/cow-poses.png', 'js/animals.js', 'js/mascot.js', 'js/app.js', 'manifest.webmanifest', 'icons/icon-192.png'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' })
    .then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return r; })
    .catch(() => caches.match(req)));
});
