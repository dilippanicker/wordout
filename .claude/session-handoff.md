# Session Handoff

**Last updated:** 2026-06-26
**Session:** v1.0.4 — animation timing fixes
**Model:** claude-sonnet-4-6
**Status:** v1.0.4 committed locally (f9a5e72). Not yet built. Build must be triggered manually via GitHub Actions.

---

## What was done this session

### Animation timing overhaul — all in one commit `f9a5e72`

**`components/FlipTile.tsx`**:
- `HALF_DURATION` 150ms → 200ms (each tile flip: 300ms → 400ms total)
- Added `Extrapolation.CLAMP` to both `interpolate()` calls — fixes web black flash caused by back face extrapolating to −180° before flip begins. Without CLAMP, at progress=0 the back face was at rotateY(−180°) which on some web frames leaked through as the colored tile.

**`components/GameBoard.tsx`**:
- `STAGGER` 150ms → 180ms (stagger between each tile in a row flip)
- `FLIP_DONE_MS` recalculated: `180 × 4 + 450 = 1170ms` (was 950ms)
- `WAVE_STAGGER` constant added: 80ms per tile (was hardcoded 50ms inline)
- Win wave BounceTile delay: `* 50` → `* WAVE_STAGGER` (80ms)
- Win overlay delay: fixed `1500ms` → dynamic `FLIP_DONE_MS + (count * COLS - 1) * WAVE_STAGGER + 400`. Fixes overlay appearing mid-wave for multi-guess wins (e.g. 6-guess win: was 1500ms, wave finishes at ~3600ms — now overlay waits for last tile to start bouncing + 400ms settle).
- `countRef = useRef(0)` added just after `count` is declared (line ~170) — lets the win `useEffect([solved])` read count without adding it to deps. Init is `0` not `count` to avoid temporal dead zone on web.
- Lose overlay delay: `FLIP_DONE_MS + 1100` → `FLIP_DONE_MS + 1300` (400ms settle after shake, was 190ms)

**`app/(tabs)/index.tsx`**:
- End-game full-screen overlay delays: win 1800ms → 4200ms, lose 2500ms → 3200ms. These give per-board ✓/✗ overlays time to fully fade in before the full-screen overlay appears.

### Version bump
`app.json`: `version` → `"1.0.4"`, `versionCode` → `5`

---

## Decisions and deviations

- **`countRef` initialized to `0` not `count`**: user's diagnosis was that `count` was a prop (it's not — it's a local derived variable). The real bug was temporal dead zone: `countRef.current = count` appeared before `const count = ...` in the component body. Fix was to move `countRef` lines to after `count` declaration and init with `0`.
- **`Extrapolation.CLAMP` on FlipTile**: not in original spec but identified during web testing as the cause of the black flash. User confirmed and requested the fix.
- **Flip timing 150ms → 200ms, stagger 150ms → 180ms**: added after the CLAMP fix as a separate user request. `FLIP_DONE_MS` updated accordingly (450ms buffer instead of 350ms to account for 400ms flip + 50ms buffer).
- **Web error debugging**: went through 3 rounds — (1) `[solved, count]` dep array causing double-invocation in strict mode, (2) `countRef` initialized before `count` declared, (3) black flash from `interpolate` extrapolation. All resolved.

---

## Current state

All changes committed, not yet pushed to remote (or push may have been triggered — check `git status`).
Version: `1.0.4` (versionCode 5) in `app.json`.
No staged changes, no uncommitted work.

---

## Exact next step

1. Push if not already: `git push`
2. Trigger GitHub Actions build manually (Actions tab → Build APK + AAB → Run workflow)
3. Test v1.0.4 APK on S24 Ultra:
   - Win animation: wave is slower (80ms stagger), overlay fades in AFTER wave completes
   - Lose animation: shake → 400ms pause → ✗ overlay fades in
   - No black flash during tile flip
   - Full-screen end-game overlay appears after per-board overlays have settled
4. Play Store submission (see TODO.md)

---

## Gotchas for next session

- **`FLIP_DONE_MS = 1170ms`** (updated this session from 950ms). Any future timing calculations must use this value.
- **`WAVE_STAGGER = 80ms`** — named constant in GameBoard.tsx. Win overlay delay is now dynamic: `FLIP_DONE_MS + (count * COLS - 1) * WAVE_STAGGER + 400`.
- **`countRef` must stay AFTER `const count = ...`** in GameBoard.tsx — moving it before causes "Cannot access 'count' before initialization" on web (temporal dead zone).
- **`Extrapolation.CLAMP` on both interpolations in FlipTile** — do not remove. Without it, the back face extrapolates to −180° at progress=0 and can flash the colored tile on web.
- **End-game overlay delays are now 4200ms (win) / 3200ms (lose)** in index.tsx — these feel long on a 1-guess win (wave done at ~1600ms, overlay at 4200ms). May want to make this dynamic in a future session using the same count-based approach.
- **EAS free tier** exhausted until July 1, 2026 — use GitHub Actions.
- **versionCode is 5**. Next build after 1.0.4 needs versionCode 6.
- **Wordlist format**: always pretty-print (indent=2, one word per line, trailing newline).
