import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ColorValue, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { useQuordleStore, QuordleGuess } from '@/store/quordleStore';
import { useSettingsStore } from '@/store/settingsStore';
import { TileStatus } from '@/components/Tile';

// Tile size for Quordle's 2×2 grid with 9 rows each.
const QUORDLE_TILE_SIZE = 22;

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

// Best result per letter across all 4 Quordle boards.
function deriveQuordleKeyStatuses(guesses: QuordleGuess[]): Record<string, TileStatus> {
  const map: Record<string, TileStatus> = {};
  for (const guess of guesses) {
    for (let i = 0; i < 5; i++) {
      const letter = guess.word[i];
      for (let b = 0; b < 4; b++) {
        const result = guess.boardResults[b][i] as TileStatus;
        if (!map[letter] || STATUS_PRIORITY[result] > STATUS_PRIORITY[map[letter]]) {
          map[letter] = result;
        }
      }
    }
  }
  return map;
}

// Stop at the winning row so solved boards freeze — no subsequent guesses shown.
function toBoardGuesses(quordleGuesses: QuordleGuess[], boardIndex: number): GuessResult[] {
  const out: GuessResult[] = [];
  for (const g of quordleGuesses) {
    const results = g.boardResults[boardIndex];
    out.push({ word: g.word, results });
    if (results.every(r => r === 'correct')) break;
  }
  return out;
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

function buildQuordleShareText(
  guesses: QuordleGuess[],
  gameStatus: 'won' | 'lost',
  colorBlind: boolean,
): string {
  const CORRECT = colorBlind ? '🟧' : '🟩';
  const PRESENT = colorBlind ? '🟦' : '🟨';
  const ABSENT = '⬛';
  const count = gameStatus === 'won' ? String(guesses.length) : 'X';
  const LABELS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
  const boards = [0, 1, 2, 3].map(b => {
    const grid = guesses
      .map(g =>
        g.boardResults[b]
          .map(r => (r === 'correct' ? CORRECT : r === 'present' ? PRESENT : ABSENT))
          .join(''),
      )
      .join('\n');
    return `${LABELS[b]}\n${grid}`;
  });
  return `Quordle ${count}/9\n\n${boards.join('\n\n')}`;
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
  // Both stores are always subscribed (Rules of Hooks).
  const wordleStore = useGameStore();
  const quordleStore = useQuordleStore();
  const {
    language, setLanguage,
    hardMode, setHardMode,
    darkTheme, setDarkTheme,
    colorBlindMode,
    gameMode,
  } = useSettingsStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH, width: screenW } = useWindowDimensions();

  // Dynamic tile size: fills the flex-1 board area between header, message, and keyboard.
  // Keyboard: 3 rows × 60px + 3 × 8px rowGap + 6px paddingBottom = 210px
  const KBD_H = 210;
  const boardAreaH = screenH - insets.top - insets.bottom - 44 - 44 - KBD_H;
  const boardAreaW = screenW - 16;
  const wordleTileSize = Math.max(44, Math.min(68,
    Math.min(Math.floor(boardAreaH / 6) - 4, Math.floor(boardAreaW / 5) - 4),
  ));

  const [showHelp, setShowHelp] = useState(false);
  const [copyConfirmed, setCopyConfirmed] = useState(false);

  const isQuordle = gameMode === 'quordle';

  // Route actions and state to the appropriate store.
  const addLetter    = isQuordle ? quordleStore.addLetter    : wordleStore.addLetter;
  const removeLetter = isQuordle ? quordleStore.removeLetter : wordleStore.removeLetter;
  const submitGuess  = isQuordle ? quordleStore.submitGuess  : wordleStore.submitGuess;
  const toast        = isQuordle ? quordleStore.toast        : wordleStore.toast;
  const clearToast   = isQuordle ? quordleStore.clearToast   : wordleStore.clearToast;
  const gameStatus   = isQuordle ? quordleStore.gameStatus   : wordleStore.gameStatus;

  const [shakeKey, setShakeKey] = useState(0);
  const toastOpacity = useSharedValue(0);

  // Blur focused tab button so Enter goes to the game keydown handler, not the tab.
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
    const text = isQuordle
      ? buildQuordleShareText(quordleStore.guesses, gameStatus as 'won' | 'lost', colorBlindMode)
      : buildShareText(wordleStore.guesses, gameStatus as 'won' | 'lost', colorBlindMode, hardMode);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopyConfirmed(true);
      setTimeout(() => setCopyConfirmed(false), 1500);
    }
  }

  const headerProps = { language, setLanguage, hardMode, setHardMode, darkTheme, setDarkTheme, colors, setShowHelp };

  // ── Quordle layout ──────────────────────────────────────────────────────
  if (isQuordle) {
    const { guesses: qGuesses, currentGuess: qCurrent, solvedBoards, answers: qAnswers } = quordleStore;
    const qKeyStatuses = deriveQuordleKeyStatuses(qGuesses);
    const solvedCount = solvedBoards.filter(Boolean).length;

    const qResultText =
      gameStatus === 'won'
        ? 'Solved!'
        : `The words were: ${qAnswers.join(' ')}`;

    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        {renderHeader({ ...headerProps, title: 'Quordle' })}

        <View style={styles.quordleArea}>
          <View style={styles.quordleRow}>
            <GameBoard
              guesses={toBoardGuesses(qGuesses, 0)}
              currentGuess={solvedBoards[0] ? '' : qCurrent}
              tileSize={QUORDLE_TILE_SIZE}
              maxGuesses={9}
              solved={solvedBoards[0]}
              label="1"
              shakeKey={shakeKey}
            />
            <GameBoard
              guesses={toBoardGuesses(qGuesses, 1)}
              currentGuess={solvedBoards[1] ? '' : qCurrent}
              tileSize={QUORDLE_TILE_SIZE}
              maxGuesses={9}
              solved={solvedBoards[1]}
              label="2"
              shakeKey={shakeKey}
            />
          </View>
          <View style={styles.quordleRow}>
            <GameBoard
              guesses={toBoardGuesses(qGuesses, 2)}
              currentGuess={solvedBoards[2] ? '' : qCurrent}
              tileSize={QUORDLE_TILE_SIZE}
              maxGuesses={9}
              solved={solvedBoards[2]}
              label="3"
              shakeKey={shakeKey}
            />
            <GameBoard
              guesses={toBoardGuesses(qGuesses, 3)}
              currentGuess={solvedBoards[3] ? '' : qCurrent}
              tileSize={QUORDLE_TILE_SIZE}
              maxGuesses={9}
              solved={solvedBoards[3]}
              label="4"
              shakeKey={shakeKey}
            />
          </View>
        </View>

        <View style={styles.messageArea}>
          {gameStatus !== 'playing' ? (
            <View style={styles.resultRow}>
              <Text style={[styles.resultText, { color: colors.text }]} numberOfLines={1}>
                {copyConfirmed ? 'Copied!' : qResultText}
              </Text>
              {!copyConfirmed && (
                <Pressable onPress={handleShare} hitSlop={12} accessibilityLabel="Share result">
                  <Ionicons name="share-social-outline" size={20} color="#878a8c" />
                </Pressable>
              )}
            </View>
          ) : solvedCount > 0 && solvedCount < 4 ? (
            <Text style={styles.progressText}>{solvedCount}/4 solved</Text>
          ) : null}
          {/* Toast overlays result/progress via absolute positioning */}
          <Animated.View style={[styles.toastOverlay, toastStyle]} pointerEvents="none">
            <View style={styles.toastPill}>
              <Text style={styles.toastText}>{toast}</Text>
            </View>
          </Animated.View>
        </View>

        <Keyboard onKey={handleKey} keyStatuses={qKeyStatuses} />
        <HelpModal visible={showHelp} onClose={() => setShowHelp(false)} hardMode={hardMode} />
      </SafeAreaView>
    );
  }

  // ── Wordle layout ───────────────────────────────────────────────────────
  const { answer, guesses, currentGuess } = wordleStore;
  const keyStatuses = deriveKeyStatuses(guesses);
  const winMessage = WIN_MESSAGES[Math.min(guesses.length - 1, WIN_MESSAGES.length - 1)];
  const resultText = gameStatus === 'won' ? winMessage : `The word was ${answer}`;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {renderHeader({ ...headerProps, title: 'Wordle' })}

      <View style={styles.boardArea}>
        <GameBoard guesses={guesses} currentGuess={currentGuess} tileSize={wordleTileSize} shakeKey={shakeKey} />
      </View>

      <View style={styles.messageArea}>
        {gameStatus !== 'playing' ? (
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
        ) : null}
        <Animated.View style={[styles.toastOverlay, toastStyle]} pointerEvents="none">
          <View style={styles.toastPill}>
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        </Animated.View>
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
  colors: { card: ColorValue; border: ColorValue; text: ColorValue };
  setShowHelp: (v: boolean) => void;
  title: string;
}

function renderHeader({
  language, setLanguage, hardMode, setHardMode,
  darkTheme, setDarkTheme, colors, setShowHelp, title,
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
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
  header: {
    height: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIconRow: {
    ...StyleSheet.absoluteFill,
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
    ...StyleSheet.absoluteFill,
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
  boardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quordleArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  quordleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  messageArea: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  // Toast is absolutely positioned so it overlays result/progress text.
  toastOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
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
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#878a8c',
  },
});
