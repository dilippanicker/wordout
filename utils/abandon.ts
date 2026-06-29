import { Alert, Platform } from 'react-native';
import { useGameStore } from '@/store/gameStore';
import { useQuordleStore } from '@/store/quordleStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useDailyStore } from '@/store/dailyStore';

export function isGameInProgress(): boolean {
  const { boardCount } = useSettingsStore.getState();
  if (boardCount > 1) {
    const { gameStatus, guesses } = useQuordleStore.getState();
    return gameStatus === 'playing' && guesses.length > 0;
  }
  // Single-board: check whichever sub-mode is active
  const { activeWordleMode, activeDailyDifficulty, games } = useDailyStore.getState();
  if (activeWordleMode === 'daily') {
    const game = games[activeDailyDifficulty];
    return game.status === 'playing' && game.guesses.length > 0;
  }
  const { gameStatus, guesses } = useGameStore.getState();
  return gameStatus === 'playing' && guesses.length > 0;
}

export function confirmAbandon(onConfirm: () => void): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm('Abandon current game?')) {
      onConfirm();
    }
    return;
  }
  Alert.alert(
    'Abandon game?',
    'Your current progress will be lost.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Abandon', style: 'destructive', onPress: onConfirm },
    ],
  );
}
