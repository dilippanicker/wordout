# Session Handoff — 2026-06-29

## Files modified

### `components/GameBoard.tsx`
- Added `useCallback` to React import
- Added `runOnJS` to react-native-reanimated import
- `BounceTile`: added `onDone?: () => void` prop; `withSpring` now receives a worklet callback `(finished?: boolean) => { 'worklet'; if (finished) runOnJS(onDone)(); }` — fires on the JS thread when the spring settles
- `GameBoard`: added `onWaveDoneRef` (ref keeping latest `onWaveDone` prop); added `stableHandleWaveDone` (`useCallback([], [])` — stable reference, reads `onWaveDone` via ref, guards with `waveSentRef`, calls `setWaveDoneLocal(true)` + `onWaveDoneRef.current?.()`)
- Wave rendering: `tiles.map` now computes `isLastTile = row === count - 1 && col === COLS - 1`; passes `stableHandleWaveDone` as `onDone` only to the last tile (longest-delay tile — rightmost tile of last solved row)
- Removed premature `onWaveDone?.()` call at wave START from the wave-timer useEffect
- Removed `setTimeout(() => setWaveDoneLocal(true), totalMs)` — replaced by animation callback
- Simplified wave-timer useEffect to revisit-path only (no more timer management)

## Root cause of bug fixed

`onWaveDone` was called at wave start (immediately when the useEffect detected the solve condition). The parent (`index.tsx`) uses `onWaveDone` to persist `waveShown` to the store. Some downstream logic (overlay timing, parent state) keyed off this signal. On large boards (8-out), the wave lasts ~4800ms but the end-game popup delay was only 4200ms — if the popup was dismissed early while the wave was still playing, `overlayLocked` dropped to false and the ✓ overlay appeared while the wave was ongoing.

## Decision: `runOnJS` in spring callback, not setTimeout

User explicitly required "no fixed delay" and "use the animation's withTiming completion callback or runOnJS." The `withSpring` callback in Reanimated fires at true animation completion (when the spring physically settles), regardless of board count. This is more accurate than any computed `totalMs` estimate, especially for variable board counts.

The last tile is `row=count-1, col=COLS-1` — always has the highest delay value (`FLIP_DONE_MS + (count*COLS - 1) * WAVE_STAGGER`), so its spring completion is the true wave end.

`stableHandleWaveDone` is stable via `useCallback([], [])` so `BounceTile`'s `useEffect([], [])` captures the correct function at mount. `onWaveDone` prop is read at call time via `onWaveDoneRef` to avoid stale closure.

## Current state

- `components/GameBoard.tsx` modified, TypeScript clean (only pre-existing `new-game.tsx` error)
- No version bump yet — same v1.2.7 (versionCode 15)
- Code committed and pushed this session
- Device testing still needed before version bump

## Exact next step to resume

1. **Device test the full animation sequence** on Samsung S24 Ultra (or emulator):
   - Win practice game → wave fires → ✓ overlay appears ONLY AFTER wave completes (not during)
   - Win 8-out game → verify ✓ overlay waits for all 40 tiles to settle before appearing
   - Win practice → switch to daily → switch back → ✓ immediately, NO wave re-fire
   - Win 4-out → switch to 2-out → switch back to 4-out → no popup re-fire, boards show ✓
   - Win daily → verify ✓ persists on app relaunch, no re-wave, no re-popup
   - Lose a game → ✗ shows on revisit, no red shake re-fire
   - New Game resets: wave fires fresh, popup fires fresh
2. **Bump version to v1.2.8** (patch) only after tests pass
3. **Trigger GitHub Actions build** (v1.2.8 APK + AAB)
4. **Upload v1.2.8 AAB** to Play Store internal testing track

## Bugs / gotchas

- If the animation is interrupted mid-wave (component unmounts — e.g. forced app restart), `onDone` is not called (`finished=false`). This means `waveShown` stays `false` in the store. On next launch, the wave will fire again. This is acceptable behaviour (user never saw the full wave).
- `stableHandleWaveDone` has `[]` deps — it captures `setWaveDoneLocal` (stable React setter) and reads `onWaveDone` via ref. Safe across renders.
- The revisit path in the useEffect (`if (waveShownRef.current && !waveSentRef.current && !waveDoneLocal)`) is unchanged — still sets `waveDoneLocal=true` directly (no animation, no `onWaveDone` call, since the store already has `waveShown=true`).
- `new-game.tsx` route type mismatch is a known pre-existing non-blocking TypeScript error.
