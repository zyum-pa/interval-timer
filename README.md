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

The first version is complete for the intended personal iPhone setup. The user confirmed offline operation on the iPhone, sound alongside YouTube after reconnecting, and correct operation with music both on and off. The screen stayed undimmed during the tested workout and dimmed only after the workout stopped.

Current milestone: simplified set display (v9), using the user's chosen above-the-timer design. The workout shows **SET 2 OF 4** in larger green text above the remaining time. The Exercise phase label is hidden; Rest, Get ready, and Complete still appear in their phases. The rest setting is labeled **Rest**. Exercise progress counts, the min : sec legend, and the routine offline-ready message are removed. Settings use **Sets** instead of Rounds. Actual iPhone confirmation of this layout is pending.

The user field-tested v7 and reported that it works as designed. Add exercise builds an ordered list within each set. Each set runs every exercise, then rests before the next set; the final set ends immediately after its last exercise. Each duration has separate minutes and seconds fields, so five minutes thirty seconds is entered as **05 : 30**. Test sound has been removed. Update notices appear only when needed.

Completed milestone: Lesson 10, explicit app updates. Downloaded updates offer an **Update app** button below the workout controls. Running and paused workouts are protected, settings are preserved, and update failures release the controls. The user confirmed that Lesson 10 reached the existing iPhone Home Screen app and settings were preserved. On the v5 follow-up, the user confirmed that the button stayed disabled while paused, applied after Reset, showed **Lesson 10 · update test**, preserved settings, and left the workout working with YouTube.

The user confirmed that Lesson 9 remembers workout settings on the iPhone, including offline, and that workouts still work with YouTube. The initial Lesson 8 → 9 update was stuck until the phone restarted; Lesson 10 addresses that handoff instead of requiring routine phone restarts.

An online visit saves all required app files so the app can reopen without internet. The offline-saving notice disappears after the saved copy is verified. Release v8 removes the routine **Ready for offline use** message; saving or failure notices still appear when needed.

The user confirmed that the Home Screen version works on the iPhone with YouTube playing. The existing icon and app identity are retained; there is no need to reinstall it for this lesson.

The user confirmed that the louder sounds work well on the iPhone with YouTube playing. The shared tone level is 0.6, with the same frequencies, durations, and short fade as before. No new packages are added.

The user confirmed that Lesson 5's starting countdown and final-five-second cues worked on the iPhone with YouTube playing. The preceding settings, workout, countdown, and sound-button tests were also confirmed.

## Verify Lesson 7: Home Screen installation

These are historical installation checks. The user confirmed them; the current compact page has no lesson label. Installation instructions are kept here rather than on the workout screen.

1. On the iPhone, open **https://zyum-pa.github.io/interval-timer/** in Safari and reload it.
2. Tap Safari's **Share** button, then **Add to Home Screen**. If shown, keep **Open as Web App** turned on. Keep the name **Interval Timer** and tap **Add**.
3. On your Home Screen, expect a green icon with a white stopwatch. Tap it: the timer should open in its own app window without Safari's address bar.
4. Keep the screen unlocked. Choose **8 seconds exercise / 7 seconds rest / 2 rounds** and run a workout. Expect the preparation countdown, warning ticks, phase changes, and completion without a final rest. Also try Pause/Resume and Reset.
5. Start YouTube music, return to the timer through its Home Screen icon, and repeat. Confirm that music continues and the louder cues remain clear.
6. Close the timer and reopen it from the icon while online. It should start ready, not resume an old workout. Lesson 9 now restores your last valid choices instead of the defaults.

Product decision: verify Home Screen use before adding offline support so any new audio or launch issue is easier to isolate. Lesson 7 initially required internet to open; Lesson 8 below adds saved offline files. The timer should remain visible with the screen unlocked during workouts.

`public/manifest.webmanifest` is a small browser settings file for the name, icons, launch address, and app-window display. Its relative addresses stay inside the GitHub Pages `/interval-timer/` folder. Apple-specific page settings and a 180-pixel icon support iPhone Home Screen use; the manifest also includes 192- and 512-pixel icons. `tools/generate-icons.ps1` regenerates all icons on Windows using built-in drawing tools. Lesson 7 introduced no service worker, new account, or package.

References: [Apple's Home Screen instructions](https://support.apple.com/en-lamr/guide/iphone/iphea86e5236/ios), [manifest launch address](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/start_url).

## Verify Lesson 8: offline use

These offline checks still apply on the compact page.

1. Keep internet on. Quit the Home Screen timer from the iPhone app switcher, then reopen it. Let offline saving finish; from v8 the saving notice disappears on success instead of showing **Ready for offline use**. Preparation must happen in the Home Screen app itself, even if Safari is already prepared.
2. Quit the timer completely. Turn off both **Wi-Fi and mobile data** in Settings, then open the timer from its existing Home Screen icon.
3. Expect the full page and normal controls. Choose **8 seconds exercise / 7 seconds rest / 2 sets**. Complete a workout with preparation ticks, final-five-second ticks, phase changes, and completion with no final rest.
4. Try Pause/Resume and Reset offline. Settings should be editable between workouts. On another run, reset and wait: the cancelled workout must not continue.
5. Reconnect to the internet, start YouTube music, then return to the timer through its icon and repeat a short workout. The louder cues should remain clear while music continues. Keep the timer visible and screen unlocked throughout.

The timer is what works offline; this does not download YouTube music. Clearing website data or the phone removing saved website files can remove the offline copy. If saving does not finish or reports failure, reconnect and prepare the app again before relying on it. Lesson 9 adds saved workout settings separately from these saved app files.

## Verify Lesson 9: remembered settings

These settings checks still apply on the compact page. The user confirmed them on Lesson 9.

1. While online, open the Home Screen app. Keep the existing Home Screen icon. For the transition to Lesson 10, use the migration steps below rather than the old close-every-window instructions.
2. Choose **8 seconds exercise / 7 seconds rest / 2 rounds**, then quit and reopen the app. Expect those same values, **Exercise**, **Round 1 of 2**, **00:08**, and **Ready**. No workout should start automatically.
3. Quit again, turn off both Wi-Fi and mobile data in Settings, and reopen. The same choices should return. While offline, change them to **5 / 3 / 3**, quit, and reopen again. Expect the new choices and **00:05**.
4. Enter **0** for exercise and expect an error. Quit and reopen: expect the last valid **5 / 3 / 3**, not the invalid entry or defaults.
5. Run a workout with the saved choices, checking Pause/Resume and Reset. Reset keeps the choices; reopening a running or paused workout starts ready from round one with its full exercise time.
6. Restore internet and repeat a short workout with YouTube playing. Keep the timer visible and screen unlocked.

Product decisions: save the complete valid set automatically between workouts, without a Save button or extra always-visible message. Blank or invalid fields never overwrite the last valid set. First use, missing data, or invalid stored values use the original **10 / 5 / 2** defaults. If reading or writing storage is blocked, show a brief notice and let the timer keep working.

Lesson 9 saved the three numeric choices in the browser's local storage (small data kept on this device), under `interval-timer.settings.v1`. Release v7 stores the exercise-duration list, rest duration, and round count under `interval-timer.settings.v2`. On first use it reads valid older settings as a single Exercise 1, retaining the old data for any older open timer window. Restored values are checked against the same bounds as inputs; timer progress and unknown fields are not restored. No new accounts, packages, tracking, or synchronization were added. The Home Screen app and Safari may have separate storage; test and use the same app. Clearing website data can remove these choices.

Reference: [browser local storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

## Verify Lesson 10: updates without a phone restart

These are the historical migration and v5 verification steps, confirmed by the user. Current releases have no lesson label; identify the v6 release by its compact layout.

Stage 1: get the new updater into the existing Home Screen app. The user confirmed this handoff and preserved settings.

1. With internet connected and no workout in progress, fully close and reopen the Home Screen timer. Leave it visible for about 30 seconds so it can download the new files.
2. Fully close and reopen it once more. Expect **Lesson 10** and the same saved workout choices. Do not clear website data or reinstall the icon. If it still shows Lesson 9, report that result before proceeding; the actual iPhone migration is not assumed to have passed.
3. Find **App updates** just below Start/Pause/Reset. With no newer release waiting, the Update app button is hidden. Report that Lesson 10 reached the existing installation without restarting the phone.

Pause for that confirmation before publishing the verification update: skipping this stage would bypass the one-time bridge needed by the old updater.

Stage 2: test **Update app** with the v5 follow-up release, marked **Interval Timer · Lesson 10 · update test**. Keep the existing Home Screen app open while checking; closing every timer window can allow an update to activate naturally and bypass the button test.

1. Open or return to the timer online. Under **App updates**, expect **Update saved** and **Update app** after the complete new version is saved.
2. Start and pause a workout: the update button must be disabled and the workout must stay intact. Reset or finish the workout, tap Update app, and expect **Updating…** followed by **Interval Timer · Lesson 10 · update test**, the saved choices, and Ready. The updating message may be brief. If the marker appears before tapping, natural activation may have occurred; report that separately from a passed button test.
3. If another timer window has a running or paused workout, applying from an idle window must be declined without disrupting either window. Idle windows release their controls after a declined or timed-out update. Older unresponsive timer windows must be closed before a normal button update can proceed.
4. Verify the new version opens offline and workouts still work with YouTube after reconnecting. Repeated taps must not trigger overlapping updates. Only the window whose user requested the update refreshes.

No new accounts, packages, or browser permissions are needed. The user confirmed actual Home Screen migration and the main update-button flow on the iPhone. Multi-window coordination, failure recovery, and offline reopening of an updated release were checked in the desktop browser; these additional cases are not inferred from the iPhone report.

## Offline implementation and future updates

`public/sw.js` is a service worker: a browser helper that saves and serves app files. `public/offline.js` registers that helper and displays its confirmed readiness independently of workout timing and sound. No packages or accounts were added. HTTPS is required on the phone; loopback addresses such as `http://127.0.0.1` also support local desktop checks. The old plain-HTTP home Wi-Fi address cannot verify offline setup on the iPhone.

The worker saves one complete version of the HTML, CSS, JavaScript, manifest, and icons. It serves only these known app files from its versioned cache (the browser's saved file storage), including the folder's entry page. It does not save unrelated sites or other projects. A missing file causes installation to fail; readiness is shown only after the controlling worker checks that every required file is present.

For every future app-file change, **increase the cache version in `public/sw.js` and the matching `data-app-version` in `public/index.html` (currently `v9`)**. Publish the whole `public/` folder together; a test enforces that those versions match. Downloads include the release version in their addresses to avoid reusing an older copy from the host. The folder launch address serves the saved `index.html`, so a separately cached directory response cannot keep the app on an old lesson. Normal updates download a complete separate copy and wait for **Update app** (or natural activation once all older windows are gone). The button is disabled during running or paused workouts. Before activation, the waiting worker asks every in-scope window to lock its controls; busy or unresponsive windows block the update. Rejected requests unlock idle windows, and a timeout recovers stalled page controls. Only the requesting window reloads after activation; other windows can apply their already-active newer version later when idle. Saved settings are separate and are never cleared by the updater.

**One-time v4 bridge:** Lessons 8/9 do not have the update button. Release `v4` calls `skipWaiting()` after saving the complete app, advancing the file-serving helper without navigating or refreshing existing screens. It retains old v1/v2/v3 files for requests from those screens. A subsequent fresh opening can therefore load Lesson 10 despite an old retained window. This also replaces the initial v3 release, whose live-site check exposed an older host-cached launch page. Later releases (v5 onward) do not use this automatic bridge and resume normal user-controlled updates. There is no forced legacy-page navigation and no attempt to infer a legacy workout's state. The iPhone must confirm that closing/reopening creates a fresh page in its actual setup.

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

These are historical checks. The current page uses the compact layout; the Lesson 5 workout checks below still apply.

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
8. Try **61** seconds exercise while ready. Expect **01:01** in the preview. Lesson 4 originally restored defaults on reload; Lesson 9 now preserves these choices.
9. Repeat a short workout on the iPhone with YouTube music playing. Check input comfort, readable labels, audible cues, and music continuing.

Product decisions: whole seconds and positive round counts keep setup straightforward. Visible limits of 1–3,600 seconds per phase and 1–99 rounds catch accidental oversized entries and keep generated workouts small. Changes apply between workouts, and Reset retains the user's choices. Lesson 9 adds remembering choices across reopening. No new packages were added.

## Verify Lesson 5

These workout checks still apply on the compact page. Keep the page visible and the screen unlocked.

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

## Historical Lesson 1 sound-button checks

Release v7 removes this diagnostic button at the user's request. Check workout audio through Start and Pause/Resume instead. The following records the original sound-test procedure.

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
- The user subsequently confirmed that the timer worked offline on the iPhone and that sounds still worked with YouTube after reconnecting.

## First-version completion checkpoint — October 18, 2026

- The user reported that the app runs correctly with YouTube both on and off. During the tested workout the screen did not dim; it dimmed only after the workout stopped.
- Combined with the earlier feature, Home Screen, and offline confirmations, this meets the first-version goals for the user's tested setup. No workout duration or additional device/iOS coverage is inferred from the report.
- This records observed screen behavior, not a new screen-wake feature or a guarantee for other phone settings. The app code is unchanged; the preceding 36 automated checks remain the latest code verification.
- Stop adding features for this version. Further lessons or improvements should follow the user's experience and priorities.

## Lesson 9 checkpoint — October 20, 2026

- Added automatic saving and validated restoration of workout settings. New sessions open ready from the beginning. Storage failures do not block workouts, and invalid edits preserve the last valid saved set.
- Increased the offline app-cache version to `v2`; workout settings are stored separately so app updates do not clear them. The offline test helper now chooses test versions independently of the production version.
- All 43 automated checks passed, including seven new settings-memory checks. The user subsequently confirmed remembered settings on the iPhone, including offline, and workouts alongside YouTube.
- In a real desktop browser, settings returned after closing and reopening online and with the local web server stopped. An invalid entry did not replace the saved set. New choices entered offline also survived closing and reopening. An offline workout completed using those choices, including Pause/Resume and Reset.

## Lesson 10 checkpoint — October 20, 2026

- Added a saved-update button with workout guards, multi-window coordination, timeout recovery, and one requesting-window refresh. No new packages or accounts were added.
- Added the one-time v4 legacy bridge to address current Lesson 9 installations, without clearing settings or navigating an open workout. The initial v3 publication exposed stale host-cached launch HTML during live verification; v4 requests fresh release files and serves the canonical saved index for the launch address.
- All 56 automated checks passed. In the browser, the exact saved Lesson 9 version was left paused in one window while another downloaded the corrected v4 bridge. Lesson 10 then loaded despite that retained old window, with saved choices intact; the old workout remained paused.
- A separate temporary normal update was declined while another new-version window was paused, then applied after both were idle. Only the requesting window refreshed. With the corrected download and cache matching, a temporary v5 update was blocked during a paused workout, applied after Reset with the server stopped, and cold-opened offline with settings preserved.
- The user subsequently confirmed Lesson 10 in the existing iPhone Home Screen app, with settings still remembered. This completed Stage 1 and allowed the v5 verification release; the follow-up result is recorded below.

## Lesson 10 follow-up: update-button verification

- Release v5 changes only the lesson label to **Interval Timer · Lesson 10 · update test** and advances the saved app version. It uses the normal waiting update process, without the one-time v4 bridge. No workout behavior, packages, or accounts are added.
- All 56 automated checks passed before publication. On the live website, the update waited during running and paused workouts, applied after Reset through the button, and preserved the saved choices.
- The user confirmed on the iPhone that **Update app** stayed disabled while paused, updated after Reset, and displayed **Lesson 10 · update test**. Settings were remembered and the workout still worked with YouTube. This completes the main update-button milestone; no further app release is needed to record this result.

## Compact workout screen checkpoint

- Release v6 removes teaching and installation text from the app, along with the duplicate workout summary and routine setting hints. The detailed guidance stays in this README. It keeps units, validation errors, storage warnings, and audio errors, with a compact Test sound control.
- Update notices take space only when an update is available, applying, or has an error. The normal update protection and separate saved workout settings remain in use. No packages or accounts were added.
- All 56 automated checks passed. Existing offline checks also verify that the update area is hidden when idle and visible when an update is saved. Browser previews at 390 × 844 and 390 × 664 fit without scrolling; a validation error also fit in the shorter preview. Start, Pause/Resume, Reset, and Test sound worked without browser warnings or errors. The compact app reopened with its local server stopped and retained saved settings.
- On the iPhone, open the existing Home Screen app online and apply this release through **Update app**. Expect **Interval Timer** without a lesson label. With the keyboard dismissed and the phone in portrait, confirm that settings, phase/round, time, and all workout controls fit on one screen. Check Pause/Resume, Reset, settings memory, and a short workout with YouTube. Larger text preferences and the editing keyboard may require scrolling; content is never clipped to force a fit.
- Pause for the user's actual iPhone layout result before further changes.

## Multiple exercises and minutes-and-seconds checkpoint

- Release v7 removes Test sound and its event handler. Workout sounds, their volume, and mixed-audio configuration remain in use; audio failure messages refer to Pause/Resume rather than the removed test.
- Add exercise appends a duration copied from the last exercise. The × button removes an exercise, preserving the remaining order and renumbering labels; at least one exercise remains. Running or paused workouts and applying updates lock all edits. Up to 99 exercises and 99 rounds are supported.
- A round runs Exercise 1 → Exercise 2 → … → Rest. Rest appears only between rounds, never between exercises or after the final round. Preparation still occurs once, and every exercise and rest gets the existing warning and phase cues.
- Durations are entered through numeric-keyboard minutes and seconds fields. Values are padded to two digits when leaving a field. Seconds must be 00–59, and total duration remains 00:01–60:00. The existing historical checks above express times in total seconds; translate these to minutes and seconds when testing the current interface.
- Existing saved single-exercise settings are read without loss. Complete valid lists are saved automatically; invalid edits do not overwrite the last valid set. No packages, accounts, or backend were added.
- All 66 automated checks passed, including multiple-exercise order, rest placement, cue transitions, exact pause timing, Add/Remove locks, input boundaries, 05:30 timing, storage migration, and list restoration. The removed diagnostic test was retired; the existing workout/audio and update checks remain.
- Browser checks covered the two-exercise sequence through completion, Pause/Resume and Reset, removing and renumbering exercises, 05:30 entry, and offline reopening with both saved exercise durations. No browser warnings or errors were observed. Two exercises and all workout controls fit at 390 × 844 and 390 × 664 without scrolling in the previews. More exercises or larger text settings may require scrolling; content is not clipped.
- iPhone check: apply through Update app, verify the previous saved exercise/rest/round values, and try **05 : 30**. For a quick workout, set Exercise 1 to **00 : 03**, add Exercise 2 and set it to **00 : 02**, rest **00 : 01**, rounds **2**. Expect preparation → Exercise 1 → Exercise 2 → Rest → Exercise 1 → Exercise 2 → completion (14 seconds including preparation). Check Pause/Resume, Reset, remembered settings, and audio alongside YouTube. Pause for the result.
- The user subsequently reported that the app was field-tested and works as designed, completing this milestone.

## Prominent set count checkpoint — October 23, 2026

- Implemented the selected above-the-timer design with a large green **SET 1 OF 2** count. The phase stays visible without an exercise number or total. Settings label the repeated group **Sets**; saved values and their storage format remain the same.
- Removed min : sec beside Workout and the routine offline-ready success message. Accessible minutes/seconds labels, saving/failure notices, and offline file saving remain in use. No packages were added.
- All 66 automated checks passed with the new visible labels. They still cover set advancement, rest placement, multi-exercise timing, pause/reset behavior, saved choices, and offline/update handling.
- In the browser, the two-exercise screen fit at 390 × 664 without scrolling. A short workout completed at **SET 2 OF 2**; Pause preserved its set and Reset returned to **SET 1 OF 2**. No browser warnings or errors were observed.
- Apply through Update app on the existing iPhone Home Screen installation. Confirm the set count is prominent above the timer, the three removed texts are absent, and Pause/Resume and Reset keep the expected set count. Actual iPhone layout confirmation remains pending.

## Set display refinement — October 23, 2026

- Release v9 hides Exercise above the set count, shortens Rest after exercises to **Rest**, and increases the set-count size from 1.6rem to 1.8rem. Rest, Get ready, and Complete remain visible in their phases.
- Saved settings, exercise order, rest placement, sounds, offline support, and update handling retain the existing behavior. The workout checks now also verify phase-label visibility throughout the existing sequences.
- All 66 automated checks passed. The two-exercise browser preview at 390 × 664 fit without scrolling, with Exercise hidden above the set count, the shortened Rest label, and the larger set count.
- Apply through Update app and check the larger set count, shortened Rest setting, and absence of Exercise above the timer. Pause for the iPhone layout result.
