/**
 * Regression tests for GameBoard's animation sequencing decisions
 * (components/boardSequencing.ts). Each block replays a scenario from the
 * CHANGELOG animation-bug chain (v1.0.1 → v1.2.8) at the decision level.
 */
import { describe, test, expect } from '@jest/globals';
import {
  COLS,
  FLIP_DONE_MS,
  WAVE_STAGGER,
  isRevisit,
  isLastWaveTile,
  loseShakeDuration,
  overlayPlan,
  shouldWaveRow,
  tileModeForSubmittedRow,
  waveDuration,
  waveTileDelay,
} from '../components/boardSequencing';

// ── Fill animation: always on a fresh guess, never on remount ────────────────

describe('fill (flip) decision', () => {
  test('the just-submitted row flips', () => {
    expect(tileModeForSubmittedRow(2, 2, false)).toBe('flip');
  });

  test('other rows render static', () => {
    expect(tileModeForSubmittedRow(0, 2, false)).toBe('static');
    expect(tileModeForSubmittedRow(1, 2, false)).toBe('static');
  });

  test('remount: animatingRow is -1, so no row flips (no spurious fill on mode/bc/daily switch)', () => {
    // GameBoard remounts via key= on mode switch; prevCount initialises to count,
    // so animatingRow stays -1 and every submitted row must be static.
    for (let row = 0; row < 6; row++) {
      expect(tileModeForSubmittedRow(row, -1, false)).toBe('static');
    }
  });

  test('v1.2.8: once waveDoneLocal is true the animating row collapses to static in the same render', () => {
    // The !waveDoneLocal guard: without it, the BounceTile wrapper disappearing
    // while FlipTile persisted caused a type-change remount that replayed the
    // fill after the overlay dismissed.
    expect(tileModeForSubmittedRow(3, 3, true)).toBe('static');
  });
});

// ── Wave: fires once, on first solve, by the instance that submitted it ──────

describe('wave decision', () => {
  const freshWin = { solved: true, count: 4, animatingRow: 3, waveDoneLocal: false, revisit: false };

  test('fresh solve: every submitted row waves', () => {
    for (let row = 0; row < freshWin.count; row++) {
      expect(shouldWaveRow({ ...freshWin, row })).toBe(true);
    }
  });

  test('unsubmitted rows never wave', () => {
    expect(shouldWaveRow({ ...freshWin, row: 4 })).toBe(false);
    expect(shouldWaveRow({ ...freshWin, row: 5 })).toBe(false);
  });

  test('unsolved board never waves', () => {
    expect(shouldWaveRow({ ...freshWin, row: 0, solved: false })).toBe(false);
  });

  test('v1.2.2: wave fires only once — waveDoneLocal blocks a second pass', () => {
    expect(shouldWaveRow({ ...freshWin, row: 0, waveDoneLocal: true })).toBe(false);
  });

  test('v1.2.6: revisiting a solved board does not re-trigger the wave', () => {
    // Store flag says wave already shown, this instance never played it.
    expect(isRevisit(true, false)).toBe(true);
    expect(shouldWaveRow({ ...freshWin, row: 0, revisit: true })).toBe(false);
  });

  test('remount of a solved board (animatingRow -1) never waves, even before the revisit flag lands', () => {
    expect(shouldWaveRow({ ...freshWin, row: 0, animatingRow: -1 })).toBe(false);
  });

  test('mid-game solve state cannot wave rows from a stale animatingRow', () => {
    // animatingRow must equal count-1: the winning guess was submitted by this instance.
    expect(shouldWaveRow({ ...freshWin, row: 0, animatingRow: 2 })).toBe(false);
  });

  test('isRevisit is false for a fresh game and after this instance played the wave', () => {
    expect(isRevisit(false, false)).toBe(false); // fresh game
    expect(isRevisit(true, true)).toBe(false);   // this instance played it (waveSent)
  });
});

// ── Wave timing: onWaveDone at TRUE wave end, overlay never beats the wave ───

describe('wave timing', () => {
  test('last wave tile is (count-1, COLS-1) and has the largest delay', () => {
    const count = 6;
    expect(isLastWaveTile(count - 1, COLS - 1, count)).toBe(true);
    expect(isLastWaveTile(count - 1, 0, count)).toBe(false);
    expect(isLastWaveTile(0, COLS - 1, count)).toBe(false);
    const lastDelay = waveTileDelay(count - 1, COLS - 1);
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < COLS; col++) {
        if (!(row === count - 1 && col === COLS - 1)) {
          expect(waveTileDelay(row, col)).toBeLessThan(lastDelay);
        }
      }
    }
  });

  test('v1.2.8: overlay schedule strictly exceeds the last tile start on every board size', () => {
    // The ✓ overlay must not appear before the wave finishes — on large boards
    // (6-out/8-out win rows) the wave is long; waveDuration must always cover
    // the last tile's start plus its bounce.
    for (const count of [1, 2, 3, 4, 6, 8, 13]) {
      const lastTileStart = waveTileDelay(count - 1, COLS - 1);
      expect(waveDuration(count)).toBeGreaterThan(lastTileStart);
      expect(waveDuration(count) - lastTileStart).toBe(WAVE_STAGGER + 400); // bounce window
    }
  });

  test('wave starts only after the flip completes', () => {
    expect(waveTileDelay(0, 0)).toBe(FLIP_DONE_MS);
  });
});

// ── Overlay fade plans (v1.0.4: delayed on fresh finish, instant on remount) ─

describe('overlayPlan', () => {
  const DUR = waveDuration(4);

  test('fresh solve: waits out the full remaining animation', () => {
    const now = 1_000_000;
    expect(overlayPlan(now, now, DUR)).toEqual({ delayMs: DUR, fadeMs: 300 });
  });

  test('mid-animation re-evaluation: waits only the remainder', () => {
    const start = 1_000_000;
    const plan = overlayPlan(start, start + 500, DUR);
    expect(plan).toEqual({ delayMs: DUR - 500, fadeMs: 300 });
  });

  test('remount of an already-finished board (timestamp 0): immediate fade', () => {
    expect(overlayPlan(0, 5_000_000, DUR)).toEqual({ delayMs: 0, fadeMs: 200 });
  });

  test('not yet in state (timestamp -1): treated as elapsed, immediate if ever invoked', () => {
    expect(overlayPlan(-1, 5_000_000, DUR)).toEqual({ delayMs: 0, fadeMs: 200 });
  });

  test('animation long since finished: immediate fade', () => {
    const start = 1_000_000;
    expect(overlayPlan(start, start + DUR + 1, DUR)).toEqual({ delayMs: 0, fadeMs: 200 });
  });

  test('lose overlay waits out flip + 7-move shake', () => {
    expect(loseShakeDuration()).toBe(FLIP_DONE_MS + 7 * 130 + 300);
  });
});
