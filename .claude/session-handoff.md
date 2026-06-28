# Session Handoff — 2026-06-29 (session 6)

## Files modified

### `components/GameBoard.tsx` (commit 922bed7)
- Line 282: Added `&& !waveDoneLocal` guard to FlipTile condition
- Before: `if (row === animatingRow) {`
- After: `if (row === animatingRow && !waveDoneLocal) {`
- Why: when `waveDoneLocal` flips true, BounceTile and FlipTile collapsed in same render;
  React saw a BounceTile→FlipTile type change and remounted FlipTile fresh, replaying the flip.
  Guard makes both conditions false in the same render → replaced by static Tile, no re-animation.

### `app/(tabs)/index.tsx` (commit a6405ec)
- Line 28: Added `const END_GAME_DISMISS_MS = 5000;` module-level constant
- Line 471: B4 timer now uses `END_GAME_DISMISS_MS` instead of hardcoded 5000
- Lines 476–481: B4b effect — `dismissCountdown` state + `setInterval` ticker while `endGameVisible`
- Line 635: JSX — `{dismissCountdown > 0 && <Text style={styles.dismissCountdown}>Closing in {dismissCountdown}…</Text>}`
- Line 1308: `dismissCountdown` style — `rgba(255,255,255,0.45)`, fontSize 13, marginTop -4

### `store/quordleStore.ts` (commit a6405ec)
- Lines 166–174: Hard mode validation loop rewritten
- Old: reject if ANY unsolved board fails constraint
- New: accept if AT LEAST ONE unsolved board accepts the guess; reject (showing first violation)
  only when ALL unsolved boards reject

## Decisions made

**Hard mode n-out semantics — "at least one board accepts":**
The old code rejected a guess if any unsolved board's constraint was violated. This meant board 1
revealing 'I' blocked all future guesses that lacked 'I', even when focusing on board 2 (which
doesn't need 'I'). The fix: each board enforces its own constraints independently; a guess is
valid if it satisfies at least one unsolved board's constraints. If a board has no revealed
letters yet, it trivially accepts (no constraints → no block). Toast shown only when all
active boards reject, displaying first board's violation.

**Countdown display:**
Module-level `END_GAME_DISMISS_MS = 5000` is the single source of truth for both the
`setTimeout` duration and the countdown init (`Math.ceil(END_GAME_DISMISS_MS / 1000) = 5`).
Style uses low-opacity white (0.45) at 13px below the share button, matching overlay aesthetics.

## Current state

All three items committed and pushed:
1. ✅ Tile re-animation bug fixed (922bed7)
2. ✅ Countdown in celebration overlay (a6405ec)
3. ✅ Hard mode per-board constraint fix in n-out (a6405ec)

No in-progress work. No uncommitted changes.

## Exact next step to resume

1. **Check GitHub Actions build** (run 28332145349) — confirm APK + AAB for v1.2.7 produced
   - If failed: fix, re-trigger after v1.2.8 bump
2. **Bump to v1.2.8** (patch) before next build:
   - Read `app.json`, confirm current versionCode=15
   - Propose: "v1.2.8 (versionCode 16) — patch: tile re-animation fix, overlay countdown, hard mode per-board"
   - Wait for confirmation, then update `app.json` + `CHANGELOG.md`
3. **Device test on Samsung S24 Ultra:**
   - Win practice → wave → ✓ overlay after wave (not during); no re-animation after overlay dismisses
   - Win 8-out → ✓ overlay waits all 40 tiles; no re-animation after overlay dismisses
   - Hard mode 2-out: board 1 reveals 'I' → can submit guess without 'I' if it satisfies board 2
   - Celebration overlay: "Closing in 5…4…3…2…1…" visible during 5s auto-dismiss
4. **Upload v1.2.8 AAB** to Play Store internal testing track

## Bugs / gotchas

- Hard mode "at least one accepts": if an unsolved board has NO revealed letters yet, it
  trivially accepts every guess (no constraints). This makes hard mode partially toothless
  in early turns when some boards have all-absent results. Intentional — matches user spec.
- `new-game.tsx` route type mismatch is a known pre-existing non-blocking TypeScript error.
- Build was triggered at v1.2.7 without version bump — if re-building, bump to v1.2.8 first.
