# Session Handoff — 2026-06-28

## What changed this session

### Files modified

**`app/(tabs)/index.tsx`** — Many changes:
- **B1**: Added ↺ New Game button to practice/quordle end-game overlay (`newGameButton` style, `!isDaily` guard)
- **B2**: `handleNewGame()` now checks `dailyStore.dailyStatus === 'completed'` first; shows `systemToast` "Daily solved! Next word in HH:MM:SS" and returns without resetting
- **B3**: Added new `useEffect([isQuordle, isDaily])` that clears any showing overlay and syncs `prevGameStatusRef.current = activeGameStatus` on mode change, preventing stale status transitions from re-firing the end-game popup
- **B6**: Removed `useGameStore.getState().newGame()` from the practice mode icon button (was unintentionally clearing the practice board on every switch from daily → practice)
- **B10**: `cycleTo()` now calls `useQuordleStore.getState().newGame()` when `n > 1`, so switching board count immediately syncs quordleStore.boardCount with the new mode
- **E1**: Removed `setTimeout(clearCurrentGuess, 950)` from the toast effect — invalid words stay in the input row after shake
- **E3**: Added `useStatsStore` + `emptyBoardStats` import; computes `gameStats` object `{ played, winPct, streak, streakEmoji }` for the active mode; passes to both BottomStrip renders
- **E4**: Added `modeIconWithLabel` container + `modeLabel` text (9px green) inside each mode pressable; only shows under the active icon; `WORD_DOTS_H = 44` for single-board (was 36); `modeIconRow` height → 44
- Added `systemToast` state + `systemToastOpacity` shared value + second `Animated.View` in messageArea for system-level toasts
- Added `showSystemToast(msg)` helper function
- Removed unused `clearCurrentGuess` binding and `modeKey` variable

**`components/BottomStrip.tsx`** — State redesign:
- Added `GameStats` interface + `gameStats: GameStats` required prop
- **E2**: State 1 (playing > 0 guesses) changed from "Guess N+1 of M" to "⏳ N tries left · ? for help" (singular "1 try left")
- **E3**: State 3 (game over) changed from "🎯 Solved in X of N / 🎲 Unlucky" to stats row: "{N} played · {M}% win · {emoji} {streak}"
- **B8**: Removed `multiInfo` (`${solvedCount} solved · ${remaining} remaining`) from state 1

**`components/GameBoard.tsx`** — B7 overlay timing:
- Added `solvedTimestampRef` and `lostTimestampRef` (initialized to 0 if already in that state on mount = remount, -1 if not yet)
- Added two effects to track when solved/gameOver first becomes true
- Modified win overlay effect: if `elapsed < waveDuration`, uses `withDelay(waveDuration - elapsed, withTiming(1))` for smooth post-wave appearance; else immediate show (popup dismiss, remount)
- Modified lose overlay effect: same pattern with `shakeDuration = FLIP_DONE_MS + 7*130 + 300 = ~2380ms`

**`components/HelpModal.tsx`** — B13: Added 🔥/⚡ streak explanation entries to `BOTTOM_ICON_ROWS`

**`app/(tabs)/settings.tsx`** — B5, E5:
- B5: Replaced `Alert.alert` with local `diffLockToast` state + `showDiffLockToast()` helper (3s auto-dismiss). Shows "Daily solved! Next word in HH:MM:SS"
- E5: Removed word count pills (`pillRow`, `pill`, `pillText`) from footer; removed `WORD_COUNT_ANSWERS/WORD_COUNT_GUESSES` import
- Added `toastContainer` / `toastPill` / `toastText` styles
- Changed import: removed `Alert`, added `useRef`

**`app.json`** — Bumped `version: "1.2.2"`, `versionCode: 10`

---

## Decisions & deviations

- **B3 approach**: Used a separate `useEffect([isQuordle, isDaily])` to sync `prevGameStatusRef` on mode change, rather than tracking mode in the existing effect. This is cleaner and avoids the race condition where status and mode both change in the same render.
- **B7 approach**: Used `Date.now()` timestamps stored in refs to distinguish "first solve" (add delay) from "popup dismissed" or "remount" (immediate show). `solvedTimestampRef = useRef(solved ? 0 : -1)` — 0 means already solved on mount (immediate show via elapsed=Infinity).
- **B10**: `cycleTo()` always calls `quordleStore.newGame()` when `n > 1`. This is safe because the abandon guard fires first for in-progress games.
- **E3 stats**: `gameStats` is now a required prop on BottomStrip. The parent always computes it via `useStatsStore` (or `dailyStore.stats` for daily mode).
- **E4 height**: `WORD_DOTS_H = 44` replaces `DOTS_H = 36` for single-board tile calculation. Multi-board still uses `DOTS_H = 36`. Mode icon row height changed from 36 → 44 to accommodate the label.
- **The `[Unreleased]` CHANGELOG section** (RV1-RV4 from last session) merged into v1.2.2 since they share the same version tag.

---

## Current state

All 9 bugs (B1, B2, B3, B5, B6, B7, B8, B10, B13) and 5 enhancements (E1, E2, E3, E4, E5) are implemented. TypeScript clean. App renders correctly (verified via screenshot). Version is 1.2.2 (versionCode 10).

---

## Exact next steps

1. **Device test** on Samsung S24 Ultra — verify this session's changes:
   - BottomStrip: "⏳ N tries left · ? for help" while playing
   - BottomStrip: "N played · M% win · ⚡ S 📊" after game ends
   - Mode icon row shows "Practice · Easy" / "Today's · Easy" label
   - Practice overlay shows ↺ New Game button; daily overlay shows countdown only
   - Tapping ↺ New Game on completed daily shows toast (no board reset)
   - Difficulty change on completed daily shows toast (not alert)
   - Settings footer: no word count pills
   - Help modal: 🔥/⚡ streak entries at bottom
   - Arrow cycling ◄ ► immediately shows new board count game
   - Practice board persists when switching to daily and back
2. **Build APK**: `bash build-and-deploy.sh`

---

## Gotchas

- **`WORD_DOTS_H = 44` vs `DOTS_H = 36`**: Single-board now uses `WORD_DOTS_H = 44` in tile sizing; multi-board still uses `DOTS_H = 36`. CLAUDE.md updated accordingly.
- **B3 mode-dismiss on mount**: The `useEffect([isQuordle, isDaily])` runs on initial mount too, which is fine (clears nothing, syncs ref to current status). But if the initial render has a completed game, the overlay doesn't show on mount — correct since `prevGameStatusRef` is initialized to `activeGameStatus` so the status-change effect sees no transition.
- **B10 + B6 interaction**: `cycleTo(1)` (back to Wordout) does NOT call `wordleStore.newGame()` — practice game stays. `cycleTo(n > 1)` calls `quordleStore.newGame()` — quordle board resets to the new board count. This is the intended behavior.
- **E1 implication**: After E1, users must manually backspace invalid words. The `clearCurrentGuess` binding was removed from index.tsx since it was only used for auto-clear.
- **BottomStrip gameStats pre-game**: Even in state 0 (pre-game), `gameStats` is computed but not displayed. First game will show "0 played · 0% win · ⚡ 0" in state 3 after game ends — that's correct since no history yet.
