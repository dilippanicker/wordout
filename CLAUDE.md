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

### Daily Gate Architecture (v1.4.0)

Three independent daily games run each day — Easy, Hard, Extreme — each with a different word:

**Per-difficulty state (`dailyStore.ts`)**:
- `games.{easy|hard|extreme}` — independent `DailyGameState`: status, guesses, currentGuess, solved, waveShown, celebrationShown, lastWinDate, streak, stats
- Stats per-difficulty, shown in sub-tabs (🐣/💪/💀) within the Daily tab of StatsModal
- Streaks tracked independently via `lastWinDate`; missed-day detection fires in `checkAndReset()`

**Word selection**:
All three words computed atomically on first daily start via UTC-midnight seed: `Math.imul(dayMs, 2654435761)` bit-shifted by indices 0/1/2. Guarantees different words per difficulty; all three set in one call to `startOrResumeDailyGame`.

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

**Daily mode (v1.4.0):**
- Three independent daily games per day: Easy, Hard, Extreme — different word for each
- Gate mechanic (accessible-list): cycle through reachable difficulties only. Build list: Easy always; add Hard if Easy won; add Extreme if Hard won. Also include any difficulty already in 'playing'/'completed' state. Wrap within that list — NO gate toasts, NO "Win X first" messages.
- Footer "Play Now" button: after winning Easy, shows "💪 Unlocked! Play Now" if Hard not started; after winning Hard, shows "💀 Unlocked! Play Now" if Extreme not started
- Peek animation: after win overlay dismisses, header difficulty emoji briefly scales to next difficulty (🐣→💪 or 💪→💀) and back
- Three independent daily streaks with missed-day detection via `lastWinDate`
- Stats modal: per-difficulty sub-tabs (🐣/💪/💀) inside the Daily tab
- Startup funnel: on mount, routes to next unplayed difficulty (Easy if not started; Hard if Easy won; Extreme if Hard won; else restore persisted)

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

### Animation sequence (locked design)

**Four animation types:**
1. **Fill (flip):** tiles reveal colours on guess submit. Always fires on every new guess. Never suppress.
2. **Wave:** solved-board tiles bounce. Fires ONCE on first solve via `waveShown`/`waveDoneBoards` flags.
3. **Celebration overlay:** full-screen "Solved!" / "Better luck next time" popup. Fires ONCE via `celebrationShown` flag.
4. **Final state:** `✓`/`✗` dim overlay on board. Always visible on completed boards, no animation.

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
- Quordle: lock if game complete (toast); confirmAbandon if in-progress; resets board on change.

### Startup logic (v1.4.0)
On app mount:
1. `checkAndReset()` — ensure daily state is current
2. Funnel to next unplayed daily difficulty:
   - Easy `'available'` → open daily Easy
   - Easy `'completed'` + Hard `'available'` → open daily Hard
   - Hard `'completed'` + Extreme `'available'` → open daily Extreme
   - Otherwise → restore persisted `activeWordleMode` + `activeDailyDifficulty`

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

**GitHub Actions (primary):** `.github/workflows/build-apk.yml` — trigger manually from Actions tab.
- Builds APK (`preview`) then AAB (`production`) sequentially
- Creates versioned GitHub Release with both files
- Build time: ~45 min; faster with warm Gradle cache
- Requires `EXPO_TOKEN` secret in repo settings

**Download links:**
- `https://github.com/dilippanicker/wordout/releases/latest/download/wordout.apk`
- `https://github.com/dilippanicker/wordout/releases/latest/download/wordout.aab`

**Do NOT use local EAS builds** — Java/Gradle environment issues. GitHub Actions is the only supported build path.

---

## Version Bumping Protocol

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

**Current version:** `1.5.3` (versionCode 25)

---

## Play Store
- Publisher: Onglipo, package: `com.dilippanicker.wordout`
- Internal + closed testing live, 12/12 testers opted in
- Production access: ~July 10 2026
- Last uploaded: versionCode 4 (v1.0.3) — upload v1.2.7 AAB next
- See `docs/playstore.md` for setup checklist

---

## v1.3.0 Features

### Haptic Feedback
- Uses `expo-haptics` (built into Expo, no new dependency)
- **Warning notification** on invalid word or hard mode violation (unified via toast system in `index.tsx`)
- **Medium impact** on correct guess (green tiles) — fires after `FLIP_DONE_MS` in `GameBoard`
- **Success notification** on game win (celebration overlay in `index.tsx`)
- Gracefully degrades on web (no-op)

### Tap Tile to Clear Rightward
- Filled tiles in current guess are pressable (via `Tile` component's `onPress` prop)
- Tap clears tile at position + all tiles to the right: `setCurrentGuess(guess.slice(0, col))`
- New `setCurrentGuess` method added to all three game stores (gameStore, quordleStore, dailyStore)
- Works in single-board (Wordout), multi-board (Quordle), and daily modes
- Cursor position implicit: new guess length determines where typing resumes

### Board Indicators
- Extracted to `components/BoardIndicator.tsx` (static rendering)
- Initially implemented scale pop (1.0 → 1.1 → 1.0) + 500ms color animations
- **Decision:** Reverted to static rendering — at 24×24px size, animations imperceptible even with pop effect
- Static indicators clean, immediate visual feedback sufficient

---

## Model Selection

CC uses Haiku as executor with Opus as advisor. Set up once at session start:

1. `/model` → select `claude-haiku-4-5-20251001`
2. `/advisor` → select `Opus 4.8` and confirm it shows a checkmark

**Important:** `claude config set advisorModel` does NOT work — the only correct way to enable the advisor is via the `/advisor` command picker in the session. The advisor means Opus is consulted automatically at key moments (before writing, before committing to an approach, when stuck, before declaring done). No manual model switching needed.

Cost awareness: Haiku as executor keeps costs low; Opus advisor only engages when needed. Run `/compact` at 50%+ context.

---

## Known Issues
- `CECIL` in GB answers list — proper noun (name), violates word list rules; needs removal from `assets/wordlists/answers_en_us/gb.json`
- `DAILY_PROGRESSION` export in `constants/helpContent.ts` — unused, ready for HelpModal wiring

## StatsModal Behaviour (v1.4.0+)
- `isQuordle` uses `gameMode === 'quordle'` only — never `boardCount > 1` (default is 4)
- Daily/Practice tabs are local state (`modalModeTab`), synced imperatively via `useDailyStore.getState()` on `visible → true` — does NOT write back to store
- Difficulty sub-tab (`dailyDiffTab`) similarly synced from `activeDailyDifficulty` on open
- Empty state shown when `totalGames === 0`: daily uses difficulty label ("Easy/Hard/Extreme"), practice uses board name ("Wordout/2-out/…")

## Keyboard Behaviour (`components/Keyboard.tsx`, v1.5.3+)
- `deriveKeyStatuses(guesses)` (single-board) and `deriveQuordleKeyStatuses(guesses, boardIndex)` (n-out, `app/(tabs)/index.tsx`) both fold letter statuses by priority (correct > present > absent). The n-out version takes an explicit `boardIndex` and reads only `guess.boardResults[boardIndex]` — **scoped to the currently active board only, never a union across boards.** Since only one board is visible at a time in n-out mode (unlike Quordle/Octordle showing all boards simultaneously), the keyboard mirrors single-board behavior exactly, keyed off `activeBoard` state. Switching boards (swipe via `onMomentumScrollEnd`, or tapping a `BoardIndicator` dot via `scrollTo(i)`) both update `activeBoard`, so the keyboard re-derives and updates automatically.
- `Keyboard` accepts `enterActive?: boolean` — when true, the `ENTER` key overrides its normal status styling with a green outline (`borderWidth: 2, borderColor: '#5BA75A'`, transparent background) and green text, instead of the app's usual filled "correct" tile green (`#6aaa64`) — a deliberate distinct color, not reused from `keyBg`'s `'correct'` case. Callers pass `enterActive={currentGuess.length === 5}` (or `qCurrent.length === 5` for n-out) — wire this at every `<Keyboard>` call site if new ones are added.
