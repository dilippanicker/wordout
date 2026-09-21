import { create } from 'zustand';
import { useSettingsStore, Language, Difficulty, maxGuessesForDifficulty } from './settingsStore';
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
  boardResults: LetterResult[][];
}

export type GameStatus = 'playing' | 'won' | 'lost';

interface QuordleSnapshot {
  answers: string[];
  boardCount: number;
  maxGuesses: number;
  guesses: QuordleGuess[];
  currentGuess: string;
  solvedBoards: boolean[];
  gameStatus: GameStatus;
  waveDoneBoards: boolean[];
  celebrationShown: boolean;
}

interface QuordleState {
  answers: string[];
  boardCount: number;
  maxGuesses: number;
  guesses: QuordleGuess[];
  currentGuess: string;
  solvedBoards: boolean[];
  gameStatus: GameStatus;
  toast: string | null;
  waveDoneBoards: boolean[];
  celebrationShown: boolean;
  // Saved states per difficulty+board-count combo — allows restoring a game when cycling back to a previous one.
  snapshots: Record<string, QuordleSnapshot>;
  // Last difficulty played at each board count — lets switchBoardCount land on it instead
  // of whatever difficulty happened to be active on the board count you're leaving.
  lastDifficultyByBoardCount: Record<number, Difficulty>;
  addLetter: (letter: string) => void;
  removeLetter: () => void;
  submitGuess: () => void;
  clearToast: () => void;
  clearCurrentGuess: () => void;
  setCurrentGuess: (guess: string) => void;
  setWaveDone: (boardIndex: number) => void;
  setCelebrationShown: (v: boolean) => void;
  newGame: () => void;
  // Returns the difficulty now active for board count n (its last-played difficulty,
  // or 'easy' if n has never been visited) — callers must pass this to setDifficulty().
  switchBoardCount: (n: number) => Difficulty;
  switchDifficulty: (difficulty: Difficulty) => void;
  // Snapshot-aware language switch, mirroring switchDifficulty — called from the
  // settingsStore subscribe below, which has both the old and new language in hand.
  switchLanguage: (oldLanguage: Language, newLanguage: Language) => void;
}

function snapshotKey(language: Language, difficulty: Difficulty, boardCount: number): string {
  return `${language}-${difficulty}-${boardCount}`;
}

function captureSnapshot(s: QuordleState): QuordleSnapshot {
  return {
    answers: s.answers,
    boardCount: s.boardCount,
    maxGuesses: s.maxGuesses,
    guesses: s.guesses,
    currentGuess: s.currentGuess,
    solvedBoards: s.solvedBoards,
    gameStatus: s.gameStatus,
    waveDoneBoards: s.waveDoneBoards,
    celebrationShown: s.celebrationShown,
  };
}

function pickAnswers(n: number, language: Language): string[] {
  const list = ANSWERS[language];
  const arr = [...list];
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (arr.length - i));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
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

function initialState(language: Language, boardCount: number, difficulty?: Difficulty) {
  const diff = difficulty ?? useSettingsStore.getState().difficulty;
  const maxGuesses = maxGuessesForDifficulty(diff, boardCount);
  return {
    answers: pickAnswers(boardCount, language),
    boardCount,
    maxGuesses,
    guesses: [] as QuordleGuess[],
    currentGuess: '',
    solvedBoards: Array(boardCount).fill(false) as boolean[],
    gameStatus: 'playing' as GameStatus,
    toast: null as string | null,
    waveDoneBoards: Array(boardCount).fill(false) as boolean[],
    celebrationShown: false,
  };
}

export const useQuordleStore = create<QuordleState>((set, get) => {
  const settings = useSettingsStore.getState();
  return {
    ...initialState(settings.language, settings.boardCount),
    snapshots: {} as Record<string, QuordleSnapshot>,
    lastDifficultyByBoardCount: {} as Record<number, Difficulty>,

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
      const { currentGuess, answers, guesses, gameStatus, solvedBoards, boardCount, maxGuesses } = get();
      if (gameStatus !== 'playing') return;

      if (currentGuess.length < 5) { set({ toast: 'Too short' }); return; }

      const { language, difficulty } = useSettingsStore.getState();

      if (!VALID_WORDS[language].has(currentGuess)) {
        set({ toast: 'Not in word list' }); return;
      }

      if (guesses.some(g => g.word === currentGuess)) {
        set({ toast: 'Already guessed' }); return;
      }

      if (difficulty === 'hard') {
        let firstViolation: string | null = null;
        let anyAccepts = false;
        for (let b = 0; b < boardCount; b++) {
          if (solvedBoards[b]) continue;
          const boardHistory = guesses.map(g => ({ word: g.word, results: g.boardResults[b] }));
          const v = checkHardModeConstraints(boardHistory, currentGuess);
          if (!v) { anyAccepts = true; break; }
          if (!firstViolation) firstViolation = `Board ${b + 1}: ${v}`;
        }
        if (!anyAccepts && firstViolation) { set({ toast: firstViolation }); return; }
      }

      const boardResults = answers.map(a => evaluateGuess(currentGuess, a));
      const newGuesses = [...guesses, { word: currentGuess, boardResults }];
      const newSolved = solvedBoards.map((was, b) => was || currentGuess === answers[b]);
      const allSolved = newSolved.every(Boolean);
      const outOfGuesses = newGuesses.length >= maxGuesses;
      const newStatus: GameStatus = allSolved ? 'won' : outOfGuesses ? 'lost' : 'playing';

      set({ guesses: newGuesses, currentGuess: '', solvedBoards: newSolved, gameStatus: newStatus });

      if (newStatus !== 'playing') {
        useStatsStore.getState().recordResult(newStatus === 'won', newGuesses.length, String(boardCount));
      }
    },

    clearToast: () => set({ toast: null }),
    clearCurrentGuess: () => set({ currentGuess: '' }),
    setCurrentGuess: (guess) => set({ currentGuess: guess }),

    setWaveDone: (boardIndex) => set(state => {
      const arr = [...state.waveDoneBoards];
      arr[boardIndex] = true;
      return { waveDoneBoards: arr };
    }),

    setCelebrationShown: (v) => set({ celebrationShown: v }),

    newGame: () => {
      const { language, boardCount, difficulty } = useSettingsStore.getState();
      // Clear any saved snapshot for this language+difficulty+board-count (explicit new game).
      const { snapshots } = get();
      const newSnapshots = { ...snapshots };
      delete newSnapshots[snapshotKey(language, difficulty, boardCount)];
      set({ ...initialState(language, boardCount), snapshots: newSnapshots });
    },

    switchBoardCount: (n) => {
      const current = get();
      const { language, difficulty } = useSettingsStore.getState();
      // Save the current game state under its language+difficulty+board-count.
      const newSnapshots = { ...current.snapshots, [snapshotKey(language, difficulty, current.boardCount)]: captureSnapshot(current) };
      const newLastDifficulty = { ...current.lastDifficultyByBoardCount, [current.boardCount]: difficulty };
      // Land on n's own last-played difficulty, not whatever was active on the board we're leaving.
      const targetDifficulty = newLastDifficulty[n] ?? 'easy';
      const saved = newSnapshots[snapshotKey(language, targetDifficulty, n)];
      if (saved) {
        set({ ...saved, snapshots: newSnapshots, lastDifficultyByBoardCount: newLastDifficulty, toast: null });
      } else {
        set({ ...initialState(language, n, targetDifficulty), snapshots: newSnapshots, lastDifficultyByBoardCount: newLastDifficulty });
      }
      return targetDifficulty;
    },

    switchDifficulty: (newDifficulty) => {
      const current = get();
      const { language, difficulty: currDifficulty, boardCount } = useSettingsStore.getState();
      // Save the current game state under its language+difficulty+board-count.
      const newSnapshots = { ...current.snapshots, [snapshotKey(language, currDifficulty, boardCount)]: captureSnapshot(current) };
      const newLastDifficulty = { ...current.lastDifficultyByBoardCount, [boardCount]: newDifficulty };
      const saved = newSnapshots[snapshotKey(language, newDifficulty, boardCount)];
      if (saved) {
        set({ ...saved, snapshots: newSnapshots, lastDifficultyByBoardCount: newLastDifficulty, toast: null });
      } else {
        // Build fresh state for newDifficulty explicitly — initialState() reads
        // difficulty from settingsStore, which may still be the OLD difficulty
        // at this point (this must run before setDifficulty() updates it, to
        // save the current board under its correct difficulty key above).
        set({
          answers: pickAnswers(boardCount, language),
          boardCount,
          maxGuesses: maxGuessesForDifficulty(newDifficulty, boardCount),
          guesses: [],
          currentGuess: '',
          solvedBoards: Array(boardCount).fill(false),
          gameStatus: 'playing',
          toast: null,
          waveDoneBoards: Array(boardCount).fill(false),
          celebrationShown: false,
          snapshots: newSnapshots,
          lastDifficultyByBoardCount: newLastDifficulty,
        });
      }
    },

    switchLanguage: (oldLanguage, newLanguage) => {
      const current = get();
      const { difficulty, boardCount } = useSettingsStore.getState();
      // Save the current game state under its old-language+difficulty+board-count.
      const newSnapshots = { ...current.snapshots, [snapshotKey(oldLanguage, difficulty, boardCount)]: captureSnapshot(current) };
      const saved = newSnapshots[snapshotKey(newLanguage, difficulty, boardCount)];
      if (saved) {
        set({ ...saved, snapshots: newSnapshots, toast: null });
      } else {
        set({ ...initialState(newLanguage, boardCount, difficulty), snapshots: newSnapshots });
      }
    },
  };
});

// Language switches are snapshot-aware, same as difficulty/board-count — see switchLanguage.
// The subscribe callback fires after settingsStore has already committed the new language,
// so prev/curr here are the only place both the old and new language are available together.
useSettingsStore.subscribe((curr, prev) => {
  if (curr.language !== prev.language) {
    useQuordleStore.getState().switchLanguage(prev.language, curr.language);
  }
});
