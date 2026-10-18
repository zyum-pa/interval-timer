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
  const defaultValues = { "#exercise-seconds": "10", "#rest-seconds": "5", "#rounds": "2" };

  function element(selector) {
    if (!elements.has(selector)) {
      elements.set(selector, {
        textContent: "",
        value: defaultValues[selector] ?? "",
        disabled: false,
        attributes: {},
        setAttribute(name, value) { this.attributes[name] = value; },
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
        stop(at) {
          if (at === undefined) {
            cue.cancelledAt = now / 1000;
            this.onended?.();
          } else {
            cue.duration = at - cue.start;
            queueMicrotask(() => this.onended?.());
          }
        },
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
    value: (id) => element(`#${id}`).value,
    invalid: (id) => element(`#${id}`).attributes["aria-invalid"] === "true",
    change(id, value) {
      const input = element(`#${id}`);
      if (input.disabled) return;
      input.value = String(value);
      input.input();
    },
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

function expectDisplay(page, phase, round, time, status, totalRounds = 2) {
  assert.equal(page.text("phase-display"), phase);
  assert.equal(page.text("round-display"), `Round ${round} of ${totalRounds}`);
  assert.equal(page.text("time-display"), time);
  assert.equal(page.text("timer-status"), status);
}

function startExercise(page) {
  page.click("start-button");
  page.advance(3_000);
}

test("28-second workout includes preparation, correct phases, and no final rest", () => {
  const page = createPage();
  expectDisplay(page, "Exercise", 1, "00:10", "Ready");
  startExercise(page);
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
    [880, 0.25], [880, 0.25], [880, 0.25], [660, 0.75],
  ]);
  page.advance(30_000);
  assert.equal(page.cues.length, 4, "completion must happen only once");
  startExercise(page);
  expectDisplay(page, "Exercise", 1, "00:10", "Running");
});

test("Pause preserves fractional exercise time and Resume keeps the same round", () => {
  const page = createPage();
  startExercise(page);
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
  startExercise(page);
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
      startExercise(page);
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
  startExercise(page);
  page.advance(16_000);
  expectDisplay(page, "Exercise", 2, "00:09", "Running");
  assert.equal(page.cues.length, 2);
  page.advance(9_000);
  expectDisplay(page, "Complete", 2, "00:00", "Finished");
});

test("Pause at the finish cannot turn a completed workout into a paused one", () => {
  const page = createPage();
  startExercise(page);
  page.advance(25_000, false);
  page.click("pause-button");
  expectDisplay(page, "Complete", 2, "00:00", "Finished");
  assert.equal(page.cues.length, 2);
  assert.equal(page.cues[1].duration, 0.75);
});

test("Unavailable audio does not prevent visual workout completion", async () => {
  const page = createPage({ audioAllowed: false });
  startExercise(page);
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

function configure(page, exercise = 3, rest = 2, rounds = 3) {
  page.change("exercise-seconds", exercise);
  page.change("rest-seconds", rest);
  page.change("rounds", rounds);
}

test("Chosen 3/2/3 settings produce a 16-second workout including preparation", () => {
  const page = createPage();
  configure(page);
  expectDisplay(page, "Exercise", 1, "00:03", "Ready", 3);
  startExercise(page);
  page.advance(3_000);
  expectDisplay(page, "Rest", 1, "00:02", "Running", 3);
  page.advance(2_000);
  expectDisplay(page, "Exercise", 2, "00:03", "Running", 3);
  page.advance(3_000);
  expectDisplay(page, "Rest", 2, "00:02", "Running", 3);
  page.advance(2_000);
  expectDisplay(page, "Exercise", 3, "00:03", "Running", 3);
  page.advance(3_000);
  expectDisplay(page, "Complete", 3, "00:00", "Finished", 3);
  assert.equal(page.cues.length, 6);
});

test("One round finishes after one exercise and never enters rest", () => {
  const page = createPage();
  configure(page, 4, 99, 1);
  startExercise(page);
  page.advance(4_000);
  expectDisplay(page, "Complete", 1, "00:00", "Finished", 1);
  assert.equal(page.cues.length, 2);
  assert.equal(page.cues[1].duration, 0.75);
});

test("Settings lock while running or paused; Reset keeps choices and unlocks them", () => {
  const page = createPage();
  configure(page);
  startExercise(page);
  page.advance(3_500);
  for (const id of ["exercise-seconds", "rest-seconds", "rounds"]) {
    assert.equal(page.enabled(id), false);
  }
  page.change("rounds", 8);
  assert.equal(page.value("rounds"), "3");
  page.click("pause-button");
  assert.equal(page.enabled("rounds"), false);
  page.click("reset-button");
  assert.equal(page.value("exercise-seconds"), "3");
  assert.equal(page.value("rest-seconds"), "2");
  assert.equal(page.value("rounds"), "3");
  assert.equal(page.enabled("rounds"), true);
  page.advance(20_000);
  expectDisplay(page, "Exercise", 1, "00:03", "Ready", 3);
  page.change("exercise-seconds", 4);
  expectDisplay(page, "Exercise", 1, "00:04", "Ready", 3);
});

test("Invalid settings block Start, explain the field, and recover when corrected", () => {
  for (const [id, errorId, correct, tooLarge] of [
    ["exercise-seconds", "exercise-error", 10, 3601],
    ["rest-seconds", "rest-error", 5, 3601],
    ["rounds", "rounds-error", 2, 100],
  ]) {
    for (const invalid of ["", 0, -1, 1.5, "abc", "Infinity", "1e100", tooLarge]) {
      const page = createPage();
      page.change(id, invalid);
      assert.equal(page.enabled("start-button"), false);
      assert.equal(page.text("time-display"), "--:--");
      assert.equal(page.text("timer-status"), "Check settings");
      assert.equal(page.invalid(id), true);
      assert.match(page.text(errorId), /Enter a whole number/);
      page.click("start-button");
      page.advance(30_000);
      assert.equal(page.cues.length, 0);
      page.change(id, correct);
      assert.equal(page.invalid(id), false);
      assert.equal(page.text(errorId), "");
      assert.equal(page.enabled("start-button"), true);
      expectDisplay(page, "Exercise", 1, "00:10", "Ready");
    }
  }
});

test("Times longer than a minute display minutes and seconds", () => {
  const page = createPage();
  configure(page, 61, 75, 2);
  expectDisplay(page, "Exercise", 1, "01:01", "Ready");
  startExercise(page);
  page.advance(61_000);
  expectDisplay(page, "Rest", 1, "01:15", "Running");
});

test("Editing after completion previews a fresh workout using the new settings", () => {
  const page = createPage();
  configure(page, 1, 1, 1);
  startExercise(page);
  page.advance(1_000);
  assert.equal(page.enabled("exercise-seconds"), true);
  page.change("exercise-seconds", 4);
  expectDisplay(page, "Exercise", 1, "00:04", "Ready", 1);
  startExercise(page);
  page.advance(4_000);
  expectDisplay(page, "Complete", 1, "00:00", "Finished", 1);
});

test("Maximum supported settings stay valid and complete after the chosen duration", () => {
  const page = createPage();
  configure(page, 3600, 3600, 99);
  expectDisplay(page, "Exercise", 1, "60:00", "Ready", 99);
  assert.equal(page.enabled("start-button"), true);
  startExercise(page);
  page.advance((99 + 98) * 3600 * 1000);
  expectDisplay(page, "Complete", 99, "00:00", "Finished", 99);
});

async function settleAudio() {
  // Let the browser-like audio preparation promise finish before checking its cue.
  await new Promise(setImmediate);
}

test("Preparation shows and cues 3, 2, 1, then begins the full exercise", async () => {
  const page = createPage();
  page.click("start-button");
  await settleAudio();
  expectDisplay(page, "Get ready", 1, "00:03", "Running");
  assert.equal(page.enabled("exercise-seconds"), false);
  page.advance(1_000);
  expectDisplay(page, "Get ready", 1, "00:02", "Running");
  page.advance(1_000);
  expectDisplay(page, "Get ready", 1, "00:01", "Running");
  page.advance(1_000);
  expectDisplay(page, "Exercise", 1, "00:10", "Running");
  assert.deepEqual(page.cues.map((cue) => [cue.start, cue.frequency]), [
    [0, 1100], [1, 1100], [2, 1100], [3, 880],
  ]);
  for (const cue of page.cues.slice(0, 3)) {
    assert.ok(Math.abs(cue.duration - 0.08) < 0.000001);
  }
});

test("Long exercise and rest each tick at their final five seconds, once per second", () => {
  const page = createPage();
  configure(page, 8, 7, 2);
  startExercise(page);
  page.advance(3_000);
  for (let second = 4; second >= 1; second -= 1) page.advance(1_000);
  assert.deepEqual(page.cues.filter((cue) => cue.frequency === 1100).map((cue) => cue.start), [6, 7, 8, 9, 10]);
  page.advance(1_000);
  expectDisplay(page, "Rest", 1, "00:07", "Running");
  page.advance(2_000);
  for (let second = 4; second >= 1; second -= 1) page.advance(1_000);
  assert.deepEqual(page.cues.filter((cue) => cue.frequency === 1100).map((cue) => cue.start), [6, 7, 8, 9, 10, 13, 14, 15, 16, 17]);
  const cueCount = page.cues.length;
  page.advance(0);
  page.advance(0);
  assert.equal(page.cues.length, cueCount);
  page.advance(1_000);
  expectDisplay(page, "Exercise", 2, "00:08", "Running");
});

test("One-, three-, and five-second phases use the opening cue without a duplicate tick", () => {
  for (const duration of [1, 3, 5]) {
    const page = createPage();
    configure(page, duration, duration, 2);
    startExercise(page);
    for (let phase = 0; phase < 3; phase += 1) {
      for (let second = 1; second <= duration; second += 1) page.advance(1_000);
    }
    expectDisplay(page, "Complete", 2, "00:00", "Finished");
    assert.equal(page.cues.filter((cue) => cue.frequency === 880).length, 3);
    assert.equal(page.cues.filter((cue) => cue.frequency === 1100).length, 3 * (duration - 1));
    assert.equal(page.cues.filter((cue) => cue.frequency === 660).length, 1);
    assert.equal(new Set(page.cues.map((cue) => cue.start)).size, page.cues.length);
  }
});

test("Pause during preparation preserves fractions and Resume does not restart at three", async () => {
  const page = createPage();
  page.click("start-button");
  await settleAudio();
  page.advance(1_300);
  page.click("pause-button");
  const cueCount = page.cues.length;
  page.advance(30_000);
  expectDisplay(page, "Get ready", 1, "00:02", "Paused");
  assert.equal(page.cues.length, cueCount);
  page.click("pause-button");
  await settleAudio();
  assert.equal(page.cues.length, cueCount, "Resume must not repeat the current tick");
  page.advance(699);
  expectDisplay(page, "Get ready", 1, "00:02", "Running");
  page.advance(1);
  expectDisplay(page, "Get ready", 1, "00:01", "Running");
  page.advance(1_000);
  expectDisplay(page, "Exercise", 1, "00:10", "Running");
});

test("Pause during the final five seconds holds cues without replaying one on Resume", async () => {
  const page = createPage();
  configure(page, 6, 2, 1);
  startExercise(page);
  page.advance(1_000);
  page.click("pause-button");
  const cueCount = page.cues.length;
  page.advance(10_000);
  expectDisplay(page, "Exercise", 1, "00:05", "Paused", 1);
  assert.equal(page.cues.length, cueCount);
  page.click("pause-button");
  await settleAudio();
  assert.equal(page.cues.length, cueCount);
  page.advance(999);
  assert.equal(page.cues.length, cueCount);
  page.advance(1);
  assert.equal(page.cues.length, cueCount + 1);
  expectDisplay(page, "Exercise", 1, "00:04", "Running", 1);
});

test("Reset during preparation prevents late audio and keeps chosen settings", async () => {
  const page = createPage();
  configure(page);
  page.click("start-button");
  page.click("reset-button");
  await settleAudio();
  page.advance(30_000);
  expectDisplay(page, "Exercise", 1, "00:03", "Ready", 3);
  assert.equal(page.cues.length, 0);
  assert.equal(page.value("exercise-seconds"), "3");
  assert.equal(page.enabled("exercise-seconds"), true);
});

test("Quick Start, Reset, Start cannot play the old countdown's pending opening tick", async () => {
  const page = createPage();
  page.click("start-button");
  page.click("reset-button");
  page.click("start-button");
  await settleAudio();
  expectDisplay(page, "Get ready", 1, "00:03", "Running");
  assert.equal(page.cues.length, 1);
});

test("Late updates cue only the current final second and never burst missed ticks", () => {
  const page = createPage();
  configure(page, 8, 2, 1);
  startExercise(page);
  page.advance(6_200);
  expectDisplay(page, "Exercise", 1, "00:02", "Running", 1);
  assert.equal(page.cues.filter((cue) => cue.frequency === 1100).length, 1);
  page.advance(0);
  assert.equal(page.cues.filter((cue) => cue.frequency === 1100).length, 1);
  page.advance(800);
  assert.equal(page.cues.filter((cue) => cue.frequency === 1100).length, 2);
  page.advance(1_000);
  expectDisplay(page, "Complete", 1, "00:00", "Finished", 1);
});

test("Reset immediately stops a currently playing automatic phase cue", () => {
  const page = createPage();
  startExercise(page);
  const phaseCue = page.cues[0];
  page.click("reset-button");
  assert.equal(phaseCue.cancelledAt, 3);
  const cueCount = page.cues.length;
  page.advance(30_000);
  assert.equal(page.cues.length, cueCount);
});

test("A phase change takes over a late tick without overlapping automatic sounds", () => {
  const page = createPage();
  configure(page, 6, 2, 2);
  startExercise(page);
  page.advance(5_990);
  const tick = page.cues.at(-1);
  assert.equal(tick.frequency, 1100);
  page.advance(10);
  expectDisplay(page, "Rest", 1, "00:02", "Running");
  assert.equal(tick.cancelledAt, 9);
  assert.equal(page.cues.at(-1).frequency, 880);
});
