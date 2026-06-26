# Session Handoff

**Last updated:** 2026-06-26
**Session:** v1.1 — Daily Word mode, header redesign, BottomStrip, StatsModal
**Model:** claude-sonnet-4-6
**Status:** v1.1 code committed (9bc76da). Version bump to v1.1.0 (versionCode 6) proposed but NOT YET applied — awaiting user confirmation before updating app.json.

---

## What was done this session

### New files

**`store/dailyStore.ts`**:
- Persisted to `wordout-daily` via AsyncStorage
- Date-seeded daily word: `getDailyIndex() = floor((Date.now() - DAILY_EPOCH) / 86400000)`, epoch = 2026-01-01
- `getDailyAnswer(language)` → `ANSWERS[language][dailyIndex % length]`
- State: `lastPlayedDate`, `dailyStatus` ('available'|'playing'|'completed'), `dailyGuesses`, `currentGuess`, `dailyAnswer`, `dailySolved`, `dailyHardMode`, `toast`, `stats: BoardStats`, `activeWordleMode: 'daily'|'practice'`
- `checkAndReset()` — resets to 'available' if `lastPlayedDate !== today`
- `startOrResumeDaily()` — no-op if status !== 'available'; picks word, sets playing
- Full game logic: `addLetter`, `removeLetter`, `submitGuess` (evaluateGuess + checkHardModeConstraints duplicated from gameStore — intentional, per "don't touch gameStore schema" rule)
- `resetDailyForToday()` — restart same-day daily (same word) with current hardMode setting
- `resetDailyStats()` — clear daily BoardStats

**`components/StatsModal.tsx`**:
- Modal with close on backdrop tap (inner Pressable uses `onPress={() => {}}` to capture touch)
- Wordout mode (boardCount=1): Daily | Practice tabs via `activeWordleMode`
- Multi-board: practice stats only, no tabs
- Distribution chart, Played/Win%/Streak/Best cells
- Reset Stats button (confirms in nested Modal, resets both statsStore AND dailyStore.stats)

**`components/BottomStrip.tsx`**:
- Height 50px (= TAB_H), sits at bottom of SafeAreaView
- State 1 (playing): "Guess N+1 of M [· X solved · Y remaining]" + 📊 icon
- State 2 (multi-board board just solved, still playing): "Board X solved in N ✓ | 🏆 Best: M" + 📊
- State 3 (game over practice): stats chips (Played, Win%, ⚡N) + Share button + 📊
- State 3 (game over daily): stats chips (Played, Win%, 🔥N) + 📊 (no Share button)
- `shareConfirmed` prop: changes Share button to "Copied ✓" when true
- `getPersonalBest(stats)` → min guess count with at least 1 win

### Modified files

**`app/(tabs)/_layout.tsx`** — gutted to 8 lines:
- All three tabs hidden via `tabBarStyle: { display: 'none' }`
- Removed all mode cycling logic (moved to index.tsx)
- Removed settingsBadge from layout (badge logic gone with stats in settings)

**`app/(tabs)/index.tsx`** — major overhaul:
- New imports: `useRouter`, `useStatsStore`, `useDailyStore`, `getDailyIndex`, `BottomStrip`, `StatsModal`, `BOARD_COUNTS`, `BoardCount`
- `isQuordle` and `isDaily` derived; all actions (addLetter/removeLetter/submitGuess/toast/clearToast) routed to correct store
- `activeGameStatus` unified: quordle → quordleStore.gameStatus; daily → derived from dailyStatus; practice → wordleStore.gameStatus
- `buildDailyShareText()` for daily share format "Wordout Daily #N — solved/failed in X/6"
- Countdown helpers: `msUntilMidnight()` + `msToHMS()`, updated every 1s via setInterval
- `dailyStore.checkAndReset()` called in `useFocusEffect` (daily reset on new day)
- `startOrResumeDaily()` called in effect when `isDaily === true`
- `justSolvedInfo` tracked via `solvedBoardsKey` dependency (`.join(',')`)
- Mode cycling functions `cycleTo/cyclePrev/cycleNext` moved from _layout.tsx to here
- New `handleNewGame`: routes to `resetDailyForToday` (daily), `wordleStore.newGame()` (practice), or `quordleStore.newGame()` (quordle)
- Header redesign: left [🇺🇸/🇬🇧 💪/🐣 ↺] center [‹ mode ›] right [🌙 ⚙ ?]
- Hard mode icon changed 🔥 → 💪 (🔥 reserved for daily streak per spec §7)
- Single-board indicator row (DOTS_H=36): 📅 (left) | ▶ (center, green) | ∞ (right)
- `wordleAvailH` now subtracts DOTS_H (36px) for single-board tile sizing
- messageArea is now toast-only (result text and progress text removed)
- End-game overlay: daily mode doesn't auto-dismiss, shows "Next daily in HH:MM:SS"
- Daily overlay Share button doesn't dismiss overlay (user keeps seeing countdown)
- BottomStrip and StatsModal rendered in both quordle and wordle layouts

**`app/(tabs)/settings.tsx`** — stats section removed:
- Removed STATISTICS row (totalGames, winPct, streak, max)
- Removed GUESS DISTRIBUTION chart
- Removed Reset confirmation Modal
- Removed `useState`, `useFocusEffect`, `useStatsStore`, `Modal` imports
- Removed `StatCell`, `DistBar` sub-components and all stats-related styles
- Game Mode, Word List, Preferences, Version sections unchanged

**`utils/abandon.ts`** — daily mode added:
- `isGameInProgress()` now checks `activeWordleMode === 'daily'` for single-board:
  - daily → `dailyStatus === 'playing' && dailyGuesses.length > 0`
  - practice → existing `wordleStore` check

---

## Decisions and deviations

- **Hard mode emoji 🔥 → 💪**: Spec §7 says 🔥 is daily streak ONLY. Existing header used 🔥 for hard mode, which would conflict. Changed to 💪. HelpModal still uses 🔥 for hard mode (per §8 "don't change help modal"), creating a minor inconsistency, but unavoidable.
- **Reset Stats resets daily too**: StatsModal reset calls both `resetStats()` (statsStore) and `resetDailyStats()` (dailyStore). Spec didn't say which, but resetting only one while showing both would be confusing.
- **Daily overlay doesn't auto-dismiss**: Spec shows countdown in the overlay. Auto-dismiss would cut the countdown short. Practice/quordle still auto-dismiss after 3s.
- **`wordleAvailH` now subtracts DOTS_H**: Added the 36px indicator row to single-board layout. Tile sizing fallback updated to account for this. Measured height (onLayout) handles actual sizing.
- **`activeWordleMode` in dailyStore (not settingsStore)**: Spec §8 says don't change settingsStore schema. New field goes in the new dailyStore.
- **evaluateGuess/checkHardModeConstraints duplicated in dailyStore**: Per §8 "don't touch gameStore schema". These are private functions in gameStore.ts — duplicated in dailyStore rather than exported.
- **settingsBadge removed from _layout**: The badge was tied to stats in settings. Stats moved to StatsModal. Badge logic would need rethinking; removed for now.

---

## Current state

All changes committed at 9bc76da. **Version bump NOT applied yet** — awaiting confirmation.

Proposed: **v1.1.0 (versionCode 6)** — minor release (new user-visible features).

---

## Exact next step

1. User confirms v1.1.0 (versionCode 6) → update app.json + CHANGELOG.md
2. Run TypeScript check one more time after version bump: `npx tsc --noEmit`
3. Test on device / web:
   - Daily mode: tap 📅, play a game, check countdown overlay, share
   - Practice mode: tap ∞, verify practice game still works
   - ‹/› header arrows cycle modes with abandon guard
   - ↺ header new game button works
   - ⚙ navigates to settings
   - 📊 opens StatsModal
   - BottomStrip shows correct state in all 3 states
   - Multi-board: State 2 flash on board solve
4. Trigger GitHub Actions build

---

## Gotchas for next session

- **`FLIP_DONE_MS = 1170ms`**, **`WAVE_STAGGER = 80ms`** — animation constants in GameBoard.tsx (unchanged from v1.0.4)
- **`countRef` must stay AFTER `const count = ...`** — TDZ fix, don't move
- **`activeWordleMode` starts as 'practice'** — daily mode only activates on tap/switch
- **Daily overlay doesn't auto-dismiss** — this is intentional for the countdown
- **Tab bar is fully hidden** — navigation still works via Expo Router tabs, but UI is driven by index.tsx header and BottomStrip
- **settingsBadge removed** — the badge dot on settings tab no longer appears. This is a regression from v1.0, acceptable since stats moved out of settings.
- **`justSolvedInfo` cleared when gameStatus !== 'playing'** — prevents stale State 2 display after game ends
- **Hard mode lock in daily**: once `dailyStatus === 'playing'`, changing `hardMode` (global setting) doesn't affect the current daily game (it uses `dailyHardMode` stored at game start). Tapping 💪/🐣 during daily just changes the global setting for future games.
- **Reset Stats in StatsModal** resets BOTH `useStatsStore.byMode` AND `useDailyStore.stats`
- **EAS free tier** exhausted until July 1, 2026 — use GitHub Actions
- **versionCode is 5** (v1.0.4). Next build needs versionCode 6.
