import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'en_us' | 'en_gb';
export type GameMode = 'wordle' | 'quordle';

export const BOARD_COUNTS = [1, 2, 3, 4, 6, 8] as const;
export type BoardCount = typeof BOARD_COUNTS[number];

const BOARD_NAMES: Record<number, string> = {
  1: 'Wordout', 2: '2-out', 3: '3-out', 4: '4-out', 6: '6-out', 8: '8-out',
};
export function boardCountName(n: number): string {
  return BOARD_NAMES[n] ?? `${n}-out`;
}

interface SettingsState {
  language: Language;
  hardMode: boolean;
  darkTheme: boolean;
  colorBlindMode: boolean;
  enterOnRight: boolean;
  gameMode: GameMode;
  boardCount: BoardCount;
  setLanguage: (lang: Language) => void;
  setHardMode: (on: boolean) => void;
  setDarkTheme: (on: boolean) => void;
  setColorBlindMode: (on: boolean) => void;
  setEnterOnRight: (on: boolean) => void;
  setGameMode: (mode: GameMode) => void;
  setBoardCount: (n: BoardCount) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'en_us',
      hardMode: false,
      darkTheme: false,
      colorBlindMode: false,
      enterOnRight: false,
      gameMode: 'wordle',
      boardCount: 4,
      setLanguage: (language) => set({ language }),
      setHardMode: (hardMode) => set({ hardMode }),
      setDarkTheme: (darkTheme) => set({ darkTheme }),
      setColorBlindMode: (colorBlindMode) => set({ colorBlindMode }),
      setEnterOnRight: (enterOnRight) => set({ enterOnRight }),
      setGameMode: (gameMode) => set({ gameMode }),
      setBoardCount: (boardCount) => set({ boardCount }),
    }),
    {
      name: 'wordle-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
