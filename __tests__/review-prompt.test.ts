import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

jest.mock('expo-store-review', () => ({
  isAvailableAsync: jest.fn(),
  requestReview: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { Platform } from 'react-native';
import * as StoreReview from 'expo-store-review';
import { isReviewEligible, reviewBlockedBy, scheduleReviewAfterWin, maybeRequestReview, REVIEW_DELAY_MS, ReviewEligibilityInput } from '../utils/reviewPrompt';
import { useSettingsStore } from '../store/settingsStore';
import { useGameStore } from '../store/gameStore';
import { useQuordleStore } from '../store/quordleStore';
import { useDailyStore, emptyDailyGameState } from '../store/dailyStore';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-12-01T12:00:00Z');
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

const base: ReviewEligibilityInput = {
  platform: 'android',
  won: true,
  tutorialShowing: false,
  totalWins: 5,
  firstLaunchDate: iso(3 * DAY),
  reviewPromptCount: 0,
  lastReviewPromptDate: '',
  now: NOW,
};
const el = (o: Partial<ReviewEligibilityInput> = {}) => isReviewEligible({ ...base, ...o });

describe('isReviewEligible', () => {
  it('passes when every gate is met exactly at its boundary', () => expect(el()).toBe(true));
  it('web / ios never', () => {
    expect(el({ platform: 'web' })).toBe(false);
    expect(el({ platform: 'ios' })).toBe(false);
  });
  it('never after a loss', () => expect(el({ won: false })).toBe(false));
  it('not while the tutorial is showing', () => expect(el({ tutorialShowing: true })).toBe(false));
  it('needs totalWins >= 5', () => {
    expect(el({ totalWins: 4 })).toBe(false);
    expect(el({ totalWins: 6 })).toBe(true);
  });
  it('needs >= 3 days since first launch', () => {
    expect(el({ firstLaunchDate: iso(3 * DAY - 1) })).toBe(false);
    expect(el({ firstLaunchDate: '' })).toBe(false);
  });
  it('caps prompts at 3', () => {
    expect(el({ reviewPromptCount: 2 })).toBe(true);
    expect(el({ reviewPromptCount: 3 })).toBe(false);
  });
  it('needs >= 60 days since last prompt (or never)', () => {
    expect(el({ lastReviewPromptDate: iso(60 * DAY - 1), reviewPromptCount: 1 })).toBe(false);
    expect(el({ lastReviewPromptDate: iso(60 * DAY), reviewPromptCount: 1 })).toBe(true);
  });
});

describe('review settings defaults', () => {
  it('start empty/zero, and incrementTotalWins / recordReviewPrompt update them', () => {
    const s = useSettingsStore.getState();
    expect([s.firstLaunchDate, s.totalWins, s.reviewPromptCount, s.lastReviewPromptDate]).toEqual(['', 0, 0, '']);
    expect([s.reviewLastOutcome, s.reviewLastOutcomeDate]).toEqual(['', '']);
    s.incrementTotalWins();
    s.recordReviewPrompt('2026-12-01T00:00:00.000Z');
    const n = useSettingsStore.getState();
    expect([n.totalWins, n.reviewPromptCount, n.lastReviewPromptDate]).toEqual([1, 1, '2026-12-01T00:00:00.000Z']);
  });
});

describe('totalWins counts only full wins, in every mode', () => {
  const wins = () => useSettingsStore.getState().totalWins;

  it('single-board practice: win +1, loss +0', () => {
    useSettingsStore.setState({ difficulty: 'easy', language: 'en_us', totalWins: 0 });
    useGameStore.setState({ answer: 'CIGAR', currentGuess: 'CIGAR', guesses: [], gameStatus: 'playing' });
    useGameStore.getState().submitGuess();
    expect(wins()).toBe(1);

    useGameStore.setState({ answer: 'CIGAR', currentGuess: 'REBUT', guesses: Array.from({ length: 5 }, (_, i) => ({ word: `X${i}`, results: [] })) as any, gameStatus: 'playing' });
    useGameStore.getState().submitGuess();
    expect(useGameStore.getState().gameStatus).toBe('lost');
    expect(wins()).toBe(1);
  });

  it('n-out: partial solve +0, all boards solved +1', () => {
    useSettingsStore.setState({ difficulty: 'easy', language: 'en_us', gameMode: 'quordle', boardCount: 2, totalWins: 0 });
    const seed = (solvedBoards: boolean[], guess: string) =>
      useQuordleStore.setState({
        boardCount: 2, maxGuesses: 7, answers: ['CIGAR', 'REBUT'], guesses: [], currentGuess: guess,
        solvedBoards, gameStatus: 'playing', toast: null, waveDoneBoards: [false, false], celebrationShown: false, snapshots: {},
      });
    seed([false, false], 'CIGAR');
    useQuordleStore.getState().submitGuess();
    expect(useQuordleStore.getState().gameStatus).toBe('playing');
    expect(wins()).toBe(0);

    seed([true, false], 'REBUT');
    useQuordleStore.getState().submitGuess();
    expect(useQuordleStore.getState().gameStatus).toBe('won');
    expect(wins()).toBe(1);
  });

  it('daily: win +1, loss +0', () => {
    useSettingsStore.setState({ language: 'en_us', totalWins: 0 });
    const seed = (guess: string, nGuesses: number) =>
      useDailyStore.setState({
        activeDailyDifficulty: 'easy',
        dailyAnswers: { easy: 'CIGAR', hard: 'REBUT', extreme: 'CANDY' },
        games: {
          ...useDailyStore.getState().games,
          easy: { ...emptyDailyGameState(), status: 'playing', currentGuess: guess,
            guesses: Array.from({ length: nGuesses }, (_, i) => ({ word: `X${i}`, results: [] })) as any },
        },
      });
    seed('REBUT', 5);
    useDailyStore.getState().submitGuess();
    expect(useDailyStore.getState().games.easy.solved).toBe(false);
    expect(wins()).toBe(0);

    seed('CIGAR', 0);
    useDailyStore.getState().submitGuess();
    expect(useDailyStore.getState().games.easy.solved).toBe(true);
    expect(wins()).toBe(1);
  });
});

describe('reviewBlockedBy names the failing gate', () => {
  it('returns null when eligible, else the first failing gate', () => {
    expect(reviewBlockedBy(base)).toBeNull();
    expect(reviewBlockedBy({ ...base, platform: 'web' })).toBe('platform');
    expect(reviewBlockedBy({ ...base, won: false })).toBe('not-won');
    expect(reviewBlockedBy({ ...base, tutorialShowing: true })).toBe('tutorial');
    expect(reviewBlockedBy({ ...base, totalWins: 4 })).toBe('wins');
    expect(reviewBlockedBy({ ...base, reviewPromptCount: 3 })).toBe('prompt-cap');
    expect(reviewBlockedBy({ ...base, firstLaunchDate: iso(3 * DAY - 1) })).toBe('first-launch');
    expect(reviewBlockedBy({ ...base, firstLaunchDate: '' })).toBe('first-launch');
    expect(reviewBlockedBy({ ...base, lastReviewPromptDate: iso(60 * DAY - 1) })).toBe('cooldown');
  });
});

describe('scheduleReviewAfterWin (fake timers, android)', () => {
  const available = StoreReview.isAvailableAsync as jest.Mock<() => Promise<boolean>>;
  const request = StoreReview.requestReview as jest.Mock<() => Promise<void>>;
  const noTutorial = () => false;
  let restoreOS: { restore: () => void };

  beforeEach(() => {
    jest.useFakeTimers();
    restoreOS = jest.replaceProperty(Platform, 'OS', 'android');
    available.mockReset().mockResolvedValue(true);
    request.mockReset().mockResolvedValue(undefined);
    useSettingsStore.setState({
      totalWins: 5,
      firstLaunchDate: new Date(Date.now() - 10 * DAY).toISOString(),
      reviewPromptCount: 0,
      lastReviewPromptDate: '',
      reviewLastOutcome: '',
      reviewLastOutcomeDate: '',
    });
  });
  afterEach(() => {
    restoreOS.restore();
    jest.useRealTimers();
  });

  // Overlay appears at t=0; `dismissAtMs` is when dismissEndGame would reach the schedule call
  // (tap time, or 5000 for the auto-dismiss effect). The 320ms fade before the call is a component detail.
  async function dismissAt(dismissAtMs: number) {
    const ref = { current: false };
    await jest.advanceTimersByTimeAsync(dismissAtMs);
    scheduleReviewAfterWin('won', noTutorial, ref);
    await jest.advanceTimersByTimeAsync(REVIEW_DELAY_MS - 1);
    expect(request).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(request).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(10_000);
    expect(request).toHaveBeenCalledTimes(1);
    expect(useSettingsStore.getState().reviewLastOutcome).toBe('requested');
  }

  it('tap under 1s after the overlay appears', () => dismissAt(800));
  it('tap at 4s', () => dismissAt(4000));
  it('5s auto-dismiss', () => dismissAt(5000));

  it('double dismiss of one win (tap at ~4.8s, then the 5s timer) requests once', async () => {
    const ref = { current: false };
    scheduleReviewAfterWin('won', noTutorial, ref);       // tap
    await jest.advanceTimersByTimeAsync(200);
    scheduleReviewAfterWin('won', noTutorial, ref);       // auto-dismiss firing before the tap's fade hid the overlay
    await jest.advanceTimersByTimeAsync(5000);
    expect(request).toHaveBeenCalledTimes(1);
    expect(useSettingsStore.getState().reviewPromptCount).toBe(1);
  });

  it('after the flag is reset for a new game, the next win can request again', async () => {
    const ref = { current: false };
    scheduleReviewAfterWin('won', noTutorial, ref);
    await jest.advanceTimersByTimeAsync(REVIEW_DELAY_MS);
    ref.current = false; // new game started
    // The 60-day cooldown would (correctly) block a real second prompt; clear it so this test isolates the flag.
    useSettingsStore.setState({ reviewPromptCount: 0, lastReviewPromptDate: '' });
    scheduleReviewAfterWin('won', noTutorial, ref);
    await jest.advanceTimersByTimeAsync(REVIEW_DELAY_MS);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('a loss schedules nothing and does not set the flag', async () => {
    const ref = { current: false };
    expect(scheduleReviewAfterWin('lost', noTutorial, ref)).toBeNull();
    expect(ref.current).toBe(false);
    await jest.advanceTimersByTimeAsync(5000);
    expect(request).not.toHaveBeenCalled();
  });

  it('records why nothing was requested', async () => {
    useSettingsStore.setState({ totalWins: 2 });
    await maybeRequestReview(true, noTutorial);
    expect(useSettingsStore.getState().reviewLastOutcome).toBe('blocked:wins');

    useSettingsStore.setState({ totalWins: 5 });
    available.mockResolvedValue(false);
    await maybeRequestReview(true, noTutorial);
    expect(useSettingsStore.getState().reviewLastOutcome).toBe('unavailable');

    available.mockResolvedValue(true);
    request.mockRejectedValue(new Error('boom'));
    await maybeRequestReview(true, noTutorial);
    expect(useSettingsStore.getState().reviewLastOutcome).toBe('error:boom');
    expect(useSettingsStore.getState().reviewPromptCount).toBe(0);
    expect(useSettingsStore.getState().reviewLastOutcomeDate).not.toBe('');
  });
});
