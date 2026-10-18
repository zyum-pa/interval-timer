// Behaviour checks using Node's built-in test tools; no extra packages.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { runInNewContext } = require("node:vm");
const script = readFileSync(join(__dirname, "../public/app.js"), "utf8");

// A controllable clock lets us check full workouts without waiting in real time.
// The real browser and iPhone tests check what these stand-ins cannot: actual audio and layout.
function createPage({ audioAllowed = true } = {}) {
  let now = 0;
  let nextInterval = 0;
  const intervals = new Map();
  const elements = new Map();
  const cues = [];

  function element(selector) {
    if (!elements.has(selector)) {
      elements.set(selector, {
        textContent: "",
        disabled: false,
        addEventListener(event, action) { this[event] = action; },
      });
    }
    return elements.get(selector);
  }

  class AudioContext {
    constructor() { this.state = "suspended"; this.destination = {}; }
    get currentTime() { return now / 1000; }
    async resume() {
      if (!audioAllowed) throw new Error("Audio unavailable for this test.");
      this.state = "running";
    }
    createOscillator() {
      const cue = {};
      return {
        frequency: { value: 0 },
        connect() {},
        disconnect() {},
        start(at) { cue.start = at; cue.frequency = this.frequency.value; cues.push(cue); },
        stop(at) { cue.duration = at - cue.start; queueMicrotask(() => this.onended?.()); },
      };
    }
    createGain() {
      return {
        gain: { setValueAtTime() {}, linearRampToValueAtTime() {} },
        connect() {}, disconnect() {},
      };
    }
  }

  runInNewContext(script, {
    document: { querySelector: element },
    navigator: { audioSession: {} },
    performance: { now: () => now },
    setInterval(action) { intervals.set(++nextInterval, action); return nextInterval; },
    clearInterval(id) { intervals.delete(id); },
    AudioContext,
    console: { warn() {}, error() {} },
  });

  return {
    cues,
    text: (id) => element(`#${id}`).textContent,
    enabled: (id) => !element(`#${id}`).disabled,
    click(id) {
      const button = element(`#${id}`);
      if (!button.disabled) return button.click();
    },
    advance(ms, refresh = true) {
      now += ms;
      if (refresh) for (const update of [...intervals.values()]) update();
    },
  };
}

function expectDisplay(page, phase, round, time, status) {
  assert.equal(page.text("phase-display"), phase);
  assert.equal(page.text("round-display"), `Round ${round} of 2`);
  assert.equal(page.text("time-display"), time);
  assert.equal(page.text("timer-status"), status);
}

test("25-second workout follows the correct phases and skips final rest", () => {
  const page = createPage();
  expectDisplay(page, "Exercise", 1, "00:10", "Ready");
  page.click("start-button");
  assert.equal(page.enabled("start-button"), false);
  page.advance(10_000);
  expectDisplay(page, "Rest", 1, "00:05", "Running");
  page.advance(5_000);
  expectDisplay(page, "Exercise", 2, "00:10", "Running");
  page.advance(10_000);
  expectDisplay(page, "Complete", 2, "00:00", "Finished");
  assert.equal(page.enabled("start-button"), true);
  assert.equal(page.enabled("pause-button"), false);
  assert.deepEqual(page.cues.map((cue) => [cue.frequency, cue.duration]), [
    [880, 0.25], [880, 0.25], [660, 0.75],
  ]);
  page.advance(30_000);
  assert.equal(page.cues.length, 3, "completion must happen only once");
  page.click("start-button");
  expectDisplay(page, "Exercise", 1, "00:10", "Running");
});

test("Pause preserves fractional exercise time and Resume keeps the same round", () => {
  const page = createPage();
  page.click("start-button");
  page.advance(2_300);
  page.click("pause-button");
  page.advance(30_000);
  expectDisplay(page, "Exercise", 1, "00:08", "Paused");
  assert.equal(page.text("pause-button"), "Resume");
  page.click("pause-button");
  page.advance(7_699);
  expectDisplay(page, "Exercise", 1, "00:01", "Running");
  page.advance(1);
  expectDisplay(page, "Rest", 1, "00:05", "Running");
});

test("Pause during rest preserves the rest before starting round two", () => {
  const page = createPage();
  page.click("start-button");
  page.advance(11_000);
  page.click("pause-button");
  page.advance(30_000);
  expectDisplay(page, "Rest", 1, "00:04", "Paused");
  page.click("pause-button");
  page.advance(4_000);
  expectDisplay(page, "Exercise", 2, "00:10", "Running");
});

test("Reset from every phase, running or paused, cancels the old workout", () => {
  for (const elapsed of [2_500, 11_000, 16_000]) {
    for (const paused of [false, true]) {
      const page = createPage();
      page.click("start-button");
      page.advance(elapsed);
      if (paused) page.click("pause-button");
      page.click("reset-button");
      const cueCount = page.cues.length;
      page.advance(30_000);
      expectDisplay(page, "Exercise", 1, "00:10", "Ready");
      assert.equal(page.cues.length, cueCount, "Reset must cancel future cues");
      assert.equal(page.enabled("pause-button"), false);
    }
  }
});

test("A late update catches up without extending the workout or replaying old cues", () => {
  const page = createPage();
  page.click("start-button");
  page.advance(16_000);
  expectDisplay(page, "Exercise", 2, "00:09", "Running");
  assert.equal(page.cues.length, 1);
  page.advance(9_000);
  expectDisplay(page, "Complete", 2, "00:00", "Finished");
});

test("Pause at the finish cannot turn a completed workout into a paused one", () => {
  const page = createPage();
  page.click("start-button");
  page.advance(25_000, false);
  page.click("pause-button");
  expectDisplay(page, "Complete", 2, "00:00", "Finished");
  assert.equal(page.cues.length, 1);
  assert.equal(page.cues[0].duration, 0.75);
});

test("Unavailable audio does not prevent visual workout completion", async () => {
  const page = createPage({ audioAllowed: false });
  page.click("start-button");
  await Promise.resolve();
  await Promise.resolve();
  page.advance(25_000);
  expectDisplay(page, "Complete", 2, "00:00", "Finished");
  assert.match(page.text("sound-status"), /sound was unavailable/);
});

test("The separate sound-test button still plays and becomes available again", async () => {
  const page = createPage();
  await page.click("sound-button");
  assert.equal(page.cues.length, 1);
  assert.equal(page.enabled("sound-button"), true);
  assert.match(page.text("sound-status"), /Test finished/);
});
