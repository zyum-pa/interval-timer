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

Keep the implementation simple, explain new technical terms and any proposed dependencies, work in small steps, and verify each result. Save working checkpoints with Git and GitHub.

## Current status

Lesson 2: a fixed ten-second countdown with Start, Pause/Resume, Reset, and a completion beep. Browser checks are complete; iPhone testing of the countdown and automatic completion sound is pending.

Lesson 1's button-triggered sound was tested successfully in Safari on the user's iPhone alongside music from the YouTube app.

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

The countdown uses `performance.now()`, the browser's elapsed-time clock, and a target finish time. A repeated update refreshes the display about every tenth of a second; remaining time comes from the clock rather than counting updates. Pause saves the remaining fraction of a second as well as the whole seconds shown on screen.

Start and Resume prepare the browser's sound workspace during the tap so the finish beep can happen automatically later. Audio failure does not stop the visual countdown. No new dependencies were added.

This lesson has a fixed duration and one countdown. Adjustable settings, the three-second preparation countdown, exercise/rest rounds, and final-five-second cues belong to later lessons.

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
- iPhone verification of these controls and the automatic completion beep is pending.

Pause here for the user's test before adding further timer features.
