const soundButton = document.querySelector("#sound-button");
const soundStatus = document.querySelector("#sound-status");
const timeDisplay = document.querySelector("#time-display");
const timerStatus = document.querySelector("#timer-status");
const startButton = document.querySelector("#start-button");
const pauseButton = document.querySelector("#pause-button");
const resetButton = document.querySelector("#reset-button");
const phaseDisplay = document.querySelector("#phase-display");
const roundDisplay = document.querySelector("#round-display");

// A short, fixed workout keeps this lesson quick to test.
const workout = [
  { phase: "Exercise", round: 1, durationMs: 10_000 },
  { phase: "Rest", round: 1, durationMs: 5_000 },
  { phase: "Exercise", round: 2, durationMs: 10_000 },
];
let phaseIndex = 0;
let remainingMs = workout[0].durationMs;
let finishAt = 0;
let updateInterval;
let timerState = "ready";
let audioContext;

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
  timeDisplay.textContent = `00:${String(seconds).padStart(2, "0")}`;
  const phase = timerState === "finished" ? "Complete" : workout[phaseIndex].phase;
  const round = `Round ${workout[phaseIndex].round} of 2`;
  // Update announcements only when the phase or round actually changes.
  if (phaseDisplay.textContent !== phase) phaseDisplay.textContent = phase;
  if (roundDisplay.textContent !== round) roundDisplay.textContent = round;
  const labels = { ready: "Ready", running: "Running", paused: "Paused", finished: "Finished" };
  // Announce status changes to screen readers only when the state changes.
  if (timerStatus.textContent !== labels[timerState]) {
    timerStatus.textContent = labels[timerState];
  }
  startButton.disabled = timerState === "running" || timerState === "paused";
  pauseButton.disabled = timerState !== "running" && timerState !== "paused";
  pauseButton.textContent = timerState === "paused" ? "Resume" : "Pause";
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
  phaseIndex = 0;
  remainingMs = workout[0].durationMs;
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
  phaseIndex = 0;
  remainingMs = workout[0].durationMs;
  renderTimer();
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

renderTimer();
