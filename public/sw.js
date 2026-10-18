// Bump this version whenever any saved app file changes, including this script.
const CACHE_PREFIX = `interval-timer:${self.registration.scope}:`;
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const APP_FILES = [
  "./", "./index.html", "./styles.css", "./app.js", "./offline.js",
  "./manifest.webmanifest", "./icons/timer-180.png",
  "./icons/timer-192.png", "./icons/timer-512.png",
].map((path) => new URL(path, self.registration.scope).href);

self.addEventListener("install", (event) => {
  // addAll succeeds only if every required file can be saved.
  event.waitUntil(caches.open(CACHE_NAME).then((cache) =>
    cache.addAll(APP_FILES.map((url) => new Request(url, { cache: "reload" })))));
  // Let updates wait for all old timer windows to close; never force a refresh.
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) =>
      name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map((name) => caches.delete(name)));
    // On the first installation, the open page can use offline support immediately.
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  // Ignore harmless query strings on our known files, but never cache other sites.
  url.search = "";
  url.hash = "";
  if (!APP_FILES.includes(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    return (await cache.match(url.href)) || fetch(event.request);
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CHECK_OFFLINE_READY") return;
  event.waitUntil((async () => {
    let ready = false;
    try {
      const cache = await caches.open(CACHE_NAME);
      const saved = await Promise.all(APP_FILES.map((url) => cache.match(url)));
      ready = saved.every(Boolean);
    } catch {
      // A storage failure must not be advertised as a ready offline copy.
    }
    event.source?.postMessage({ type: "OFFLINE_STATUS", ready });
  })());
});
