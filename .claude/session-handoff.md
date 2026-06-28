# Session Handoff — 2026-06-28

## What changed this session

### Files modified

**`store/gameStore.ts`** — B2:
- Added `waveShown: boolean` + `setWaveShown(v)` — reset to false in `newGame()`

**`store/dailyStore.ts`** — B2:
- Added `waveShown: boolean` + `setWaveShown(v)` — reset to false in `startOrResumeDaily()`, `resetDailyForToday()`, `checkAndReset()`

**`store/quordleStore.ts`** — B2:
- Added `waveDoneBoards: boolean[]` + `setWaveDone(boardIndex)` — reset to all-false in `newGame()` via `initialState()`

**`components/GameBoard.tsx`** — B2:
- Added `waveShown?: boolean` and `onWaveDone?: () => void` props
- `waveDone` state now initializes from `waveShown` prop and syncs via `useEffect([waveShown])`
- Removed `setWaveDone(false)` from count===0 branch (was causing re-animation on mode switch)
- Wave-done effect calls `onWaveDone?.()` alongside `setWaveDone(true)`
- Added `waveDone` to wave-done effect dependency array (was missing, could cause stale closure)

**`components/BottomStrip.tsx`** — B1, B7, B8:
- Removed `justSolvedInfo` prop entirely
- Added `activeBoardIndex?`, `activeBoardSolved?`, `activeBoardSolvedGuess?` props for B7
- Game-over state: single row `[? for help] [spacer] [📊] [↺ New Game / countdown]` — no stats row
- Playing + active board solved (multi-board): shows persistent "Board N solved in M ✓"

**`components/HelpModal.tsx`** — B5:
- Added ◄ ► triangles entry to TOP_ICON_ROWS (Header section)
- Removed ◄ ► from FOOTER_ICON_ROWS
- Fixed "at the bottom" → "in the header" in MULTI-BOARD MODE section

**`app/(tabs)/index.tsx`** — B2, B3, B4, B6, B7, B9:
- **B2**: Pass `waveShown` + `onWaveDone` to both single-board and multi-board GameBoard instances
- **B3**: Ribbon label changes to `Next word in HH:MM:SS` when `dailyStore.dailyStatus === 'completed'`
- **B4**: `renderHeader` for single-board path receives `isDaily ? dailyStore.dailyDifficulty : difficulty`
- **B6**: `cycleTo` only calls `newGame()` when `n !== prevBc` (quordle board count changes)
- **B7**: Removed `justSolvedInfo` state and effects; compute `activeBoardSolved` + `activeBoardSolvedGuess` from `quordleStore.solvedBoards[activeBoard]`; pass to BottomStrip
- **B8**: Resolved by B1 (stats row removed from footer)
- **B9**: Board indicator — active+solved shows green filled square with ✓; non-active+solved uses circle (as before)
- Removed `prevSolvedBoardsRef` and all `justSolvedInfo` tracking effects

**`app/(tabs)/settings.tsx`** — B6:
- `handleBoardCountSelect`: only calls `newGame()` when `n !== prevBc`

**`app.json`** — version bump:
- `version`: 1.2.4 → 1.2.5
- `versionCode`: 12 → 13

**`CHANGELOG.md`** — new [1.2.5] entry added

---

## Decisions & deviations

- **B2 wave fix approach**: Store-level flags (`waveShown` in gameStore/dailyStore, `waveDoneBoards` in quordleStore) persist across mode switches. Local `waveDone` state syncs from prop via `useEffect` — when mode switches (prop changes to false = new game), local state resets too. This avoids the "daily→practice→daily re-triggers wave" bug.

- **B3 countdown in Ribbon**: When `dailyStore.dailyStatus === 'completed'`, the Ribbon shows `Next word in ${countdown}` inline with 📅 icon — replacing "Today's · Easy". Countdown is still computed every second via the same interval. Footer also shows countdown per B1 (both show it).

- **B4 header difficulty**: Only the single-board renderHeader call gets the effective difficulty. Quordle path unchanged (no daily mode in quordle). This means the header emoji (🐣/💪/💀) accurately reflects the locked daily difficulty when in daily mode.

- **B6 preserve completed board**: The quordle board is only reset when bc changes, not on every mode switch. A completed 4-out game persists through daily→4-out round trip.

- **B7 persistent vs flash**: `justSolvedInfo` (transient flash) replaced entirely by `activeBoardSolved` computed directly from `quordleStore.solvedBoards[activeBoard]`. Footer shows "Board N solved" persistently whenever you're on a solved board (not just for 1 guess after it's solved).

- **B8 stats removed from footer**: Footer no longer shows stats row in game-over state. Stats accessed via 📊 icon (StatsModal).

- **B9 active+solved indicator**: Active board indicator was always a square (with ▶). Now when the active board is solved, it shows a green-filled square with ✓ (matching the spec). Non-active solved boards still show green-filled circle with ✓.

---

## Current state

All 9 bugs and 2 design updates addressed. TypeScript clean (pre-existing new-game.tsx error only). Version bumped to v1.2.5 (versionCode 13). Changes committed.

---

## Exact next steps

1. **Build APK** via GitHub Actions (trigger manually from Actions tab)
2. **Device test** on Samsung S24 Ultra — verify:
   - Ribbon shows "Next word in HH:MM:SS" after daily completion (replaces "Today's · Easy")
   - Footer game-over: single row [? for help] [📊] [↺ New Game] (practice) or [countdown] (daily)
   - No stats row in footer after game ends
   - Ribbon difficulty icon reflects locked daily difficulty (not settingsStore difficulty)
   - Completed 4-out game persists when going daily and back
   - Active board indicator shows ✓ in square when board solved; other solved boards use circles
   - Footer immediately updates to "Board N solved in M ✓" when swiping to solved board
   - Wave animation fires once on solve; revisit → immediate ✓ overlay, no wave
   - Mode switch daily→practice→daily: wave does NOT re-fire on return to daily

---

## Gotchas

- **B3 Ribbon countdown**: The countdown string is computed in index.tsx every second. When daily is completed, the Ribbon label reads from the same `countdown` state. No new effect needed.

- **B7 activeBoardSolvedGuess**: Computed as `boardSolvedAtRow(qGuesses, activeBoard) + 1`. Returns 0 if board not solved (-1 + 1 = 0). BottomStrip uses it only when `activeBoardSolved` is true, so the 0 case is never shown.

- **B6 isGameInProgress**: When user is in daily mode (bc=1), `isGameInProgress()` checks daily store not quordle. A playing quordle game won't trigger the abandon guard when cycling from daily to quordle. This is pre-existing behavior, not introduced by B6 fix.

- **waveDone effect deps**: Added `waveDone` to the deps array of the wave-done effect. This causes the effect to re-run when `waveDone` changes (from prop sync). The `if (!waveDone)` guard prevents the timeout from firing again once waveDone is true. No infinite loop risk.

- **waveShown in dailyStore persist**: `waveShown` is part of the persisted `wordout-daily` store. If user closes and reopens app after solving daily, the wave won't re-fire. This is correct behavior. Old persisted state without `waveShown` will have `undefined` → falsy → wave fires on first load (correct).
