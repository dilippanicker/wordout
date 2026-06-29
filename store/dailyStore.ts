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

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getDailyAnswer(language: Language): string {
  const list = ANSWERS[language];
  return list[getDailyIndex() % list.length];
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

interface DailyState {
  // Today's daily game state
  lastPlayedDate: string;
  dailyStatus: DailyStatus;
  dailyGuesses: GuessResult[];
  currentGuess: string;
  dailyAnswer: string;
  dailySolved: boolean;
  dailyHardMode: boolean;
  dailyDifficulty: Difficulty;
  toast: string | null;

  // Daily-specific stats (separate from practice stats in statsStore)
  stats: BoardStats;

  // Which single-board sub-mode is active
  activeWordleMode: WordleMode;

  // Wave animation shown flag (prevents re-animation on mode switch back)
  waveShown: boolean;
  // Celebration overlay shown flag (prevents re-firing on mode switch / app relaunch)
  celebrationShown: boolean;

  // Actions
  checkAndReset: () => void;
  startOrResumeDaily: () => void;
  addLetter: (letter: string) => void;
  removeLetter: () => void;
  submitGuess: () => void;
  clearToast: () => void;
  clearCurrentGuess: () => void;
  setCurrentGuess: (guess: string) => void;
  setActiveWordleMode: (mode: WordleMode) => void;
  setWaveShown: (v: boolean) => void;
  setCelebrationShown: (v: boolean) => void;
  // Called when difficulty changes mid-daily after abandon confirm
  resetDailyForToday: () => void;
  resetDailyStats: () => void;
}

export const useDailyStore = create<DailyState>()(
  persist(
    (set, get) => ({
      lastPlayedDate: '',
      dailyStatus: 'available',
      dailyGuesses: [],
      currentGuess: '',
      dailyAnswer: '',
      dailySolved: false,
      dailyHardMode: false,
      dailyDifficulty: 'easy',
      toast: null,
      stats: emptyBoardStats(),
      activeWordleMode: 'practice',
      waveShown: false,
      celebrationShown: false,

      checkAndReset: () => {
        if (get().lastPlayedDate !== getTodayString()) {
          set({
            dailyStatus: 'available',
            dailyGuesses: [],
            currentGuess: '',
            dailyAnswer: '',
            dailySolved: false,
            toast: null,
            waveShown: false,
            celebrationShown: false,
          });
        }
      },

      startOrResumeDaily: () => {
        if (get().dailyStatus !== 'available') return;
        const { language } = useSettingsStore.getState();
        set({
          dailyStatus: 'playing',
          dailyGuesses: [],
          currentGuess: '',
          dailyAnswer: getDailyAnswer(language),
          dailySolved: false,
          dailyHardMode: false,   // Daily is always Easy — no hard mode constraints
          dailyDifficulty: 'easy',
          lastPlayedDate: getTodayString(),
          toast: null,
          waveShown: false,
          celebrationShown: false,
        });
      },

      addLetter: (letter) => {
        const { currentGuess, dailyStatus } = get();
        if (dailyStatus !== 'playing' || currentGuess.length >= 5) return;
        set({ currentGuess: currentGuess + letter });
      },

      removeLetter: () => {
        const { currentGuess } = get();
        if (currentGuess.length === 0) return;
        set({ currentGuess: currentGuess.slice(0, -1) });
      },

      submitGuess: () => {
        const { currentGuess, dailyAnswer, dailyGuesses, dailyStatus, dailyHardMode, dailyDifficulty } = get();
        if (dailyStatus !== 'playing') return;

        if (currentGuess.length < 5) { set({ toast: 'Too short' }); return; }

        const { language } = useSettingsStore.getState();
        if (!VALID_WORDS[language].has(currentGuess)) { set({ toast: 'Not in word list' }); return; }
        if (dailyGuesses.some(g => g.word === currentGuess)) { set({ toast: 'Already guessed' }); return; }

        if (dailyHardMode) {
          const violation = checkHardModeConstraints(dailyGuesses, currentGuess);
          if (violation) { set({ toast: violation }); return; }
        }

        const maxGuesses = maxGuessesForDifficulty(dailyDifficulty, 1);
        const results = evaluateGuess(currentGuess, dailyAnswer);
        const newGuesses = [...dailyGuesses, { word: currentGuess, results }];
        const won = currentGuess === dailyAnswer;
        const lost = !won && newGuesses.length >= maxGuesses;

        if (won || lost) {
          const { stats } = get();
          const newStreak = won ? stats.currentStreak + 1 : 0;
          const key = String(newGuesses.length);
          set({
            dailyGuesses: newGuesses,
            currentGuess: '',
            dailyStatus: 'completed',
            dailySolved: won,
            toast: null,
            stats: {
              totalGames: stats.totalGames + 1,
              wins: won ? stats.wins + 1 : stats.wins,
              currentStreak: newStreak,
              maxStreak: Math.max(stats.maxStreak, newStreak),
              guessCounts: won
                ? { ...stats.guessCounts, [key]: (stats.guessCounts[key] ?? 0) + 1 }
                : stats.guessCounts,
            },
          });
        } else {
          set({ dailyGuesses: newGuesses, currentGuess: '' });
        }
      },

      clearToast: () => set({ toast: null }),
      clearCurrentGuess: () => set({ currentGuess: '' }),
      setCurrentGuess: (guess) => set({ currentGuess: guess }),

      setActiveWordleMode: (mode) => set({ activeWordleMode: mode }),
      setWaveShown: (v) => set({ waveShown: v }),
      setCelebrationShown: (v) => set({ celebrationShown: v }),

      resetDailyStats: () => set({ stats: emptyBoardStats() }),

      resetDailyForToday: () => {
        const { language } = useSettingsStore.getState();
        set({
          dailyStatus: 'playing',
          dailyGuesses: [],
          currentGuess: '',
          dailyAnswer: getDailyAnswer(language),
          dailySolved: false,
          dailyHardMode: false,
          dailyDifficulty: 'easy',
          lastPlayedDate: getTodayString(),
          toast: null,
          waveShown: false,
          celebrationShown: false,
        });
      },
    }),
    {
      name: 'wordout-daily',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
