# Interval Timer

A beginner learning project: a personal interval timer web app, developed on Windows with Codex and used mainly on an iPhone 12.

## First version

- Adjustable exercise time, rest time, and number of rounds.
- A three-second countdown before the workout starts.
- Large remaining-time, current-phase, and current-round displays.
- Audible cues during the final five seconds of exercise and rest, with a distinct cue at phase changes.
- Start, Pause/Resume, and Reset controls.
- Skip rest after the final exercise and play a distinct completion sound.
- Test audio early on the actual iPhone alongside music from the YouTube app, with the timer visible and the screen unlocked.
- No accounts or backend.

## Later

- Offline use.
- Adding the app to the iPhone Home Screen.

## Working approach

Treat this as a guided course in product and software development. Before each lesson, explain the user benefit, product decisions, and success criteria, then pause for questions before changing files. Keep code details brief unless requested. Build one small increment, check it, and pause for the user's test. Save working checkpoints with Git and GitHub, distinguishing browser checks from real iPhone results.

## Current status

Lesson 3: a fixed two-round workout: exercise for ten seconds, rest for five seconds, exercise for ten seconds, then finish with no final rest. Includes phase and round labels, Start, Pause/Resume, Reset, short transition beeps, and a longer, lower completion tone. Real iPhone verification of this workout is pending.

The user confirmed that the preceding simple-countdown test worked. Lesson 1's button-triggered sound was also tested successfully in Safari on the user's iPhone alongside music from the YouTube app.

## Run the app

From the project folder in PowerShell:

```powershell
python -m http.server 8000 --bind 0.0.0.0 --directory public
```

This starts a local development server: a temporary program on your PC that sends the page to your browser. It serves only the `public` folder. No extra packages are needed. Stop it with Ctrl+C.

On the PC, open <http://localhost:8000>. For iPhone testing, keep the PC running, connect both devices to the same home Wi-Fi network, and use `http://YOUR-PC-IP:8000` in Safari. The PC's IPv4 address is listed by `ipconfig`. Windows Firewall or Wi-Fi isolation may prevent the phone from connecting; diagnose that if needed rather than disabling protections.

## Files in this lesson

- `public/index.html`: HTML describes the page's content, time display, and buttons.
- `public/styles.css`: CSS controls the layout, colors, and button size.
- `public/app.js`: JavaScript runs the countdown and generates the beep.

The Web Audio API is the browser's built-in sound interface. The script creates an `AudioContext` (the browser's sound workspace) in response to a tap. Where supported, it requests `ambient` audio so the beep can mix with other audio. This is a browser request, not a guarantee of iPhone behavior.

References: [Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices), [audio session types](https://developer.mozilla.org/en-US/docs/Web/API/AudioSession/type).

## Verify Lesson 2

Keep the page visible and the screen unlocked during this test. Reload Safari to get the updated page; look for **Interval Timer · Lesson 2**.

1. Expect **00:10**, **Ready**, an enabled **Start** button, and a disabled **Pause** button.
2. Tap **Start**. Expect **Running** and decreasing time. Start is disabled while running or paused to prevent overlapping countdowns.
3. After a few seconds, tap **Pause**. Expect **Paused** and a **Resume** button. Wait several seconds: the time should hold.
4. Tap **Resume**. Expect the countdown to continue from where it paused.
5. Let it reach **00:00**. Expect **Finished** and one automatic beep. The display should stay at zero, and Start should become available again.
6. Tap **Start**, then **Reset** before it finishes. Expect **00:10** and **Ready**. Wait longer than ten seconds: it should remain ready with no completion beep.
7. Start again, pause, then reset. Expect **00:10** and **Ready** again.
8. On your iPhone, repeat with music playing in the YouTube app. Confirm that the automatic beep at zero is audible and that music continues.

These are the historical Lesson 2 checks. The current page runs Lesson 3's workout; use its checklist below.

## Verify Lesson 3

Reload Safari and look for **Interval Timer · Lesson 3**. Keep the page visible and the screen unlocked.

1. Expect **Exercise**, **Round 1 of 2**, **00:10**, and **Ready**.
2. Tap **Start** and follow one uninterrupted workout. After ten seconds, expect **Rest**, **Round 1 of 2**, **00:05**, and a short beep.
3. After five seconds of rest, expect **Exercise**, **Round 2 of 2**, **00:10**, and another short beep.
4. After the second exercise, expect **Complete**, **Round 2 of 2**, **00:00**, **Finished**, and one longer, lower tone. There is no final rest. The uninterrupted workout totals 25 seconds.
5. Start again. Pause during exercise and then during rest. Each pause must hold the phase, round, and remaining time; Resume must continue from that place.
6. Reset during exercise and during rest, including while paused. Expect the initial ready screen. Wait beyond the old finish time: the cancelled workout must not continue or play future cues.
7. On your iPhone, repeat with the YouTube app playing music. Check whether phase and completion sounds are audible, clearly different, and allow music to continue.

Product decision: fixed short times make the complete sequence quick to test before adjustable settings are introduced. The separate sound-test button remains available to diagnose audio independently of the workout. The three-second preparation countdown and final-five-second cues are later milestones.

## Repeatable behaviour checks

```powershell
node --test tests/workout.test.cjs
```

These checks use Node's built-in tools and add no packages. They cover the full sequence, skipping final rest, distinct cues, pause/resume in both phases, resetting in every phase, delayed updates, replay, and visual completion when audio is unavailable. They use a controlled clock and stand-ins for the browser's sound tools, so they do not establish actual iPhone audio compatibility or visual layout.

The app continues to run entirely in the browser. The local development server only serves the files; it does not manage workouts or store data.

## Recheck Lesson 1's sound button

1. Without music, tap **Play test sound**. Expect a short beep and the message **Test finished. Did you hear the beep?** The message confirms that playback finished in the browser, not that the device speaker was audible.
2. Tap again to check that the button works repeatedly.
3. On the iPhone, turn Silent Mode off and choose a comfortable media volume.
4. Start music in the YouTube app, then return to Safari. Note if the music stops before tapping.
5. With Safari visible and the screen unlocked, tap the button. Report whether the beep is audible and whether music continues.

The YouTube app must already support playback while another app is visible for this setup to work. If music stops as soon as you leave YouTube, that is a separate issue from this sound button.

## Verified checkpoint — October 17, 2026

- Desktop browser: the sound button completed playback and worked on repeated taps without browser errors.
- Real iPhone test, reported by the user: the page opened in Safari, and tapping **Play test sound** produced an audible beep while YouTube music played in the background.
- This verifies the button-triggered beep in the tested setup. Delayed workout cues will need another real-device test when the timer is added.

## Browser checkpoint — October 18, 2026

- Pause held the remaining time; Resume continued to zero and showed **Finished** without browser errors.
- Start worked again after completion. Reset during an active run restored **00:10** and **Ready** and cancelled the old countdown.
- The user subsequently confirmed that the Lesson 2 test worked.

## Lesson 3 checkpoint — October 18, 2026

- Repeatable behaviour checks passed. Real browser checks cover the phase and round displays, controls, completion, and mobile layout.
- Real iPhone verification of the full sequence and its sounds alongside YouTube is pending.

Pause here for the user's test before adding further timer features.
