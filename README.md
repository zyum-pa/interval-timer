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

## Working approach

Treat this as a guided course in product and software development. Before each lesson, explain the user benefit, product decisions, and success criteria, then pause for questions before changing files. Keep code details brief unless requested. Build one small increment, check it, and pause for the user's test. Save working checkpoints with Git and GitHub, distinguishing browser checks from real iPhone results.

## Current status

The timer is published at **[https://zyum-pa.github.io/interval-timer/](https://zyum-pa.github.io/interval-timer/)**. GitHub serves the website independently of the development PC. HTTPS is enabled. The user confirmed that the published timer works on the iPhone.

Current milestone: Lesson 8, offline use. After an online visit saves all required files, the app confirms **Ready for offline use**. It can then reopen from its saved copy without internet. The actual iPhone offline test is pending.

The user confirmed that the Home Screen version works on the iPhone with YouTube playing. The existing icon and app identity are retained; there is no need to reinstall it for this lesson.

The user confirmed that the louder sounds work well on the iPhone with YouTube playing. The shared tone level is 0.6, with the same frequencies, durations, and short fade as before. No new packages are added.

The user confirmed that Lesson 5's starting countdown and final-five-second cues worked on the iPhone with YouTube playing. The preceding settings, workout, countdown, and sound-button tests were also confirmed.

## Verify Lesson 7: Home Screen installation

These are historical installation checks. The user confirmed them; the current page is Lesson 8.

1. On the iPhone, open **https://zyum-pa.github.io/interval-timer/** in Safari and reload it.
2. Tap Safari's **Share** button, then **Add to Home Screen**. If shown, keep **Open as Web App** turned on. Keep the name **Interval Timer** and tap **Add**.
3. On your Home Screen, expect a green icon with a white stopwatch. Tap it: the timer should open in its own app window without Safari's address bar.
4. Keep the screen unlocked. Choose **8 seconds exercise / 7 seconds rest / 2 rounds** and run a workout. Expect the preparation countdown, warning ticks, phase changes, and completion without a final rest. Also try Pause/Resume and Reset.
5. Start YouTube music, return to the timer through its Home Screen icon, and repeat. Confirm that music continues and the louder cues remain clear.
6. Close the timer and reopen it from the icon while online. It should start ready with the usual defaults, not resume an old workout.

Product decision: verify Home Screen use before adding offline support so any new audio or launch issue is easier to isolate. Lesson 7 initially required internet to open; Lesson 8 below adds saved offline files. The timer should remain visible with the screen unlocked during workouts.

`public/manifest.webmanifest` is a small browser settings file for the name, icons, launch address, and app-window display. Its relative addresses stay inside the GitHub Pages `/interval-timer/` folder. Apple-specific page settings and a 180-pixel icon support iPhone Home Screen use; the manifest also includes 192- and 512-pixel icons. `tools/generate-icons.ps1` regenerates all icons on Windows using built-in drawing tools. Lesson 7 introduced no service worker, new account, or package.

References: [Apple's Home Screen instructions](https://support.apple.com/en-lamr/guide/iphone/iphea86e5236/ios), [manifest launch address](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/start_url).

## Verify Lesson 8: offline use

1. Keep internet on. Quit the Home Screen timer from the iPhone app switcher, then reopen it. Look for **Lesson 8** and wait for **Ready for offline use** near the top. Preparation must happen in the Home Screen app itself, even if Safari is already prepared.
2. Quit the timer completely. Turn off both **Wi-Fi and mobile data** in Settings, then open the timer from its existing Home Screen icon.
3. Expect the full page, normal controls, and **Ready for offline use**. Choose **8 seconds exercise / 7 seconds rest / 2 rounds**. Complete a workout with preparation ticks, final-five-second ticks, phase changes, and completion with no final rest.
4. Try Pause/Resume and Reset offline. Settings should be editable between workouts. On another run, reset and wait: the cancelled workout must not continue.
5. Reconnect to the internet, start YouTube music, then return to the timer through its icon and repeat a short workout. The louder cues should remain clear while music continues. Keep the timer visible and screen unlocked throughout.

The timer is what works offline; this does not download YouTube music. Clearing website data or the phone removing saved website files can remove the offline copy. If the readiness message is missing or reports failure, reconnect and prepare the app again before relying on it. Saving the app does not preserve your workout settings after reopening.

## Offline implementation and future updates

`public/sw.js` is a service worker: a browser helper that saves and serves app files. `public/offline.js` registers that helper and displays its confirmed readiness independently of workout timing and sound. No packages or accounts were added. HTTPS is required on the phone; loopback addresses such as `http://127.0.0.1` also support local desktop checks. The old plain-HTTP home Wi-Fi address cannot verify offline setup on the iPhone.

The worker saves one complete version of the HTML, CSS, JavaScript, manifest, and icons. It serves only these known app files from its versioned cache (the browser's saved file storage), including the folder's entry page. It does not save unrelated sites or other projects. A missing file causes installation to fail; readiness is shown only after the controlling worker checks that every required file is present.

For every future app-file change, **increase the `v1` cache version in `public/sw.js`** as part of that checkpoint. Publish the whole `public/` folder together. A new worker downloads a separate complete copy and waits until all old timer windows, including Safari tabs, are closed. It never forces a refresh or takes over a running or paused workout. The message **Update saved** explains how to switch after finishing. Activation removes only this timer scope's old copies. A failed update leaves the previous version intact.

Reference: [browser worker installation and updates](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).

## Publish with GitHub Pages

The publishing instructions are saved in `.github/workflows/pages.yml`. They use GitHub's official Pages actions to check the existing workout tests and publish only `public/`. README files, tests, and Git history are not part of the deployed website files. Making the repository public would separately make the repository's contents and commit history visible on GitHub.

The source repository is public, and GitHub Pages is enabled with **GitHub Actions** as its source. The site uses the existing GitHub account without an additional hosting account or a paid plan.

To publish app changes, open the repository's **Actions** tab: select **Publish timer to GitHub Pages**, then **Run workflow** on `main`. Saving a Git checkpoint does not by itself trigger publication. The successful initial publishing run checked all 25 workout tests and deployed the files from `public/`.

## Commit email privacy

Before publication, the original eight checkpoints were recreated with GitHub's privacy-protecting `noreply` email address. Their messages, dates, parent relationships, and file versions were preserved; commit identifiers changed. This local project's Git configuration also uses the privacy address for future commits.

Because GitHub can retain old commit records after a rewrite, the original repository was retained as an archived **private** backup. A fresh repository containing only the cleaned history was published under the original `interval-timer` name. Anonymous checks confirmed that all eight original commits are unavailable through the public repository, while the eight cleaned checkpoints are visible with privacy-protecting author and committer addresses. A separate local history backup was saved outside the project folder.

Reference: [GitHub's history-cleanup limitations](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

References: [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [HTTPS support](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https).

## Verify hosting after publication

1. On the iPhone, open **https://zyum-pa.github.io/interval-timer/** in Safari. Then turn the PC off.
2. Reload the public page while connected to the internet. It must load independently of the PC. Use the public address rather than the old home-Wi-Fi address.
3. Choose **3** seconds exercise, **2** seconds rest, **3** rounds. Expect preparation followed by the full workout, finishing after **16 seconds** with no final rest.
4. Check Pause/Resume, Reset, and the cues alongside YouTube, with the timer visible and the screen unlocked.

This historical milestone established online hosting. The user confirmed it; use the Lesson 8 checklist above for offline verification.

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

These are historical checks. The current page is Lesson 8; the Lesson 5 workout checks below still apply.

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

## Historical Lesson 4 checks

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

## Verify Lesson 5

These workout checks still apply on the current Lesson 8 page. Keep the page visible and the screen unlocked.

1. Choose **8** seconds exercise, **7** seconds rest, **2** rounds. Tap Start: expect **Get ready**, **Round 1 of 2**, and **00:03 → 00:02 → 00:01**, with three short ticks. Then expect the exercise opening cue and the full **00:08** exercise period.
2. In exercise, expect one short tick at **5, 4, 3, 2, 1** seconds remaining, then the stronger rest-opening cue. In rest, expect another five ticks before the next exercise-opening cue.
3. There is no new preparation countdown before rest or round two. After the last exercise, expect the distinct completion tone and no final rest. This uninterrupted test totals **26 seconds**, including the three-second preparation.
4. Try **3** seconds exercise, **2** seconds rest, **3** rounds. It now totals **16 seconds** including preparation. Each short phase's opening cue replaces its first tick; subsequent seconds get ticks. There must be no doubled sounds at phase starts.
5. Try **1** second exercise and **1** round. Expect three seconds of preparation, the exercise-opening cue, one full second of exercise, then completion. There is no rest or extra tick at exercise start.
6. Pause during **Get ready**. Wait: the phase, time, and sounds must hold. Resume continues from that point without returning to three or repeating the current second's tick. Repeat a pause during a phase's final five seconds.
7. Reset during preparation and during a phase's final five seconds. Expect the initial ready screen with your choices preserved and no further automatic cues from the cancelled run. Starting again must begin a new three-second preparation.
8. Repeat on the iPhone with YouTube music playing. Check that ticks, phase-change cues, and completion are easy to tell apart, and that music continues.

Product decisions: preparation occurs once and adds time instead of shortening exercise. Each sound has a specific meaning. Phases of five seconds or less use the opening phase cue in place of that second's tick. Pause and Reset cancel automatic sounds; Resume preserves your place. Late browser updates cue the current moment instead of replaying missed seconds, and phase cues take over any late tick cleanly. No new packages were added.

## Repeatable behaviour checks

```powershell
node --test tests/*.test.cjs
```

These checks use Node's built-in tools and add no packages. They cover the workout sequence, settings, validation, control behaviour, preparation timing, cue timing in both phases, short phases, cancellation, quick restarts, delayed updates, and sound overlap. Offline checks also cover the complete saved file set, missing-file failure, serving files without network, scope isolation, update cleanup, preservation after failed updates, and honest readiness messages. They use controlled clocks and stand-ins for browser APIs, so actual worker lifecycle, iPhone audio, and layout need browser/device checks too.

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
- The user subsequently confirmed that adjustable settings worked on the iPhone with YouTube playing.

## Lesson 5 checkpoint — October 18, 2026

- Twenty-five repeatable behaviour checks passed. The earlier workout and settings checks were updated to account for the additional three-second preparation.
- Browser verification covers the preparation display, pausing and resuming preparation, workout transitions and completion, and mobile layout.
- The user subsequently confirmed that the countdown and cues worked on the iPhone with YouTube playing.

## Hosting preparation checkpoint — October 18, 2026

- Initially, the repository was private. GitHub's Pages setup request returned: **Your current plan does not support GitHub Pages for this repository.**
- A manual publishing workflow was prepared and saved. The user subsequently authorized cleaning the commit email history and public publication.

## Public hosting checkpoint — October 18, 2026

- Cleaned all eight existing checkpoints and configured future local project commits to use the GitHub privacy email. The original history remains in private backups.
- Published the cleaned repository publicly under its original name, with all original private commits checked as inaccessible through the public repository.
- GitHub Pages is live at **https://zyum-pa.github.io/interval-timer/** with HTTPS enforced.
- The publishing workflow passed all 25 behaviour tests and deployed the website successfully. A workout on the live website completed without browser errors.
- This checkpoint changes hosting and privacy metadata, not the timer's behaviour. The user subsequently confirmed that the published timer works on the iPhone. Offline use and Home Screen installation remain for the next milestone.

## Louder cues checkpoint — October 18, 2026

- Increased the shared tone level for preparation ticks, final-five-second ticks, phase changes, completion, and the sound-test button. Workout timing and mixed-audio configuration are unchanged.
- All 25 existing workout checks and the JavaScript syntax check passed. These checks do not establish perceived volume on the iPhone.
- The user subsequently confirmed that the louder sounds work well on the iPhone with YouTube playing.
- Home Screen installation and offline support are planned as separate small milestones after this listening test.

## Lesson 7 checkpoint — October 18, 2026

- Added Home Screen launch settings, a web app manifest, three green stopwatch icon sizes, and installation instructions on the page.
- All 25 existing workout checks passed. Manifest launch addresses and PNG dimensions were checked. The 180-pixel iPhone icon was visually inspected.
- At iPhone 12 screen dimensions in the desktop browser, the timer and installation instructions were readable. A short workout and the sound-test button completed without browser warnings or errors. This preview does not verify iPhone installation or app-window audio mixing.
- The user subsequently confirmed that the Home Screen version works on the iPhone with YouTube playing.

## Lesson 8 checkpoint — October 18, 2026

- Added saved offline app files, confirmed readiness, and updates that wait for old timer windows to close. Workout timing, settings, controls, and the louder cues are unchanged.
- All 36 automated checks passed, including 11 new offline checks. New scripts also passed syntax checks.
- In an isolated desktop browser check, the app was closed and reopened with its local web server stopped. Settings, Pause/Resume, workout completion, Reset, and the test-sound button worked from saved files.
- A separate temporary update downloaded while a workout was paused. The old page and paused time stayed intact, Resume completed the workout with the server stopped again, and the saved new version appeared only after both old timer windows were closed. The new version also opened with the server stopped. These checks used the same project-folder URL structure as GitHub Pages.
- Real iPhone offline verification is pending. Pause for the user's test before further changes.

Pause here for the user's test before adding further timer features.
