import { create } from 'zustand';
import { useSettingsStore, Language } from './settingsStore';
import { useStatsStore } from './statsStore';
import answerListEnUs from '../assets/wordlists/answers_en_us.json';
import answerListEnGb from '../assets/wordlists/answers_en_gb.json';
import guessListEnUs from '../assets/wordlists/guesses_en_us.json';
import guessListEnGb from '../assets/wordlists/guesses_en_gb.json';

const ANSWERS: Record<Language, string[]> = {
  en_us: (answerListEnUs as string[]).map(w => w.toUpperCase()),
  en_gb: (answerListEnGb as string[]).map(w => w.toUpperCase()),
};

const VALID_WORDS: Record<Language, Set<string>> = {
  en_us: new Set([...ANSWERS.en_us, ...(guessListEnUs as string[]).map(w => w.toUpperCase())]),
  en_gb: new Set([...ANSWERS.en_gb, ...(guessListEnGb as string[]).map(w => w.toUpperCase())]),
};

export type LetterResult = 'correct' | 'present' | 'absent';

export interface QuordleGuess {
  word: string;
  // One LetterResult[] per board, index 0-3
  boardResults: [LetterResult[], LetterResult[], LetterResult[], LetterResult[]];
}

export type GameStatus = 'playing' | 'won' | 'lost';

interface QuordleState {
  answers: [string, string, string, string];
  guesses: QuordleGuess[];
  currentGuess: string;
  solvedBoards: [boolean, boolean, boolean, boolean];
  gameStatus: GameStatus;
  toast: string | null;
  addLetter: (letter: string) => void;
  removeLetter: () => void;
  submitGuess: () => void;
  clearToast: () => void;
  newGame: () => void;
}

function pickFourAnswers(language: Language): [string, string, string, string] {
  const list = ANSWERS[language];
  // Fisher-Yates partial shuffle for first 4 — avoids duplicate answers
  const arr = [...list];
  for (let i = 0; i < 4; i++) {
    const j = i + Math.floor(Math.random() * (arr.length - i));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return [arr[0], arr[1], arr[2], arr[3]] as [string, string, string, string];
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
      if (!answerUsed[j] && guess[i] === answer[j]) {
        result[i] = 'present'; answerUsed[j] = true; break;
      }
    }
  }
  return result;
}

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th'];

function checkHardModeConstraints(
  guesses: Array<{ word: string; results: LetterResult[] }>,
  guess: string,
): string | null {
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
  const locked = new Set(requiredAtPos.values());
  for (const letter of requiredLetters) {
    if (!locked.has(letter) && !guess.includes(letter)) return `Guess must contain ${letter}`;
  }
  return null;
}

function initialState(language: Language) {
  return {
    answers: pickFourAnswers(language),
    guesses: [] as QuordleGuess[],
    currentGuess: '',
    solvedBoards: [false, false, false, false] as [boolean, boolean, boolean, boolean],
    gameStatus: 'playing' as GameStatus,
    toast: null as string | null,
  };
}

export const useQuordleStore = create<QuordleState>((set, get) => ({
  ...initialState(useSettingsStore.getState().language),

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
    const { currentGuess, answers, guesses, gameStatus, solvedBoards } = get();
    if (gameStatus !== 'playing') return;

    if (currentGuess.length < 5) {
      set({ toast: 'Too short' });
      return;
    }

    const { language, hardMode } = useSettingsStore.getState();

    if (!VALID_WORDS[language].has(currentGuess)) {
      set({ toast: 'Not in word list' });
      return;
    }

    // Hard mode: the guess must satisfy constraints from every unsolved board.
    if (hardMode) {
      for (let b = 0; b < 4; b++) {
        if (solvedBoards[b]) continue;
        const boardHistory = guesses.map(g => ({ word: g.word, results: g.boardResults[b] }));
        const violation = checkHardModeConstraints(boardHistory, currentGuess);
        if (violation) {
          set({ toast: `Board ${b + 1}: ${violation}` });
          return;
        }
      }
    }

    // Evaluate against all 4 boards.
    const boardResults: [LetterResult[], LetterResult[], LetterResult[], LetterResult[]] = [
      evaluateGuess(currentGuess, answers[0]),
      evaluateGuess(currentGuess, answers[1]),
      evaluateGuess(currentGuess, answers[2]),
      evaluateGuess(currentGuess, answers[3]),
    ];

    const newGuesses = [...guesses, { word: currentGuess, boardResults }];

    // Mark newly solved boards.
    const newSolved = solvedBoards.map(
      (was, b) => was || currentGuess === answers[b],
    ) as [boolean, boolean, boolean, boolean];

    const allSolved = newSolved.every(Boolean);
    const outOfGuesses = newGuesses.length >= 9;
    const newStatus: GameStatus = allSolved ? 'won' : outOfGuesses ? 'lost' : 'playing';

    set({ guesses: newGuesses, currentGuess: '', solvedBoards: newSolved, gameStatus: newStatus });

    if (newStatus !== 'playing') {
      useStatsStore.getState().recordResult(newStatus === 'won', newGuesses.length);
    }
  },

  clearToast: () => set({ toast: null }),

  newGame: () => set(initialState(useSettingsStore.getState().language)),
}));

// Only reset on language change — mode switching preserves game state.
useSettingsStore.subscribe((curr, prev) => {
  if (curr.language !== prev.language) {
    useQuordleStore.getState().newGame();
  }
});
