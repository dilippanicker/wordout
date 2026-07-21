import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettingsStore, Language, Difficulty, maxGuessesForDifficulty } from './settingsStore';
import { BoardStats, emptyBoardStats } from './statsStore';
import { GuessResult, LetterResult } from './gameStore';
import answerListEnUs from '../assets/wordlists/answers_en_us.json';
import answerListEnGb from '../assets/wordlists/answers_en_gb.json';
import guessListEnUs from '../assets/wordlists/guesses_en_us.json';
import guessListEnGb from '../assets/wordlists/guesses_en_gb.json';

export type WordleMode = 'daily' | 'practice';
export type DailyStatus = 'available' | 'playing' | 'completed';

// Daily #1 = 2026-01-01
export const DAILY_EPOCH = new Date('2026-01-01').getTime();

const ANSWERS: Record<Language, string[]> = {
  en_us: (answerListEnUs as string[]).map(w => w.toUpperCase()),
  en_gb: (answerListEnGb as string[]).map(w => w.toUpperCase()),
};

const VALID_WORDS: Record<Language, Set<string>> = {
  en_us: new Set([...ANSWERS.en_us, ...(guessListEnUs as string[]).map(w => w.toUpperCase())]),
  en_gb: new Set([...ANSWERS.en_gb, ...(guessListEnGb as string[]).map(w => w.toUpperCase())]),
};

export function getDailyIndex(): number {
  return Math.floor((Date.now() - DAILY_EPOCH) / 86400000);
}

// UTC-based — must agree with getDailyAnswers()'s UTC-midnight day boundary.
// A local-calendar-day version caused the daily reset to fire before the word
// actually rotated for any timezone ahead of UTC (e.g. IST), repeating the
// previous day's word until real UTC midnight caught up.
function getTodayString(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function getYesterdayString(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// mulberry32 — small deterministic PRNG, seeded per UTC day
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Three distinct indices into a list of length n, deterministic per day.
// Full range [0, n) is reachable (unlike the old bit-masked derivation).
export function dailyIndices(dayNum: number, n: number): [number, number, number] {
  const rand = mulberry32(Math.imul(dayNum, 2654435761));
  const picked: number[] = [];
  while (picked.length < 3) {
    const v = Math.floor(rand() * n);
    if (!picked.includes(v)) picked.push(v);
  }
  return picked as [number, number, number];
}

export function getDailyAnswersForDay(language: Language, dayNum: number): { easy: string; hard: string; extreme: string } {
  const list = ANSWERS[language];
  const [easyIdx, hardIdx, extremeIdx] = dailyIndices(dayNum, list.length);
  return { easy: list[easyIdx], hard: list[hardIdx], extreme: list[extremeIdx] };
}

export function getDailyAnswers(language: Language): { easy: string; hard: string; extreme: string } {
  const midnight = new Date();
  midnight.setUTCHours(0, 0, 0, 0);
  const dayNum = Math.floor(midnight.getTime() / 86400000);
  return getDailyAnswersForDay(language, dayNum);
}

function evaluateGuess(guess: string, answer: string): LetterResult[] {
  const result: LetterResult[] = Array(5).fill('absent');
  const answerUsed = Array(5).fill(false);
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) { result[i] = 'correct'; answerUsed[i] = true; }
  }
  for (let i = 0; i < 5; i++) {
    if (result[i] === 'correct') continue;
    for (let j = 0; j < 5; j++) {
      if (!answerUsed[j] && guess[i] === answer[j]) { result[i] = 'present'; answerUsed[j] = true; break; }
    }
  }
  return result;
}

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th'];

function checkHardModeConstraints(guesses: GuessResult[], guess: string): string | null {
  const requiredAtPos = new Map<number, string>();
  const requiredLetters = new Set<string>();
  for (const { word, results } of guesses) {
    for (let i = 0; i < 5; i++) {
      if (results[i] === 'correct') requiredAtPos.set(i, word[i]);
      else if (results[i] === 'present') requiredLetters.add(word[i]);
    }
  }
  for (const [pos, letter] of requiredAtPos) {
    if (guess[pos] !== letter) return `${ORDINALS[pos]} letter must be ${letter}`;
  }
  const lockedLetters = new Set(requiredAtPos.values());
  for (const letter of requiredLetters) {
    if (!lockedLetters.has(letter) && !guess.includes(letter)) return `Guess must contain ${letter}`;
  }
  return null;
}

// ── Per-difficulty daily game state ─────────────────────────────────────────

export interface DailyGameState {
  status: DailyStatus;
  guesses: GuessResult[];
  currentGuess: string;
  solved: boolean;
  waveShown: boolean;
  celebrationShown: boolean;
  lastWinDate: string;   // 'YYYY-MM-DD' or '' — for missed-day streak detection
  stats: BoardStats;
}

export function emptyDailyGameState(): DailyGameState {
  return {
    status: 'available',
    guesses: [],
    currentGuess: '',
    solved: false,
    waveShown: false,
    celebrationShown: false,
    lastWinDate: '',
    stats: emptyBoardStats(),
  };
}

// ── Store types ──────────────────────────────────────────────────────────────

const DIFFICULTIES: Difficulty[] = ['easy', 'hard', 'extreme'];

interface DailyState {
  lastPlayedDate: string;
  // Per-difficulty answers — all set together on first daily start of the day
  dailyAnswers: { easy: string; hard: string; extreme: string };

  // Per-difficulty game states
  games: {
    easy: DailyGameState;
    hard: DailyGameState;
    extreme: DailyGameState;
  };

  // Which daily difficulty tab is active
  activeDailyDifficulty: Difficulty;

  // Daily vs practice
  activeWordleMode: WordleMode;

  // Ephemeral game toast
  toast: string | null;

  // Actions
  checkAndReset: () => void;
  startOrResumeDailyGame: (difficulty: Difficulty) => void;
  setActiveDailyDifficulty: (difficulty: Difficulty) => void;
  addLetter: (letter: string) => void;
  removeLetter: () => void;
  submitGuess: () => void;
  clearToast: () => void;
  clearCurrentGuess: () => void;
  setCurrentGuess: (guess: string) => void;
  setActiveWordleMode: (mode: WordleMode) => void;
  setWaveShown: (difficulty: Difficulty, v: boolean) => void;
  setCelebrationShown: (difficulty: Difficulty, v: boolean) => void;
  resetDailyStats: () => void;
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useDailyStore = create<DailyState>()(
  persist(
    (set, get) => ({
      lastPlayedDate: '',
      dailyAnswers: { easy: '', hard: '', extreme: '' },
      games: {
        easy: emptyDailyGameState(),
        hard: emptyDailyGameState(),
        extreme: emptyDailyGameState(),
      },
      activeDailyDifficulty: 'easy',
      activeWordleMode: 'practice',
      toast: null,

      checkAndReset: () => {
        const today = getTodayString();
        if (get().lastPlayedDate === today) return;

        const yesterday = getYesterdayString();
        const { games } = get();

        const newGames = { ...games };
        for (const diff of DIFFICULTIES) {
          const g = games[diff];
          // Reset streak if the user didn't win yesterday (missed day or earlier win)
          const streakResets = g.lastWinDate !== '' && g.lastWinDate !== yesterday;
          newGames[diff] = {
            ...emptyDailyGameState(),
            lastWinDate: g.lastWinDate,
            stats: {
              ...g.stats,
              currentStreak: streakResets ? 0 : g.stats.currentStreak,
            },
          };
        }

        set({
          games: newGames,
          dailyAnswers: { easy: '', hard: '', extreme: '' },
          toast: null,
          activeDailyDifficulty: 'easy',
        });
      },

      startOrResumeDailyGame: (difficulty) => {
        const { games, dailyAnswers } = get();
        const game = games[difficulty];
        if (game.status !== 'available') return;

        const { language } = useSettingsStore.getState();
        const today = getTodayString();
        // Compute all three answers together; reuse stored if already set today
        const answers = dailyAnswers.easy ? dailyAnswers : getDailyAnswers(language);
        if (__DEV__) {
          console.log(`[Daily words] easy=${answers.easy} hard=${answers.hard} extreme=${answers.extreme}`);
        }

        set({
          lastPlayedDate: today,
          dailyAnswers: answers,
          games: {
            ...games,
            [difficulty]: {
              ...emptyDailyGameState(),
              status: 'playing',
            },
          },
        });
      },

      setActiveDailyDifficulty: (difficulty) => set({ activeDailyDifficulty: difficulty }),

      addLetter: (letter) => {
        const { games, activeDailyDifficulty } = get();
        const game = games[activeDailyDifficulty];
        if (game.status !== 'playing' || game.currentGuess.length >= 5) return;
        set({
          games: {
            ...games,
            [activeDailyDifficulty]: { ...game, currentGuess: game.currentGuess + letter },
          },
        });
      },

      removeLetter: () => {
        const { games, activeDailyDifficulty } = get();
        const game = games[activeDailyDifficulty];
        if (game.currentGuess.length === 0) return;
        set({
          games: {
            ...games,
            [activeDailyDifficulty]: { ...game, currentGuess: game.currentGuess.slice(0, -1) },
          },
        });
      },

      submitGuess: () => {
        const { games, activeDailyDifficulty, dailyAnswers } = get();
        const game = games[activeDailyDifficulty];
        if (game.status !== 'playing') return;

        const { currentGuess, guesses } = game;
        if (currentGuess.length < 5) { set({ toast: 'Too short' }); return; }

        const { language } = useSettingsStore.getState();
        if (!VALID_WORDS[language].has(currentGuess)) { set({ toast: 'Not in word list' }); return; }
        if (guesses.some(g => g.word === currentGuess)) { set({ toast: 'Already guessed' }); return; }

        if (activeDailyDifficulty === 'hard') {
          const violation = checkHardModeConstraints(guesses, currentGuess);
          if (violation) { set({ toast: violation }); return; }
        }

        const dailyAnswer = dailyAnswers[activeDailyDifficulty];
        const maxGuesses = maxGuessesForDifficulty(activeDailyDifficulty, 1);
        const results = evaluateGuess(currentGuess, dailyAnswer);
        const newGuesses = [...guesses, { word: currentGuess, results }];
        const won = currentGuess === dailyAnswer;
        const lost = !won && newGuesses.length >= maxGuesses;

        if (won || lost) {
          const { stats } = game;
          const today = getTodayString();
          const newStreak = won ? stats.currentStreak + 1 : 0;
          const key = String(newGuesses.length);
          set({
            games: {
              ...games,
              [activeDailyDifficulty]: {
                ...game,
                guesses: newGuesses,
                currentGuess: '',
                status: 'completed',
                solved: won,
                lastWinDate: won ? today : game.lastWinDate,
                stats: {
                  totalGames: stats.totalGames + 1,
                  wins: won ? stats.wins + 1 : stats.wins,
                  currentStreak: newStreak,
                  maxStreak: Math.max(stats.maxStreak, newStreak),
                  guessCounts: won
                    ? { ...stats.guessCounts, [key]: (stats.guessCounts[key] ?? 0) + 1 }
                    : stats.guessCounts,
                },
              },
            },
            toast: null,
          });
        } else {
          set({
            games: {
              ...games,
              [activeDailyDifficulty]: { ...game, guesses: newGuesses, currentGuess: '' },
            },
          });
        }
      },

      clearToast: () => set({ toast: null }),

      clearCurrentGuess: () => {
        const { games, activeDailyDifficulty } = get();
        const game = games[activeDailyDifficulty];
        set({ games: { ...games, [activeDailyDifficulty]: { ...game, currentGuess: '' } } });
      },

      setCurrentGuess: (guess) => {
        const { games, activeDailyDifficulty } = get();
        const game = games[activeDailyDifficulty];
        set({ games: { ...games, [activeDailyDifficulty]: { ...game, currentGuess: guess } } });
      },

      setActiveWordleMode: (mode) => set({ activeWordleMode: mode }),

      setWaveShown: (difficulty, v) => {
        const { games } = get();
        set({ games: { ...games, [difficulty]: { ...games[difficulty], waveShown: v } } });
      },

      setCelebrationShown: (difficulty, v) => {
        const { games } = get();
        set({ games: { ...games, [difficulty]: { ...games[difficulty], celebrationShown: v } } });
      },

      resetDailyStats: () => {
        const { games } = get();
        set({
          games: {
            easy:    { ...games.easy,    stats: emptyBoardStats() },
            hard:    { ...games.hard,    stats: emptyBoardStats() },
            extreme: { ...games.extreme, stats: emptyBoardStats() },
          },
        });
      },
    }),
    {
      name: 'wordout-daily',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persisted: any, fromVersion: number) => {
        if (fromVersion === 0) {
          // v1.3.0 → v1.4.0+: flat fields → games + per-difficulty answers
          const won = persisted.dailySolved === true;
          const lastWinDate = (won && persisted.lastPlayedDate) ? persisted.lastPlayedDate : '';
          return {
            lastPlayedDate: persisted.lastPlayedDate ?? '',
            dailyAnswers: { easy: persisted.dailyAnswer ?? '', hard: '', extreme: '' },
            games: {
              easy: {
                status:           persisted.dailyStatus ?? 'available',
                guesses:          persisted.dailyGuesses ?? [],
                currentGuess:     persisted.currentGuess ?? '',
                solved:           persisted.dailySolved ?? false,
                waveShown:        persisted.waveShown ?? false,
                celebrationShown: persisted.celebrationShown ?? false,
                lastWinDate,
                stats:            persisted.stats ?? emptyBoardStats(),
              },
              hard:    emptyDailyGameState(),
              extreme: emptyDailyGameState(),
            },
            activeDailyDifficulty: 'easy',
            activeWordleMode: persisted.activeWordleMode ?? 'practice',
            toast: null,
          };
        }
        if (fromVersion === 1) {
          // Interim v1.4.0 (single dailyAnswer) → v1.4.0 final (per-difficulty dailyAnswers)
          return {
            ...persisted,
            dailyAnswers: { easy: persisted.dailyAnswer ?? '', hard: '', extreme: '' },
          };
        }
        return persisted;
      },
    },
  ),
);
