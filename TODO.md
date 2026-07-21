# Wordout — Master TODO
**Updated: 2026-07-21 (session 24)**
**Current version: v1.5.8 (versionCode 30)**

---

## 🔴 NEW — Follow-up from Session 24 (2026-07-21, Play Store production-access investigation)

- ✅ **v1.5.8 upload to closed testing confirmed live** — verified via Play Console screenshot (released Jul 9, 100% rollout, 18,977 devices); supersedes the "Session 23 follow-up" item below asking for this
- [ ] **Production-access application was rejected** (reviewed 2026-07-20) — Google requires 12+ testers opted-in continuously for 14 days; dashboard showed only "1 day" despite the user believing 12+ opted in continuously since Jul 9. Root cause unconfirmed — see gotchas in `session-handoff.md`. Two live hypotheses: insufficient tester engagement (12 opted-in but only 8 ever downloaded), or an unknown Play Console reset mechanism.
- [ ] **Support ticket submitted 2026-07-21** — asks Google to explain the opt-in-duration discrepancy. Awaiting response.
- [ ] **Get opted-in testers to actually open/use the current build** — targets the "insufficient engagement" hypothesis Google's own AI-assist panel named as a rejection cause
- [ ] **Reapply for production access** once 14 clean days pass with opt-in count holding ≥12 (Dashboard → "Apply for production")
- [ ] (Optional) Bug-fix release to re-engage testers and provide concrete material for the reapplication questionnaire — no specific tester-reported bugs were captured this session, would need a fresh list first

## ✅ Session 23 — Completed 2026-07-09 (v1.5.8: daily-word fix + HelpModal wiring)

- ✅ **Daily word collisions + unreachable answers fixed** (`getDailyAnswers`) — replaced the bit-masked `& 0x7FF` derivation with `dailyIndices(dayNum, n)`, a mulberry32 PRNG sampled with reject-duplicate for 3 distinct indices across the full answer-list range. New tests prove distinctness + full-range reachability over 10,000 simulated days, both languages. No cutover-date logic needed — reasoning recorded in CLAUDE.md.
- ✅ **`DAILY_PROGRESSION` wired into HelpModal** — new "DAILY MODE" section in the help screen; text was already written (session 10), just never rendered. Resolved the last CLAUDE.md Known Issues entry, section removed (now empty).
- ✅ **v1.5.8 (versionCode 30) released** — bump confirmed, CHANGELOG updated, `/release` triggered CI (test gate green, ~40 min build), GitHub Release published with both artifacts, local `releases/` copies refreshed, device spot-check clean.
- ✅ **`/smoke` run properly** (previous close's status was 3 commits stale) — automated checks + 8/10 manual web items verified directly; items 4/10 (device-only: wave timing, share text) explicitly recorded as `skipped` rather than left silent.
- ✅ **Decision capture**: "no cutover needed" reasoning added to Daily Gate Architecture; "Wordout stays ad-free" locked as an explicit decision (see Gotchas below); advisor-settings-key note softened from "confirmed broken" to "unconfirmed, worth re-testing."
- ✅ **Play Store release notes drafted** for the 1.5.6→1.5.8 user-facing delta (v1.5.7 was internal-only, no notes needed for it) — see session-handoff.md.

## 🔴 NEW — Follow-up from Session 23

- [ ] **Play Store: upload v1.5.8** to closed testing (v1.5.6/vc28 currently live; v1.5.7 was never uploaded, v1.5.8 supersedes both) — AAB at `releases/wordout-latest.aab`, release notes drafted in session-handoff.md
- [ ] **Prune two stale TODO nice-to-have entries** (flagged session 23, not yet cleaned up): "Haptic feedback on correct/wrong guess" under Future — already shipped session 8; "Animate board indicator state transitions" — contradicts the locked "deliberately static" CLAUDE.md decision
- [ ] (Future, paused mid-search) **Web games portfolio domain naming** — if resumed, do NOT re-litigate Wordout-stays-ad-free (see CLAUDE.md Monetization decision + `wordout-ads-scope-decision.md` memory). Ruled out: `gullygames.org` (trademark/brand collision with an existing India real-money gaming platform), `desiboard.games` (collision with existing DesiBoardGames tabletop company). Live candidates when paused: `onglipo.games`/`onglipo.fun`, and pan-Indian (not Hindi-belt-slang) options still needed for South Indian resonance.

## ✅ Session 22 — Completed 2026-07-06 (v1.5.7 shipped through the new pipeline)

- ✅ **v1.5.7 (versionCode 29) released** — first real end-to-end run of the new workflow: `/open` (drift check clean) → `/smoke` (3 automated + 10 manual items ALL PASS, device items on v1.5.6 build) → `/release` (bump gate, CHANGELOG fold, push, CLI trigger) → CI test gate green on both first firings (push-triggered `test.yml` + fail-fast job, 35s) → build success (~42 min) → release notes correctly awk-extracted into GitHub Release `v1.5.7`
- ✅ **Device smoke pass** — retired the outstanding per-session "device regression test" items from sessions 15/17/18/20 (consolidated into the smoke checklist device items)
- ✅ **Permissions modernized** — global `defaultMode` bypassPermissions → `auto` (routine actions unprompted, dangerous ones flagged); pruned ~30 auto-accumulated one-off allow rules from `.claude/settings.local.json` to 13 reusable ones
- ✅ **Workflow docs modernized** (`~/repos/claude-workflow/HOWTO.md`) — two-AI chat-relay pattern retired in favor of "plan mode for features, direct for fixes"; decision-capture rule added to global /close; executor+advisor model economics recorded as deliberate (cost per correct result)
- ✅ **README stale features fixed** — removed the reverted Enter-key green highlight line; "Enter key on right" renamed to match the actual "Swap ⏎ and ⌫ positions" setting

## 🔴 NEW — Follow-up from Session 22

- ✅ **v1.5.7 APK device spot-check** — done 2026-07-06: installed via `./make.sh push`, win-wave + revisit verified on S24 Ultra. Refactored GameBoard confirmed behavior-identical on hardware.
- 🟡 **Verify advisor settings key** — partially addressed session 23: `advisor()` calls this session returned substantive, independent-seeming analysis with the key present, but wasn't rigorously re-tested (no comparison with the key removed). CLAUDE.md note softened to "unconfirmed" rather than "does NOT work." Still needs a clean before/after test to fully close.
- ✅ **Play Store: upload v1.5.x** — superseded; v1.5.7 was never uploaded, now tracked as "upload v1.5.8" in Session 23 follow-ups above

## ✅ Session 21 — Completed 2026-07-06 (workflow overhaul)

- ✅ **Workflow diagnosis** — three-source analysis (git log, CHANGELOG, docs) written to `reflection-notes.md`; 6 ranked improvements, 5 implemented this session
- ✅ **`/release` global skill** (`~/.claude/skills/release/SKILL.md`) — bump → confirm → CHANGELOG → commit/push → `gh workflow run` → report links; verified by dry-run + live trigger/cancel (run `28773885805`, cancelled ~20s in, no release published)
- ✅ **`/smoke` global skill** + `.claude/smoke-checklist.md` (2 automated checks, 10 manual items annotated with the regression each guards) + `.claude/launch.json`; status recorded in gitignored `.claude/smoke-status.json` which `/release` reads as its gate; verified end-to-end on web
- ✅ **Store-invariant tests** (`__tests__/store-invariants.test.ts`, 15 tests) — jest-expo infra, `npm test`; covers maxGuesses formulas, the `boardCount > 1` trap, hard-mode per-board independence, snapshot round-trips, daily derivation/reset/guess-limit
- ✅ **CI fail-fast** — new `test.yml` (typecheck + jest on push/PR) and a `test` job in `build-apk.yml` that the build `needs:` — broken invariant dies in ~2 min, not after 45
- ✅ **Drift guard** in global `/open`/`/close` + `### Doc sync (drift check)` list in CLAUDE.md; verified against real files + mutation test; remediation documented (backfill from git log, never a retroactive /close)
- ✅ **Animation sequencing extracted** to `components/boardSequencing.ts` (pure functions) + `__tests__/board-sequencing.test.ts` (21 regression tests replaying the v1.0.1→v1.2.8 chain); GameBoard now renders what the functions decide — behavior-identical, verified live on web (flip, wave, ✓ overlay timing, no-replay-on-revisit at 59ms)
- ✅ **Release-notes coupling documented** — build workflow awk-extracts the `## [x.y.z]` CHANGELOG section into the GitHub Release body; heading format is load-bearing (noted in CLAUDE.md Build Pipeline + /release skill)
- ✅ **Found 2 real bugs via invariant testing**: daily words collide across difficulties on 8 days/decade (2026-01-27 was easy=hard=ABACK) and 267 answers are unreachable (`& 0x7FF` mask) — CLAUDE.md corrected, fix task queued
- ✅ **`~/repos/claude-workflow/HOWTO.md` updated** with all new layers + adoption checklists (committed there: `8917d41`, `6449bee`)

## 🔴 NEW — Follow-up from Session 21

- ✅ **First real `/release` + `/smoke` run** — done session 22
- ✅ **Device smoke pass** — done session 22, consolidated the outstanding per-session "device regression test" items
- ✅ **Fix daily word collisions + unreachable answers** — done session 23 (turned out not to need cutover-date anchoring — see session 23 notes)
- [ ] (Optional, deferred by decision) Item 6 of reflection-notes: parallelize APK/AAB CI jobs, repair local Java/Gradle env

## ✅ Session 20 — Completed 2026-07-05

- ✅ **Enter key relabeled to "⏎"** (`components/Keyboard.tsx`) — v1.5.5. Initially changed the key's functional value to the glyph, which broke submit (glyph got typed as a literal character); fixed in v1.5.6 by separating the display label (`keyLabel()`) from the internal key value, which stays `'ENTER'`
- ✅ **"Enter Key on Right" setting relabeled** to "Swap ⏎ and ⌫ positions" (`app/(tabs)/settings.tsx`), redundant subtitle removed
- ✅ **`enterOnRight` default and toggle polarity fixed** (`store/settingsStore.ts`, `components/Keyboard.tsx`) — default corrected to `false` (⏎ sits right, the natural position); toggling ON now correctly swaps ⏎ to the left (previously the ternary was inverted and the default was `true`)
- ✅ **`enterActive` green-outline highlight fully reverted** (`components/Keyboard.tsx`, `app/(tabs)/index.tsx`) — the v1.5.3 feature (green outline + text on Enter once guess hits 5 letters) was removed entirely: prop, both call sites, and styles
- ✅ CLAUDE.md "Keyboard Behaviour" section corrected — removed the now-false `enterActive` documentation, added accurate notes on the ENTER label/value split and `enterOnRight` polarity
- ✅ Version bumps: v1.5.4 → v1.5.5 (versionCode 27) → v1.5.6 (versionCode 28)
- ✅ **GitHub Actions build for v1.5.6 (versionCode 28) succeeded** — run `28749535782` (47m11s); GitHub Release `v1.5.6` published with `wordout.aab` and `wordout.apk` attached
- ✅ **CLAUDE.md deduped** (~336→302 lines, commit `a072c5b`) — fixed stale Play Store/word-list-path/Model Selection facts, collapsed the daily-gate mechanics to a single source of truth, deleted the fully-shipped "v1.3.0 Features" section (preserving its two still-relevant facts elsewhere)
- ✅ **Known Issues: `CECIL` line removed** — verified gone from `assets/wordlists/answers_en_gb.json` (fixed by the word list rebuild, `grep` confirms no match)
- ✅ **Known Issues: `DAILY_PROGRESSION` line reworded** — confirmed it's the daily gate explanation text (`constants/helpContent.ts`); reworded to "unused; candidate HelpModal section explaining daily difficulty progression"
- ✅ **`docs/playstore.md` deleted** — had drifted stale repeatedly (still showed "v1.2.7 ready to upload" / "last uploaded v1.0.3" as of session 19) since it duplicated state that changes faster than docs get updated. Play Store status is now tracked as a short "current reality" snippet directly in CLAUDE.md's "Play Store" section instead of a separate checklist doc; the `/close` Session lifecycle step and stray references updated to match

## 🔴 NEW — Follow-up from Session 20

- [ ] **Device regression test** of the Enter/Backspace swap toggle and the ⏎ label on a real Android device — v1.5.5/v1.5.6 fixes were not verified in a live browser or device this session
- [ ] `.claude/session-handoff.md` and this TODO both lagged two versions (1.5.5, 1.5.6) behind CHANGELOG.md before this backfill — no session-close ritual was run for those two version bumps
- [ ] **(Low priority, post-1.5.6-upload) Wire `DAILY_PROGRESSION` into HelpModal** — text already written and confirmed accurate (`constants/helpContent.ts`), just needs a section added to `HelpModal.tsx`

## ✅ Session 19 — Completed 2026-07-05

- ✅ **GitHub Actions build caching added** (`.github/workflows/build-apk.yml`) — explicit Gradle (`~/.gradle`) and npm (`~/.npm`) cache steps moved to right after checkout, before Setup Node/Java/Android SDK; removed the duplicate Gradle cache step and the redundant `cache: npm` on `setup-node`
- ✅ **`/close` command genericised** (`.claude/commands/close.md`) — step 6 no longer hardcodes `docs/playstore.md`, now reads "any project-specific deployment or release documentation"
- ✅ **Share button hidden in practice mode** (`app/(tabs)/index.tsx`) — gated on `isDaily` (not raw `activeWordleMode`) so it's hidden for single-board practice AND quordle/n-out practice, since quordle can never be `isDaily` under current architecture. User confirmed this is intended even though it makes the n-out share fixes below currently unreachable via the UI
- ✅ **N-out share header max-guesses bug fixed** — `buildQuordleShareText` now takes a `difficulty` param and uses `maxGuessesForDifficulty(difficulty, bc)` instead of a hardcoded `Math.min(13, 5+bc)` (was showing "3-out 6/8" instead of "3-out 6/6" on Extreme)
- ✅ **N-out share header difficulty emoji added** — header now reads e.g. `"3-out 💀 6/6"`
- ✅ CLAUDE.md: added new "Share Behaviour" section documenting the `isDaily` gate rationale and which share-builder functions are/aren't fixed and why
- ✅ README.md: "Share results" bullet qualified as daily-only
- ✅ Version bump v1.5.3 → v1.5.4 (versionCode 26)

## 🔴 NEW — Follow-up from Session 19

- [ ] **Manual/browser verification** of the share changes — this session was typecheck-only (`tsc --noEmit`), no dev server run. Verify: share button absent on practice end-game overlays (single-board and n-out), present and correct on daily end-game overlay
- ✅ **Trigger GitHub Actions build** — superseded; v1.5.5/v1.5.6 shipped before a build was triggered for v1.5.4, so the build triggered in session 20 covers v1.5.6 instead
- [ ] **`docs/playstore.md` is stale** — still shows "v1.2.7 ready to upload" / "last uploaded v1.0.3"; pre-existing drift, not introduced this session, but needs a real upload pass whenever Play Store publishing is next prioritized

## ✅ Session 18 — Completed 2026-07-05

- ✅ **N-out keyboard letter status scoping fixed** (`app/(tabs)/index.tsx`) — `deriveQuordleKeyStatuses` now takes a `boardIndex` param and reads only that board's `boardResults`, instead of unioning letter statuses across all boards. Wired to `activeBoard` state, so switching boards (swipe or indicator-dot tap) updates the keyboard to match — mirrors single-board behaviour exactly, since only one board is visible at a time in n-out mode
- ✅ **`new-game.tsx` route-type error fixed** — `href="/(tabs)/"` → `href="/(tabs)"`; `tsc --noEmit` now fully clean (previously the one known pre-existing error)
- ✅ **Enter key highlight added** (`components/Keyboard.tsx`) — Enter key shows a green outline (`#5BA75A`, transparent background, green text) once the current guess reaches 5 letters, in both single-board and n-out modes; reverts to normal on submit or backspace. Deliberately a distinct outlined style, not the app's filled "correct" tile green (`#6aaa64`)
- ✅ Verified all three changes end-to-end in a live browser via the scratch Playwright driver (`/tmp/pw-driver`, outside repo) against the running `npx expo start` web server — confirmed keyboard scoping switches correctly between boards, Enter highlight timing correct at 4/5 letters and after submit, no console errors
- ✅ Version bumps: v1.5.1 → v1.5.2 (versionCode 24, bundling the keyboard-scoping + new-game.tsx fixes + previous session's tutorial fixes), then v1.5.2 → v1.5.3 (versionCode 25, Enter key highlight) — both pushed to `main`, no builds triggered
- ✅ CLAUDE.md Known Issues: removed the now-resolved `new-game.tsx` entry; added new "Keyboard Behaviour" section documenting the active-board scoping and `enterActive` prop for future sessions

## 🔴 NEW — Follow-up from Session 18

- [ ] **Device regression test** of the n-out keyboard scoping fix and the Enter key highlight on a real Android device — this session's verification was web-only (headless Chromium via Playwright)
- [ ] **Trigger GitHub Actions build** for v1.5.3 (versionCode 25) — not triggered this session (version bump + doc updates only)

## ✅ Session 17 — Completed 2026-07-04

- ✅ **Tutorial overlay layout instability fixed** (`components/TutorialOverlay.tsx`) — legend, "Don't show again" checkbox, and "Got it!" button now render statically from mount (removed `showLegend`/`showEnd` gating + `legendOpacity` fade-in); only tile colours/letters animate progressively, so the card no longer grows/reflows mid-sequence
- ✅ **Tutorial overlay escape-during-animation fixed** — "Got it!" now cancels the running sequence (`cancelledRef.current = true`) and closes immediately whenever tapped, including mid-animation, instead of only working once the sequence reached its end state
- ✅ **Verified live in Chromium** via a scratch Playwright driver against the running Expo web dev server — confirmed static layout at frame one, mid-animation tap-to-close, no console errors, and no regression to backdrop tap-to-skip

## 🔴 NEW — Follow-up from Session 17

- [ ] **Device regression test** of both tutorial fixes on a real Android device — verification this session was web-only (headless Chromium)

## ✅ Session 15 — Completed 2026-07-04

- ✅ **First-launch animated tutorial overlay** (`components/TutorialOverlay.tsx`) — scripted RAISE/CLOUT/FROST demo with tile flips, colour legend, win flash, "Don't show again" checkbox + "Got it!" button
- ✅ **`tutorialSeen` flag** added to `settingsStore` (persisted, default `false`)
- ✅ **"▶ Watch how to play" button** added to top of Help modal — replays tutorial on demand, resets `tutorialSeen`
- ✅ **Backdrop tap-to-skip** — jumps straight to end state from any point in the animation
- ✅ **Verified end-to-end via headless Playwright** against the running web dev server — full animation, backdrop skip, checkbox persistence across reload, and Help modal re-trigger all confirmed working, no console errors
- ✅ **Version bump** — v1.5.0 (versionCode 21) → v1.5.1 (versionCode 22)

## 🔴 NEW — Follow-up from Session 15

- [ ] **Trigger GitHub Actions build** for v1.5.1 (versionCode 22)
- [ ] **Device regression test of tutorial overlay** on a real Android device — Playwright verification was web-only; check flip animation smoothness and layout on smaller real screens
- [ ] (Optional, not currently planned) Wire "Watch how to play" into `app/(tabs)/settings.tsx`'s HelpModal instance — currently hidden there since that route has no path back to the game screen's tutorial state

## ✅ Session 14 — Completed 2026-07-04

- ✅ **Word list rebuild from NYT Wordle source** — 2,315 US answers + 10,484 US guesses (174 removals)
- ✅ **UK English variants generated** — 2,314 answers + 8,554 guesses (from SOWPODS)
- ✅ **UK spelling conversions** — FIBER→FIBRE, METER→METRE, PRIZE→PRISE
- ✅ **Word list regeneration tooling** — wordlist/regenerate.py + source/ files committed
- ✅ **Version bump** — v1.4.1 (versionCode 20) → v1.5.0 (versionCode 21)
- ✅ **Verified import paths** — assets/wordlists/ matches all game store imports exactly

## 🔴 IMMEDIATE — v1.5.0 Release

- ✅ **Push to remote** — pushed 2026-06-30
- [ ] **Test on web** (`npx expo start`) — key paths:
  - Cold start: routes to next unplayed daily difficulty (Easy if not yet started)
  - Easy daily: play to win → "💪 Unlocked! Play Now" appears in footer
  - Play Now button: tapping starts Hard daily
  - Header emoji peek: after Easy win, 🐣→💪→🐣 animation fires on overlay dismiss
  - Difficulty cycle: Easy→Hard (after win), Hard→Easy (wraps when Extreme locked)
  - Win Easy, lose Hard, restart → should land on Hard (not Extreme)
  - Lose Easy, tap difficulty emoji → toast "Easy 🐣 lost, can't play Hard 💪"
  - Stats modal: opens to Daily tab + active difficulty sub-tab (not Practice/4-out)
  - Stats modal header: shows "STATISTICS · Wordout" (not "4-out")
  - Stats modal empty state: "Play your first Easy for stats" when no games played
  - Streak shows `🐣🔥N` on Easy tab, `💪🔥N` on Hard tab
  - Practice difficulty: tap emoji → snapshot saves, new game starts; tap back → board restored
  - Celebration overlay: tap anywhere to dismiss immediately
- ✅ **Version bump**: v1.4.0 (versionCode 19) — app.json + CHANGELOG updated 2026-06-30
- ✅ **Version bump**: v1.4.1 (versionCode 20) — app.json + CHANGELOG updated 2026-07-02
- ✅ **Trigger GitHub Actions build** for v1.4.0 — completed 2026-06-30
- ✅ **Trigger GitHub Actions build** for v1.4.1 — run ID 28574666289, completed 2026-07-02
- [ ] Test on device (Samsung S24 Ultra) — priority test cases:
  - Win practice → ✓ overlay appears ONLY AFTER wave fully completes (not during bounce)
  - Win 8-out → ✓ overlay waits for all 40 tiles; no re-animation after overlay auto-dismisses
  - Win practice → switch to daily → switch back → ✓ immediately, NO wave re-fire
  - Win 4-out → switch to 2-out → switch back → no popup re-fire, boards show ✓
  - Win daily → verify ✓ persists on app relaunch, no re-wave, no re-popup
  - Lose a game → ✗ shows on revisit, no red shake re-fire
  - New Game resets: wave fires fresh, popup fires fresh
  - Celebration overlay: "Closing in 5…4…3…2…1…" visible, then auto-dismisses
  - Hard mode 2-out: board 1 reveals 'I' → can submit guess without 'I' if board 2 accepts it
- [ ] Also verify v1.2.6/v1.2.7 fixes still intact:
  - Footer on completed daily: only [? for help] [📊], NO countdown, NO New Game button
  - ↺ New Game button in footer is green/white rounded
  - Practice ribbon label: "Practice · Easy 🎮" (text FIRST, then icon)
  - Daily ribbon label: "📅 Today's · Easy" (icon first — unchanged)
  - 4-out → 2-out → back to 4-out: board state persists (snapshot restored)
  - Difficulty change in practice: shows abandon confirm if in-progress, resets board
  - Help screen Ribbon section has description paragraph
- [ ] Feature graphic (1024×500px) — design in claude.ai
- [ ] Screenshots on S24 Ultra (min 2, recommend 6):
  - Fresh empty board (Wordout mode, showing pre-game tip)
  - Mid-game with green/yellow tiles
  - Multi-board mode (4-out) mid-game
  - End-of-game overlay (win)
  - Settings screen (showing difficulty radio)
  - Help modal
- [ ] Complete Play Console setup:
  - Content rating questionnaire
  - Data safety (no data collected — all local)
  - Target audience (everyone)
- [ ] Upload AAB to internal testing track (`releases/latest/download/wordout.aab`)
- [ ] Promote to production
- [ ] Set up Google Play service account for automation (after first manual upload)
- [ ] Add GOOGLE_PLAY_SERVICE_ACCOUNT_JSON secret to GitHub
- [ ] Update GitHub Actions workflow to auto-upload to internal track

---

## ✅ Session 13 — Completed 2026-07-03

- ✅ Settings footer updated: "© 2026 Onglipo Labs. *Ohm Shanti* Ω Ω Ω · MIT License"
- ✅ Dead-end gate toast text updated to include difficulty names ("Easy 🐣 lost, can't play Hard 💪")
- ✅ v1.4.1 (versionCode 20) bumped, built, and released
- ✅ `/advisor` setup instructions fixed in `open.md` and `CLAUDE.md`
- ✅ Technical Debt section added to TODO with Android 15 + tablet Play Console warnings

## ✅ Session 11 — Completed 2026-06-30

- ✅ B1: Startup funnel now checks `games.X.solved` before advancing difficulty — prevented routing to Extreme after losing Hard on app restart
- ✅ B2: Difficulty icon tap now shows toast when stuck on single lost difficulty ("🐣 lost · can't play 💪")
- ✅ B3: StatsModal tab no longer mutates `activeWordleMode` store — uses local state, synced imperatively on open
- ✅ StatsModal `isQuordle` fixed: was `gameMode === 'quordle' || boardCount > 1`; `boardCount` defaults to `4` so Daily tab was always hidden — now `gameMode === 'quordle'` only
- ✅ StatsModal header fixed: now shows "STATISTICS · Wordout" in single-board/daily mode
- ✅ StatsModal empty state added: "Play your first Easy/Hard/Extreme for stats" and "Play your first Wordout/N-out for stats"

## ✅ Session 10 — Completed 2026-06-30

- ✅ Documentation update: CLAUDE.md, TODO.md, README.md, constants/helpContent.ts updated for v1.4.0
- ✅ New Daily Gate Architecture section added to CLAUDE.md
- ✅ DAILY_PROGRESSION export added to helpContent.ts (unused, ready for HelpModal)
- ✅ Version bump: app.json → v1.4.0 / versionCode 19; CHANGELOG [1.4.0] dated
- ✅ GitHub Actions build triggered (run ID 28424810118)

## ✅ Session 9 — Completed 2026-06-30

- ✅ v1.4.0 daily store: per-difficulty games (`games: {easy, hard, extreme}`), per-difficulty answers (UTC-midnight seed), per-difficulty stats/streaks/waveShown/celebrationShown, missed-day detection, persist v2 migration
- ✅ v1.4.0 game screen: startup funnel, accessible-list difficulty cycle (no gate toasts), Play Now button, peek animation after daily win, TouchableOpacity overlay dismiss
- ✅ Practice difficulty switching: snapshot-based (no lock, no confirm dialog), mirrors quordleStore pattern
- ✅ Stats modal: per-difficulty sub-tabs for daily (🐣/💪/💀)
- ✅ Play Now button: "Unlocked! Play Now" label
- ✅ Daily gate logic: three rewrites → final: accessible-list (cycle only within reachable difficulties, no toasts ever)

## ✅ Session 8 — Completed 2026-06-29

- ✅ Haptic feedback: Warning (wrong guesses), Medium (correct guesses), Success (win)
- ✅ Tap tile to clear rightward — cursor lands at tapped position
- ✅ Board indicator state changes display correctly (animations removed as too subtle at 24×24px)
- ✅ v1.3.0 version bump: app.json, CHANGELOG.md, CLAUDE.md updated
- ✅ Documentation: added KEYBOARD_HINTS to helpContent.ts, features to README.md
- ✅ TODO reorganized: auto-publish setup linked to production release, marked v1.3 items complete
- ✅ Git credential issue resolved: configured GitHub CLI as credential helper

## ✅ Session 7 — Completed 2026-06-29

- ✅ Daily difficulty toast shortened to "Daily is always Easy" — was overflowing footer on device (two occurrences: `settings.tsx` + `index.tsx`)

## ✅ Session 6 — Completed 2026-06-29

- ✅ Tile re-animation bug fixed — last-row tiles no longer re-animate after celebration overlay dismisses (`waveDoneLocal` guard in `GameBoard.tsx`)
- ✅ Celebration overlay countdown — "Closing in 5…4…3…2…1…" shown while 5s auto-dismiss timer runs; driven by `END_GAME_DISMISS_MS` constant
- ✅ Hard mode per-board constraint fix — n-out: each board enforces only its own revealed hints; guess accepted if any unsolved board accepts it

## ✅ v1.2.7 — Completed 2026-06-28

- ✅ B1: Win-wave re-animation on board revisit — `onWaveDone()` called at wave START; `waveSentRef`/`waveShownRef`/`isRevisit` prevent double-fire and revisit replay
- ✅ B2: Daily always Easy — removed lock logic; 🐣 always shown in daily; toast on change attempt
- ✅ B3: Help screen text moved to `constants/helpContent.ts` — component reads from file

## ✅ v1.2.6 — Completed 2026-06-28

- ✅ B1: Footer on completed daily no longer shows countdown — only [? for help] [📊]
- ✅ B2: Wave animation race condition fixed — `waveDone` derived from prop directly, no one-render lag
- ✅ B3: Multi-board state persists across mode switches via per-bc snapshots in quordleStore
- ✅ B4: Practice board resets on difficulty change (both header toggle and settings); quordle snapshots cleared
- ✅ B5: Difficulty locked after any game completes (practice, quordle, daily) — shows toast
- ✅ B6: Daily difficulty lock only applies after first guess submitted (or completion)
- ✅ B7: Practice ribbon label order: "Practice · Easy 🎮" (text before icon)
- ✅ B8: Help screen Ribbon section has description paragraph
- ✅ B9: ↺ New Game button styled green (#5BA75A) with white text, rounded corners
- ✅ D1: Startup logic verified correct from v1.2.5 — no change needed
- ✅ D2: Help screen ◄ ► description updated to list all board count names

## ✅ v1.2.5 — Completed 2026-06-28

- ✅ B1: Footer game-over redesigned — single row [? for help][📊][↺ New Game / countdown]; stats row removed
- ✅ B2: Wave animation stored in game/daily/quordle stores — no re-animation when returning to solved board
- ✅ B3: Ribbon label → "Next word in HH:MM:SS" after daily completion (replaces "Today's · Easy")
- ✅ B4: Header difficulty emoji reflects active mode's locked difficulty
- ✅ B5: Help screen ◄ ► moved to Header section; "at the bottom" → "in the header"
- ✅ B6: Mode switch no longer resets completed multi-board game (newGame only when bc changes)
- ✅ B7: Footer shows persistent "Board N solved ✓" for active solved board (replaces transient flash)
- ✅ B8: Resolved by B1 (stats removed from footer)
- ✅ B9: Active+solved board indicator shows ✓ in green square (not circle)

## ✅ v1.2.4 — Completed 2026-06-28

- ✅ B1: Overlay is Share-only; Footer shows ↺ New Game (practice) or "Next word in HH:MM:SS" (daily) after overlay dismisses
- ✅ B2: Wave animation fires once per game — revisiting solved board goes directly to ✓ state (`waveDone` state guard)
- ✅ B3: Mode label inline to right of active icon (confirmed from D2/v1.2.3)
- ✅ B4: Footer clears "Board X solved in N" when switching active board via swipe
- ✅ B5: Practice 1-out difficulty change no longer fires daily lock toast — guard checks `activeWordleMode === 'daily'`
- ✅ B6: Settings difficulty change only locks for daily 1-out — multi-board and practice modes freely changeable
- ✅ B7: Help ICONS split into "Top bar" / "Ribbon" (📅 🎮) / "Footer" (📊 ‹› 🔥 ⚡)
- ✅ B8: ∞ → 🎮 throughout (confirmed from D1/v1.2.3)

## ✅ v1.2.3 post-test fixes — Completed 2026-06-28

- ✅ B1 (post-test): "Today's · Easy" label position on Android — maxWidth/marginTop/numberOfLines constraints on modeLabel
- ✅ B2 (post-test): Board doesn't refresh on Settings mode change — boardCount in scroll-reset deps + clamp effect
- ✅ B3 (post-test): Difficulty icon cycles on completed daily — lock guard changed to `isDaily` (not `!isQuordle`)
- ✅ B4 (post-test): Daily win overlay auto-dismiss not firing — decoupled to useEffect([endGameVisible])
- ✅ B5 (post-test): Lose overlay ↺ New Game + ? — stopPropagation + explicit dismissEndGame() added to ↺ handler
- ✅ D1 (design): Replace ∞ with 🎮 throughout (indicator row, HelpModal)
- ✅ D2 (design): Mode label inline to right of active icon (not below)

## ✅ v1.2.2 — Completed 2026-06-28

- ✅ B1: End-game exit — practice "New Game", daily countdown
- ✅ B2: Daily New Game toast correct
- ✅ B3: Animations fire once only per game
- ✅ B5: Difficulty locked after daily completed
- ✅ B6: Practice board persists on mode switch
- ✅ B7: ✓/✗ overlay after wave animation
- ✅ B8: Multi-board strip state cleanup
- ✅ B10: Mode arrows refresh active board
- ✅ B13: Streak explanation in HelpModal
- ✅ E1: Removed auto-clear after invalid-word shake
- ✅ E2: Bottom strip ⏳/🎯/🎲 states
- ✅ E3: Stats row inline layout
- ✅ E4: Indicator row mode/difficulty label
- ✅ E5: Word count pills removed from Settings

## ✅ v1.2.1 — Completed 2026-06-27

- ✅ B1: Settings safe area top inset (status bar / notch)
- ✅ B2: Settings mode change stays on Settings (no navigation)
- ✅ B3: Difficulty lock when daily game in progress (alert shown)
- ✅ B4: Header mode label updates on ‹ › arrow press
- ✅ B5: Help screen: Extreme mode 💀 entry added
- ✅ B6: Help screen icons match actual colours (green indicator square, 📊 emoji, solid triangles)
- ✅ E1: Win overlay shows "Solved in X/N tries {emoji}"
- ✅ E2: Continue button hides ✓/✗ board overlays after end-game popup
- ✅ E3: Stats modal header shows mode name ("STATISTICS · Wordout" etc.)
- ✅ E4: Header ‹ › replaced with solid filled triangles (grey #aaa)
- ✅ E5: Help screen feedback prompt shortened to "Missing or wrong word?"
- ✅ E6: Bottom strip: single combined line "Guess N of M · ? for help" (green)

## ✅ v1.2.0 — Completed 2026-06-27

- ✅ Extreme mode (💀): `max(3, (5+boardCount)−2)` guesses; shown in BottomStrip State 1
- ✅ `difficulty: 'easy'|'hard'|'extreme'` replaces `hardMode: boolean` (Zustand persist migration)
- ✅ Settings DIFFICULTY section: DifficultyRow radio buttons (🐣 Easy / 💪 Hard / 💀 Extreme)
- ✅ Settings footer: word count pills, GitHub link, credits, version string
- ✅ ? help icon in StatsModal header
- ✅ ? help icon in end-of-game overlay
- ✅ ‹ › mode arrows wrapped in grey squares (#878a8c)
- ✅ Pre-game tip tappable → opens HelpModal
- ✅ `clearCurrentGuess` action in all three game stores
- ✅ Auto-clear currentGuess 950ms after invalid-word shake
- ✅ Overlay timing: wave → popup → dismiss → per-board ✓/✗ (`overlayLocked` + `suppressOverlay`)
- ✅ Daily revisit: static ✓ overlay, no re-animation
- ✅ Mode switch (‹›, board count select) preserves game — no longer calls newGame()
- ✅ Share button icon vertical alignment fix (BottomStrip + overlay)
- ✅ Streak emoji/number vertical alignment fix (BottomStrip State 3)
- ✅ 2-out board last row clipping fix on web (BOARD_PAGE_PAD = 12)
- ✅ Settings "Dark Theme" label: explicit textColor prop (was blue/link on iOS)
- ✅ `WORD_COUNT_ANSWERS` / `WORD_COUNT_GUESSES` exported from gameStore

## ✅ v1.1.1 — Completed 2026-06-26

- ✅ Hard mode toggle mid-game: abandon confirm + new game starts immediately
- ✅ Share button: share-social-outline icon (BottomStrip + end-game overlay)
- ✅ Settings screen: ? help icon in header opens HelpModal
- ✅ HelpModal: 💪/🐣 as separate rows; sun icon for light theme; absent tile dark in dark mode
- ✅ Mode indicator (📅/∞): green tint background when active
- ✅ Version string on web: omits build number
- ✅ Bottom strip: paddingBottom = insets.bottom (fixes Android nav bar overlap)
- ✅ Startup logic: opens Daily if not yet completed today; otherwise restores last-played mode
- ✅ Pre-game tip in bottom strip: "📅 Daily · ∞ Practice · ? Help" before first guess

## ✅ v1.1.0 — Completed 2026-06-26

- ✅ Header redesign: left [🇺🇸/🇬🇧 💪/🐣 ↺] | center [‹ mode ›] | right [🌙 ⚙ ?]
- ✅ Tab bar hidden; mode cycling and new game moved to header
- ✅ BottomStrip: 3 states (playing/board-solved/game-over) + 📊 stats icon
- ✅ StatsModal: Daily|Practice tabs, distribution chart, reset stats
- ✅ Stats removed from Settings screen
- ✅ Daily Word mode with countdown overlay
- ✅ Emoji convention: 🔥 daily streak, ⚡ practice streak, 🏆 personal best

---

## 🟡 Technical Debt / Future

- [ ] Migrate away from deprecated edge-to-edge APIs for Android 15 compatibility (Play Console warning on release 20)
- [ ] Add large screen / tablet support — remove orientation restrictions (Play Console warning on release 20)

## 🟢 Future — Nice to Have

- [ ] **Deploy Wordout as a web app** — `npx expo export --platform web` generates static dist/ folder, deploy to onglipo.in/wordout or wordout.onglipo.in. Consider adding PWA manifest so users can install from browser. Haptics and AsyncStorage already work on web.
- [ ] Haptic feedback on correct/wrong guess
- [ ] Animate board indicator state transitions
- [ ] Sequential ✓ flash across boards before end-game overlay (multi-board all-won)
- [ ] GitHub Actions → Play Store auto-publish pipeline
- [ ] End-game overlay delay dynamic based on guess count (currently fixed — feels long on 1-guess wins)
- [ ] Per-difficulty state persistence in quordle (snapshots currently invalidated on difficulty change)

---

## ✅ Completed

- ✅ Core game: single board Wordout mode
- ✅ Multi-board modes: 2-out, 3-out, 4-out, 6-out, 8-out
- ✅ Board progress indicators (▶ ○ ① ✓)
- ✅ Settings: language, difficulty (easy/hard/extreme), dark theme, colour blind
- ✅ Stats per mode with guess distribution
- ✅ Share emoji grid
- ✅ Help modal rewrite (RAISE/CLOUT/FROST, rendered indicators, Onglipo Labs)
- ✅ App icon: parchment bg, RAISE/CLOUT easter egg
- ✅ splash/adaptive-icon background #FFF8EE
- ✅ GitHub Actions build pipeline
- ✅ Abandon guard (New Game, mode switch, language switch)
- ✅ Privacy policy at GitHub Pages
- ✅ Play Store listing text (name, short desc, full desc)
- ✅ Google Play Console account + identity verified
- ✅ Package com.dilippanicker.wordout registered
- ✅ 2026-06-25 v1.0.1: Remove green border from solved boards
- ✅ 2026-06-25 v1.0.1: Win/lose overlays + end-of-game full screen overlay
- ✅ 2026-06-25 v1.0.2: Fix "Quadout" → "4-out" in Settings + wordlist additions
- ✅ 2026-06-26 v1.0.3: Reject duplicate guesses; versioned GitHub Releases
- ✅ 2026-06-26 v1.0.4: Tile flip timing, wave animation, FlipTile CLAMP fix
- ✅ 2026-06-26 v1.1.0: Daily mode, BottomStrip, StatsModal, header redesign
- ✅ 2026-06-26 v1.1.1: Bug fix round 1+2, startup logic, safe area, pre-game tip
- ✅ 2026-06-27 v1.2.0: Extreme mode, overlay timing, game-persist, 11 additional fixes

---

*Update at end of every CC session via /close*
