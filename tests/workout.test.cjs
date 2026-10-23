// Behaviour checks using Node's built-in test tools; no extra packages.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { runInNewContext } = require("node:vm");
const script = readFileSync(join(__dirname, "../public/app.js"), "utf8");

// A controllable clock lets us check full workouts without waiting in real time.
// The real browser and iPhone tests check what these stand-ins cannot: actual audio and layout.
function createPage({ audioAllowed = true, storage = new Map(), storageReadFails = false, storageWriteFails = false } = {}) {
  let now = 0;
  let nextInterval = 0;
  let nextNode = 0;
  const intervals = new Map();
  const elements = new Map();
  const cues = [];
  const window = {};
  const defaultValues = { "#exercise-1-seconds": "10", "#rest-seconds": "5", "#rounds": "2" };

  function element(selector) {
    if (!elements.has(selector)) {
      elements.set(selector, {
        textContent: "",
        value: defaultValues[selector] ?? "",
        disabled: false,
        attributes: {},
        setAttribute(name, value) { this.attributes[name] = value; },
        addEventListener(event, action) { this[event] = action; },
        querySelector: element,
        append() {},
        remove() {},
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
    window,
    document: { querySelector: element, createElement: () => element(`#node-${++nextNode}`) },
    navigator: { audioSession: {} },
    localStorage: {
      getItem(key) {
        if (storageReadFails) throw new Error("Reading storage is blocked.");
        return storage.get(key) ?? null;
      },
      setItem(key, value) {
        if (storageWriteFails) throw new Error("Writing storage is blocked.");
        storage.set(key, value);
      },
    },
    performance: { now: () => now },
    setInterval(action) { intervals.set(++nextInterval, action); return nextInterval; },
    clearInterval(id) { intervals.delete(id); },
    AudioContext,
    console: { warn() {}, error() {} },
  });

  return {
    updates: window.workoutUpdates,
    cues,
    text: (id) => element(`#${id}`).textContent,
    enabled: (id) => !element(`#${id}`).disabled,
    value: (id) => element(`#${id}`).value,
    invalid: (id) => element(`#${id}`).attributes["aria-invalid"] === "true",
    hidden: (id) => element(`#${id}`).hidden,
    blur(id) { element(`#${id}`).blur(); },
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
  assert.equal(page.text("round-display"), `Set ${round} of ${totalRounds}`);
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

function configure(page, exercise = 3, rest = 2, rounds = 3) {
  page.change("exercise-1-minutes", Math.floor(exercise / 60));
  page.change("exercise-1-seconds", exercise % 60);
  page.change("rest-minutes", Math.floor(rest / 60));
  page.change("rest-seconds", rest % 60);
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
  for (const id of ["exercise-1-seconds", "rest-seconds", "rounds"]) {
    assert.equal(page.enabled(id), false);
  }
  page.change("rounds", 8);
  assert.equal(page.value("rounds"), "3");
  page.click("pause-button");
  assert.equal(page.enabled("rounds"), false);
  page.click("reset-button");
  assert.equal(page.value("exercise-1-seconds"), "3");
  assert.equal(page.value("rest-seconds"), "2");
  assert.equal(page.value("rounds"), "3");
  assert.equal(page.enabled("rounds"), true);
  page.advance(20_000);
  expectDisplay(page, "Exercise", 1, "00:03", "Ready", 3);
  page.change("exercise-1-seconds", 4);
  expectDisplay(page, "Exercise", 1, "00:04", "Ready", 3);
});

test("Invalid settings block Start, explain the field, and recover when corrected", () => {
  for (const [id, errorId, correct, tooLarge] of [
    ["exercise-1-seconds", "exercise-1-error", 10, 60],
    ["rest-seconds", "rest-error", 5, 60],
    ["rounds", "rounds-error", 2, 100],
  ]) {
    for (const invalid of ["", 0, -1, 1.5, "abc", "Infinity", "1e100", tooLarge]) {
      const page = createPage();
      page.change(id, invalid);
      assert.equal(page.enabled("start-button"), false);
      assert.equal(page.text("time-display"), "--:--");
      assert.equal(page.text("timer-status"), "Check settings");
      assert.equal(page.invalid(id), true);
      assert.match(page.text(errorId), /Enter/);
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
  assert.equal(page.enabled("exercise-1-seconds"), true);
  page.change("exercise-1-seconds", 4);
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
  assert.equal(page.enabled("exercise-1-seconds"), false);
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
  assert.equal(page.value("exercise-1-seconds"), "3");
  assert.equal(page.enabled("exercise-1-seconds"), true);
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

const settingsKey = "interval-timer.settings.v2";

test("First use has the usual defaults; valid edits are remembered without starting", () => {
  const storage = new Map();
  const first = createPage({ storage });
  expectDisplay(first, "Exercise", 1, "00:10", "Ready");
  assert.equal(storage.size, 0, "opening the page does not overwrite saved data");
  configure(first, 8, 7, 2);
  const reopened = createPage({ storage });
  assert.deepEqual([reopened.value("exercise-1-seconds"), reopened.value("rest-seconds"), reopened.value("rounds")], ["08", "07", "2"]);
  expectDisplay(reopened, "Exercise", 1, "00:08", "Ready");
});

test("Incomplete edits keep the last valid workout until all three fields are valid", () => {
  const storage = new Map();
  const page = createPage({ storage });
  configure(page, 8, 7, 2);
  const saved = storage.get(settingsKey);
  for (const invalid of ["", "0", "-1", "1.5", "3601"]) {
    page.change("exercise-1-seconds", invalid);
    page.change("rest-seconds", "9");
    assert.equal(storage.get(settingsKey), saved);
  }
  expectDisplay(createPage({ storage }), "Exercise", 1, "00:08", "Ready");
  page.change("exercise-1-seconds", "4");
  assert.deepEqual(JSON.parse(storage.get(settingsKey)), { exercises: [4], restSeconds: 9, rounds: 2 });
  expectDisplay(createPage({ storage }), "Exercise", 1, "00:04", "Ready");
});

test("Malformed, incomplete, or out-of-range saved values fall back to defaults", () => {
  const invalid = ["not JSON", "null", "[]", '"hello"',
    JSON.stringify({ exercises: [], restSeconds: 7, rounds: 2 }),
    JSON.stringify({ exercises: [0], restSeconds: 7, rounds: 2 }),
    JSON.stringify({ exercises: [3601], restSeconds: 7, rounds: 2 }),
    JSON.stringify({ exercises: ["8"], restSeconds: 7, rounds: 2 }),
    JSON.stringify({ exercises: [8.5], restSeconds: 7, rounds: 2 }),
    JSON.stringify({ exercises: [8], restSeconds: -1, rounds: 2 }),
    JSON.stringify({ exercises: [8], restSeconds: 7, rounds: 100 }),
    JSON.stringify({ exercises: [8], restSeconds: 7 }),
  ];
  for (const raw of invalid) {
    const storage = new Map([[settingsKey, raw]]);
    const page = createPage({ storage });
    expectDisplay(page, "Exercise", 1, "00:10", "Ready");
    assert.equal(storage.get(settingsKey), raw);
    page.change("exercise-1-seconds", "6");
    assert.deepEqual(JSON.parse(storage.get(settingsKey)).exercises, [6]);
  }
});

test("Valid boundary values are restored and extra saved fields are not used or resaved", () => {
  for (const values of [{ exercises: [1], restSeconds: 1, rounds: 1 },
    { exercises: [3600], restSeconds: 3600, rounds: 99 }]) {
    const storage = new Map([[settingsKey, JSON.stringify({ ...values, timerState: "running", remainingMs: 1 })]]);
    const page = createPage({ storage });
    assert.equal(page.value("exercise-1-minutes"), String(Math.floor(values.exercises[0] / 60)).padStart(2, "0"));
    assert.equal(page.value("exercise-1-seconds"), String(values.exercises[0] % 60).padStart(2, "0"));
    assert.equal(page.value("rest-seconds"), String(values.restSeconds % 60).padStart(2, "0"));
    assert.equal(page.value("rounds"), String(values.rounds));
    assert.equal(page.text("timer-status"), "Ready");
    page.click("reset-button");
    assert.deepEqual(JSON.parse(storage.get(settingsKey)), values);
  }
});

test("Reopening a running or paused workout restores choices and starts ready from round one", () => {
  for (const pause of [false, true]) {
    const storage = new Map();
    const page = createPage({ storage });
    configure(page, 8, 7, 2);
    startExercise(page);
    page.advance(9_000);
    if (pause) page.click("pause-button");
    const reopened = createPage({ storage });
    expectDisplay(reopened, "Exercise", 1, "00:08", "Ready");
    assert.equal(reopened.enabled("start-button"), true);
    assert.equal(reopened.enabled("pause-button"), false);
    page.click("reset-button");
    expectDisplay(page, "Exercise", 1, "00:08", "Ready");
    assert.deepEqual(JSON.parse(storage.get(settingsKey)), { exercises: [8], restSeconds: 7, rounds: 2 });
  }
});

test("Blocked storage reports the limitation and still allows a complete workout", () => {
  for (const options of [{ storageReadFails: true, storageWriteFails: true }, { storageWriteFails: true }]) {
    const page = createPage(options);
    configure(page, 2, 1, 2);
    assert.match(page.text("settings-save-status"), /cannot be remembered/);
    startExercise(page);
    page.advance(5_000);
    expectDisplay(page, "Complete", 2, "00:00", "Finished");
    page.click("reset-button");
    expectDisplay(page, "Exercise", 1, "00:02", "Ready");
  }
});

test("Saving workout settings leaves unrelated device storage untouched", () => {
  const storage = new Map([["other-app", "keep me"]]);
  const page = createPage({ storage });
  configure(page, 3, 2, 3);
  assert.equal(storage.get("other-app"), "keep me");
  assert.equal(storage.size, 2);
});

test("the updater cannot lock a running or paused workout", () => {
  const page = createPage();
  page.click("start-button");
  assert.equal(page.updates.begin(), false);
  assert.equal(page.text("timer-status"), "Running");
  page.click("pause-button");
  assert.equal(page.updates.begin(), false);
  assert.equal(page.text("timer-status"), "Paused");
  assert.equal(page.enabled("pause-button"), true);
  page.click("reset-button");
  assert.equal(page.updates.begin(), true);
});

test("applying an update blocks starting and Reset, then failure restores controls and choices", () => {
  const page = createPage();
  configure(page, 5, 3, 3);
  assert.equal(page.updates.begin(), true);
  assert.equal(page.enabled("start-button"), false);
  assert.equal(page.enabled("reset-button"), false);
  page.change("exercise-1-seconds", "8");
  page.click("start-button");
  expectDisplay(page, "Exercise", 1, "00:05", "Ready", 3);
  page.updates.end();
  assert.equal(page.enabled("start-button"), true);
  assert.equal(page.enabled("reset-button"), true);
});

test("05:30 is entered as minutes and seconds and runs for the full 330 seconds", () => {
  const page = createPage();
  configure(page, 330, 75, 2);
  expectDisplay(page, "Exercise", 1, "05:30", "Ready");
  startExercise(page);
  page.advance(329_999);
  expectDisplay(page, "Exercise", 1, "00:01", "Running");
  page.advance(1);
  expectDisplay(page, "Rest", 1, "01:15", "Running");
});

test("time fields reject invalid minutes, seconds above 59, and durations over 60:00", () => {
  const storage = new Map();
  const page = createPage({ storage });
  configure(page, 8, 7, 2);
  const saved = storage.get(settingsKey);
  for (const value of ["", "-1", "1.5", "1e1", "61", "abc"]) {
    page.change("exercise-1-minutes", value);
    assert.equal(page.enabled("start-button"), false);
    assert.equal(storage.get(settingsKey), saved);
  }
  page.change("exercise-1-minutes", "60");
  assert.equal(page.enabled("start-button"), false, "60:08 is over the existing one-hour limit");
  page.change("exercise-1-seconds", "00");
  expectDisplay(page, "Exercise", 1, "60:00", "Ready");
  page.change("rest-seconds", "60");
  assert.equal(page.enabled("start-button"), false);
  page.change("rest-seconds", "59");
  assert.equal(page.enabled("start-button"), true);
});

test("leaving a time field pads it to two digits without changing its duration", () => {
  const page = createPage();
  configure(page, 330, 5, 2);
  page.blur("exercise-1-minutes");
  page.blur("rest-seconds");
  assert.equal(page.value("exercise-1-minutes"), "05");
  assert.equal(page.value("exercise-1-seconds"), "30");
  assert.equal(page.value("rest-seconds"), "05");
  expectDisplay(page, "Exercise", 1, "05:30", "Ready");
});

test("two exercises run consecutively, rest once per round, and skip final rest", () => {
  const page = createPage();
  configure(page, 3, 1, 2);
  page.click("add-exercise");
  page.change("exercise-2-seconds", "2");
  startExercise(page);
  expectDisplay(page, "Exercise", 1, "00:03", "Running");
  page.advance(3_000);
  expectDisplay(page, "Exercise", 1, "00:02", "Running");
  page.advance(2_000);
  expectDisplay(page, "Rest", 1, "00:01", "Running");
  page.advance(1_000);
  expectDisplay(page, "Exercise", 2, "00:03", "Running");
  page.advance(3_000);
  expectDisplay(page, "Exercise", 2, "00:02", "Running");
  page.advance(2_000);
  expectDisplay(page, "Complete", 2, "00:00", "Finished");
  assert.equal(page.cues.filter((cue) => cue.frequency === 880).length, 5);
  assert.equal(page.cues.filter((cue) => cue.frequency === 660).length, 1);
});

test("one round completes all exercises without any rest", () => {
  const page = createPage();
  configure(page, 1, 99, 1);
  page.click("add-exercise");
  page.click("add-exercise");
  startExercise(page);
  page.advance(1_000);
  expectDisplay(page, "Exercise", 1, "00:01", "Running", 1);
  page.advance(1_000);
  expectDisplay(page, "Exercise", 1, "00:01", "Running", 1);
  page.advance(1_000);
  expectDisplay(page, "Complete", 1, "00:00", "Finished", 1);
});

test("pausing the second exercise preserves its position and fractional remaining time", () => {
  const page = createPage();
  configure(page, 2, 1, 1);
  page.click("add-exercise");
  page.change("exercise-2-seconds", "4");
  startExercise(page);
  page.advance(3_300);
  page.click("pause-button");
  page.advance(30_000);
  expectDisplay(page, "Exercise", 1, "00:03", "Paused", 1);
  page.click("pause-button");
  page.advance(2_699);
  expectDisplay(page, "Exercise", 1, "00:01", "Running", 1);
  page.advance(1);
  expectDisplay(page, "Complete", 1, "00:00", "Finished", 1);
});

test("exercise editing is locked during workouts and updates, then restored after Reset", () => {
  const page = createPage();
  page.click("add-exercise");
  for (const paused of [false, true]) {
    page.click("start-button");
    if (paused) page.click("pause-button");
    for (const id of ["add-exercise", "exercise-1-remove", "exercise-2-minutes", "exercise-2-seconds", "rest-minutes"]) {
      assert.equal(page.enabled(id), false);
    }
    page.click("reset-button");
    expectDisplay(page, "Exercise", 1, "00:10", "Ready");
  }
  assert.equal(page.updates.begin(), true);
  assert.equal(page.enabled("add-exercise"), false);
  assert.equal(page.enabled("exercise-2-remove"), false);
  page.updates.end();
  assert.equal(page.enabled("add-exercise"), true);
});

test("removing an exercise keeps the remaining duration, renumbers it, and remembers the result", () => {
  const storage = new Map();
  const page = createPage({ storage });
  page.click("add-exercise");
  page.change("exercise-2-minutes", "5");
  page.change("exercise-2-seconds", "30");
  page.click("exercise-1-remove");
  assert.equal(page.text("exercise-2-label"), "Exercise 1");
  assert.equal(page.hidden("exercise-2-remove"), true);
  expectDisplay(page, "Exercise", 1, "05:30", "Ready");
  expectDisplay(createPage({ storage }), "Exercise", 1, "05:30", "Ready");
  page.click("exercise-2-remove");
  assert.deepEqual(JSON.parse(storage.get(settingsKey)).exercises, [330]);
});

test("all exercise durations and their order survive reopening, including invalid edits", () => {
  const storage = new Map();
  const page = createPage({ storage });
  configure(page, 330, 90, 3);
  page.click("add-exercise");
  page.change("exercise-2-minutes", "1");
  page.change("exercise-2-seconds", "15");
  const saved = storage.get(settingsKey);
  page.change("exercise-2-seconds", "60");
  assert.equal(storage.get(settingsKey), saved);
  const reopened = createPage({ storage });
  assert.deepEqual([reopened.value("exercise-1-minutes"), reopened.value("exercise-1-seconds"),
    reopened.value("exercise-2-minutes"), reopened.value("exercise-2-seconds")], ["05", "30", "01", "15"]);
  assert.equal(reopened.value("rest-minutes"), "01");
  assert.equal(reopened.value("rest-seconds"), "30");
  expectDisplay(reopened, "Exercise", 1, "05:30", "Ready", 3);
});

test("old saved settings become Exercise 1 without overwriting the old version's data", () => {
  const legacyKey = "interval-timer.settings.v1";
  const old = JSON.stringify({ exerciseSeconds: 330, restSeconds: 75, rounds: 3 });
  const storage = new Map([[legacyKey, old]]);
  const page = createPage({ storage });
  expectDisplay(page, "Exercise", 1, "05:30", "Ready", 3);
  assert.equal(page.value("rest-minutes"), "01");
  assert.equal(page.value("rest-seconds"), "15");
  assert.equal(storage.has(settingsKey), false, "opening does not overwrite storage");
  page.click("add-exercise");
  assert.deepEqual(JSON.parse(storage.get(settingsKey)), { exercises: [330, 330], restSeconds: 75, rounds: 3 });
  assert.equal(storage.get(legacyKey), old);
});

test("invalid old storage falls back cleanly and valid new storage takes priority", () => {
  for (const raw of ["broken", "[]", JSON.stringify({ exerciseSeconds: 0, restSeconds: 5, rounds: 2 })]) {
    const page = createPage({ storage: new Map([["interval-timer.settings.v1", raw]]) });
    expectDisplay(page, "Exercise", 1, "00:10", "Ready");
    assert.equal(page.text("settings-save-status"), "");
  }
  const page = createPage({ storage: new Map([
    ["interval-timer.settings.v1", JSON.stringify({ exerciseSeconds: 10, restSeconds: 5, rounds: 2 })],
    [settingsKey, JSON.stringify({ exercises: [8, 7], restSeconds: 6, rounds: 3 })],
  ]) });
  expectDisplay(page, "Exercise", 1, "00:08", "Ready", 3);
});
