# Session Handoff — 2026-06-28

## What changed this session

### Files modified

**`app/(tabs)/index.tsx`** — 5 bugs fixed:

- **B1 (label position)**: Changed conditional rendering of "Today's · Easy" / "Practice · Easy" labels to always-rendered with `opacity: 1/0`. Prevents Android layout recalculation that caused the label to appear top-left above the board instead of under its icon. Both `modeIconWithLabel` containers now have consistent height (24px icon + 2px gap + 11px label = 37px) at all times.

- **B3 (difficulty lock)**: Extracted the difficulty toggle handler out of `renderHeader` (where it had no access to daily state) into a new `handleDifficultyToggle()` function in `WordleScreen`. Added daily lock check: if `!isQuordle && (dailyStatus === 'completed' || dailyStatus === 'playing' && dailyGuesses.length > 0)`, shows system toast "Daily locked — next word in HH:MM:SS" and returns. Added `onDifficultyToggle: () => void` to `HeaderProps`; `renderHeader` now calls the prop instead of inline logic.

- **B4 (auto-dismiss)**: Removed `if (!isDailyRef.current)` guard from auto-dismiss timer. All modes (daily, practice, quordle) now auto-dismiss the end-game overlay after 3 seconds. Removed the now-unused `isDailyRef` ref entirely.

- **B5 (? and ↺ in lose overlay)**: Restructured end-game overlay. The `?` help button was previously `position: 'absolute'` inside the `endGamePressable` — moved it into a `endGameHelpRow` View (full-width, `alignItems: 'flex-end'`) as a normal flex child. Added `endGameContent` View wrapping the main content (emoji, message, word, buttons) with `flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14`. `endGamePressable` now uses `flexDirection: 'column'` without `justifyContent: 'center'` (the inner `endGameContent` handles centering). This guarantees both `?` and `↺` always render in the flex tree regardless of platform/mode.

**`app/(tabs)/settings.tsx`** — B2 fixed:

- **B2 (board refresh on Settings mode change)**: Added `useQuordleStore` import. In `handleBoardCountSelect`, when switching to quordle mode (`n > 1`), now calls `useQuordleStore.getState().newGame()` immediately after `setGameMode('quordle')` — same pattern as the B10 arrow-cycling fix from the previous session. This syncs the board display to the new board count when returning from Settings.

---

## Decisions & deviations

- **B4 — Daily auto-dismiss changed from "stays until tapped" to "3s auto-dismiss"**: Original design had daily overlay stay indefinitely. Task spec says "the 5-second auto-dismiss timer is not firing" — but there never was a 5s timer; the task also says "Reduce to 3 seconds while fixing." Decision: remove the `!isDailyRef.current` guard and use the same 3s timer for all modes. Daily users can still tap to dismiss early.

- **B5 — Root cause unclear**: Code analysis couldn't identify why `position: 'absolute'` on the `?` button would fail specifically for practice lose (not win). Chose a structural fix (remove absolute positioning, use flex layout) rather than a targeted patch — this is more reliable across platforms.

- **B3 — `onDifficultyToggle` prop added to `renderHeader`**: The `renderHeader` function couldn't access `showSystemToast` or `isQuordle` in its closure. Added a single prop to pass the handler in. This is a clean pattern vs. threading multiple values through the existing props.

---

## Current state

All 5 bugs (B1, B2, B3, B4, B5) are implemented. TypeScript compiles cleanly (only pre-existing `new-game.tsx` error remains). No runtime testing done this session — device test still pending.

---

## Exact next steps

1. **Device test** on Samsung S24 Ultra — verify this session's fixes:
   - "Today's · Easy" label appears directly under 📅 icon (not top-left)
   - Settings mode change → back → board shows correct new mode
   - Difficulty icon tap after daily completed shows "Daily locked — next word in HH:MM:SS" toast (does NOT cycle)
   - Daily win overlay auto-dismisses after 3 seconds
   - Practice lose overlay shows ? help icon (top-right row) and ↺ New Game button
2. **Build APK**: `bash build-and-deploy.sh`

---

## Gotchas

- **B1 layout with always-rendered labels**: Both mode labels now always take up vertical space (11px + 2px gap). The `modeIconRow` height is 44px; total content is 37px. Inactive label has `opacity: 0` — it takes space but is invisible. On Android, this consistent height prevents the layout jump that caused the label to escape the container.

- **B5 overlay structure change**: `endGamePressable` no longer has `alignItems: 'center'` or `justifyContent: 'center'` at top level — these moved to `endGameContent`. If anything in the overlay seems misaligned, check `endGameContent` flex properties. The `endGameHelpRow` sits above `endGameContent` in the column.

- **B4 daily timer**: `isDailyRef` was removed entirely since it's no longer used. If daily-specific auto-dismiss behaviour is ever needed again, re-introduce this ref.

- **B3 quordle mode**: Difficulty lock check only runs when `!isQuordle` — quordle mode has no daily concept so locking makes no sense there.

- **Settings B2 guard**: `handleBoardCountSelect` now calls `newGame()` whenever switching to quordle. This means switching from 4-out to 6-out in Settings also resets the quordle board. This matches the behaviour of the arrow-cycling fix (which always reset on quordle switch).
