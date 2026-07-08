/**
 * Store-invariant tests — executable versions of the invariants documented in CLAUDE.md.
 * These guard the state-isolation rules that have regressed before (see CHANGELOG
 * v1.2.2–v1.2.8, v1.4.1, v1.5.2). Pure store logic only; no components, no Reanimated.
 */
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  useSettingsStore,
  maxGuessesForDifficulty,
  boardCountName,
  Difficulty,
} from '../store/settingsStore';
import { useQuordleStore, QuordleGuess } from '../store/quordleStore';
import { useGameStore } from '../store/gameStore';
import { useDailyStore, getDailyAnswers, getDailyAnswersForDay, dailyIndices, emptyDailyGameState } from '../store/dailyStore';
import { emptyBoardStats } from '../store/statsStore';
import answersEnUsJson from '../assets/wordlists/answers_en_us.json';
import answersEnGbJson from '../assets/wordlists/answers_en_gb.json';

const ANSWERS_EN_US = (answersEnUsJson as string[]).map(w => w.toUpperCase());
const ANSWERS_EN_GB = (answersEnGbJson as string[]).map(w => w.toUpperCase());

const SETTINGS_DEFAULTS = {
  language: 'en_us' as const,
  difficulty: 'easy' as Difficulty,
  darkTheme: false,
  colorBlindMode: false,
  enterOnRight: false,
  gameMode: 'wordle' as const,
  boardCount: 4 as const,
  tutorialSeen: false,
};

beforeEach(() => {
  useSettingsStore.setState(SETTINGS_DEFAULTS);
});

afterEach(() => {
  jest.useRealTimers();
});

// ── maxGuessesForDifficulty — single source of truth for guess counts ────────

describe('maxGuessesForDifficulty', () => {
  test('easy/hard: 6 for single board, 5+boardCount capped at 13 otherwise', () => {
    for (const d of ['easy', 'hard'] as Difficulty[]) {
      expect(maxGuessesForDifficulty(d, 1)).toBe(6);
      expect(maxGuessesForDifficulty(d, 2)).toBe(7);
      expect(maxGuessesForDifficulty(d, 3)).toBe(8);
      expect(maxGuessesForDifficulty(d, 4)).toBe(9);
      expect(maxGuessesForDifficulty(d, 6)).toBe(11);
      expect(maxGuessesForDifficulty(d, 8)).toBe(13);
    }
  });

  test('extreme: (5+boardCount)−2 with floor 3', () => {
    expect(maxGuessesForDifficulty('extreme', 1)).toBe(4);
    expect(maxGuessesForDifficulty('extreme', 2)).toBe(5);
    expect(maxGuessesForDifficulty('extreme', 3)).toBe(6);
    expect(maxGuessesForDifficulty('extreme', 4)).toBe(7);
    expect(maxGuessesForDifficulty('extreme', 6)).toBe(9);
    expect(maxGuessesForDifficulty('extreme', 8)).toBe(11);
  });
});

describe('boardCountName', () => {
  test('maps the supported board counts to locked mode names', () => {
    expect(boardCountName(1)).toBe('Wordout');
    expect(boardCountName(2)).toBe('2-out');
    expect(boardCountName(3)).toBe('3-out');
    expect(boardCountName(4)).toBe('4-out');
    expect(boardCountName(6)).toBe('6-out');
    expect(boardCountName(8)).toBe('8-out');
  });
});

// ── Mode detection — the v1.4.1 `boardCount > 1` trap ────────────────────────

describe('settings defaults', () => {
  test('boardCount defaults to 4 while gameMode is wordle — so `boardCount > 1` must never be used to detect multi-board mode', () => {
    const s = useSettingsStore.getState();
    expect(s.gameMode).toBe('wordle');
    expect(s.boardCount).toBe(4);
    // The trap that hid the Stats Daily tab until v1.4.1: this is TRUE for a
    // fresh install that has never seen multi-board mode.
    expect(s.boardCount > 1 && s.gameMode === 'wordle').toBe(true);
  });
});

// ── Quordle hard mode — per-board constraint independence (v1.2.8) ───────────

describe('quordle hard-mode constraints', () => {
  // History: CANDY vs [CIGAR, REBUT].
  // Board 0 (CIGAR): C correct at pos 0, A present → constraints exist.
  // Board 1 (REBUT): all absent → no constraints.
  const history: QuordleGuess[] = [
    {
      word: 'CANDY',
      boardResults: [
        ['correct', 'present', 'absent', 'absent', 'absent'],
        ['absent', 'absent', 'absent', 'absent', 'absent'],
      ],
    },
  ];

  // A guess that violates board 0 (doesn't start with C). ABACK is the first
  // NYT answer, guaranteed valid.
  const VIOLATOR = 'ABACK';

  function seedQuordle(solvedBoards: boolean[]) {
    useSettingsStore.setState({ difficulty: 'hard', gameMode: 'quordle', boardCount: 2 });
    useQuordleStore.setState({
      boardCount: 2,
      maxGuesses: maxGuessesForDifficulty('hard', 2),
      answers: ['CIGAR', 'REBUT'],
      guesses: history,
      currentGuess: VIOLATOR,
      solvedBoards,
      gameStatus: 'playing',
      toast: null,
      waveDoneBoards: [false, false],
      celebrationShown: false,
      snapshots: {},
    });
  }

  test('precondition: test words are in the answer list', () => {
    for (const w of ['CIGAR', 'REBUT', 'ABACK', 'CANDY']) {
      expect(ANSWERS_EN_US).toContain(w);
    }
  });

  test('accepted when at least one unsolved board has no violation', () => {
    seedQuordle([false, false]); // board 1 unsolved, has no constraints → accepts
    useQuordleStore.getState().submitGuess();
    const s = useQuordleStore.getState();
    expect(s.guesses).toHaveLength(2);
    expect(s.toast).toBeNull();
  });

  test('rejected only when ALL unsolved boards reject; toast names the first violation', () => {
    seedQuordle([false, true]); // board 1 solved → only board 0 counts, and it rejects
    useQuordleStore.getState().submitGuess();
    const s = useQuordleStore.getState();
    expect(s.guesses).toHaveLength(1); // unchanged
    expect(s.toast).toBe('Board 1: 1st letter must be C');
  });

  test('easy difficulty applies no constraints', () => {
    seedQuordle([false, true]);
    useSettingsStore.setState({ difficulty: 'easy' });
    useQuordleStore.getState().submitGuess();
    expect(useQuordleStore.getState().guesses).toHaveLength(2);
  });
});

// ── Quordle snapshots — board-count switch round-trip (v1.2.6) ───────────────

describe('quordle switchBoardCount snapshots', () => {
  test('round-trip restores full state including celebrationShown and waveDoneBoards', () => {
    useSettingsStore.setState({ gameMode: 'quordle', boardCount: 4 });
    const seeded = {
      boardCount: 4,
      maxGuesses: 9,
      answers: ['CIGAR', 'REBUT', 'SISSY', 'HUMPH'],
      guesses: [] as QuordleGuess[],
      currentGuess: 'AB',
      solvedBoards: [true, false, false, false],
      gameStatus: 'playing' as const,
      toast: null,
      waveDoneBoards: [true, false, false, false],
      celebrationShown: true,
      snapshots: {},
    };
    useQuordleStore.setState(seeded);

    useQuordleStore.getState().switchBoardCount(2);
    let s = useQuordleStore.getState();
    expect(s.boardCount).toBe(2);
    expect(s.guesses).toHaveLength(0);
    expect(s.currentGuess).toBe('');
    expect(s.celebrationShown).toBe(false);
    expect(s.snapshots[4]).toBeDefined();

    useQuordleStore.getState().switchBoardCount(4);
    s = useQuordleStore.getState();
    expect(s.answers).toEqual(seeded.answers);
    expect(s.currentGuess).toBe('AB');
    expect(s.solvedBoards).toEqual(seeded.solvedBoards);
    expect(s.waveDoneBoards).toEqual(seeded.waveDoneBoards);
    expect(s.celebrationShown).toBe(true);
  });

  test('newGame clears only the current board count snapshot', () => {
    useSettingsStore.setState({ gameMode: 'quordle', boardCount: 4 });
    useQuordleStore.setState({
      boardCount: 4,
      snapshots: {
        2: { answers: ['CIGAR', 'REBUT'], boardCount: 2, maxGuesses: 7, guesses: [], currentGuess: '', solvedBoards: [false, false], gameStatus: 'playing', waveDoneBoards: [false, false], celebrationShown: false },
        4: { answers: ['CIGAR', 'REBUT', 'SISSY', 'HUMPH'], boardCount: 4, maxGuesses: 9, guesses: [], currentGuess: '', solvedBoards: [false, false, false, false], gameStatus: 'playing', waveDoneBoards: [false, false, false, false], celebrationShown: false },
      },
    });
    useQuordleStore.getState().newGame();
    const s = useQuordleStore.getState();
    expect(s.snapshots[4]).toBeUndefined();
    expect(s.snapshots[2]).toBeDefined();
    expect(s.gameStatus).toBe('playing');
    expect(s.guesses).toHaveLength(0);
  });
});

// ── Practice single-board snapshots — switchDifficulty round-trip ────────────

describe('gameStore switchDifficulty snapshots', () => {
  test('round-trip restores board state without confirmation or data loss', () => {
    useSettingsStore.setState({ difficulty: 'easy' });
    const seeded = {
      answer: 'CIGAR',
      guesses: [{ word: 'ABACK', results: ['absent', 'absent', 'present', 'present', 'absent'] as any }],
      currentGuess: 'RE',
      gameStatus: 'playing' as const,
      toast: null,
      waveShown: true,
      celebrationShown: true,
      snapshots: {},
    };
    useGameStore.setState(seeded);

    // App flow: switchDifficulty(d) is called while settings still hold the old difficulty.
    useGameStore.getState().switchDifficulty('hard');
    useSettingsStore.setState({ difficulty: 'hard' });
    let s = useGameStore.getState();
    expect(s.guesses).toHaveLength(0);
    expect(s.currentGuess).toBe('');
    expect(s.snapshots['easy']).toBeDefined();

    useGameStore.getState().switchDifficulty('easy');
    useSettingsStore.setState({ difficulty: 'easy' });
    s = useGameStore.getState();
    expect(s.answer).toBe('CIGAR');
    expect(s.currentGuess).toBe('RE');
    expect(s.waveShown).toBe(true);
    expect(s.celebrationShown).toBe(true);
  });
});

// ── Daily answers — deterministic UTC-midnight derivation ────────────────────

describe('getDailyAnswers', () => {
  test('deterministic for a given day, stable across the UTC day, words from the answer list', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-06T01:00:00Z'));
    const a = getDailyAnswers('en_us');
    expect(getDailyAnswers('en_us')).toEqual(a);

    jest.setSystemTime(new Date('2026-07-06T23:59:00Z'));
    expect(getDailyAnswers('en_us')).toEqual(a);

    for (const w of [a.easy, a.hard, a.extreme]) {
      expect(ANSWERS_EN_US).toContain(w);
    }
    expect(new Set([a.easy, a.hard, a.extreme]).size).toBe(3);

    jest.setSystemTime(new Date('2026-07-07T01:00:00Z'));
    expect(getDailyAnswers('en_us')).not.toEqual(a); // new day, new words
  });

  test('always distinct and full range reachable, over 10000 days, both languages', () => {
    const DAYS = 10000;
    for (const list of [ANSWERS_EN_US, ANSWERS_EN_GB]) {
      let maxIndexSeen = 0;
      for (let day = 0; day < DAYS; day++) {
        const [e, h, x] = dailyIndices(day, list.length);
        expect(new Set([e, h, x]).size).toBe(3);
        for (const idx of [e, h, x]) {
          expect(idx).toBeGreaterThanOrEqual(0);
          expect(idx).toBeLessThan(list.length);
          maxIndexSeen = Math.max(maxIndexSeen, idx);
        }
      }
      // Proves the old `& 0x7FF` cap (max reachable index 2047) is gone.
      expect(maxIndexSeen).toBeGreaterThanOrEqual(2048);
    }
  });

  test('getDailyAnswersForDay is a pure function of (language, dayNum)', () => {
    const a = getDailyAnswersForDay('en_us', 200);
    expect(getDailyAnswersForDay('en_us', 200)).toEqual(a);
    expect(getDailyAnswersForDay('en_us', 201)).not.toEqual(a);
  });
});

// ── Daily reset — per-difficulty streak keep/reset (v1.4.0 gate design) ──────

describe('dailyStore checkAndReset', () => {
  test('new day resets games, keeps yesterday-win streaks, zeroes missed-day streaks', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-06T09:00:00'));
    useDailyStore.setState({
      lastPlayedDate: '2026-07-05',
      dailyAnswers: { easy: 'CIGAR', hard: 'REBUT', extreme: 'SISSY' },
      activeDailyDifficulty: 'extreme',
      games: {
        easy: {
          ...emptyDailyGameState(),
          status: 'completed',
          solved: true,
          lastWinDate: '2026-07-05', // won yesterday → streak survives
          stats: { ...emptyBoardStats(), totalGames: 5, wins: 4, currentStreak: 3, maxStreak: 3 },
        },
        hard: {
          ...emptyDailyGameState(),
          status: 'completed',
          lastWinDate: '2026-07-03', // missed days → streak resets
          stats: { ...emptyBoardStats(), totalGames: 4, wins: 2, currentStreak: 2, maxStreak: 2 },
        },
        extreme: emptyDailyGameState(),
      },
    });

    useDailyStore.getState().checkAndReset();
    const s = useDailyStore.getState();
    expect(s.games.easy.status).toBe('available');
    expect(s.games.easy.guesses).toHaveLength(0);
    expect(s.games.easy.stats.currentStreak).toBe(3);
    expect(s.games.easy.stats.totalGames).toBe(5); // lifetime stats untouched
    expect(s.games.easy.lastWinDate).toBe('2026-07-05');
    expect(s.games.hard.stats.currentStreak).toBe(0);
    expect(s.dailyAnswers).toEqual({ easy: '', hard: '', extreme: '' });
    expect(s.activeDailyDifficulty).toBe('easy');
  });

  test('same-day call is a no-op', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-06T09:00:00'));
    useDailyStore.setState({
      lastPlayedDate: '2026-07-06',
      activeDailyDifficulty: 'hard',
      games: {
        ...useDailyStore.getState().games,
        hard: { ...emptyDailyGameState(), status: 'playing', currentGuess: 'CRA' },
      },
    });
    useDailyStore.getState().checkAndReset();
    const s = useDailyStore.getState();
    expect(s.games.hard.status).toBe('playing');
    expect(s.games.hard.currentGuess).toBe('CRA');
    expect(s.activeDailyDifficulty).toBe('hard');
  });
});

// ── Daily guess limit — must match maxGuessesForDifficulty(d, 1) ─────────────

describe('daily guess limit', () => {
  test('extreme daily completes as lost on the 4th wrong guess', () => {
    expect(maxGuessesForDifficulty('extreme', 1)).toBe(4);
    useDailyStore.setState({
      activeWordleMode: 'daily',
      activeDailyDifficulty: 'extreme',
      dailyAnswers: { easy: 'CIGAR', hard: 'REBUT', extreme: 'SISSY' },
      toast: null,
      games: {
        easy: emptyDailyGameState(),
        hard: emptyDailyGameState(),
        extreme: { ...emptyDailyGameState(), status: 'playing' },
      },
    });

    const wrong = ['ABACK', 'ABASE', 'ABATE', 'ABBEY']; // all valid answers ≠ SISSY
    for (const w of wrong) {
      expect(useDailyStore.getState().games.extreme.status).toBe('playing');
      useDailyStore.getState().setCurrentGuess(w);
      useDailyStore.getState().submitGuess();
    }
    const g = useDailyStore.getState().games.extreme;
    expect(g.guesses).toHaveLength(4);
    expect(g.status).toBe('completed');
    expect(g.solved).toBe(false);
    expect(g.stats.currentStreak).toBe(0);
  });
});
