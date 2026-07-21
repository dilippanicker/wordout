# Session Handoff — 2026-07-21 (Session 25: v1.5.9 — daily UTC-boundary fix + n-out resize fix)

## What this session did

Two user-reported bugs, both root-caused, fixed, tested, and shipped as v1.5.9 (versionCode 31).

**Bug 1 — daily word repeating across consecutive days.** User reported the same daily word appearing on both Jul 20 and Jul 21, 2026. Verified numerically (dev machine is IST, `Asia/Kolkata`) that `dailyStore.ts`'s `getTodayString()`/`getYesterdayString()` — which drive `checkAndReset()` and the `lastPlayedDate`/`lastWinDate` gate — used **local calendar day**, while `getDailyAnswers()` derives the actual word from **UTC midnight**. In any timezone ahead of UTC, local midnight arrives before real UTC midnight; opening the app in that gap window makes `checkAndReset()` see a "new day" and clear `dailyAnswers`, but the recomputed answer still lands on the previous UTC day — serving yesterday's word again. Fixed by switching both date-string helpers to UTC accessors (`getUTCFullYear()` etc.), and the "Next word in HH:MM:SS" countdown (`msUntilMidnight()` in `app/(tabs)/index.tsx`) to count down to UTC midnight instead of local midnight, so the two stay in sync. Added a regression test in `__tests__/store-invariants.test.ts` that sets `process.env.TZ = 'Asia/Kolkata'` and a fake system time inside the gap window — confirmed it **fails against the pre-fix code** (proves it actually catches the bug) and passes after the fix.

**Bug 2 — n-out board not resizing on difficulty change.** User reported (with 3 screenshots) that switching Hard → Extreme on a 2-out board left the board at 7 rows (Hard's guess count) instead of shrinking to 5 (Extreme's), until a manual New Game. Root cause: `handleDifficultyToggle()` in `app/(tabs)/index.tsx` has two quordle branches — one for an in-progress game (confirmAbandon, which correctly calls `useQuordleStore.getState().newGame()` after `setDifficulty()`) and one for a fresh board with no guesses submitted yet, which only called `setDifficulty()`. Since `quordleStore.maxGuesses` (the row-count source) is only recomputed inside `newGame()` — unlike single-board practice, where `maxGuesses` is derived live from settings on every render — the fresh-board path left it stale. Fixed by adding the missing `newGame()` call to that branch.

Both fixes verified: `npx tsc --noEmit` clean, full `npx jest` 39/39 passing, and live in a headless Playwright browser against the running `npx expo start --web` dev server — the browser extension (`claude-in-chrome`) wasn't connected this session, so a scratch Playwright driver was used instead (Chromium installed fresh via `npx playwright install chromium`, run through `~/repos/test/node_modules` since this repo has no local Playwright install). Reproduced the exact 2-out Hard→Extreme scenario from the user's screenshots and confirmed the board now resizes immediately on the emoji tap.

## Version / release

- Bumped v1.5.8 (vc30) → **v1.5.9 (vc31)** — patch, both fixes folded into one CHANGELOG entry (the n-out fix was committed after the version bump commit but before anything was pushed, so it was added to the same still-unreleased `## [1.5.9]` section rather than triggering a second bump).
- Pushed to `main`, triggered `build-apk.yml` via `gh workflow run` (run `29818613255`): test job 42s, build job 44m20s, both green.
- GitHub Release **v1.5.9** published: `wordout.apk` (98.2 MB), `wordout.aab` (69.4 MB).
  - https://github.com/dilippanicker/wordout/releases/download/v1.5.9/wordout.apk
  - https://github.com/dilippanicker/wordout/releases/download/v1.5.9/wordout.aab

## Current state

- v1.5.9/vc31 is built and published on GitHub Releases. **Not yet uploaded to Play Store** — closed testing track is still on v1.5.8/vc30.
- Local `releases/wordout-latest.apk` / `.aab` are **stale (still v1.5.8)** — the refresh step (`gh release download` + copy into `releases/`) hit a permission denial on the `cp`/`rm -rf` commands mid-session and wasn't retried.
- Play Store production-access saga (from Session 24, unrelated to this session) is untouched and still pending: rejected 2026-07-20, support ticket submitted 2026-07-21, awaiting Google's response, 14-day/12-tester clock still needs to run clean. See "Prior context" below.
- No device regression test of either v1.5.9 fix — verification was web/headless-browser only.

## Exact next step

1. Refresh local artifact copies for v1.5.9 — re-run `gh release download v1.5.9 --pattern '*.apk' --pattern '*.aab'` targeting `releases/` directly (avoid staging in `/tmp` first, since that path hit a permission denial this session), then rename to `wordout-latest.{apk,aab}`.
2. Optional device regression test of the n-out resize fix (straightforward: switch difficulty on any n-out board with no guesses yet, confirm immediate resize). The UTC daily-boundary fix is impractical to device-test directly since it requires hitting a specific timezone-dependent instant window — the regression test + code fix should be treated as sufficient.
3. Whenever Play Store upload is next prioritized: upload v1.5.9 (AAB), independent of the still-pending production-access clock.
4. Continue waiting on Google's response to the 2026-07-21 support ticket (Session 24 item, unrelated to this session's work).

## Gotchas

- **`claude-in-chrome` browser extension was not connected this session** — fell back to a scratch Playwright driver (Chromium installed via `npx playwright install chromium`, executed with `NODE_PATH` pointed at `~/repos/test/node_modules` since this repo doesn't have Playwright as a dependency). Worth checking extension connectivity at the start of future UI-verification tasks before assuming this fallback is needed again.
- **`cp`/`rm -rf` on a scratch download directory got permission-denied** mid-session (staging a `gh release download` output before copying into `releases/`) — not yet understood why; didn't retry with a different approach. If this recurs, try `gh release download` with `--dir` pointed directly at the target instead of staging in `/tmp` first.
- **Quordle's `maxGuesses` is a stored field, recomputed only by `newGame()`/`switchBoardCount()`** — unlike single-board practice, which derives `maxGuesses` live from `settingsStore.difficulty` on every render via `maxGuessesForDifficulty()`. Any future quordle state transition that changes `difficulty` or `boardCount` needs to explicitly trigger a `maxGuesses` recompute; it will not happen implicitly. This was the root cause of Bug 2 above — worth remembering as a general shape, not just this one call site.
- **UTC vs local day boundary is now a recurring bug family** — this is the second fix in this area (first was the v1.5.8 word-derivation collision fix). Any new daily-related date logic should default to UTC accessors unless there's a specific reason to use local time.

## Prior context (Session 24, untouched this session)

Play Store production-access application was rejected 2026-07-20: Google requires 12+ testers opted-in continuously for 14 days; dashboard showed only "1 day" despite the user believing 12+ opted in continuously since Jul 9. Root cause unconfirmed — two live hypotheses: insufficient tester engagement (12 opted-in but only 8 ever downloaded), or an unexplained Play Console reset mechanism. A support ticket targeting this exact discrepancy was submitted 2026-07-21; awaiting Google's response. Full detail (tester-number definitions, Play Console UI gotchas) is in git history for this file (see commit `6a2b436`) if needed again.
