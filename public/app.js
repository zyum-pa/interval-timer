const soundButton = document.querySelector("#sound-button");
const soundStatus = document.querySelector("#sound-status");
const timeDisplay = document.querySelector("#time-display");
const timerStatus = document.querySelector("#timer-status");
const startButton = document.querySelector("#start-button");
const pauseButton = document.querySelector("#pause-button");
const resetButton = document.querySelector("#reset-button");
const phaseDisplay = document.querySelector("#phase-display");
const roundDisplay = document.querySelector("#round-display");
const workoutSummary = document.querySelector("#workout-summary");
const settingsHint = document.querySelector("#settings-hint");
const settingFields = [
  { key: "exerciseSeconds", input: document.querySelector("#exercise-seconds"), error: document.querySelector("#exercise-error"), max: 3600 },
  { key: "restSeconds", input: document.querySelector("#rest-seconds"), error: document.querySelector("#rest-error"), max: 3600 },
  { key: "rounds", input: document.querySelector("#rounds"), error: document.querySelector("#rounds-error"), max: 99 },
];

let settings = { exerciseSeconds: 10, restSeconds: 5, rounds: 2 };
let settingsValid = true;
let workout = buildWorkout(settings);
let phaseIndex = 0;
let remainingMs = workout[0].durationMs;
let finishAt = 0;
let updateInterval;
let timerState = "ready";
let audioContext;

function buildWorkout(values) {
  const phases = [];
  for (let round = 1; round <= values.rounds; round += 1) {
    phases.push({ phase: "Exercise", round, durationMs: values.exerciseSeconds * 1000 });
    if (round < values.rounds) {
      phases.push({ phase: "Rest", round, durationMs: values.restSeconds * 1000 });
    }
  }
  return phases;
}

function applySettings() {
  if (timerState === "running" || timerState === "paused") return;
  const nextSettings = {};
  settingsValid = true;
  for (const field of settingFields) {
    const raw = field.input.value.trim();
    const value = Number(raw);
    const valid = raw !== "" && Number.isInteger(value) && value >= 1 && value <= field.max;
    const message = valid ? "" : `Enter a whole number from 1 to ${field.max.toLocaleString("en-US")}.`;
    if (field.error.textContent !== message) field.error.textContent = message;
    field.input.setAttribute("aria-invalid", String(!valid));
    if (!valid) settingsValid = false;
    nextSettings[field.key] = value;
  }
  timerState = "ready";
  if (settingsValid) {
    settings = nextSettings;
    workout = buildWorkout(settings);
    phaseIndex = 0;
    remainingMs = workout[0].durationMs;
  }
  renderTimer();
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
  // Prepare audio inside Start, Resume, or a test tap so it can play later.
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
  volume.gain.linearRampToValueAtTime(0.2, start + 0.01);
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
}

function renderTimer() {
  // Round up so 00:00 appears only when the countdown actually finishes.
  const seconds = Math.ceil(remainingMs / 1000);
  const minutesText = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secondsText = String(seconds % 60).padStart(2, "0");
  timeDisplay.textContent = settingsValid ? `${minutesText}:${secondsText}` : "--:--";
  const phase = timerState === "finished" ? "Complete" : workout[phaseIndex].phase;
  const round = settingsValid ? `Round ${workout[phaseIndex].round} of ${settings.rounds}` : "Round —";
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
  startButton.disabled = active || !settingsValid;
  pauseButton.disabled = timerState !== "running" && timerState !== "paused";
  pauseButton.textContent = timerState === "paused" ? "Resume" : "Pause";
  for (const field of settingFields) field.input.disabled = active;
  settingsHint.textContent = active
    ? "Settings are locked. Reset to change them."
    : "Adjust before starting. Reset keeps your choices.";
  workoutSummary.textContent = settingsValid
    ? `${settings.exerciseSeconds} sec exercise · ${settings.restSeconds} sec rest · ${settings.rounds} ${settings.rounds === 1 ? "round" : "rounds"}`
    : "Correct the settings below to start.";
}

function stopUpdates() {
  clearInterval(updateInterval);
  updateInterval = undefined;
}

function playWorkoutCue(completed = false) {
  try {
    playBeep(completed ? { frequency: 660, duration: 0.75 } : {});
  } catch (error) {
    const event = completed ? "Workout finished" : "Phase changed";
    soundStatus.textContent = `${event}, but sound was unavailable. Try the sound test.`;
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
      playWorkoutCue(true);
      renderTimer();
      return;
    }
    phaseIndex += 1;
    finishAt += workout[phaseIndex].durationMs;
    phaseChanged = true;
  }

  remainingMs = finishAt - now;
  // If updates were delayed, cue the current phase once, without old cues.
  if (phaseChanged) playWorkoutCue();
  renderTimer();
}

function runCountdown() {
  // Audio preparation must not delay the timer or undo a Reset click.
  prepareAudio().catch((error) => {
    soundStatus.textContent = "The workout will continue, but sound could not start. Try the sound test.";
    console.warn("Workout audio could not start.", error);
  });
  timerState = "running";
  finishAt = performance.now() + remainingMs;
  updateInterval = setInterval(updateCountdown, 100);
  renderTimer();
}

startButton.addEventListener("click", () => {
  if (timerState !== "ready" && timerState !== "finished") return;
  applySettings();
  if (!settingsValid) return;
  runCountdown();
});

pauseButton.addEventListener("click", () => {
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
  stopUpdates();
  timerState = "ready";
  applySettings();
});

soundButton.addEventListener("click", async () => {
  soundButton.disabled = true;
  soundStatus.textContent = "Preparing sound…";
  try {
    await prepareAudio();
    playBeep({ onFinished: () => {
      soundButton.disabled = false;
      soundStatus.textContent = "Test finished. Did you hear the beep?";
    } });
    soundStatus.textContent = "Playing a short beep…";
  } catch (error) {
    soundButton.disabled = false;
    soundStatus.textContent = "Sound could not start. Tap again, or tell me what happened.";
    console.error("Sound test failed.", error);
  }
});

for (const field of settingFields) field.input.addEventListener("input", applySettings);
applySettings();
