const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { runInNewContext } = require("node:vm");

const root = join(__dirname, "../public");
const workerScript = readFileSync(join(root, "sw.js"), "utf8");
const scope = "https://example.test/interval-timer/";

// Model storage and lost connections. Actual worker lifecycle is checked in a browser too.
function createWorker({ storage = new Map(), version = "v1", failFile, offline = false } = {}) {
  const handlers = {};
  const networkCalls = [];
  let claimed = false;
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
      registration: { scope },
      addEventListener(type, handler) { handlers[type] = handler; },
      clients: { async claim() { claimed = true; } },
      skipWaiting() { assert.fail("An update must never take over an open workout"); },
    },
    caches, URL, Request, fetch: network,
  });
  return {
    storage, networkCalls,
    claimed: () => claimed,
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
  const listeners = {};
  const requests = [];
  const controller = { scriptURL: scope + "sw.js", postMessage(message) { requests.push(message); } };
  const registration = { waiting: waiting ? {} : null, addEventListener() {}, update: async () => {} };
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
    document: { querySelector() { return status; } },
    navigator: supported ? { serviceWorker: workers } : {},
    window: { isSecureContext: secure, location: { href: scope }, addEventListener() {} }, URL,
  });
  await new Promise((resolve) => setImmediate(resolve));
  return {
    text: () => status.textContent,
    requests,
    report(ready, source = controller) {
      listeners.message({ source, data: { type: "OFFLINE_STATUS", ready } });
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

test("a waiting update asks for reopening after the workout and preserves offline readiness", async () => {
  const page = await createStatus({ waiting: true });
  page.report(true);
  assert.match(page.text(), /Ready for offline use/);
  assert.match(page.text(), /After your workout, close all timer windows/);
});
