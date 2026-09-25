/**
 * Regression tests for utils/dailyDifficultyCycle.ts — shared by the header emoji
 * tap (forward only) and the finished-board swipe gesture (both directions) in
 * app/(tabs)/index.tsx. Pins down the accessible-list gate, the directional wrap
 * (stepDailyDifficulty, which always lands somewhere — it never blocks), and the
 * separate dead-end check (isDailyDeadEndStep) the caller uses to decide whether
 * to delay that landing behind a toast. Checked by position in the accessible list,
 * not by list length — must fire whether the loss is Easy with nothing else touched
 * yet, or Hard after Easy was already won — and never for a backward step.
 */
import { describe, test, expect } from '@jest/globals';
import { accessibleDailyDifficulties, stepDailyDifficulty, isDailyDeadEndStep } from '../utils/dailyDifficultyCycle';
import { emptyDailyGameState, DailyGameState } from '../store/dailyStore';
import { Difficulty } from '../store/settingsStore';

function games(overrides: Partial<Record<Difficulty, Partial<DailyGameState>>>): Record<Difficulty, DailyGameState> {
  return {
    easy: { ...emptyDailyGameState(), ...overrides.easy },
    hard: { ...emptyDailyGameState(), ...overrides.hard },
    extreme: { ...emptyDailyGameState(), ...overrides.extreme },
  };
}

describe('accessibleDailyDifficulties', () => {
  test('only Easy accessible before it is finished', () => {
    const g = games({ easy: { status: 'playing' } });
    expect(accessibleDailyDifficulties(g)).toEqual(['easy']);
  });

  test('Hard unlocks once Easy is won', () => {
    const g = games({ easy: { status: 'completed', solved: true } });
    expect(accessibleDailyDifficulties(g)).toEqual(['easy', 'hard']);
  });

  test('Hard stays locked if Easy was lost', () => {
    const g = games({ easy: { status: 'completed', solved: false } });
    expect(accessibleDailyDifficulties(g)).toEqual(['easy']);
  });

  test('all three accessible once Easy and Hard are both won', () => {
    const g = games({
      easy: { status: 'completed', solved: true },
      hard: { status: 'completed', solved: true },
    });
    expect(accessibleDailyDifficulties(g)).toEqual(['easy', 'hard', 'extreme']);
  });
});

describe('stepDailyDifficulty', () => {
  test('forward and backward wrap around the full accessible list', () => {
    const g = games({
      easy: { status: 'completed', solved: true },
      hard: { status: 'completed', solved: true },
    });
    expect(stepDailyDifficulty(g, 'easy', 1)).toBe('hard');
    expect(stepDailyDifficulty(g, 'hard', 1)).toBe('extreme');
    expect(stepDailyDifficulty(g, 'extreme', 1)).toBe('easy'); // wraps forward
    expect(stepDailyDifficulty(g, 'easy', -1)).toBe('extreme'); // wraps backward
    expect(stepDailyDifficulty(g, 'extreme', -1)).toBe('hard');
  });

  test('single-entry list (Easy lost) is a same-difficulty no-op in both directions', () => {
    const g = games({ easy: { status: 'completed', solved: false } });
    expect(stepDailyDifficulty(g, 'easy', 1)).toBe('easy');
    expect(stepDailyDifficulty(g, 'easy', -1)).toBe('easy');
  });

  test('mid-game (not yet finished) is a same-difficulty no-op in the single-entry list', () => {
    const g = games({ easy: { status: 'playing' } });
    expect(stepDailyDifficulty(g, 'easy', 1)).toBe('easy');
    expect(stepDailyDifficulty(g, 'easy', -1)).toBe('easy');
  });

  test('Hard lost after Easy won: forward from Hard wraps to Easy, backward too — never null', () => {
    const g = games({
      easy: { status: 'completed', solved: true },
      hard: { status: 'completed', solved: false },
    });
    expect(stepDailyDifficulty(g, 'hard', 1)).toBe('easy');
    expect(stepDailyDifficulty(g, 'hard', -1)).toBe('easy');
    // Forward from Easy to the already-touched (lost) Hard is just a normal move — you can
    // still revisit a lost board, the dead end is only about advancing *past* it.
    expect(stepDailyDifficulty(g, 'easy', 1)).toBe('hard');
  });
});

describe('isDailyDeadEndStep', () => {
  test('Easy lost, nothing else touched: forward is a dead end, backward is not', () => {
    const g = games({ easy: { status: 'completed', solved: false } });
    expect(isDailyDeadEndStep(g, 'easy', 1)).toBe(true);
    expect(isDailyDeadEndStep(g, 'easy', -1)).toBe(false);
  });

  test('generalizes past the first difficulty: Hard lost after Easy won', () => {
    const g = games({
      easy: { status: 'completed', solved: true },
      hard: { status: 'completed', solved: false },
    });
    expect(isDailyDeadEndStep(g, 'hard', 1)).toBe(true);
    expect(isDailyDeadEndStep(g, 'hard', -1)).toBe(false);
    // From Easy, stepping forward just revisits the already-touched Hard — not a dead end.
    expect(isDailyDeadEndStep(g, 'easy', 1)).toBe(false);
  });

  test('not a dead end while the last accessible entry is still playing, or once won', () => {
    const stillPlaying = games({
      easy: { status: 'completed', solved: true },
      hard: { status: 'playing' },
    });
    expect(isDailyDeadEndStep(stillPlaying, 'hard', 1)).toBe(false);

    const won = games({
      easy: { status: 'completed', solved: true },
      hard: { status: 'completed', solved: true },
    });
    expect(isDailyDeadEndStep(won, 'hard', 1)).toBe(false);
  });
});
