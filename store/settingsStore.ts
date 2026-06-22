import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'en_us' | 'en_gb';
export type GameMode = 'wordle' | 'quordle';

interface SettingsState {
  language: Language;
  hardMode: boolean;
  darkTheme: boolean;
  colorBlindMode: boolean;
  gameMode: GameMode;
  setLanguage: (lang: Language) => void;
  setHardMode: (on: boolean) => void;
  setDarkTheme: (on: boolean) => void;
  setColorBlindMode: (on: boolean) => void;
  setGameMode: (mode: GameMode) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'en_us',
      hardMode: false,
      darkTheme: false,
      colorBlindMode: false,
      gameMode: 'wordle',
      setLanguage: (language) => set({ language }),
      setHardMode: (hardMode) => set({ hardMode }),
      setDarkTheme: (darkTheme) => set({ darkTheme }),
      setColorBlindMode: (colorBlindMode) => set({ colorBlindMode }),
      setGameMode: (gameMode) => set({ gameMode }),
    }),
    {
      name: 'wordle-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
