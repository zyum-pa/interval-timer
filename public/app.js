const soundStatus = document.querySelector("#sound-status");
const timeDisplay = document.querySelector("#time-display");
const timerStatus = document.querySelector("#timer-status");
const startButton = document.querySelector("#start-button");
const pauseButton = document.querySelector("#pause-button");
const resetButton = document.querySelector("#reset-button");
const phaseDisplay = document.querySelector("#phase-display");
const roundDisplay = document.querySelector("#round-display");
const settingsSaveStatus = document.querySelector("#settings-save-status");
const exerciseList = document.querySelector("#exercise-list");
const addExerciseButton = document.querySelector("#add-exercise");
const roundsInput = document.querySelector("#rounds");
const roundsError = document.querySelector("#rounds-error");
const restField = {
  minutes: document.querySelector("#rest-minutes"),
  seconds: document.querySelector("#rest-seconds"),
  error: document.querySelector("#rest-error"),
};
const exerciseFields = [];
let nextExerciseId = 0;
const maxExercises = 99;

const settingsStorageKey = "interval-timer.settings.v2";
let settingsStorageAvailable = true;
let settings = readSavedSettings();
let settingsValid = true;
let workout = buildWorkout(settings);
let phaseIndex = 0;
let remainingMs = workout[0].durationMs;
let finishAt = 0;
let updateInterval;
let timerState = "ready";
let applyingAppUpdate = false;
let audioContext;
const preparationMs = 3_000;
let lastCueSecond;
let audioRunId = 0;
const activeWorkoutTones = new Set();

// The updater can lock controls, but cannot replace an active or paused workout.
window.workoutUpdates = {
  isBusy: () => timerState === "running" || timerState === "paused",
  begin() {
    if (this.isBusy()) return false;
    applyingAppUpdate = true;
    renderTimer();
    return true;
  },
  end() { applyingAppUpdate = false; renderTimer(); },
  onChange: null,
};

function readSavedSettings() {
  const defaults = { exercises: [10], restSeconds: 5, rounds: 2 };
  let raw;
  let legacy = false;
  try {
    raw = localStorage.getItem(settingsStorageKey);
    if (raw === null) {
      raw = localStorage.getItem("interval-timer.settings.v1");
      legacy = true;
    }
  } catch {
    settingsStorageAvailable = false;
    return defaults;
  }
  try {
    let saved = JSON.parse(raw);
    if (legacy && saved && !Array.isArray(saved)) {
      saved = { exercises: [saved.exerciseSeconds], restSeconds: saved.restSeconds, rounds: saved.rounds };
    }
    const validTime = (value) => Number.isInteger(value) && value >= 1 && value <= 3600;
    if (saved && Array.isArray(saved.exercises) && saved.exercises.length >= 1
        && saved.exercises.length <= maxExercises && saved.exercises.every(validTime)
        && validTime(saved.restSeconds) && Number.isInteger(saved.rounds) && saved.rounds >= 1 && saved.rounds <= 99) {
      // Restore just workout choices, never timer progress or unknown fields.
      return { exercises: [...saved.exercises], restSeconds: saved.restSeconds, rounds: saved.rounds };
    }
  } catch {
    // Invalid saved data falls back to the normal first-use settings.
  }
  return defaults;
}

function saveSettings() {
  try {
    localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
    settingsStorageAvailable = true;
  } catch {
    settingsStorageAvailable = false;
  }
}

function buildWorkout(values) {
  const phases = [];
  for (let round = 1; round <= values.rounds; round += 1) {
    values.exercises.forEach((seconds) => {
      phases.push({ phase: "Exercise", round, durationMs: seconds * 1000 });
    });
    if (round < values.rounds) {
      phases.push({ phase: "Rest", round, durationMs: values.restSeconds * 1000 });
    }
  }
  return phases;
}

function applySettings(remember = true) {
  if (timerState === "running" || timerState === "paused" || applyingAppUpdate) return;
  settingsValid = true;
  const exercises = exerciseFields.map(readDuration);
  const restSeconds = readDuration(restField);
  const rawRounds = roundsInput.value.trim();
  const rounds = Number(rawRounds);
  const validRounds = /^\d+$/.test(rawRounds) && Number.isInteger(rounds) && rounds >= 1 && rounds <= 99;
  roundsInput.setAttribute("aria-invalid", String(!validRounds));
  roundsError.textContent = validRounds ? "" : "Enter a whole number from 1 to 99.";
  if (!validRounds) settingsValid = false;
  timerState = "ready";
  if (settingsValid) {
    settings = { exercises, restSeconds, rounds };
    if (remember) saveSettings();
    workout = buildWorkout(settings);
    phaseIndex = 0;
    remainingMs = workout[0].durationMs;
    lastCueSecond = undefined;
  }
  renderTimer();
}

function readDuration(field) {
  const minutes = field.minutes.value.trim();
  const seconds = field.seconds.value.trim();
  const total = Number(minutes) * 60 + Number(seconds);
  const valid = /^\d{1,2}$/.test(minutes) && /^\d{1,2}$/.test(seconds)
    && Number(seconds) <= 59 && total >= 1 && total <= 3600;
  for (const input of [field.minutes, field.seconds]) input.setAttribute("aria-invalid", String(!valid));
  const message = valid ? "" : "Enter 00:01–60:00; seconds 00–59.";
  if (field.error.textContent !== message) field.error.textContent = message;
  if (!valid) settingsValid = false;
  return total;
}

function writeDuration(field, seconds) {
  field.minutes.value = String(Math.floor(seconds / 60)).padStart(2, "0");
  field.seconds.value = String(seconds % 60).padStart(2, "0");
}

function bindDuration(field) {
  for (const input of [field.minutes, field.seconds]) {
    input.addEventListener("input", () => applySettings());
    input.addEventListener("blur", () => {
      if (/^\d{1,2}$/.test(input.value)) input.value = input.value.padStart(2, "0");
    });
  }
}

function addExercise(seconds) {
  const prefix = `exercise-${++nextExerciseId}`;
  const row = document.createElement("div");
  row.className = "exercise-row";
  row.innerHTML = `
    <span id="${prefix}-label"></span>
    <div class="time-inputs" role="group" aria-labelledby="${prefix}-label">
      <input id="${prefix}-minutes" type="text" inputmode="numeric" pattern="[0-9]{1,2}" maxlength="2" aria-describedby="${prefix}-error" required>
      <span aria-hidden="true">:</span>
      <input id="${prefix}-seconds" type="text" inputmode="numeric" pattern="[0-9]{1,2}" maxlength="2" aria-describedby="${prefix}-error" required>
    </div>
    <button id="${prefix}-remove" class="remove-exercise" type="button">×</button>
    <p id="${prefix}-error" class="field-error" aria-live="polite"></p>`;
  exerciseList.append(row);
  const field = {
    row, label: row.querySelector(`#${prefix}-label`),
    minutes: row.querySelector(`#${prefix}-minutes`), seconds: row.querySelector(`#${prefix}-seconds`),
    error: row.querySelector(`#${prefix}-error`), remove: row.querySelector(`#${prefix}-remove`),
  };
  exerciseFields.push(field);
  writeDuration(field, seconds);
  bindDuration(field);
  field.remove.addEventListener("click", () => {
    if (window.workoutUpdates.isBusy() || applyingAppUpdate || exerciseFields.length === 1) return;
    exerciseFields.splice(exerciseFields.indexOf(field), 1);
    row.remove();
    labelExercises();
    applySettings();
  });
  labelExercises();
}

function labelExercises() {
  exerciseFields.forEach((field, index) => {
    field.label.textContent = `Exercise ${index + 1}`;
    field.minutes.setAttribute("aria-label", `Exercise ${index + 1} minutes`);
    field.seconds.setAttribute("aria-label", `Exercise ${index + 1} seconds`);
    field.remove.setAttribute("aria-label", `Remove exercise ${index + 1}`);
    field.remove.hidden = exerciseFields.length === 1;
  });
}

// Ask supporting browsers to mix our beep with music from other apps.
if ("audioSession" in navigator) {
  try {
    navigator.audioSession.type = "ambient";
  } catch (error) {
    console.warn("The browser could not select mixed audio.", error);
  }
}

async function prepareAudio() {
  // Prepare audio inside Start or Resume so it can play later.
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  await audioContext.resume();

  if (audioContext.state !== "running") {
    throw new Error("Audio is not running.");
  }
}

function playBeep({ frequency = 880, duration = 0.25, onFinished = () => {} } = {}) {
  if (!audioContext || audioContext.state !== "running") {
    throw new Error("Audio is not running.");
  }

  // An oscillator generates a tone; gain controls its volume.
  const tone = audioContext.createOscillator();
  const volume = audioContext.createGain();
  const start = audioContext.currentTime;

  tone.frequency.value = frequency;
  volume.gain.setValueAtTime(0, start);
  // Stronger cues help them stand out over music; retain a short fade to avoid clicks.
  volume.gain.linearRampToValueAtTime(0.6, start + 0.01);
  volume.gain.linearRampToValueAtTime(0, start + duration);

  tone.connect(volume);
  volume.connect(audioContext.destination);
  tone.onended = () => {
    tone.disconnect();
    volume.disconnect();
    onFinished();
  };
  tone.start(start);
  tone.stop(start + duration);
  return tone;
}

function renderTimer() {
  // Round up so 00:00 appears only when the countdown actually finishes.
  const seconds = Math.ceil(remainingMs / 1000);
  const minutesText = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secondsText = String(seconds % 60).padStart(2, "0");
  timeDisplay.textContent = settingsValid ? `${minutesText}:${secondsText}` : "--:--";
  const currentPhase = phaseIndex === -1 ? { phase: "Get ready", round: 1 } : workout[phaseIndex];
  const phase = timerState === "finished" ? "Complete" : currentPhase.phase;
  const round = settingsValid ? `Set ${currentPhase.round} of ${settings.rounds}` : "Set —";
  // Update announcements only when the phase or round actually changes.
  if (phaseDisplay.textContent !== phase) phaseDisplay.textContent = phase;
  if (roundDisplay.textContent !== round) roundDisplay.textContent = round;
  const labels = { ready: "Ready", running: "Running", paused: "Paused", finished: "Finished" };
  const status = settingsValid ? labels[timerState] : "Check settings";
  // Announce status changes to screen readers only when the state changes.
  if (timerStatus.textContent !== status) {
    timerStatus.textContent = status;
  }
  const active = timerState === "running" || timerState === "paused";
  startButton.disabled = active || !settingsValid || applyingAppUpdate;
  pauseButton.disabled = (!active) || applyingAppUpdate;
  resetButton.disabled = applyingAppUpdate;
  pauseButton.textContent = timerState === "paused" ? "Resume" : "Pause";
  const locked = active || applyingAppUpdate;
  for (const field of [...exerciseFields, restField]) {
    field.minutes.disabled = locked;
    field.seconds.disabled = locked;
    if (field.remove) field.remove.disabled = locked;
  }
  roundsInput.disabled = locked;
  addExerciseButton.disabled = locked || !settingsValid || exerciseFields.length >= maxExercises;
  const saveMessage = settingsStorageAvailable
    ? ""
    : "Settings cannot be remembered here. You can still use the timer.";
  if (settingsSaveStatus.textContent !== saveMessage) settingsSaveStatus.textContent = saveMessage;
  window.workoutUpdates.onChange?.();
}

function stopUpdates() {
  clearInterval(updateInterval);
  updateInterval = undefined;
  audioRunId += 1;
  for (const tone of activeWorkoutTones) tone.stop();
  activeWorkoutTones.clear();
}

function playWorkoutCue(kind = "phase") {
  const sounds = {
    tick: { frequency: 1100, duration: 0.08 },
    phase: { frequency: 880, duration: 0.25 },
    complete: { frequency: 660, duration: 0.75 },
  };
  try {
    // A phase cue takes over cleanly even if a late tick is still sounding.
    for (const tone of activeWorkoutTones) tone.stop();
    activeWorkoutTones.clear();
    const tone = playBeep({ ...sounds[kind], onFinished: () => activeWorkoutTones.delete(tone) });
    activeWorkoutTones.add(tone);
  } catch (error) {
    const event = kind === "complete" ? "Workout finished" : "Workout continues";
    soundStatus.textContent = `${event}, but sound was unavailable. Check volume, then pause and resume to retry.`;
    console.warn("Workout sound failed.", error);
  }
}

function updateCountdown() {
  if (timerState !== "running") return;
  const now = performance.now();
  let phaseChanged = false;

  // Carry the finish time forward so browser delays don't extend the workout.
  while (now >= finishAt) {
    if (phaseIndex === workout.length - 1) {
      remainingMs = 0;
      stopUpdates();
      timerState = "finished";
      playWorkoutCue("complete");
      renderTimer();
      return;
    }
    phaseIndex += 1;
    finishAt += workout[phaseIndex].durationMs;
    phaseChanged = true;
  }

  remainingMs = finishAt - now;
  const seconds = Math.ceil(remainingMs / 1000);
  // If updates were delayed, cue the current phase once, without old cues.
  if (phaseChanged) {
    playWorkoutCue("phase");
    // The opening phase cue replaces the tick for a short phase's first second.
    lastCueSecond = seconds;
  } else if (seconds !== lastCueSecond) {
    lastCueSecond = seconds;
    if (phaseIndex === -1 || seconds <= 5) playWorkoutCue("tick");
  }
  renderTimer();
}

function runCountdown(starting = false) {
  const runId = ++audioRunId;
  // Audio preparation must not delay the timer or undo a Reset click.
  prepareAudio().then(() => {
    if (runId !== audioRunId || timerState !== "running") return;
    soundStatus.textContent = "";
    // Play the opening "3" only while that same starting countdown is active.
    if (starting && phaseIndex === -1
        && Math.ceil((finishAt - performance.now()) / 1000) === 3) {
      playWorkoutCue("tick");
    }
  }).catch((error) => {
    if (runId !== audioRunId) return;
    soundStatus.textContent = "Sound could not start. Check volume, then pause and resume to retry.";
    console.warn("Workout audio could not start.", error);
  });
  timerState = "running";
  finishAt = performance.now() + remainingMs;
  updateInterval = setInterval(updateCountdown, 100);
  renderTimer();
}

startButton.addEventListener("click", () => {
  if (applyingAppUpdate) return;
  if (timerState !== "ready" && timerState !== "finished") return;
  applySettings();
  if (!settingsValid) return;
  stopUpdates();
  soundStatus.textContent = "";
  phaseIndex = -1;
  remainingMs = preparationMs;
  lastCueSecond = 3;
  runCountdown(true);
});

pauseButton.addEventListener("click", () => {
  if (applyingAppUpdate) return;
  if (timerState === "paused") {
    runCountdown();
  } else if (timerState === "running") {
    // Capture the exact remaining time, including fractions of a second.
    updateCountdown();
    if (timerState === "finished") return;
    stopUpdates();
    timerState = "paused";
    renderTimer();
  }
});

resetButton.addEventListener("click", () => {
  if (applyingAppUpdate) return;
  stopUpdates();
  timerState = "ready";
  applySettings();
});

addExerciseButton.addEventListener("click", () => {
  if (window.workoutUpdates.isBusy() || applyingAppUpdate || !settingsValid || exerciseFields.length >= maxExercises) return;
  addExercise(settings.exercises.at(-1));
  applySettings();
});

settings.exercises.forEach(addExercise);
writeDuration(restField, settings.restSeconds);
roundsInput.value = String(settings.rounds);
bindDuration(restField);
roundsInput.addEventListener("input", () => applySettings());
applySettings(false);
