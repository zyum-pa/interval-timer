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

Lesson 4: adjustable exercise time, rest time, and number of rounds. Defaults remain ten seconds exercise, five seconds rest, and two rounds. Settings lock during running and paused workouts; Reset keeps the chosen values. Invalid entries block Start and show a field-specific explanation. Real iPhone verification of adjustable settings is pending.

The user confirmed that Lesson 3's two-round workout worked on the iPhone with YouTube playing. The preceding simple countdown and button-triggered sound tests were also confirmed.

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

## Historical Lesson 2 checks

Keep the page visible and the screen unlocked during this test. Reload Safari to get the updated page; look for **Interval Timer · Lesson 2**.

1. Expect **00:10**, **Ready**, an enabled **Start** button, and a disabled **Pause** button.
2. Tap **Start**. Expect **Running** and decreasing time. Start is disabled while running or paused to prevent overlapping countdowns.
3. After a few seconds, tap **Pause**. Expect **Paused** and a **Resume** button. Wait several seconds: the time should hold.
4. Tap **Resume**. Expect the countdown to continue from where it paused.
5. Let it reach **00:00**. Expect **Finished** and one automatic beep. The display should stay at zero, and Start should become available again.
6. Tap **Start**, then **Reset** before it finishes. Expect **00:10** and **Ready**. Wait longer than ten seconds: it should remain ready with no completion beep.
7. Start again, pause, then reset. Expect **00:10** and **Ready** again.
8. On your iPhone, repeat with music playing in the YouTube app. Confirm that the automatic beep at zero is audible and that music continues.

These are historical checks. The current page runs Lesson 4; use its checklist below.

## Historical Lesson 3 checks

Reload Safari and look for **Interval Timer · Lesson 3**. Keep the page visible and the screen unlocked.

1. Expect **Exercise**, **Round 1 of 2**, **00:10**, and **Ready**.
2. Tap **Start** and follow one uninterrupted workout. After ten seconds, expect **Rest**, **Round 1 of 2**, **00:05**, and a short beep.
3. After five seconds of rest, expect **Exercise**, **Round 2 of 2**, **00:10**, and another short beep.
4. After the second exercise, expect **Complete**, **Round 2 of 2**, **00:00**, **Finished**, and one longer, lower tone. There is no final rest. The uninterrupted workout totals 25 seconds.
5. Start again. Pause during exercise and then during rest. Each pause must hold the phase, round, and remaining time; Resume must continue from that place.
6. Reset during exercise and during rest, including while paused. Expect the initial ready screen. Wait beyond the old finish time: the cancelled workout must not continue or play future cues.
7. On your iPhone, repeat with the YouTube app playing music. Check whether phase and completion sounds are audible, clearly different, and allow music to continue.

Product decision: fixed short times make the complete sequence quick to test before adjustable settings are introduced. The separate sound-test button remains available to diagnose audio independently of the workout. The three-second preparation countdown and final-five-second cues are later milestones.

## Verify Lesson 4

Reload Safari and look for **Interval Timer · Lesson 4**. Keep the page visible and the screen unlocked.

1. Check the defaults: **10** seconds exercise, **5** seconds rest, **2** rounds. The preview should match.
2. Choose **3** seconds exercise, **2** seconds rest, and **3** rounds. Expect **Exercise**, **Round 1 of 3**, **00:03**, **Ready**.
3. Start. Expect exercise → rest → exercise → rest → exercise → completion: a 13-second workout, four short phase-change beeps, and the distinct completion tone. There is no final rest.
4. On another run, pause during exercise and during rest. The settings must stay locked while running or paused. Resume must preserve the current phase, round, and remaining time.
5. Reset during the workout. Expect **Exercise**, **Round 1 of 3**, **00:03**, **Ready**; the selected values remain **3 / 2 / 3** and become editable. The cancelled run must not resume or play future cues.
6. Choose **4** seconds exercise and **1** round. Start: expect four seconds of exercise followed immediately by completion, with no rest.
7. While ready, clear a setting or enter **0**, a negative number, or a fraction. Expect an explanation beside that field, **Check settings**, **--:--**, and an unavailable Start button. Correct the entry: the error clears and Start becomes available.
8. Try **61** seconds exercise while ready. Expect **01:01** in the preview. Reload the page: the defaults return to **10 / 5 / 2**.
9. Repeat a short workout on the iPhone with YouTube music playing. Check input comfort, readable labels, audible cues, and music continuing.

Product decisions: whole seconds and positive round counts keep setup straightforward. Visible limits of 1–3,600 seconds per phase and 1–99 rounds catch accidental oversized entries and keep generated workouts small. Changes apply between workouts, and Reset retains the user's choices. Remembering settings after refreshing or closing the page is a later lesson. No new packages were added.

## Repeatable behaviour checks

```powershell
node --test tests/workout.test.cjs
```

These checks use Node's built-in tools and add no packages. They cover the full sequence, skipping final rest, distinct cues, pause/resume in both phases, resetting in every phase, delayed updates, replay, visual completion when audio is unavailable, chosen settings, one-round workouts, validation, locking, and minute formatting. They use a controlled clock and stand-ins for the browser's sound tools, so they do not establish actual iPhone audio compatibility or visual layout.

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
- The user subsequently confirmed that the two-round workout worked on the iPhone with YouTube playing.

## Lesson 4 checkpoint — October 18, 2026

- Fifteen repeatable behaviour checks passed, covering the earlier workout behaviour and the new settings.
- Browser verification includes preview updates, setting locks, Reset preserving choices, workout completion, input validation, and mobile layout.
- Real iPhone verification of adjustable settings is pending.

Pause here for the user's test before adding further timer features.
