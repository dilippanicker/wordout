/**
 * Regression tests for utils/dailyDifficultyCycle.ts — shared by the header emoji
 * tap (forward only) and the finished-board swipe gesture (both directions) in
 * app/(tabs)/index.tsx. Pins down the accessible-list gate and the directional
 * wrap, including the single-entry dead end that must stay silent going backward.
 */
import { describe, test, expect } from '@jest/globals';
import { accessibleDailyDifficulties, stepDailyDifficulty } from '../utils/dailyDifficultyCycle';
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

  test('single-entry dead end (Easy lost) returns null in both directions', () => {
    const g = games({ easy: { status: 'completed', solved: false } });
    expect(stepDailyDifficulty(g, 'easy', 1)).toBeNull();
    expect(stepDailyDifficulty(g, 'easy', -1)).toBeNull();
  });

  test('mid-game (not yet finished) is a same-difficulty no-op in the single-entry list', () => {
    const g = games({ easy: { status: 'playing' } });
    expect(stepDailyDifficulty(g, 'easy', 1)).toBe('easy');
    expect(stepDailyDifficulty(g, 'easy', -1)).toBe('easy');
  });
});
