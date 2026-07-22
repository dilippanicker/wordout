# Wordout — React Native (Expo)

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

---

## Screen Zone Naming Convention
- **Header** — top bar: 🇬🇧 🐣 ↺ | ◄ Wordout ► | ☽ ⚙ ?
- **Ribbon** — 📅 🎮 icons + board indicators + contextual status (next word countdown etc)
- **Board** — tile grid
- **Keyboard** — on-screen keyboard
- **Footer** — ⏳ tries left / new game button / 📊 stats

---

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
- `maxGuessesForDifficulty(difficulty, boardCount)` — extreme = `max(3,(5+boardCount)−2)`, else boardCount===1 ? 6 : min(13,5+boardCount)
- `boardCountName(n)` → `'Wordout'|'2-out'|'3-out'|'4-out'|'6-out'|'8-out'`
- **Never use `boardCount > 1` to detect multi-board mode** — use `gameMode === 'quordle'`. `boardCount` starts at 4 so `boardCount > 1` is always true for users who never visited multi-board mode.

**`gameStore.ts`** — practice 1-out logic:
- `waveShown: boolean` — wave-shown flag; reset in `newGame()`
- `celebrationShown: boolean` — celebration popup shown flag; reset in `newGame()`
- `clearCurrentGuess()` — not auto-called; user backspaces manually after shake

**`quordleStore.ts`** — multi-board logic:
- `waveDoneBoards: boolean[]` — per-board wave flags
- `celebrationShown: boolean` — end-game popup shown flag; saved/restored in snapshots
- `snapshots: Record<number, QuordleSnapshot>` — in-memory per-board-count state (NOT persisted)
- `switchBoardCount(n)` — saves current state to snapshot (incl. celebrationShown), restores n if previously visited
- `newGame()` — clears snapshot for current bc, starts fresh

**`dailyStore.ts`** — persisted (`wordout-daily`, version 2):
- `DAILY_EPOCH = new Date('2026-01-01').getTime()`
- `games: { easy, hard, extreme }` — each a `DailyGameState` with `status`, `guesses`, `currentGuess`, `solved`, `waveShown`, `celebrationShown`, `lastWinDate`, `stats`
- `dailyAnswers: { easy, hard, extreme }` — per-difficulty answers, set together on first daily start of the day via UTC-midnight seed (`Math.imul(dayMs, 2654435761)`, bit-shifted indices 0/1/2)
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

Three independent daily games run each day — Easy, Hard, Extreme — each with a different word:

**Per-difficulty state (`dailyStore.ts`)**:
- `games.{easy|hard|extreme}` — independent `DailyGameState`: status, guesses, currentGuess, solved, waveShown, celebrationShown, lastWinDate, streak, stats
- Stats per-difficulty, shown in sub-tabs (🐣/💪/💀) within the Daily tab of StatsModal
- Streaks tracked independently via `lastWinDate`; missed-day detection fires in `checkAndReset()`

**Word selection**:
All three words computed atomically on first daily start via `dailyIndices(dayNum, n)` — a mulberry32 PRNG seeded per UTC day, sampled with reject-duplicate until 3 distinct indices are drawn from the full `[0, n)` range of that language's answer list. All three set in one call to `startOrResumeDailyGame`. Fixed in v1.5.8 (previously a bit-masked derivation that collided ~8 days/decade and capped indices at 2047 — see CHANGELOG). No cutover-date gating was needed for the fix: `dailyAnswers` is computed once per day and persisted, so an in-progress day keeps its already-computed word (old or new algorithm) and only future days see the new derivation — same-day cross-version consistency was never a requirement here (no historical word display, share text never reveals the word).

**Day boundary is UTC everywhere, not local calendar day** — `getTodayString()`/`getYesterdayString()` (`dailyStore.ts`, drive `checkAndReset()`/`lastPlayedDate`/`lastWinDate`) and the countdown (`msUntilMidnight()`, `app/(tabs)/index.tsx`) all key off UTC date components, matching `getDailyAnswers()`'s UTC-midnight derivation. Before this fix they used local time: for any timezone ahead of UTC (e.g. IST +5:30), local midnight arrives before real UTC midnight, so `checkAndReset()` fired early during that gap and the freshly-reset game reused `getDailyAnswers()`'s still-previous-UTC-day word — the daily word appeared to repeat across two consecutive local days. Regression test: `__tests__/store-invariants.test.ts` "day boundary is UTC, not local" (sets `TZ=Asia/Kolkata`, fails against the pre-fix local-time implementation).

**Accessible-list gate**:
Build reachable difficulty list before each cycle step:
1. Easy — always included
2. Hard — included if Easy is `'completed'` OR Hard is already `'playing'`/`'completed'`
3. Extreme — included if Hard is `'completed'` OR Extreme is already `'playing'`/`'completed'`

Cycle (m = highest reachable index): header difficulty emoji taps through this list only. NO gate toasts, NO "Win X first" messages.

**Peek animation**: After the win overlay dismisses (first win only), the header emoji briefly scales toward the next difficulty emoji (🐣→💪 or 💪→💀) then snaps back. Only fires when the next difficulty is newly unlocked.

**Play Now button**: After winning Easy (if Hard is `'available'`) or Hard (if Extreme is `'available'`), the footer shows "💪 Unlocked! Play Now" or "💀 Unlocked! Play Now". Tapping starts the next difficulty immediately.

**Startup funnel**: On app mount, automatically routes to next unplayed difficulty: Easy not started → Easy; Easy won + Hard not started → Hard; Hard won + Extreme not started → Extreme; else restore persisted `activeWordleMode` + `activeDailyDifficulty`.

### Key Design Decisions (locked)

**Daily mode (v1.4.0)** — decisions; see "Daily Gate Architecture" above for mechanics:
- Three independent daily games per day, each a different word
- Gate via accessible-list cycling only — no gate toasts, no "Win X first" messages
- Footer surfaces a "Play Now" button for a newly-unlocked difficulty
- Peek animation previews the next difficulty right after a win
- Streaks and missed-day detection tracked independently per difficulty
- Stats modal has per-difficulty sub-tabs
- Startup funnels to the next unplayed difficulty

**Practice mode:**
- Unlimited games, freely change difficulty — snapshot-based (no lock, no confirm dialog)
- `gameStore.switchDifficulty(d)` saves current state under current difficulty key, restores snapshot for new difficulty or starts fresh — mirrors quordleStore.switchBoardCount
- Board state persists on mode switch — only ↺ New Game clears (also clears snapshots)

**Never clear rule:**
- Games never auto-cleared without explicit user action (↺ New Game)
- Abandon guard on: New Game, mode arrows (◄►), language change
- Difficulty change in practice: no confirm, snapshot-based (no data lost)

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
- Playing: `[⏳ N tries left · ? for help] [📊]`
- Game over (practice): `[? for help] [↺ New Game (green)] [📊]`
- Game over (daily, next unstarted): `[? for help] [💪 Unlocked! Play Now (green)] [📊]`
- Game over (daily, all done or gated): `[? for help] [📊]` (countdown in Ribbon)

**Emoji convention (strict):**
- 🐣 easy, 💪 hard, 💀 extreme
- 🔥 daily streak, ⚡ practice streak, 🏆 personal best
- 📅 daily mode, 🎮 practice mode

**App name:** Wordout (not WordOut, not WORDOUT)
**Mode names:** Wordout, 2-out, 3-out, 4-out, 6-out, 8-out

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
- Quordle: lock if game complete (toast); confirmAbandon if in-progress; resets board on change. Both the confirmAbandon path and the fresh-board (no guesses yet) path in `handleDifficultyToggle()` must call `useQuordleStore.getState().newGame()` after `setDifficulty()` — `quordleStore.maxGuesses` (and thus rendered row count) is only recomputed inside `newGame()`, not derived live like single-board's. Fixed in v1.5.9 (previously the fresh-board path skipped the `newGame()` call, so the board kept the old difficulty's row count until a manual New Game).

### Abandon guard — `utils/abandon.ts`
`isGameInProgress()` reads stores imperatively. Checks guesses submitted, not just game state existence.
`confirmAbandon(onConfirm)` — `Alert.alert` on Android/iOS, `window.confirm` on web.

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

---

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

---

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

**Current version:** `1.5.11` (versionCode 33)

---

## Play Store
- Publisher: Onglipo, package: `com.dilippanicker.wordout`
- v1.5.8 (versionCode 30) live on closed testing (released Jul 9 2026), 19 testers invited / ~12 opted in / 8 downloaded
- **Production access application rejected 2026-07-20** — Google requires 12+ testers opted-in continuously for 14 days; the dashboard showed only "1 day" of continuity despite ~12 days of believed compliance since Jul 9. Root cause unconfirmed (support ticket pending) — two candidates: insufficient tester engagement (opted-in ≠ actually opening the app), or an unexplained Play Console reset. See `.claude/session-handoff.md` session 24 for full investigation notes.
- Google Play Services/Play Store tracks install, open, vitals, and update-adoption automatically for every Play-installed app with zero app-side instrumentation — this is separate from and doesn't conflict with the app's no-tracking policy (see Monetization above)
- Upload/release status tracked manually until release — not maintained in docs

---

## Distribution

- **Web (GitHub Pages):** automated — `deploy-web.yml` (push to main) and `build-apk.yml`'s `deploy-web` job (after a manual build) both export and deploy to the `gh-pages` branch, under `/play/` so the existing landing page + Play Store privacy policy at the Pages root are untouched (`keep_files: true`).
- **itch.io — Android (APK):** automated — `build-apk.yml` pushes `./wordout.apk` via `butler` to the `:android` channel after every build (`ITCHIO_API_KEY` secret). Users sideload; itch.io hosts it as a plain file, no browser execution involved.
- **itch.io — Web (HTML5): unblocked, automated.** `deploy-web.yml`'s `deploy-itchio-web` job (push to main) exports a *separate, root-relative* web build (baseUrl unset, unlike the GitHub Pages export), post-processes it with `scripts/itchio-postprocess.py`, and pushes to the `:html5` channel via `butler` (`ITCHIO_API_KEY` secret). `./make.sh deploy-web` does the same locally for manual pushes.
  - The blocker was real (Expo Router has no supported hash-based or dynamic-subpath routing — confirmed by reading the installed `expo-router` source and cross-checking upstream: [expo/expo#27163](https://github.com/expo/expo/issues/27163), [expo/router#165](https://github.com/expo/router/issues/165)), and itch.io assigns a new CDN path on every upload with no stable prefix to hardcode. The fix doesn't touch app code: the postprocess script injects a boot-time `<script>` into the exported `index.html` that pins an explicit `<base href>` to the real (unknown-until-runtime) CDN directory — so relative asset loads stay correctly anchored — and *then* normalizes `window.location` to `/` via `history.replaceState()` so Expo Router's initial route match succeeds. Order matters: doing the `replaceState()` first (the obvious first attempt) breaks asset loading instead, because it also moves `document.baseURI`, which relative references resolve against. Verified locally against a simulated nested CDN path: clean boot, correct asset loads, and round-trip client-side navigation to Settings and back (Wordout is not single-screen — `/settings` is a real `router.navigate()`'d route).
  - **Caveat:** a manual page reload while on a sub-route (e.g. `/settings`) issues a real request the CDN can't serve and 404s for real. Inherent to any client-routed SPA on a static host without server-side rewrite rules, not itch.io-specific, and not fixable client-side. Acceptable given itch.io embeds games in an iframe with no reload affordance exposed to players.
- **Samsung Galaxy Store:** manual upload for now, automate later.
- **Amazon Appstore:** manual upload for now, automate later.
- **Google Play:** manual upload for now — automate after production access is granted (API access unlocks then; see Play Store section above for the pending rejection).

**Manual steps required before the workflows above will actually run/deploy successfully:**
1. Create the `wordout` project on itch.io at `itch.io/game/new` (unconfirmed whether this has been done yet)
2. ✅ API key generated and `ITCHIO_API_KEY` added to GitHub repo secrets
3. ✅ GitHub Pages source flipped from `main:/docs` to the `gh-pages` branch — live and verified (`gh-pages` was seeded with the prior `docs/index.html` + `docs/privacy.html` first, so the Play Store privacy policy URL didn't change)

---

## Model Selection

Pattern: `opusplan` session model (Opus plans, Sonnet executes — automatic) + Opus-class advisor + Haiku-pinned Explore agent (`~/.claude/agents/Explore.md`). Set globally in `~/.claude/settings.json`; verify at session start via the `/model` and `/advisor` checkmarks. Rationale and details: `~/repos/claude-workflow/HOWTO.md` Roles section.

**Implementation delegation:** well-specified, low-complexity tasks (see `~/.claude/agents/haiku-implementer.md`) may be delegated to Haiku per the global CLAUDE.md "Model Delegation" section. Returned diffs get reviewed against this project's own `/review` command before being accepted — not the generic fallback checklist, since `/review` already covers the failure modes that matter here (persist-version bumps, hardMode constraints, abandon guard).

**Important:** `claude config set advisorModel` does NOT work — the only correct way to enable the advisor is via the `/advisor` command picker in the session. Note: `~/.claude/settings.json` currently has `"advisorModel": "opus"` set, and `advisor()` calls in the 2026-07-08 session returned substantive, independent-seeming analysis — this note may be stale, but wasn't rigorously re-tested (didn't compare behavior with the key removed), so treat as unconfirmed rather than fixed.

Executor handles implementation; advisor engages automatically at key decision points (before writing, before committing to an approach, when stuck, before declaring done). Run `/compact` at 50%+ context.

---

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

---

## StatsModal Behaviour (v1.4.0+)
- `isQuordle` uses `gameMode === 'quordle'` (see settingsStore rule)
- Daily/Practice tabs are local state (`modalModeTab`), synced imperatively via `useDailyStore.getState()` on `visible → true` — does NOT write back to store
- Difficulty sub-tab (`dailyDiffTab`) similarly synced from `activeDailyDifficulty` on open
- Empty state shown when `totalGames === 0`: daily uses difficulty label ("Easy/Hard/Extreme"), practice uses board name ("Wordout/2-out/…")

## Keyboard Behaviour (`components/Keyboard.tsx`, v1.5.6+)
- `deriveKeyStatuses(guesses)` (single-board) and `deriveQuordleKeyStatuses(guesses, boardIndex)` (n-out, `app/(tabs)/index.tsx`) both fold letter statuses by priority (correct > present > absent). The n-out version takes an explicit `boardIndex` and reads only `guess.boardResults[boardIndex]` — **scoped to the currently active board only, never a union across boards.** Since only one board is visible at a time in n-out mode (unlike Quordle/Octordle showing all boards simultaneously), the keyboard mirrors single-board behavior exactly, keyed off `activeBoard` state. Switching boards (swipe via `onMomentumScrollEnd`, or tapping a `BoardIndicator` dot via `scrollTo(i)`) both update `activeBoard`, so the keyboard re-derives and updates automatically.
- **Enter key is always `'ENTER'` internally** — `keyLabel(key)` maps it to the display glyph `'⏎'` only at render time (`Text` content), so `onKey`/`keyStatuses` lookups keyed on `'ENTER'` stay correct. Do not change the key's functional value to `'⏎'` — v1.5.5 did this and it broke submit (the glyph got typed as a literal character); fixed in v1.5.6.
- **No `enterActive` prop** — the green-outline highlight on 5-letter guesses (added v1.5.3) was fully reverted in v1.5.6, including the prop, both call sites, and its styles. Do not re-add it without a fresh explicit request.
- `enterOnRight: boolean` (`settingsStore`, default `false`) — settings label "Swap ⏎ and ⌫ positions". `false` (default) renders `ROWS_ENTER_RIGHT` (⌫ left, ⏎ right — the natural position); `true` renders `ROWS_ENTER_LEFT` (⏎ left, ⌫ right, swapped). Toggle polarity was inverted until v1.5.6 — verify against this description before "fixing" it again.

## Share Behaviour (`app/(tabs)/index.tsx`, v1.5.4+)
- **Share is daily-only** — the share button (in the shared `endGameOverlay`, used by both single-board and n-out layouts) is gated on `isDaily`, hiding it for every practice game including quordle/n-out. Rationale: share is only meaningful when everyone played the same word, which is true only for daily games. Deliberately not gated on the raw `activeWordleMode === 'daily'` flag, since that alone doesn't account for quordle (`isDaily = !isQuordle && activeWordleMode === 'daily'` already handles this correctly).
- `buildQuordleShareText` (n-out share text, currently unreachable via UI per above but kept correct) takes a `difficulty: Difficulty` param and uses `maxGuessesForDifficulty(difficulty, bc)` — never hardcode a guess-count formula here, it must match `quordleStore.maxGuesses`'s derivation exactly. Header format: `` `${name} ${DIFFICULTY_EMOJI[difficulty]} ${count}/${maxGuesses}` ``, e.g. `"3-out 💀 6/6"`.
- `buildShareText` (single-board practice) is also unreachable via UI post-v1.5.4 and intentionally left with its old hardcoded `/6` — do not "fix" it without first reconsidering whether practice share should be visible at all.
- `buildDailyShareText` (daily single-board) was already correct before v1.5.4 — uses `maxGuessesForDifficulty(difficulty, 1)` and includes the difficulty emoji in its label.
