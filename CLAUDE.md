# Wordout — React Native (Expo)

Historical bug write-ups and resolved-incident detail referenced below live in [REGRESSION_TRAPS.md](REGRESSION_TRAPS.md) — check it before touching code near a "see REGRESSION_TRAPS.md" pointer.

## Stack
- Expo SDK ~56.0.12, React Native 0.85.3 (file-based routing via Expo Router)
- TypeScript ~6.0.3
- Zustand v5.0.14 with `persist` middleware (AsyncStorage)
- react-native-reanimated 4.3.1 for tile flip + shake animations
- react-native-safe-area-context, @expo/vector-icons (Ionicons)

## Commands
- `npx expo start` — web dev server (port 8081)
- `npx expo start --android`
- `npx jest` — store-invariant tests (`__tests__/store-invariants.test.ts`); executable versions of the invariants documented in this file. Also run in CI (`test.yml` on push, and as a fail-fast job before the APK build). Add a test here when documenting a new store invariant.

## Word lists
- `assets/wordlists/answers_en_us.json` — 2,315 answers (US English)
- `assets/wordlists/answers_en_gb.json` — 2,314 answers (UK English)
- `assets/wordlists/guesses_en_us.json` — 10,484 guesses (US English)
- `assets/wordlists/guesses_en_gb.json` — 8,554 guesses (UK English)
- **Source:** NYT Wordle answers/guesses + SOWPODS (Norvig) for UK
- **Filtering:** No proper nouns (157 removed), no offensive words (17 removed), no -ED/-ING/-S forms
- **UK variants:** FIBER→FIBRE, METER→METRE, PRIZE→PRISE
- **Regeneration:** `python3 wordlist/regenerate.py` (reads from `wordlist/source/`)
- Bundled JSON, not fetched at runtime

## Screen Zone Naming Convention
- **Header** — top bar: 🇬🇧 🐣 ☽ | ◄ Wordout ► | ↺ ⚙ ? — ↺ New Game deliberately sits away from the difficulty toggle, swapped with ☽ dark/light mode after adjacency caused accidental taps that triggered the abandon-confirm dialog
- **Ribbon** — 📅 🎮 icons + board indicators + contextual status (next word countdown etc)
- **Board** — tile grid
- **Keyboard** — on-screen keyboard
- **Footer** — ⏳ tries left / new game button / 📊 stats

## Architecture

### Routing — `app/`
- `_layout.tsx` — root Stack + ThemeProvider (light/dark driven by `settingsStore.darkTheme`)
- `(tabs)/_layout.tsx` — 3-tab layout:
  - **New Game** (refresh icon) — action tab; `tabPress` prompts to abandon if game in progress, then calls `newGame()` on both stores
  - **Wordout / mode name** (grid/apps icon) — cycles board counts (1→2→3→4→6→8→1) on tap while active
  - **Settings** (gear icon)
- `(tabs)/index.tsx` — game screen
- `(tabs)/settings.tsx` — settings + stats
- `(tabs)/new-game.tsx` — dummy redirect to `/(tabs)/`

### Stores — `store/`
**`settingsStore.ts`** — persisted (`wordle-settings`):
- `language`, `difficulty: 'easy'|'hard'|'extreme'`, `darkTheme`, `colorBlindMode`
- `gameMode: 'wordle'|'quordle'`, `boardCount: 1|2|3|4|6|8` — **default `boardCount` is `4`**, not `1`
- `tutorialSeen: boolean` (default `false`) — gates the first-launch tutorial overlay; set `true` only when the user checks "Don't show again" and taps "Got it!"
- `firstLaunchDate` (ISO, set once on first mount), `totalWins`, `reviewPromptCount`, `lastReviewPromptDate` (ISO), `reviewLastOutcome`/`reviewLastOutcomeDate` — in-app review gating + diagnostics, see Review Prompt section. Defaults `''`/0, no migration.
- `maxGuessesForDifficulty(difficulty, boardCount)` — extreme = `max(3,(5+boardCount)−2)`, else boardCount===1 ? 6 : min(13,5+boardCount)
- `boardCountName(n)` → `'Wordout'|'2-out'|'3-out'|'4-out'|'6-out'|'8-out'`
- **Never use `boardCount > 1` to detect multi-board mode** — use `gameMode === 'quordle'`. `boardCount` starts at 4 so `boardCount > 1` is always true for users who never visited multi-board mode.

**`gameStore.ts`** — practice 1-out logic:
- `waveShown: boolean` — wave-shown flag; reset in `newGame()`
- `celebrationShown: boolean` — celebration popup shown flag; reset in `newGame()`
- `clearCurrentGuess()` — not auto-called; user backspaces manually after shake
- `lastDifficulty: Difficulty` — last difficulty played in single-board practice; restored by callers entering practice from elsewhere (quordle board-count cycling, Daily→Practice tab) instead of leaving whatever difficulty was last active there
- `switchLanguage(oldLanguage, newLanguage)` — same save-then-restore-or-fresh pattern as `switchDifficulty`, called from the module-level `settingsStore.subscribe` (not from UI code directly — `setLanguage()` is called directly by the header flag / Settings picker, and the subscribe reacts to it)
- Snapshots keyed by `` `${language}-${difficulty}` `` — a language switch is snapshot-aware exactly like a difficulty switch, not a reset

**`quordleStore.ts`** — multi-board logic:
- `waveDoneBoards: boolean[]` — per-board wave flags
- `celebrationShown: boolean` — end-game popup shown flag; saved/restored in snapshots
- `snapshots: Record<string, QuordleSnapshot>` — in-memory per-`` `${language}-${difficulty}-${boardCount}` `` state (NOT persisted)
- `switchBoardCount(n)` — saves current state to snapshot (incl. celebrationShown), restores n if previously visited
- `switchLanguage(oldLanguage, newLanguage)` — same pattern, called from the module-level `settingsStore.subscribe`, which is the only place both the old and new language are available together (the subscribe fires after settingsStore has already committed the new value)
- `newGame()` — clears snapshot for current language+difficulty+bc, starts fresh

**`dailyStore.ts`** — persisted (`wordout-daily`, version 2):
- `DAILY_EPOCH = new Date('2026-01-01').getTime()`
- `games: { easy, hard, extreme }` — each a `DailyGameState` with `status`, `guesses`, `currentGuess`, `solved`, `waveShown`, `celebrationShown`, `lastWinDate`, `stats`
- `dailyAnswers: { easy, hard, extreme }` — all three set together on first daily start of the day, via `dailyIndices(dayNum, n)` (see Daily Gate Architecture below)
- `activeDailyDifficulty: Difficulty` — persisted; which tab is active
- `activeWordleMode: 'daily'|'practice'`
- `startOrResumeDailyGame(difficulty)` — starts game only if status === 'available'; computes all three answers at once; dev-mode logs all three words
- `checkAndReset()` — resets all three games on new day; streak miss detection via `lastWinDate`; resets `activeDailyDifficulty` to 'easy'
- `setActiveDailyDifficulty(difficulty)` — simple setter; gate logic lives in index.tsx
- `setWaveShown(difficulty, v)` / `setCelebrationShown(difficulty, v)` — per-difficulty flags
- Persist version 2: migration from v0 (v1.3.0) and v1 (interim v1.4.0 with single `dailyAnswer`)

**`statsStore.ts`** — persisted (`wordle-stats`):
- `byMode: Record<string, BoardStats>` — keyed by `'wordle'` or `String(boardCount)`

`setCurrentGuess()` is defined on all three game stores (`gameStore`, `quordleStore`, `dailyStore`) — powers tap-tile-to-clear-rightward in every mode.

### Daily Gate Architecture (v1.4.0)
Three independent daily games run each day — Easy, Hard, Extreme — each with a different word.

**Per-difficulty state (`dailyStore.ts`)**:
- `games.{easy|hard|extreme}` — independent `DailyGameState`: status, guesses, currentGuess, solved, waveShown, celebrationShown, lastWinDate, streak, stats
- Stats per-difficulty, shown in sub-tabs (🐣/💪/💀) within the Daily tab of StatsModal
- Streaks tracked independently via `lastWinDate`; missed-day detection fires in `checkAndReset()`
- Word selection: all three words computed atomically via `dailyIndices(dayNum, n)` — a mulberry32 PRNG seeded per UTC day, sampled with reject-duplicate until 3 distinct indices are drawn from the full `[0, n)` answer-list range. See REGRESSION_TRAPS.md for the collision bug this replaced (v1.5.8).

**Day boundary is UTC everywhere, not local calendar day** — `getTodayString()`/`getYesterdayString()` (`dailyStore.ts`) and the countdown (`msUntilMidnight()`, `app/(tabs)/index.tsx`) all key off UTC date components, matching `getDailyAnswers()`'s UTC-midnight derivation. See REGRESSION_TRAPS.md for the local-timezone bug this fixed. Regression test: `__tests__/store-invariants.test.ts` "day boundary is UTC, not local" (`TZ=Asia/Kolkata`).

**Day-roll refresh has three independent triggers, all funneled through one helper** — `refreshDailyDay()` (`app/(tabs)/index.tsx`) calls `checkAndReset()` then, only if `activeWordleMode === 'daily'`, `startOrResumeDailyGame(activeDailyDifficulty)`. `checkAndReset()` alone leaves the active difficulty `'available'` with no answer set — unplayable until something starts it. Called from: the 1s countdown interval (catches a day roll while the app stays foregrounded), `useFocusEffect` (catches in-app navigation focus), and an `AppState` `'change'` listener (catches OS-level background→foreground resume, which `useFocusEffect` does NOT fire for — confirmed live, this was the source of a reported bug where a backgrounded app kept showing yesterday's completed boards until a full reload). Any future resume/focus path must call `refreshDailyDay()`, never `checkAndReset()` directly, or it reintroduces the same gap. Regression test: `__tests__/store-invariants.test.ts` "checkAndReset alone leaves the active difficulty unplayable".

**Accessible-list gate** — build reachable difficulty list before each cycle step:
1. Easy — always included
2. Hard — included if Easy is `'completed'` OR Hard is already `'playing'`/`'completed'`
3. Extreme — included if Hard is `'completed'` OR Extreme is already `'playing'`/`'completed'`

Header difficulty emoji taps through this list only. NO gate toasts, NO "Win X first" messages.
**Swipe-to-cycle**: on a *finished* daily board (won or lost) only, swiping left/right on the board also cycles through this same accessible list (`utils/dailyDifficultyCycle.ts`'s `stepDailyDifficulty`), left = forward, right = backward with wraparound. Deliberately NOT active mid-game (`activeGameStatus === 'playing'`) — swipe touch handlers share the board's surface with the tap-to-clear-rightward gesture, so an always-on swipe risked a mistimed tap during active typing being misread as a swipe and yanking the player to a different difficulty mid-guess. Tap (header emoji) has no such risk since it's a separate target, so it stays available anytime. This asymmetry was raised and explicitly confirmed as the preferred UX, not an oversight — do not "fix" it into uniform availability without asking first.
**Peek animation + auto-advance**: after the win overlay dismisses (first win only), the header emoji briefly scales toward the next difficulty emoji then snaps back — only when the next difficulty is newly unlocked (`games[next].status === 'available'`) — then `dismissEndGame()` in `index.tsx` calls `setActiveDailyDifficulty(next)` itself, which the existing `activeWordleMode`/`activeDailyDifficulty` effect turns into a `startOrResumeDailyGame(next)` call. No manual tap required to progress Easy→Hard→Extreme. There is no "Play Now" button (removed — auto-advance made it dead code, since the "completed with next available" state it targeted is no longer reachable in normal play).
**Startup funnel**: on app mount, routes to next unplayed difficulty (Easy → Hard → Extreme in order), else restores persisted `activeWordleMode` + `activeDailyDifficulty`.

### Key Design Decisions (locked)

**Practice mode:**
- Unlimited games, freely change difficulty — snapshot-based (no lock, no confirm dialog)
- `gameStore.switchDifficulty(d)` saves current state under current difficulty key, restores snapshot for new difficulty or starts fresh — mirrors quordleStore.switchBoardCount
- Board state persists on mode switch — only ↺ New Game clears (also clears snapshots)
- Entering single-board practice from elsewhere (quordle board-count cycling, Daily→Practice tab) restores `gameStore.lastDifficulty` — its own last-played difficulty — instead of leaving whatever difficulty happened to be active in the mode you're leaving. All three entry points (`index.tsx`'s `cycleTo`, `settings.tsx`'s `handleBoardCountSelect`, the Daily→Practice tab press) must sync `setDifficulty(useGameStore.getState().lastDifficulty)` — a new entry point that skips this reintroduces the bug.

**Never clear rule:**
- Games never auto-cleared without explicit user action (↺ New Game)
- Abandon guard on: New Game, mode arrows (◄►), language change
- Difficulty change in practice: no confirm, snapshot-based (no data lost)
- Language change: snapshot-based in both `gameStore` and `quordleStore` (`switchLanguage`, mirroring `switchDifficulty`) — switching `en_us`↔`en_gb` and back restores each language's board exactly as left, it does not reset. The abandon-guard confirm on language change (see below) is a UX choice, not a data-loss prevention — no data is actually lost either way. See REGRESSION_TRAPS.md for why this must stay reactive (subscribe-driven), not a direct call.

**Ribbon label layout:**
- Daily active: `[📅 Today's · Easy 🐣 ····· 🎮]` — includes difficulty emoji
- Daily completed: `[📅 Next word in HH:MM:SS 🐣 ····· 🎮]` — includes difficulty emoji
- Practice active: `[📅 ····· Practice · Easy 🎮]` — text before icon

**Board indicators:**
- Green square + ▶ — current board, not solved
- Green filled square + ✓ — current board, solved
- Grey circle — non-active, no guesses
- Green circle + number — correct position letters found
- Yellow circle + number — yellows also found
- Green filled circle + ✓ — non-active, solved
- Rendering is deliberately static (no scale-pop or color-transition animation) — imperceptible at 24×24px; don't re-add

**Footer layout:**
- Playing: `[⏳ N tries left · ? for help] [🔥/⚡ N] [📊]`
- Game over (practice): `[? for help] [↺ New Game (green)] [🔥/⚡ N] [📊]`
- Game over (daily): `[? for help] [🔥/⚡ N] [📊]` — next difficulty (if any) auto-starts, no button needed; countdown shows in Ribbon once all three are done
- `[🔥/⚡ N]` — streak badge (`BottomStrip.tsx`'s `rightCluster`), always immediately left of `[📊]` in every footer state, hidden entirely when the current streak is 0 (a fresh or lapsed streak isn't worth permanent clutter, unlike Stats' labeled "Streak" cell where 0 is informative in a table). Sourced from the same `gameStats.streak`/`streakEmoji` already used elsewhere — daily shows the difficulty emoji + 🔥 (e.g. `🐣🔥 3`), practice shows ⚡. Tapping it opens Stats, same as `[📊]`.

**Emoji convention (strict):** 🐣 easy, 💪 hard, 💀 extreme · 🔥 daily streak, ⚡ practice streak, 🏆 personal best · 📅 daily mode, 🎮 practice mode

**App name:** Wordout (not WordOut, not WORDOUT) · **Mode names:** Wordout, 2-out, 3-out, 4-out, 6-out, 8-out

**Monetization:** Wordout stays ad-free (see README's "No ads, no accounts, no tracking"). Ad-monetization was explicitly considered and declined (2026-07) — it conflicts with the app's core promise to existing users/testers. Do not propose ads, analytics, or tracking SDKs for this app.

### Animation sequence (locked design)

**Four animation types:**
1. **Fill (flip):** tiles reveal colours on guess submit. Always fires on every new guess. Never suppress.
2. **Wave:** solved-board tiles bounce. Fires ONCE on first solve via `waveShown`/`waveDoneBoards` flags.
3. **Celebration overlay:** full-screen "Solved!" / "Better luck next time" popup. Fires ONCE via `celebrationShown` flag.
4. **Final state:** `✓`/`✗` dim overlay on board. Always visible on completed boards, no animation.

**Sequencing decisions are pure functions** in `components/boardSequencing.ts` (tileModeForSubmittedRow, shouldWaveRow, isRevisit, waveTileDelay, waveDuration, overlayPlan, …) with regression tests in `__tests__/board-sequencing.test.ts` replaying the v1.0.1→v1.2.8 bug chain. GameBoard renders what they decide — change the decisions there (with a test), not inline in the component.

**Key implementation details:**
- `GameBoard` receives `key={isDaily ? \`daily-${activeDailyDiff}\` : 'practice'}` (single-board) or `key={\`${boardCount}-${i}\`}` (quordle) — forces remount on mode/bc/daily-difficulty switch so `prevCount` ref initialises fresh (prevents spurious fill animation on revisit).
- `celebrationShown` is checked in `index.tsx` before firing the end-game popup. Set immediately on first fire, stored in all three game stores.
- `boardCount` is in the mode-reset `useEffect` deps — syncs `prevGameStatusRef` on bc-switch so returning to a completed bc-game doesn't re-trigger the popup.
- Wave skip path in `GameBoard`: on remount with `waveShown=true`, `isRevisit=true` → `setWaveDoneLocal(true)` immediately → no bounce → ✓ overlay shows via `elapsed=Infinity` path.
- `onWaveDone` fires at TRUE wave end — `BounceTile` last tile (`row=count-1, col=COLS-1`) uses `runOnJS` in the `withSpring` completion callback. `stableHandleWaveDone` is a `useCallback([], [])` stable reference that reads `onWaveDone` via `onWaveDoneRef` to avoid stale closure; guards with `waveSentRef` to prevent double-call. Do NOT call `onWaveDone` at wave start — that causes ✓ overlay to appear before the wave finishes on large boards.
- FlipTile is gated on `row === animatingRow && !waveDoneLocal` — the `!waveDoneLocal` guard is critical. When `waveDoneLocal` flips true, both the BounceTile wrapper condition and the FlipTile condition become false in the same render, collapsing to a static Tile. Without this guard, React sees a BounceTile→FlipTile type change and remounts FlipTile fresh (progress=0), replaying the fill animation after the overlay dismisses.

**Hard mode constraint semantics (n-out):**
- Each board independently enforces only its own revealed hints (`checkHardModeConstraints` uses per-board history via `g.boardResults[b]`)
- A guess is **accepted** if at least one unsolved board's constraints are satisfied
- A guess is **rejected** only when ALL unsolved boards reject it (toast shows first board's violation)
- A board with no revealed letters trivially accepts (no constraints) — normal in early turns
- Single-board (`gameStore`) hard mode is unchanged: that board's constraints always apply

### Difficulty rules
- Daily: header emoji cycles through accessible difficulties (accessible-list approach, no toasts). Settings difficulty panel applies to practice only when in daily mode.
- Practice single-board: snapshot-based switch via `gameStore.switchDifficulty(d)`. No lock, no confirm dialog.
- Quordle: confirmAbandon if in-progress; free switch otherwise — snapshot-based via `quordleStore.switchDifficulty(d)` (v1.7.2+), mirroring single-board's `gameStore.switchDifficulty`. A finished board is preserved, not wiped, when cycling difficulty and back — only explicit New Game clears it. Snapshots are keyed by `` `${language}-${difficulty}-${boardCount}` `` (`quordleStore.ts`'s `snapshotKey()`). `handleDifficultyToggle()` must call `switchDifficulty(next)` **before** `setDifficulty(next)` on both the confirmAbandon and free-switch paths — see REGRESSION_TRAPS.md for why.

### Abandon guard — `utils/abandon.ts`
`isGameInProgress()` reads stores imperatively. Checks guesses submitted, not just game state existence. `confirmAbandon(onConfirm)` — `Alert.alert` on Android/iOS, `window.confirm` on web.

### Help content
Text strings extracted to `constants/helpContent.ts` — edit there without touching `HelpModal.tsx`.

### First-launch tutorial — `components/TutorialOverlay.tsx`
Full-screen overlay, purely presentational (no store reads/writes for the demo board itself). Auto-plays a scripted RAISE → CLOUT → FROST demo game once per install, gated by `settingsStore.tutorialSeen`.
- Mounted conditionally from `app/(tabs)/index.tsx` (`{showTutorial && <TutorialOverlay onClose={...} />}`) — mounting IS the trigger; a mount-only effect checks `tutorialSeen` imperatively (same synchronous-`getState()`-on-mount convention as the daily-funnel effect, not hydration-guarded)
- Driven by one cancellable `async runSequence()` (not a reducer — the script is strictly linear) using a `wait(ms)` helper and a `cancelledRef` checked after every `await`. All timings are constants at the top of the file for easy tuning.
- Row rendering reuses `GameBoard.tsx`'s exact idiom (`Tile`/`FlipTile` with real `TileStatus` values) — colours always match the live game, including dark theme and colour-blind mode. Never hardcode tile hex values here.
- **Card layout is static from mount** — the colour legend, "Don't show again" checkbox, and "Got it!" button all render unconditionally on frame one (no `showLegend`/`showEnd` gating, no fade-in). Only tile colours/letters animate progressively; this prevents the card from growing/reflowing mid-sequence.
- Tapping the backdrop calls `skip()` — cancels the sequence and jumps the board straight to its fully-revealed end state (legend/checkbox/button were already visible)
- "Got it!" is tappable at any point, including mid-animation — `handleGotIt()` sets `cancelledRef.current = true` before closing, so it always cancels the running sequence and closes immediately rather than requiring the animation to finish first
- "Got it!" with the checkbox checked sets `tutorialSeen = true`; unchecked, the tutorial fires again next launch
- Replayable from `HelpModal`'s "▶ Watch how to play" button (top of the modal, only rendered when the optional `onWatchTutorial` prop is passed — `app/(tabs)/settings.tsx`'s `HelpModal` instance has no path back to the game screen's tutorial state, so the button is hidden there by design)

## Build Pipeline

**GitHub Actions (primary):** `.github/workflows/build-apk.yml` — trigger via `/release` (or manually from Actions tab).
- Runs the test job first (typecheck + jest) — build only starts if it passes
- Builds APK (`preview`) then AAB (`production`) sequentially
- Creates versioned GitHub Release with both files
- **Release notes are extracted from CHANGELOG.md** — the workflow awk-parses the section under the exact heading `## [x.y.z]` into the GitHub Release body. Keep that heading format, and write CHANGELOG entries to read as user-facing notes.
- Build time: ~45 min; faster with warm Gradle cache
- Requires `EXPO_TOKEN` secret in repo settings

**Download links:**
- `https://github.com/dilippanicker/wordout/releases/latest/download/wordout.apk`
- `https://github.com/dilippanicker/wordout/releases/latest/download/wordout.aab`

**Local artifact copies** (refreshed by /release after a successful build): `releases/wordout-latest.apk` + `releases/wordout-latest.aab` (gitignored). `./make.sh install` additionally installs the APK on a connected device; `./make.sh push` installs the already-downloaded copy without re-fetching.

**Do NOT use local EAS builds** — Java/Gradle environment issues. GitHub Actions is the only supported build path.

## Version Bumping Protocol

Use the global `/release` skill — it reads this section and Build Pipeline, and automates the flow below (propose → confirm → bump → commit/push → `gh workflow run build-apk.yml` → watch → report release links).

Before every build, follow exactly:
1. Read `app.json` for current `version` and `versionCode`
2. Propose bump with reasoning, wait for confirmation:
   > "Ready to build. Proposing v1.2.8 (versionCode 16) — patch: bug fixes. Confirm?"
3. Only after confirmation: update `app.json`, update `CHANGELOG.md`, commit and push

**Rules:**
- `versionCode` always +1 from current. Never skip, never reuse.
- Semver: patch = bug fixes; minor = new features; major = breaking changes
- Never update `app.json` before user confirms
- Never trigger build without confirmed version bump

**Current version:** `1.9.1` (versionCode 43)

## Play Store
- Publisher: Onglipo, package: `com.dilippanicker.wordout`. Play uploads are manual and tracked by the user, not in docs; closed-testing/internal-track history lives in CHANGELOG and TODO.md.
- **Production access granted — Google Play is live** (reapplication after the 2026-07-20 rejection succeeded). Listing: https://play.google.com/store/apps/details?id=com.dilippanicker.wordout. Uploads are still manual.
- Play Services' automatic install/vitals tracking is separate from, and doesn't conflict with, the no-tracking policy (see Monetization).
- **Console advisories deliberately not acted on** (edge-to-edge deprecated APIs = dependency code; orientation/resizability = intentional portrait lock). If Console ever names a class of ours, re-investigate. Detail: REGRESSION_TRAPS.md "Play Store (full)".

## Distribution

- **Web (GitHub Pages):** automated (`deploy-web.yml`, `build-apk.yml`'s `deploy-web` job) → `gh-pages` branch under `/play/`; `keep_files: true` on every deploy step so neither the game build nor the landing page deletes the other. `deploy-web.yml` also publishes `docs/` (landing page, `privacy.html`, `img/`, feature graphic) to the branch root — edit `docs/`, push, it deploys.
- **Card sizing / letterboxing:** web and native ≥600dp render a fixed 430×932 card (`constants/layout.ts`). `shouldLetterbox(w, h)` is the **single source of truth for both `_layout.tsx` and `index.tsx`** — never re-derive it locally. Phones <600dp are unaffected. Below the cap the card draws a 1px theme-matched border. Tests: `__tests__/layout.test.ts`. Native-tablet rendering is web-verified only.
- **itch.io:** project `onglipo/wordout` — **account is `onglipo`, not `dilippanicker`**; butler targets are `onglipo/wordout:<channel>`. Butler installs from `broth.itch.zone` (`.ovh` is retired).
  - **Android:** `build-apk.yml` pushes `./wordout.apk` to `:android` automatically. Never manually `butler push` a differently-named local file — it creates a permanent duplicate download. Stale `wordout-latest.apk` still needs manual deletion on itch.io's Edit Game page.
  - **Web (HTML5):** `deploy-web.yml`'s `deploy-itchio-web` job (or `./make.sh deploy-web`) pushes a root-relative export post-processed by `scripts/itchio-postprocess.py` to `:html5`. Postprocess order matters (`<base href>` before `replaceState()`); also adds `viewport-fit=cover`. Reloading a sub-route 404s (accepted).
  - **Embed settings** (itch.io Edit game, not in git): **430×820**, fullscreen button on — keep ≤ the 430×932 cap so it renders full-bleed; the boundary comes from `app/_layout.tsx`'s `webCard` border.
  - **Fullscreen button overlaps 📊:** `BottomStrip.tsx`'s `isIframeEmbedded` reserves right-padding only while `useWindowDimensions()` is ≤ the card cap. Don't track `document.fullscreenElement` (doesn't cascade into the iframe).
  - Full detail and the failed earlier attempts: REGRESSION_TRAPS.md "Distribution (full)".
- **Store screenshots:** `store-assets/screenshots/` holds the 8 store screenshots (1080×1920, 9:16) used on Play, itch.io and Amazon, built from the untracked, gitignored `store-assets/raw/` originals by `scripts/make-store-screenshots.py` (order and raw filenames are listed in `store-assets/store-shot-list.md`; rerun the script to rebuild).
- **Samsung Galaxy Store / Amazon Appstore:** manual upload. Amazon needs 512×512 and 114×114 icons; `store-assets/amazon/` holds only those icons (screenshots live in `store-assets/screenshots/`). Amazon stopped Appstore updates for Android phones on August 20, 2025, so the Amazon listing reaches Fire tablets and Fire TV only (the live version targets 12 Fire tablet models and no Fire TV devices).
- **Google Play:** live — https://play.google.com/store/apps/details?id=com.dilippanicker.wordout. Uploads are manual; automating them (service account + upload action) is now possible but not done. The "Get it on Google Play" badge (`docs/img/google-play-badge.png`, Google's official asset — never recolor or redraw) is on the README and the landing page.

## Model Selection
- Pattern: `opusplan` session model (Opus plans, Sonnet executes — automatic) + Opus-class advisor + Haiku-pinned Explore agent (`~/.claude/agents/Explore.md`). Set globally in `~/.claude/settings.json`; verify at session start via the `/model` and `/advisor` checkmarks. Rationale and details: `~/repos/claude-workflow/HOWTO.md` Roles section.
- `claude config set advisorModel` does NOT work — the only correct way to enable the advisor is via the `/advisor` command picker in the session. See REGRESSION_TRAPS.md for an unconfirmed note on `settings.json`'s `advisorModel` key.
- Executor handles implementation; advisor engages automatically at key decision points (before writing, before committing to an approach, when stuck, before declaring done). Run `/compact` at 50%+ context.

## Session lifecycle

### Doc sync (drift check)
These must state the same version — checked by the global /open and /close skills; `app.json` is the source of truth:
- `app.json` — `expo.version` + `expo.android.versionCode`
- `CHANGELOG.md` — latest `## [x.y.z]` heading
- `CLAUDE.md` — "Current version" line in Version Bumping Protocol
- `.claude/session-handoff.md` — version referenced in the handoff

### On /open
- Read `.claude/session-handoff.md` for prior session context
- Remind about Model Selection setup (see above)

### On /close
- Overwrite `.claude/session-handoff.md`: files changed, decisions + why, in-progress state, exact next step, gotchas
- Update `TODO.md`: mark completed items ✅ with date, add new items, re-prioritize
- Update `CLAUDE.md` if: new components, changed defaults/behavior, bug fixes affecting usage, new patterns/decisions, or stale info to remove
- Update `CHANGELOG.md`: new entry under current version, format `- [Added/Changed/Fixed/Removed] description`
- Update `README.md` also when word lists change (counts, source), in addition to other user-facing changes
- Commit message convention: `chore: session close — <what changed>`
- **Push policy: commit always; push only when explicitly asked**

## StatsModal Behaviour (v1.4.0+)
- `isQuordle` uses `gameMode === 'quordle'` (see settingsStore rule)
- Daily/Practice tabs are local state (`modalModeTab`), synced imperatively via `useDailyStore.getState()` on `visible → true` — does NOT write back to store
- Difficulty sub-tab (`dailyDiffTab`) similarly synced from `activeDailyDifficulty` on open
- Empty state shown when `totalGames === 0`: daily uses difficulty label ("Easy/Hard/Extreme"), practice uses board name ("Wordout/2-out/…")

## Keyboard Behaviour (`components/Keyboard.tsx`, v1.5.6+)
- `deriveKeyStatuses(guesses)` (single-board) and `deriveQuordleKeyStatuses(guesses, boardIndex)` (n-out, `app/(tabs)/index.tsx`) both fold letter statuses by priority (correct > present > absent). The n-out version takes an explicit `boardIndex` and reads only `guess.boardResults[boardIndex]` — **scoped to the currently active board only, never a union across boards.** Since only one board is visible at a time in n-out mode (unlike Quordle/Octordle showing all boards simultaneously), the keyboard mirrors single-board behavior exactly, keyed off `activeBoard` state. Switching boards (swipe via `onMomentumScrollEnd`, or tapping a `BoardIndicator` dot via `scrollTo(i)`) both update `activeBoard`, so the keyboard re-derives and updates automatically.
- **Enter key is always `'ENTER'` internally** — `keyLabel(key)` maps it to the display glyph `'⏎'` only at render time (`Text` content), so `onKey`/`keyStatuses` lookups keyed on `'ENTER'` stay correct. Do not change the key's functional value to `'⏎'` — see REGRESSION_TRAPS.md (v1.5.5→v1.5.6).
- **No `enterActive` prop** — the green-outline highlight on 5-letter guesses was fully reverted in v1.5.6, including the prop, both call sites, and its styles. Do not re-add it without a fresh explicit request.
- `enterOnRight: boolean` (`settingsStore`, default `false`) — settings label "Swap ⏎ and ⌫ positions". `false` (default) renders `ROWS_ENTER_RIGHT` (⌫ left, ⏎ right — the natural position); `true` renders `ROWS_ENTER_LEFT` (⏎ left, ⌫ right, swapped). Toggle polarity was inverted until v1.5.6 — verify against this description before "fixing" it again.

## Review Prompt (`utils/reviewPrompt.ts`, v1.9.0+)
- Android-only (`expo-store-review`, native module); never on web. `isReviewEligible()` is the pure gate (tested in `__tests__/review-prompt.test.ts`): won, tutorial not showing, `totalWins >= 5`, >= 3 days since `firstLaunchDate`, `reviewPromptCount < 3`, >= 60 days since `lastReviewPromptDate`. `maybeRequestReview()` adds `StoreReview.isAvailableAsync()`, then `requestReview()`, then records count+date. try/catch, fails silently.
- `totalWins` is incremented via `settingsStore.incrementTotalWins()` in all three stores' win paths (`gameStore`, `quordleStore` — full win only, i.e. all boards solved — and `dailyStore`, which does not use `statsStore.recordResult`). A new win path must call it too.
- Fired from `dismissEndGame()` in `index.tsx` (tap and 5s auto-dismiss both route there) via `scheduleReviewAfterWin(status, tutorialGetter, reviewScheduledRef)` (`utils/reviewPrompt.ts`, `REVIEW_DELAY_MS` 1500), only when `activeGameStatus === 'won'`, any mode. **Once per win:** `reviewScheduledRef` is set on the first call and reset when `activeGameStatus` returns to `'playing'` — a tap landing just before the 5s auto-dismiss (~4.7–5.0s) used to run `dismissEndGame` twice and send two requests. The request only happens if the end-game overlay appears (4.2s after a win) and is dismissed; a new game or mode switch first skips it. Tutorial gate reads `showTutorialRef` (mirror of the state) because the call is delayed — a closure over `showTutorial` would be stale.
- **Diagnostics:** `maybeRequestReview` stores `reviewLastOutcome` (`blocked:<gate>` from `reviewBlockedBy()` | `unavailable` | `error:<msg>` | `requested`) + `reviewLastOutcomeDate` in settingsStore. Long-press the version line in Settings (600ms) for a hidden on-device panel with those plus totalWins, firstLaunchDate, reviewPromptCount, lastReviewPromptDate, deviceNow (tap to close). Local only — never send or log it off-device (no-tracking policy).
- No custom pre-prompt and no success message: the API never reports whether the user reviewed. Only works in Play-installed builds; sideloaded APKs (itch.io/GitHub) get `isAvailableAsync() === false` and silently skip. Play's own quota can also suppress the dialog — not verifiable without a Play-installed build.
- Settings footer has an Android-only "Rate Wordout ↗" link to the Play listing.

## Share Behaviour (`app/(tabs)/index.tsx`, v1.5.4+)
- **Share is daily-only** — the share button (in the shared `endGameOverlay`, used by both single-board and n-out layouts) is gated on `isDaily`, hiding it for every practice game including quordle/n-out. Rationale: share is only meaningful when everyone played the same word, which is true only for daily games. Deliberately not gated on the raw `activeWordleMode === 'daily'` flag, since that alone doesn't account for quordle (`isDaily = !isQuordle && activeWordleMode === 'daily'` already handles this correctly).
- `buildQuordleShareText` (n-out share text, currently unreachable via UI per above but kept correct) takes a `difficulty: Difficulty` param and uses `maxGuessesForDifficulty(difficulty, bc)` — never hardcode a guess-count formula here, it must match `quordleStore.maxGuesses`'s derivation exactly. Header format: `` `${name} ${DIFFICULTY_EMOJI[difficulty]} ${count}/${maxGuesses}` ``, e.g. `"3-out 💀 6/6"`.
- `buildShareText` (single-board practice) is also unreachable via UI post-v1.5.4 and intentionally left with its old hardcoded `/6` — do not "fix" it without first reconsidering whether practice share should be visible at all.
- `buildDailyShareText` (daily single-board) was already correct before v1.5.4 — uses `maxGuessesForDifficulty(difficulty, 1)` and includes the difficulty emoji in its label.
