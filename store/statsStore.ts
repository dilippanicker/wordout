import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BoardStats {
  totalGames: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  guessCounts: Record<string, number>;
}

export const emptyBoardStats = (): BoardStats => ({
  totalGames: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  guessCounts: {},
});

// Mode keys: 'wordle' for the single-board Wordout game;
// '1', '2', '3', '4', '6', '8' for multi-board modes.
interface StatsState {
  byMode: Record<string, BoardStats>;
  settingsBadge: boolean;
  recordResult: (won: boolean, guessCount: number, modeKey: string) => void;
  clearSettingsBadge: () => void;
  resetStats: () => void;
}

export const useStatsStore = create<StatsState>()(
  persist(
    (set) => ({
      byMode: {},
      settingsBadge: false,

      recordResult: (won, guessCount, modeKey) =>
        set((s) => {
          const prev = s.byMode[modeKey] ?? emptyBoardStats();
          const newStreak = won ? prev.currentStreak + 1 : 0;
          const key = String(guessCount);
          const updated: BoardStats = {
            totalGames: prev.totalGames + 1,
            wins: won ? prev.wins + 1 : prev.wins,
            currentStreak: newStreak,
            maxStreak: Math.max(prev.maxStreak, newStreak),
            guessCounts: won
              ? { ...prev.guessCounts, [key]: (prev.guessCounts[key] ?? 0) + 1 }
              : prev.guessCounts,
          };
          return { byMode: { ...s.byMode, [modeKey]: updated }, settingsBadge: true };
        }),

      clearSettingsBadge: () => set({ settingsBadge: false }),

      resetStats: () => set({ byMode: {}, settingsBadge: false }),
    }),
    {
      name: 'wordle-stats',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
