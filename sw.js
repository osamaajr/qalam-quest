// Keep artwork visible through brief network interruptions and offline use.
const CACHE = 'qalam-v41';
const PREFIX = 'qalam-v';
const FILES = ['./', 'index.html', 'teacher.html', 'css/style.css', 'css/mascot.css', 'css/animals.css', 'js/arabic-text.js', 'js/content.js', 'js/audio-manifest.js', 'js/logo.js', 'js/logo-component.js', 'assets/logo/qalam-icon.svg', 'assets/characters/zaid-poses.webp', 'assets/characters/huda-poses.webp', 'assets/animals/hoopoe-poses.webp', 'assets/animals/bee-poses.webp', 'assets/animals/ant-poses.webp', 'assets/animals/camel-poses.webp', 'assets/animals/elephant-poses.webp', 'assets/animals/whale-poses.webp', 'assets/animals/cow-poses.webp', 'js/animals.js', 'js/mascot.js', 'js/app.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'assets/icons/bell.png', 'assets/icons/bolt.png', 'assets/icons/book.png', 'assets/icons/books.png', 'assets/icons/bulb.png', 'assets/icons/construction.png', 'assets/icons/crown.png', 'assets/icons/fire.png', 'assets/icons/gear.png', 'assets/icons/gem.png', 'assets/icons/glowing-star.png', 'assets/icons/grad.png', 'assets/icons/heart.png', 'assets/icons/house.png', 'assets/icons/hundred.png', 'assets/icons/key.png', 'assets/icons/lock.png', 'assets/icons/magnifier.png', 'assets/icons/medal.png', 'assets/icons/moon.png', 'assets/icons/nose.png', 'assets/icons/notes.png', 'assets/icons/party.png', 'assets/icons/pen.png', 'assets/icons/practice.png', 'assets/icons/rocket.png', 'assets/icons/scroll.png', 'assets/icons/seedling.png', 'assets/icons/shield.png', 'assets/icons/shop.png', 'assets/icons/snowflake.png', 'assets/icons/sparkles.png', 'assets/icons/speaker.png', 'assets/icons/star.png', 'assets/icons/stop.png', 'assets/icons/stopwatch.png', 'assets/icons/sun.png', 'assets/icons/target.png', 'assets/icons/thread.png', 'assets/icons/trophy.png', 'assets/icons/turtle.png'];
const scope = new URL(self.registration.scope);
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then(async (c) => {
  // Keep the number of simultaneous image requests modest, especially on mobile Safari.
  const failed = [];
  for (let i = 0; i < FILES.length; i += 6) {
    const batch = FILES.slice(i, i + 6);
    const results = await Promise.allSettled(batch.map((file) => c.add(file)));
    results.forEach((result, index) => { if (result.status === 'rejected') failed.push(batch[index]); });
  }
  for (const file of failed) { try { await c.add(file); } catch (_) { /* fetched on demand */ } }
  await self.skipWaiting();
})));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) =>
  Promise.all(ks.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k)))
).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  // Sound clips go straight to the browser. Safari asks for audio in byte ranges and will not play a
  // service-worker reply that ignores them, so handling audio here made the game silent on Safari/iOS.
  if (req.headers.has('range') || req.destination === 'audio' || /\.(?:mp3|m4a|wav|ogg)$/i.test(url.pathname)) return;
  const isImage = /\.(?:png|svg|webp|jpe?g)$/i.test(url.pathname);
  if (isImage) {
    const update = fetch(req, { cache: 'no-cache' }).then(async (r) => {
      if (r.ok) { try { await (await caches.open(CACHE)).put(req, r.clone()); } catch (_) { /* quota */ } }
      return r;
    });
    // waitUntil must be registered while the fetch event is active, not after an await.
    e.waitUntil(update.catch(() => {}));
    e.respondWith(caches.match(req).then((cached) => cached || update).catch(() => update.catch(() => Response.error())));
    return;
  }
  e.respondWith((async () => {
    try {
      const r = await fetch(req, { cache: 'no-cache' });
      if (r.ok) { try { await (await caches.open(CACHE)).put(req, r.clone()); } catch (_) { /* quota */ } }
      return r;
    } catch (_) { return (await caches.match(req)) || Response.error(); }
  })());
});
