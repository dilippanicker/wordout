# Session Handoff — 2026-06-28

## What changed this session

### Files modified

**`app/(tabs)/index.tsx`** — 5 post-test bug fixes (refined from prior commit 0b93b64):

- **B1 (label position Android)**: Removed `gap: 2` from `modeIconWithLabel` style; added `marginTop: 2`, `maxWidth: 80`, `textAlign: 'center'` to `modeLabel`; added `numberOfLines={1}` to both modeLabel Text elements. Constrains label so it can't overflow on Android.
- **B2 (board refresh from settings)**: Added `quordleStore.boardCount` to deps of scroll-reset effect. Added new clamp effect: when `activeBoard >= quordleStore.boardCount` (boardCount shrinks), resets to 0 and scrolls. Handles edge case where guesses.length stays 0 and old effect wouldn't fire.
- **B3 (difficulty lock on completed daily)**: Changed lock guard from `!isQuordle` to `isDaily`. Expanded condition: `dailyStatus === 'playing' || dailyStatus === 'completed'`. Old code blocked difficulty in PRACTICE mode if daily was done. New code only locks when actually in daily sub-mode.
- **B4 (auto-dismiss not firing)**: Separated auto-dismiss into its own `useEffect([endGameVisible])` with 3000ms timer. Removed nested `setTimeout(dismissEndGame, 3000)` from outer timer callback. Prevents the `[activeGameStatus]` cleanup from accidentally cancelling the inner timer via ref overwrite.
- **B5 (lose overlay missing buttons)**: Added `{ paddingBottom: insets.bottom + 24 }` inline to `endGameContent`. Removed static `paddingBottom: 24`. On Android with nav bar (insets.bottom > 0), content no longer clips below navigation buttons.

---

## Decisions & deviations

- **B3 scope fix**: The old `!isQuordle` guard was also blocking practice-mode difficulty changes after a daily was completed (unintended). Using `isDaily` correctly scopes the lock.
- **B4 decoupled timer**: `useEffect([endGameVisible])` is cleaner than nested setTimeout. Auto-dismiss timer starts only when overlay is visible; cleanup runs if dismissed manually (prevents double-dismiss).
- **B5 inset pattern**: On web, `insets.bottom = 0` so behaviour is unchanged. On Android, paddingBottom grows to clear nav bar.
- **No version bump this session**: Version was already bumped to 1.2.3 (versionCode 11) in the prior commit (1e79657). These are refinements to those fixes.

---

## Current state

All 5 post-test bugs fixed. TypeScript clean (known pre-existing error in new-game.tsx only). App version 1.2.3 (versionCode 11).

---

## Exact next steps

1. **Device test** on Samsung S24 Ultra — verify specifically:
   - B1: "Today's · Easy" label appears under 📅 icon on Android (not top-left)
   - B2: Settings mode change → back → board shows correct new mode
   - B3: Difficulty tap after completed daily shows toast only (no cycle); practice mode CAN change difficulty
   - B4: Daily win overlay auto-dismisses after 3s
   - B5: Practice lose overlay shows ? and ↺ New Game above nav bar
2. **Build APK**: `bash build-and-deploy.sh`

---

## Gotchas

- **B3 practice after daily**: After daily completes, switching to practice mode NOW allows difficulty change. This is correct — the daily's locked `dailyDifficulty` is separate from `settingsStore.difficulty`.
- **B4 dismiss + mode-change**: Mode-change effect sets `setEndGameVisible(false)`, which triggers `[endGameVisible]` cleanup → cancels dismiss timer. Correct.
- **B5 web**: `insets.bottom = 0` on web → `paddingBottom = 0 + 24 = 24` — identical to before.
- **B2 clamp on mount**: On first render, `activeBoard = 0`, any `boardCount ≥ 1` → condition false → no-op. Safe.
- **`WORD_DOTS_H = 44` vs `DOTS_H = 36`**: Single-board uses 44 in tile sizing; multi-board uses 36. Unchanged.
