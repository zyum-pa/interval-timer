const soundButton = document.querySelector("#sound-button");
const soundStatus = document.querySelector("#sound-status");
const timeDisplay = document.querySelector("#time-display");
const timerStatus = document.querySelector("#timer-status");
const startButton = document.querySelector("#start-button");
const pauseButton = document.querySelector("#pause-button");
const resetButton = document.querySelector("#reset-button");

const durationMs = 10_000; // A millisecond is one thousandth of a second.
let remainingMs = durationMs;
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

function playBeep(onFinished = () => {}) {
  if (!audioContext || audioContext.state !== "running") {
    throw new Error("Audio is not running.");
  }

  // An oscillator generates a tone; gain controls its volume.
  const tone = audioContext.createOscillator();
  const volume = audioContext.createGain();
  const start = audioContext.currentTime;
  const duration = 0.25;

  tone.frequency.value = 880;
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

function updateCountdown() {
  // Read elapsed time from the browser clock, independent of update delays.
  remainingMs = Math.max(0, finishAt - performance.now());
  if (remainingMs === 0) {
    stopUpdates();
    timerState = "finished";
    try {
      playBeep();
    } catch (error) {
      soundStatus.textContent = "Countdown finished, but sound was unavailable. Try the sound test.";
      console.warn("Completion sound failed.", error);
    }
  }
  renderTimer();
}

function runCountdown() {
  // Audio preparation must not delay the timer or undo a Reset click.
  prepareAudio().catch((error) => {
    soundStatus.textContent = "The timer will continue, but sound could not start. Try the sound test.";
    console.warn("Countdown audio could not start.", error);
  });
  timerState = "running";
  finishAt = performance.now() + remainingMs;
  updateInterval = setInterval(updateCountdown, 100);
  renderTimer();
}

startButton.addEventListener("click", () => {
  if (timerState !== "ready" && timerState !== "finished") return;
  remainingMs = durationMs;
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
  remainingMs = durationMs;
  renderTimer();
});

soundButton.addEventListener("click", async () => {
  soundButton.disabled = true;
  soundStatus.textContent = "Preparing sound…";
  try {
    await prepareAudio();
    playBeep(() => {
      soundButton.disabled = false;
      soundStatus.textContent = "Test finished. Did you hear the beep?";
    });
    soundStatus.textContent = "Playing a short beep…";
  } catch (error) {
    soundButton.disabled = false;
    soundStatus.textContent = "Sound could not start. Tap again, or tell me what happened.";
    console.error("Sound test failed.", error);
  }
});

renderTimer();
