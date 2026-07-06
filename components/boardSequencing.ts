// Pure sequencing decisions for GameBoard's animation state machine.
// No React, no Reanimated — everything here is unit-testable (see
// __tests__/board-sequencing.test.ts, which replays the CHANGELOG regressions
// v1.0.1/v1.0.4/v1.2.2/v1.2.6/v1.2.8). GameBoard renders what these decide.

export const COLS = 5;
export const STAGGER = 180; // ms between each tile flip
// Time (ms) after submit until the last tile's flip finishes + small buffer.
// Last tile starts at STAGGER * (COLS-1) = 720ms, flip takes 400ms → done at 1120ms + 50ms buffer.
export const FLIP_DONE_MS = STAGGER * (COLS - 1) + 450;
export const WAVE_STAGGER = 80; // ms between each tile in the win wave
export const LOSE_SHAKE_MOVES = 7;
export const LOSE_SHAKE_MOVE_MS = 130;

// How a submitted row's tiles render. 'flip' only for the just-submitted row,
// and never once the wave has locally completed — when waveDoneLocal flips true,
// this and shouldWaveRow() go false in the SAME render, collapsing straight to a
// static Tile. Without the waveDone guard React sees a BounceTile→FlipTile type
// change and remounts FlipTile fresh (progress=0), replaying the fill after the
// overlay dismisses (the v1.2.8 bug).
export function tileModeForSubmittedRow(
  row: number,
  animatingRow: number,
  waveDoneLocal: boolean,
): 'flip' | 'static' {
  return row === animatingRow && !waveDoneLocal ? 'flip' : 'static';
}

// Revisit = store says the wave already played for this game, but this component
// instance never played it (fresh mount after a mode/board switch). The revisit
// path skips the bounce and goes straight to the ✓ overlay (v1.2.6 bug).
export function isRevisit(waveShown: boolean, waveSent: boolean): boolean {
  return waveShown && !waveSent;
}

// Whether a row joins the win wave. All five conditions are load-bearing:
// solved (only winning boards wave), row < count (only submitted rows),
// animatingRow === count-1 (the win was just submitted by THIS instance —
// blocks accidental triggers on remount, where animatingRow is -1),
// !waveDoneLocal (fires once), !revisit (never re-animates on return).
export function shouldWaveRow(args: {
  solved: boolean;
  row: number;
  count: number;
  animatingRow: number;
  waveDoneLocal: boolean;
  revisit: boolean;
}): boolean {
  const { solved, row, count, animatingRow, waveDoneLocal, revisit } = args;
  return solved && row < count && animatingRow === count - 1 && !waveDoneLocal && !revisit;
}

// Per-tile wave start delay; the wave sweeps all submitted rows tile by tile.
export function waveTileDelay(row: number, col: number): number {
  return FLIP_DONE_MS + (row * COLS + col) * WAVE_STAGGER;
}

// The last wave tile — its spring-completion callback is the ONE place
// onWaveDone fires (true wave end; never at wave start — v1.2.8).
export function isLastWaveTile(row: number, col: number, count: number): boolean {
  return row === count - 1 && col === COLS - 1;
}

// Total wave duration used to schedule the win overlay fade-in.
export function waveDuration(count: number): number {
  return FLIP_DONE_MS + count * COLS * WAVE_STAGGER + 400;
}

// Total lose-shake duration used to schedule the lose overlay fade-in.
export function loseShakeDuration(): number {
  return FLIP_DONE_MS + LOSE_SHAKE_MOVES * LOSE_SHAKE_MOVE_MS + 300;
}

// When and how fast an end-state overlay fades in. stateTimestamp is when this
// instance first observed the solve/loss: -1 = not yet, 0 = already in that state
// on mount (remount of a finished board → show immediately), >0 = Date.now() of
// the transition (wait out the remainder of the animation, v1.0.4).
export interface OverlayPlan {
  delayMs: number;
  fadeMs: number;
}
export function overlayPlan(stateTimestamp: number, now: number, fullDuration: number): OverlayPlan {
  const elapsed = stateTimestamp <= 0 ? Infinity : now - stateTimestamp;
  if (elapsed < fullDuration) {
    return { delayMs: fullDuration - elapsed, fadeMs: 300 };
  }
  return { delayMs: 0, fadeMs: 200 };
}
