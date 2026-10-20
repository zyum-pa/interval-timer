// Bump this version whenever any saved app file changes, including this script.
const CACHE_PREFIX = `interval-timer:${self.registration.scope}:`;
const CACHE_NAME = `${CACHE_PREFIX}v6`;
const VERSION = CACHE_NAME.slice(CACHE_PREFIX.length);
// v4 bridges the old updater and replaces any v3 copy with stale host-cached HTML.
const LEGACY_BRIDGE = VERSION === "v4";
let applyingUpdate = false;
const APP_FILES = [
  "./", "./index.html", "./styles.css", "./app.js", "./offline.js",
  "./manifest.webmanifest", "./icons/timer-180.png",
  "./icons/timer-192.png", "./icons/timer-512.png",
].map((path) => new URL(path, self.registration.scope).href);

self.addEventListener("install", (event) => {
  // addAll succeeds only if every required file can be saved.
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_FILES.map((url) => {
      const fresh = new URL(url);
      fresh.searchParams.set("app-release", VERSION);
      return new Request(fresh.href, { cache: "reload" });
    }));
    // This swaps the helper only: existing screens are never navigated or reloaded.
    // Subsequent versions wait for an explicit, coordinated Update app request.
    if (LEGACY_BRIDGE) self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) =>
      name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME
      && !(LEGACY_BRIDGE && ["v1", "v2", "v3"].some((version) => name === CACHE_PREFIX + version)))
      .map((name) => caches.delete(name)));
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
    const file = url.href === self.registration.scope ? new URL("index.html", self.registration.scope).href : url.href;
    return (await cache.match(file, { ignoreSearch: true })) || fetch(event.request);
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "APPLY_UPDATE") {
    event.waitUntil(applyUpdate(event));
    return;
  }
  if (event.data?.type !== "CHECK_OFFLINE_READY") return;
  event.waitUntil((async () => {
    let ready = false;
    try {
      const cache = await caches.open(CACHE_NAME);
      const saved = await Promise.all(APP_FILES.map((url) => cache.match(url, { ignoreSearch: true })));
      ready = saved.every(Boolean);
    } catch {
      // A storage failure must not be advertised as a ready offline copy.
    }
    event.source?.postMessage({ type: "OFFLINE_STATUS", ready, version: VERSION });
  })());
});

function lockClient(client, id) {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => { channel.port1.close(); resolve(false); }, 3000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timeout);
      channel.port1.close();
      resolve(event.data?.allowed === true);
    };
    client.postMessage({ type: "LOCK_FOR_UPDATE", id }, [channel.port2]);
  });
}

async function applyUpdate(event) {
  const reply = event.ports?.[0];
  if (!reply || !event.source?.url?.startsWith(self.registration.scope)) return;
  if (applyingUpdate) { reply.postMessage({ ok: false, reason: "Another update is being applied. Try again shortly." }); return; }
  applyingUpdate = true;
  let clients = [];
  const id = event.data.id;
  try {
    const cache = await caches.open(CACHE_NAME);
    const saved = await Promise.all(APP_FILES.map((url) => cache.match(url, { ignoreSearch: true })));
    if (!saved.every(Boolean)) throw new Error("The update is incomplete. Reconnect and try again.");
    clients = (await self.clients.matchAll({ type: "window", includeUncontrolled: true }))
      .filter((client) => client.url.startsWith(self.registration.scope));
    // Every window must agree and lock its controls before the helper can change.
    const allowed = await Promise.all(clients.map((client) => lockClient(client, id)));
    if (!allowed.every(Boolean)) throw new Error("Finish or reset workouts in other timer windows, then try again. Close any older timer windows too.");
    await self.skipWaiting();
    reply.postMessage({ ok: true });
  } catch (error) {
    for (const client of clients) client.postMessage({ type: "UNLOCK_UPDATE", id });
    reply.postMessage({ ok: false, reason: error.message });
  } finally {
    applyingUpdate = false;
  }
}
