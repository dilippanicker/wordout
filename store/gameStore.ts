import { create } from 'zustand';
import { useSettingsStore, Language, maxGuessesForDifficulty } from './settingsStore';
import { useStatsStore } from './statsStore';
import answerListEnUs from '../assets/wordlists/answers_en_us.json';
import answerListEnGb from '../assets/wordlists/answers_en_gb.json';
import guessListEnUs from '../assets/wordlists/guesses_en_us.json';
import guessListEnGb from '../assets/wordlists/guesses_en_gb.json';

const ANSWERS: Record<Language, string[]> = {
  en_us: (answerListEnUs as string[]).map(w => w.toUpperCase()),
  en_gb: (answerListEnGb as string[]).map(w => w.toUpperCase()),
};

export const WORD_COUNT_ANSWERS: Record<Language, number> = {
  en_us: (answerListEnUs as string[]).length,
  en_gb: (answerListEnGb as string[]).length,
};

export const WORD_COUNT_GUESSES: Record<Language, number> = {
  en_us: (answerListEnUs as string[]).length + (guessListEnUs as string[]).length,
  en_gb: (answerListEnGb as string[]).length + (guessListEnGb as string[]).length,
};

// Union answers into valid words so no answer is ever rejected as invalid.
const VALID_WORDS: Record<Language, Set<string>> = {
  en_us: new Set([...ANSWERS.en_us, ...(guessListEnUs as string[]).map(w => w.toUpperCase())]),
  en_gb: new Set([...ANSWERS.en_gb, ...(guessListEnGb as string[]).map(w => w.toUpperCase())]),
};

export type LetterResult = 'correct' | 'present' | 'absent';

export interface GuessResult {
  word: string;
  results: LetterResult[];
}

export type GameStatus = 'playing' | 'won' | 'lost';

interface GameState {
  answer: string;
  guesses: GuessResult[];
  currentGuess: string;
  gameStatus: GameStatus;
  toast: string | null;
  waveShown: boolean;
  celebrationShown: boolean;
  addLetter: (letter: string) => void;
  removeLetter: () => void;
  submitGuess: () => void;
  clearToast: () => void;
  clearCurrentGuess: () => void;
  setWaveShown: (v: boolean) => void;
  setCelebrationShown: (v: boolean) => void;
  newGame: () => void;
}

function pickAnswer(language: Language): string {
  const list = ANSWERS[language];
  return list[Math.floor(Math.random() * list.length)];
}

function evaluateGuess(guess: string, answer: string): LetterResult[] {
  const result: LetterResult[] = Array(5).fill('absent');
  const answerUsed = Array(5).fill(false);

  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) {
      result[i] = 'correct';
      answerUsed[i] = true;
    }
  }

  for (let i = 0; i < 5; i++) {
    if (result[i] === 'correct') continue;
    for (let j = 0; j < 5; j++) {
      if (!answerUsed[j] && guess[i] === answer[j]) {
        result[i] = 'present';
        answerUsed[j] = true;
        break;
      }
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

export const useGameStore = create<GameState>((set, get) => ({
  answer: pickAnswer(useSettingsStore.getState().language),
  guesses: [],
  currentGuess: '',
  gameStatus: 'playing',
  toast: null,
  waveShown: false,
  celebrationShown: false,

  addLetter: (letter) => {
    const { currentGuess, gameStatus } = get();
    if (gameStatus !== 'playing' || currentGuess.length >= 5) return;
    set({ currentGuess: currentGuess + letter });
  },

  removeLetter: () => {
    const { currentGuess } = get();
    if (currentGuess.length === 0) return;
    set({ currentGuess: currentGuess.slice(0, -1) });
  },

  submitGuess: () => {
    const { currentGuess, answer, guesses, gameStatus } = get();
    if (gameStatus !== 'playing') return;

    if (currentGuess.length < 5) {
      set({ toast: 'Too short' });
      return;
    }

    const { language, difficulty } = useSettingsStore.getState();
    const maxGuesses = maxGuessesForDifficulty(difficulty, 1);

    if (!VALID_WORDS[language].has(currentGuess)) {
      set({ toast: 'Not in word list' });
      return;
    }

    if (guesses.some(g => g.word === currentGuess)) {
      set({ toast: 'Already guessed' });
      return;
    }

    if (difficulty === 'hard') {
      const violation = checkHardModeConstraints(guesses, currentGuess);
      if (violation) {
        set({ toast: violation });
        return;
      }
    }

    const results = evaluateGuess(currentGuess, answer);
    const newGuesses = [...guesses, { word: currentGuess, results }];
    const won = currentGuess === answer;
    const lost = !won && newGuesses.length >= maxGuesses;

    set({
      guesses: newGuesses,
      currentGuess: '',
      gameStatus: won ? 'won' : lost ? 'lost' : 'playing',
    });

    if (won || lost) {
      useStatsStore.getState().recordResult(won, newGuesses.length, 'wordle');
    }
  },

  clearToast: () => set({ toast: null }),
  clearCurrentGuess: () => set({ currentGuess: '' }),
  setWaveShown: (v) => set({ waveShown: v }),
  setCelebrationShown: (v) => set({ celebrationShown: v }),

  newGame: () => {
    const language = useSettingsStore.getState().language;
    set({
      answer: pickAnswer(language),
      guesses: [],
      currentGuess: '',
      gameStatus: 'playing',
      toast: null,
      waveShown: false,
      celebrationShown: false,
    });
  },
}));

// Only reset on language change — mode switching preserves game state.
useSettingsStore.subscribe((curr, prev) => {
  if (curr.language !== prev.language) {
    useGameStore.getState().newGame();
  }
});
