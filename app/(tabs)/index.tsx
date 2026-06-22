import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { useFocusEffect, useTheme } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GameBoard } from '@/components/GameBoard';
import { Keyboard } from '@/components/Keyboard';
import { HelpModal } from '@/components/HelpModal';
import { useGameStore, GuessResult, LetterResult } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { TileStatus } from '@/components/Tile';

// ── Key status helpers ──────────────────────────────────────────────────────

const STATUS_PRIORITY: Record<string, number> = { correct: 3, present: 2, absent: 1 };

function deriveKeyStatuses(guesses: GuessResult[]): Record<string, TileStatus> {
  const map: Record<string, TileStatus> = {};
  for (const guess of guesses) {
    for (let i = 0; i < 5; i++) {
      const letter = guess.word[i];
      const result = guess.results[i] as TileStatus;
      if (!map[letter] || STATUS_PRIORITY[result] > STATUS_PRIORITY[map[letter]]) {
        map[letter] = result;
      }
    }
  }
  return map;
}

// ── Share / emoji grid ──────────────────────────────────────────────────────

function buildShareText(
  guesses: GuessResult[],
  gameStatus: 'won' | 'lost',
  colorBlind: boolean,
  hardMode: boolean,
): string {
  const count = gameStatus === 'won' ? String(guesses.length) : 'X';
  const flag = hardMode ? '*' : '';
  const CORRECT = colorBlind ? '🟧' : '🟩';
  const PRESENT = colorBlind ? '🟦' : '🟨';
  const ABSENT = '⬛';
  const grid = guesses
    .map(({ results }) =>
      results.map((r: LetterResult) =>
        r === 'correct' ? CORRECT : r === 'present' ? PRESENT : ABSENT,
      ).join(''),
    )
    .join('\n');
  return `Wordle ${count}/6${flag}\n\n${grid}`;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // clipboard unavailable or denied
  }
  return false;
}

// ── Win messages ────────────────────────────────────────────────────────────

const WIN_MESSAGES = ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Phew!'];

// ── Screen ──────────────────────────────────────────────────────────────────

export default function WordleScreen() {
  const { answer, guesses, currentGuess, gameStatus, toast, clearToast,
          addLetter, removeLetter, submitGuess, newGame } = useGameStore();
  const {
    language, setLanguage,
    hardMode, setHardMode,
    darkTheme, setDarkTheme,
    colorBlindMode,
    gameMode,
  } = useSettingsStore();
  const { colors } = useTheme();
  const [showHelp, setShowHelp] = useState(false);
  const [copyConfirmed, setCopyConfirmed] = useState(false);

  const keyStatuses = deriveKeyStatuses(guesses);
  const [shakeKey, setShakeKey] = useState(0);
  const toastOpacity = useSharedValue(0);

  // Blur focused tab button so Enter goes to keydown handler, not the tab.
  useFocusEffect(
    useCallback(() => {
      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }, []),
  );

  // Physical keyboard — capture phase for highest priority.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    function onKeyDown(e: KeyboardEvent) {
      const { key } = e;
      if (key === 'Enter') submitGuess();
      else if (key === 'Backspace') removeLetter();
      else if (/^[a-zA-Z]$/.test(key)) addLetter(key.toUpperCase());
    }
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [addLetter, removeLetter, submitGuess]);

  // Toast animation — fires on any new toast message.
  useEffect(() => {
    if (!toast) return;

    setShakeKey(k => k + 1);

    toastOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withDelay(1600, withTiming(0, { duration: 300 })),
    );

    const timer = setTimeout(clearToast, 2000);
    return () => clearTimeout(timer);
  }, [toast]);

  const toastStyle = useAnimatedStyle(() => ({ opacity: toastOpacity.value }));

  function handleKey(key: string) {
    if (key === 'ENTER') submitGuess();
    else if (key === '⌫') removeLetter();
    else addLetter(key);
  }

  async function handleShare() {
    if (gameStatus === 'playing') return;
    const text = buildShareText(guesses, gameStatus, colorBlindMode, hardMode);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopyConfirmed(true);
      setTimeout(() => setCopyConfirmed(false), 1500);
    }
  }

  const winMessage = WIN_MESSAGES[Math.min(guesses.length - 1, WIN_MESSAGES.length - 1)];
  const resultText = gameStatus === 'won' ? winMessage : `The word was ${answer}`;

  // ── Quordle layout ──────────────────────────────────────────────────────
  if (gameMode === 'quordle') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        {renderHeader({ language, setLanguage, hardMode, setHardMode, darkTheme, setDarkTheme, colors, setShowHelp })}
        <View style={styles.quordleArea}>
          <View style={styles.quordleRow}>
            <GameBoard guesses={[]} currentGuess="" tileSize={34} />
            <GameBoard guesses={[]} currentGuess="" tileSize={34} />
          </View>
          <View style={styles.quordleRow}>
            <GameBoard guesses={[]} currentGuess="" tileSize={34} />
            <GameBoard guesses={[]} currentGuess="" tileSize={34} />
          </View>
        </View>
        <View style={styles.messageArea} />
        <Keyboard onKey={handleKey} keyStatuses={keyStatuses} />
        <HelpModal visible={showHelp} onClose={() => setShowHelp(false)} hardMode={hardMode} />
      </SafeAreaView>
    );
  }

  // ── Wordle layout ───────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {renderHeader({ language, setLanguage, hardMode, setHardMode, darkTheme, setDarkTheme, colors, setShowHelp })}

      <View style={styles.boardArea}>
        <GameBoard guesses={guesses} currentGuess={currentGuess} tileSize={60} shakeKey={shakeKey} />
      </View>

      {/* Message area — toast during play, result+share after game */}
      <View style={styles.messageArea}>
        {gameStatus === 'playing' ? (
          <Animated.View style={[styles.toastPill, toastStyle]} pointerEvents="none">
            <Text style={styles.toastText}>{toast}</Text>
          </Animated.View>
        ) : (
          <View style={styles.resultRow}>
            <Text style={[styles.resultText, { color: colors.text }]} numberOfLines={1}>
              {copyConfirmed ? 'Copied!' : resultText}
            </Text>
            {!copyConfirmed && (
              <Pressable onPress={handleShare} hitSlop={12} accessibilityLabel="Share result">
                <Ionicons name="share-social-outline" size={20} color="#878a8c" />
              </Pressable>
            )}
          </View>
        )}
      </View>

      <Keyboard onKey={handleKey} keyStatuses={keyStatuses} />

      <HelpModal visible={showHelp} onClose={() => setShowHelp(false)} hardMode={hardMode} />
    </SafeAreaView>
  );
}

// ── Shared header renderer ──────────────────────────────────────────────────

interface HeaderProps {
  language: string;
  setLanguage: (l: 'en_us' | 'en_gb') => void;
  hardMode: boolean;
  setHardMode: (v: boolean) => void;
  darkTheme: boolean;
  setDarkTheme: (v: boolean) => void;
  colors: { card: string; border: string; text: string };
  setShowHelp: (v: boolean) => void;
}

function renderHeader({
  language, setLanguage, hardMode, setHardMode,
  darkTheme, setDarkTheme, colors, setShowHelp,
}: HeaderProps) {
  return (
    <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <View style={styles.headerIconRow}>
        <View style={styles.iconGroupLeft}>
          <Pressable
            hitSlop={12}
            accessibilityLabel={language === 'en_us' ? 'American English — tap to switch' : 'British English — tap to switch'}
            onPress={() => setLanguage(language === 'en_us' ? 'en_gb' : 'en_us')}
          >
            <Text style={styles.flagEmoji}>{language === 'en_us' ? '🇺🇸' : '🇬🇧'}</Text>
          </Pressable>
          <Pressable
            hitSlop={12}
            accessibilityLabel={hardMode ? 'Hard mode on — tap to disable' : 'Hard mode off — tap to enable'}
            onPress={() => setHardMode(!hardMode)}
          >
            <Text style={styles.flagEmoji}>{hardMode ? '🔥' : '🐣'}</Text>
          </Pressable>
        </View>
        <View style={styles.iconGroupRight}>
          <Pressable
            hitSlop={12}
            accessibilityLabel={darkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
            onPress={() => setDarkTheme(!darkTheme)}
          >
            <Ionicons name={darkTheme ? 'sunny-outline' : 'moon-outline'} size={21} color="#878a8c" />
          </Pressable>
          <Pressable
            hitSlop={12}
            accessibilityLabel="How to play"
            onPress={() => setShowHelp(true)}
          >
            <Ionicons name="help-circle-outline" size={22} color="#878a8c" />
          </Pressable>
        </View>
      </View>
      <View style={styles.headerTitleWrapper} pointerEvents="none">
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {/* Title not needed here — tab label shows mode name */}
          Wordle
        </Text>
      </View>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  // Custom header
  header: {
    height: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIconRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  iconGroupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconGroupRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitleWrapper: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  flagEmoji: {
    fontSize: 21,
    lineHeight: 26,
  },
  // Wordle board
  boardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Quordle layout
  quordleArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  quordleRow: {
    flexDirection: 'row',
    gap: 4,
  },
  // Message area (between board and keyboard)
  messageArea: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  toastPill: {
    backgroundColor: '#1a1a1b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  toastText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  resultText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
