import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'en_us' | 'en_gb';
export type GameMode = 'wordle' | 'quordle';
export type Difficulty = 'easy' | 'hard' | 'extreme';

export const BOARD_COUNTS = [1, 2, 3, 4, 6, 8] as const;
export type BoardCount = typeof BOARD_COUNTS[number];

const BOARD_NAMES: Record<number, string> = {
  1: 'Wordout', 2: '2-out', 3: '3-out', 4: '4-out', 6: '6-out', 8: '8-out',
};
export function boardCountName(n: number): string {
  return BOARD_NAMES[n] ?? `${n}-out`;
}

export function maxGuessesForDifficulty(difficulty: Difficulty, boardCount: number): number {
  if (difficulty === 'extreme') return Math.max(3, (5 + boardCount) - 2);
  return boardCount === 1 ? 6 : Math.min(13, 5 + boardCount);
}

interface SettingsState {
  language: Language;
  difficulty: Difficulty;
  darkTheme: boolean;
  colorBlindMode: boolean;
  enterOnRight: boolean;
  gameMode: GameMode;
  boardCount: BoardCount;
  tutorialSeen: boolean;
  setLanguage: (lang: Language) => void;
  setDifficulty: (d: Difficulty) => void;
  setDarkTheme: (on: boolean) => void;
  setColorBlindMode: (on: boolean) => void;
  setEnterOnRight: (on: boolean) => void;
  setGameMode: (mode: GameMode) => void;
  setBoardCount: (n: BoardCount) => void;
  setTutorialSeen: (seen: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'en_us',
      difficulty: 'easy',
      darkTheme: false,
      colorBlindMode: false,
      enterOnRight: true,
      gameMode: 'wordle',
      boardCount: 4,
      tutorialSeen: false,
      setLanguage: (language) => set({ language }),
      setDifficulty: (difficulty) => set({ difficulty }),
      setDarkTheme: (darkTheme) => set({ darkTheme }),
      setColorBlindMode: (colorBlindMode) => set({ colorBlindMode }),
      setEnterOnRight: (enterOnRight) => set({ enterOnRight }),
      setGameMode: (gameMode) => set({ gameMode }),
      setBoardCount: (boardCount) => set({ boardCount }),
      setTutorialSeen: (tutorialSeen) => set({ tutorialSeen }),
    }),
    {
      name: 'wordle-settings',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version < 1) {
          return {
            ...persistedState,
            difficulty: (persistedState as any).hardMode ? 'hard' : 'easy',
          };
        }
        return persistedState as SettingsState;
      },
    },
  ),
);
