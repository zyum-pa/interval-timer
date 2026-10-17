const soundButton = document.querySelector("#sound-button");
const soundStatus = document.querySelector("#sound-status");
let audioContext;

// Ask supporting browsers to mix our beep with music from other apps.
if ("audioSession" in navigator) {
  try {
    navigator.audioSession.type = "ambient";
  } catch (error) {
    console.warn("The browser could not select mixed audio.", error);
  }
}

soundButton.addEventListener("click", async () => {
  soundButton.disabled = true;
  soundStatus.textContent = "Preparing sound…";

  try {
    // Create and resume audio inside a tap: mobile browsers require this.
    if (!audioContext) {
      audioContext = new AudioContext();
    }
    await audioContext.resume();

    if (audioContext.state !== "running") {
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
      soundButton.disabled = false;
      soundStatus.textContent = "Test finished. Did you hear the beep?";
    };

    soundStatus.textContent = "Playing a short beep…";
    tone.start(start);
    tone.stop(start + duration);
  } catch (error) {
    soundButton.disabled = false;
    soundStatus.textContent = "Sound could not start. Tap again, or tell me what happened.";
    console.error("Sound test failed.", error);
  }
});
