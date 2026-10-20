const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { runInNewContext } = require("node:vm");

const root = join(__dirname, "../public");
const workerScript = readFileSync(join(root, "sw.js"), "utf8");
const scope = "https://example.test/interval-timer/";

class TestMessageChannel {
  constructor() {
    this.port1 = { onmessage: null, close() {} };
    this.port2 = { postMessage: (data) => queueMicrotask(() => this.port1.onmessage?.({ data })) };
  }
}

// Model storage and lost connections. Actual worker lifecycle is checked in a browser too.
function createWorker({ storage = new Map(), version = "v1", failFile, offline = false, active = false, clients = [] } = {}) {
  const handlers = {};
  const networkCalls = [];
  let claimed = false;
  let activated = 0;
  async function network(request) {
    const url = typeof request === "string" ? request : request.url;
    networkCalls.push(url);
    if (offline) throw new Error("Disconnected");
    const name = new URL(url).pathname.slice("/interval-timer/".length) || "index.html";
    if (name === failFile) return new Response("Missing", { status: 404 });
    return new Response(readFileSync(join(root, name)));
  }
  const caches = {
    async open(name) {
      if (!storage.has(name)) storage.set(name, new Map());
      const entries = storage.get(name);
      return {
        async addAll(requests) {
          const responses = await Promise.all(requests.map(network));
          if (responses.some((response) => !response.ok)) throw new Error("Incomplete download");
          requests.forEach((request, i) => entries.set(request.url, responses[i]));
        },
        async match(url) { return entries.get(url)?.clone(); },
      };
    },
    async keys() { return [...storage.keys()]; },
    async delete(name) { return storage.delete(name); },
  };
  runInNewContext(workerScript.replace(/(\$\{CACHE_PREFIX\})v\d+/, "$1" + version), {
    self: {
      registration: { scope, active: active ? {} : null },
      addEventListener(type, handler) { handlers[type] = handler; },
      clients: { async claim() { claimed = true; }, async matchAll() { return clients; } },
      async skipWaiting() { activated += 1; },
    },
    caches, URL, Request, fetch: network, MessageChannel: TestMessageChannel, setTimeout, clearTimeout,
  });
  return {
    storage, networkCalls,
    claimed: () => claimed,
    activations: () => activated,
    disconnect() { offline = true; },
    async lifecycle(type, extra = {}) {
      let pending;
      handlers[type]({ ...extra, waitUntil(promise) { pending = promise; } });
      await pending;
    },
    async request(url, method = "GET") {
      let pending;
      handlers.fetch({ request: { url, method }, respondWith(promise) { pending = promise; } });
      return pending;
    },
    async ready() {
      let message;
      await this.lifecycle("message", {
        data: { type: "CHECK_OFFLINE_READY" },
        source: { postMessage(value) { message = value; } },
      });
      return message.ready;
    },
    async apply() {
      let reply;
      await this.lifecycle("message", {
        data: { type: "APPLY_UPDATE", id: "test-request" }, source: { url: scope },
        ports: [{ postMessage(value) { reply = value; } }],
      });
      return reply;
    },
  };
}

test("installation saves the page and every linked app file under the project folder", async () => {
  const worker = createWorker();
  await worker.lifecycle("install");
  const saved = [...worker.storage.values()][0];
  const html = readFileSync(join(root, "index.html"), "utf8");
  const links = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const path of ["./", "index.html", ...links]) {
    assert.ok(saved.has(new URL(path, scope).href), `${path} must be available offline`);
  }
  const manifest = JSON.parse(readFileSync(join(root, "manifest.webmanifest"), "utf8"));
  for (const icon of manifest.icons) assert.ok(saved.has(new URL(icon.src, scope).href));
  assert.ok(worker.networkCalls.every((url) => url.startsWith(scope)));
  assert.equal(await worker.ready(), true);
});

test("a missing required file rejects installation and never reports offline ready", async () => {
  const worker = createWorker({ failFile: "offline.js" });
  await assert.rejects(worker.lifecycle("install"), /Incomplete/);
  assert.equal(await worker.ready(), false);
});

test("saved pages, scripts, styles, and icons load with no network, including URL queries", async () => {
  const worker = createWorker();
  await worker.lifecycle("install");
  const saved = [...worker.storage.values()][0];
  const callsBefore = worker.networkCalls.length;
  worker.disconnect();
  for (const url of saved.keys()) {
    const response = await worker.request(url + "?test=offline");
    assert.equal(response.ok, true);
    assert.ok((await response.arrayBuffer()).byteLength > 0);
  }
  assert.equal(worker.networkCalls.length, callsBefore, "saved files need no network calls");
});

test("other sites, other projects, unknown URLs, and writes are left alone", async () => {
  const worker = createWorker();
  for (const url of ["https://youtube.com/", "https://example.test/another-app/", scope + "missing"])
    assert.equal(await worker.request(url), undefined);
  assert.equal(await worker.request(scope, "POST"), undefined);
});

test("an update keeps the active version until activation and cleans only its own old copies", async () => {
  const old = createWorker();
  await old.lifecycle("install");
  const oldName = [...old.storage.keys()][0];
  old.storage.set("another-app:v1", new Map());
  old.storage.set("interval-timer:https://example.test/other-folder/:v1", new Map());
  const next = createWorker({ storage: old.storage, version: "v2" });
  await next.lifecycle("install");
  assert.ok(next.storage.has(oldName), "downloading the update preserves the running version");
  assert.equal(next.claimed(), false);
  old.disconnect();
  assert.equal((await old.request(scope)).ok, true);
  await next.lifecycle("activate");
  assert.equal(next.storage.has(oldName), false);
  assert.ok(next.storage.has("another-app:v1"));
  assert.ok(next.storage.has("interval-timer:https://example.test/other-folder/:v1"));
  assert.equal(next.claimed(), true);
  next.disconnect();
  assert.equal((await next.request(scope)).ok, true);
});

test("a failed update leaves the previous offline version usable", async () => {
  const old = createWorker();
  await old.lifecycle("install");
  const next = createWorker({ storage: old.storage, version: "v2", failFile: "app.js" });
  await assert.rejects(next.lifecycle("install"));
  old.disconnect();
  assert.equal(await old.ready(), true);
  assert.equal((await old.request(scope)).ok, true);
});

test("readiness detects an incomplete saved copy instead of promising offline availability", async () => {
  const worker = createWorker();
  await worker.lifecycle("install");
  [...worker.storage.values()][0].delete(scope + "styles.css");
  assert.equal(await worker.ready(), false);
});

async function createStatus({ supported = true, secure = true, controlled = true, fails = false, waiting = false } = {}) {
  const status = { textContent: "" };
  const updateStatus = { textContent: "" };
  const button = { hidden: true, disabled: false, textContent: "", addEventListener(type, callback) { this[type] = callback; } };
  const listeners = {};
  const requests = [];
  const timers = new Map();
  let busy = false;
  let locked = false;
  let reloads = 0;
  const workout = {
    isBusy: () => busy,
    begin() { if (busy) return false; locked = true; return true; },
    end() { locked = false; },
  };
  const controller = { scriptURL: scope + "sw.js", postMessage(message) { requests.push(message); } };
  let replyPort;
  const registration = { waiting: waiting ? { postMessage(message, ports) { requests.push(message); replyPort = ports[0]; } } : null, addEventListener() {}, update: async () => {} };
  const workers = {
    controller: controlled ? controller : null,
    addEventListener(type, handler) { listeners[type] = handler; },
    async register(url, options) {
      assert.equal(url, "./sw.js");
      assert.equal(options.scope, "./");
      if (fails) throw new Error("Storage unavailable");
      return registration;
    },
    ready: Promise.resolve(registration),
  };
  runInNewContext(readFileSync(join(root, "offline.js"), "utf8"), {
    document: {
      querySelector(id) { return { "#offline-status": status, "#update-status": updateStatus, "#update-button": button }[id]; },
      body: { dataset: { appVersion: "v3" } }, addEventListener() {},
    },
    navigator: supported ? { serviceWorker: workers } : {},
    window: { workoutUpdates: workout, isSecureContext: secure, location: { href: scope, reload() { reloads += 1; } }, addEventListener() {} }, URL,
    MessageChannel: TestMessageChannel,
    setTimeout(callback) { const id = timers.size + 1; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); },
  });
  await new Promise((resolve) => setImmediate(resolve));
  return {
    text: () => status.textContent,
    updateText: () => updateStatus.textContent,
    button,
    locked: () => locked,
    reloads: () => reloads,
    setBusy(value) { busy = value; workout.onChange(); },
    click() { button.click(); },
    activated() { registration.waiting = null; listeners.controllerchange(); },
    async decline() { replyPort.postMessage({ ok: false, reason: "Another workout is active." }); await new Promise((resolve) => setImmediate(resolve)); },
    expire() { for (const callback of [...timers.values()]) callback(); },
    requests,
    report(ready, source = controller, version = "v3") {
      listeners.message({ source, data: { type: "OFFLINE_STATUS", ready, version } });
    },
  };
}

test("unsupported browsers keep an honest online-only status", async () => {
  for (const options of [{ supported: false }, { secure: false }]) {
    const page = await createStatus(options);
    assert.match(page.text(), /unavailable/);
  }
});

test("registration alone does not promise offline readiness; only the controlling worker can confirm it", async () => {
  const page = await createStatus();
  assert.match(page.text(), /Saving/);
  assert.ok(page.requests.length > 0);
  page.report(true, {});
  assert.match(page.text(), /Saving/);
  page.report(true);
  assert.equal(page.text(), "Ready for offline use.");
  page.report(false);
  assert.match(page.text(), /could not be saved/);
  const uncontrolled = await createStatus({ controlled: false });
  assert.match(uncontrolled.text(), /Saving/);
});

test("failed registration is reported without affecting workout code", async () => {
  const page = await createStatus({ fails: true, controlled: false });
  assert.match(page.text(), /could not be saved/);
});

test("a saved update offers a button and preserves offline readiness", async () => {
  const page = await createStatus({ waiting: true });
  page.report(true);
  assert.match(page.text(), /Ready for offline use/);
  assert.match(page.updateText(), /Tap Update app/);
  assert.equal(page.button.hidden, false);
  assert.equal(page.button.disabled, false);
});

test("running or paused workouts cannot use Update app", async () => {
  const page = await createStatus({ waiting: true });
  page.setBusy(true);
  page.click();
  assert.equal(page.button.disabled, true);
  assert.equal(page.requests.some((request) => request.type === "APPLY_UPDATE"), false);
  assert.equal(page.locked(), false);
  page.setBusy(false);
  assert.equal(page.button.disabled, false);
});

test("Update app locks controls, ignores duplicate taps, and reloads only after activation", async () => {
  const page = await createStatus({ waiting: true });
  page.click();
  page.click();
  assert.equal(page.locked(), true);
  assert.equal(page.button.disabled, true);
  assert.equal(page.requests.filter((request) => request.type === "APPLY_UPDATE").length, 1);
  assert.equal(page.reloads(), 0);
  page.activated();
  assert.equal(page.reloads(), 1);
});

test("a worker change never refreshes a window whose user did not request it", async () => {
  const page = await createStatus({ waiting: true });
  page.activated();
  assert.equal(page.reloads(), 0);
  page.report(true, undefined, "v4");
  assert.equal(page.button.hidden, false);
  page.setBusy(true);
  page.click();
  assert.equal(page.reloads(), 0);
  page.setBusy(false);
  page.click();
  assert.equal(page.reloads(), 1);
});

test("a declined or timed-out update restores controls and permits another attempt", async () => {
  const page = await createStatus({ waiting: true });
  page.click();
  await page.decline();
  assert.equal(page.locked(), false);
  assert.equal(page.button.disabled, false);
  assert.match(page.updateText(), /Another workout/);
  page.click();
  page.expire();
  assert.equal(page.locked(), false);
  assert.equal(page.button.disabled, false);
  assert.match(page.updateText(), /did not finish/);
});

function timerClient(busy = false, url = scope) {
  return {
    url, locked: false,
    postMessage(message, ports) {
      if (message.type === "LOCK_FOR_UPDATE") {
        this.locked = !busy;
        ports[0].postMessage({ allowed: !busy });
      } else if (message.type === "UNLOCK_UPDATE") this.locked = false;
    },
    navigate() { assert.fail("The worker must never navigate an open workout"); },
  };
}

test("future updates wait until all in-scope windows agree and lock their controls", async () => {
  const clients = [timerClient(), timerClient(), timerClient(true, "https://example.test/other/")];
  const worker = createWorker({ version: "v4", active: true, clients });
  await worker.lifecycle("install");
  assert.equal(worker.activations(), 0);
  assert.equal((await worker.apply()).ok, true);
  assert.equal(worker.activations(), 1);
  assert.equal(clients[0].locked, true);
  assert.equal(clients[1].locked, true);
  assert.equal(clients[2].locked, false);
});

test("another busy window blocks activation and releases the idle windows", async () => {
  const clients = [timerClient(), timerClient(true)];
  const worker = createWorker({ version: "v4", active: true, clients });
  await worker.lifecycle("install");
  assert.equal((await worker.apply()).ok, false);
  assert.equal(worker.activations(), 0);
  assert.ok(clients.every((client) => !client.locked));
});

test("an unresponsive older window blocks activation instead of losing its workout", async () => {
  const worker = createWorker({ version: "v4", active: true, clients: [{ url: scope, postMessage() {} }] });
  await worker.lifecycle("install");
  assert.equal((await worker.apply()).ok, false);
  assert.equal(worker.activations(), 0);
});

test("an incomplete saved update cannot activate", async () => {
  const worker = createWorker({ version: "v4", active: true, clients: [timerClient()] });
  await worker.lifecycle("install");
  [...worker.storage.values()][0].delete(scope + "app.js");
  assert.equal((await worker.apply()).ok, false);
  assert.equal(worker.activations(), 0);
});

test("the v3 bridge advances only the helper and keeps legacy files for open pages", async () => {
  const old = createWorker({ version: "v2" });
  await old.lifecycle("install");
  const oldName = [...old.storage.keys()][0];
  const next = createWorker({ storage: old.storage, version: "v3", active: true, clients: [timerClient(true)] });
  await next.lifecycle("install");
  assert.equal(next.activations(), 1);
  await next.lifecycle("activate");
  assert.ok(next.storage.has(oldName));
  old.disconnect();
  assert.equal((await old.request(scope)).ok, true);
  const broken = createWorker({ version: "v3", active: true, failFile: "app.js" });
  await assert.rejects(broken.lifecycle("install"));
  assert.equal(broken.activations(), 0);
});

test("the page version matches its worker release", () => {
  const version = workerScript.match(/\$\{CACHE_PREFIX\}(v\d+)/)[1];
  assert.ok(readFileSync(join(root, "index.html"), "utf8").includes(`data-app-version="${version}"`));
});
