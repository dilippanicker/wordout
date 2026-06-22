import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type GuessCounts = Record<'1' | '2' | '3' | '4' | '5' | '6', number>;

interface StatsState {
  totalGames: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  guessCounts: GuessCounts;
  settingsBadge: boolean;
  recordResult: (won: boolean, guessCount: number) => void;
  clearSettingsBadge: () => void;
  resetStats: () => void;
}

const EMPTY_COUNTS: GuessCounts = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0 };

export const useStatsStore = create<StatsState>()(
  persist(
    (set) => ({
      totalGames: 0,
      wins: 0,
      currentStreak: 0,
      maxStreak: 0,
      guessCounts: { ...EMPTY_COUNTS },
      settingsBadge: false,

      recordResult: (won, guessCount) =>
        set((s) => {
          const newStreak = won ? s.currentStreak + 1 : 0;
          const key = String(guessCount) as keyof GuessCounts;
          return {
            totalGames: s.totalGames + 1,
            wins: won ? s.wins + 1 : s.wins,
            currentStreak: newStreak,
            maxStreak: Math.max(s.maxStreak, newStreak),
            guessCounts: won
              ? { ...s.guessCounts, [key]: s.guessCounts[key] + 1 }
              : s.guessCounts,
            settingsBadge: true,
          };
        }),

      clearSettingsBadge: () => set({ settingsBadge: false }),

      resetStats: () => set({
        totalGames: 0, wins: 0, currentStreak: 0, maxStreak: 0,
        guessCounts: { ...EMPTY_COUNTS }, settingsBadge: false,
      }),
    }),
    {
      name: 'wordle-stats',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
