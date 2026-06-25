import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ColorValue, useWindowDimensions, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { useFocusEffect, useTheme } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { GameBoard } from '@/components/GameBoard';
import { Keyboard, kbdHeight } from '@/components/Keyboard';
import { HelpModal } from '@/components/HelpModal';
import { useGameStore, GuessResult, LetterResult } from '@/store/gameStore';
import { useQuordleStore, QuordleGuess } from '@/store/quordleStore';
import { useSettingsStore, boardCountName } from '@/store/settingsStore';
import { isGameInProgress, confirmAbandon } from '@/utils/abandon';
import { TileStatus } from '@/components/Tile';

// Prevents buttons from stealing keyboard focus on web.
// tabIndex=-1 removes them from the tab order; onMouseDown preventDefault
// stops the browser from moving focus to the element on click.
const noFocus = { tabIndex: -1, onMouseDown: (e: any) => e.preventDefault() };

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

// Best result per letter across all boards (board count is read from boardResults length).
function deriveQuordleKeyStatuses(guesses: QuordleGuess[]): Record<string, TileStatus> {
  const map: Record<string, TileStatus> = {};
  for (const guess of guesses) {
    for (let i = 0; i < 5; i++) {
      const letter = guess.word[i];
      for (let b = 0; b < guess.boardResults.length; b++) {
        const result = guess.boardResults[b][i] as TileStatus;
        if (!map[letter] || STATUS_PRIORITY[result] > STATUS_PRIORITY[map[letter]]) {
          map[letter] = result;
        }
      }
    }
  }
  return map;
}

// Count unique letter positions confirmed correct on a board so far (0–5).
function boardCorrectCount(qGuesses: QuordleGuess[], boardIndex: number): number {
  const found = new Set<number>();
  for (const g of qGuesses) {
    const results = g.boardResults[boardIndex];
    if (results) {
      for (let col = 0; col < results.length; col++) {
        if (results[col] === 'correct') found.add(col);
      }
    }
  }
  return found.size;
}

// Row index of the winning guess for a board (-1 if not yet solved).
function boardSolvedAtRow(qGuesses: QuordleGuess[], boardIndex: number): number {
  for (let row = 0; row < qGuesses.length; row++) {
    const results = qGuesses[row].boardResults[boardIndex];
    if (results && results.length === 5 && results.every(r => r === 'correct')) return row;
  }
  return -1;
}

// True if this board has at least one present-but-wrong-position (yellow) result.
function boardHasYellow(qGuesses: QuordleGuess[], boardIndex: number): boolean {
  for (const g of qGuesses) {
    const results = g.boardResults[boardIndex];
    if (results) {
      for (const r of results) {
        if (r === 'present') return true;
      }
    }
  }
  return false;
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
  return `Wordout ${count}/6${flag}\n\n${grid}`;
}

function buildQuordleShareText(
  guesses: QuordleGuess[],
  gameStatus: 'won' | 'lost',
  colorBlind: boolean,
  boardCount: number,
): string {
  const CORRECT = colorBlind ? '🟧' : '🟩';
  const PRESENT = colorBlind ? '🟦' : '🟨';
  const ABSENT = '⬛';
  const count = gameStatus === 'won' ? String(guesses.length) : 'X';
  const maxGuesses = Math.min(13, 5 + boardCount);
  const name = boardCountName(boardCount);

  if (boardCount === 1) {
    const grid = guesses.map(({ boardResults }) =>
      boardResults[0].map(r => r === 'correct' ? CORRECT : r === 'present' ? PRESENT : ABSENT).join('')
    ).join('\n');
    return `${name} ${count}/${maxGuesses}\n\n${grid}`;
  }

  const LABELS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];
  const boards = Array.from({ length: boardCount }, (_, b) => {
    const grid = guesses
      .map(g => g.boardResults[b].map(r =>
        r === 'correct' ? CORRECT : r === 'present' ? PRESENT : ABSENT,
      ).join(''))
      .join('\n');
    return `${LABELS[b]}\n${grid}`;
  });
  return `${name} ${count}/${maxGuesses}\n\n${boards.join('\n\n')}`;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}

// ── Win messages ────────────────────────────────────────────────────────────

const WIN_MESSAGES = ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Phew!'];

// Each board page in the horizontal ScrollView needs flexShrink:0 so that
// CSS flex-basis doesn't collapse the explicit width:screenW on web.
// This is a plain View — Animated.View was tried but nested style arrays
// caused the layout styles to be silently dropped on web.
function BoardPage({ style, children }: { style: object; children: React.ReactNode }) {
  return <View style={style as any}>{children}</View>;
}

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
    gameMode, setGameMode,
  } = useSettingsStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH, width: screenW } = useWindowDimensions();

  // Layout constants — only HEADER_H is fixed; everything else is derived.
  const HEADER_H = 50;
  const MSG_H = 44;    // messageArea height (matches styles.messageArea)
  const DOTS_H = 36;   // multi-board indicator row
  const TAB_H = 50;    // tab bar
  const TILE_GAP = 4;

  // Available height for board + keyboard combined (excluding header, message, tab, safe area).
  const totalH = screenH - insets.top - insets.bottom - HEADER_H - MSG_H - TAB_H;

  // Responsive keyboard: key height is 8% of totalH, capped at 60px.
  const keyHeight = Math.min(60, Math.floor(totalH * 0.08));
  const KBD_H = kbdHeight(keyHeight);

  // Width available to tiles (8px padding each side — tight but not edge-to-edge).
  const availableWidth = screenW - 16;

  // Tile size is computed from measured layout height once onLayout fires.
  const wordleAvailH = totalH - KBD_H;
  const [wordleAreaH, setWordleAreaH] = useState(0);

  const wordleMeasuredH = wordleAreaH > 0 ? wordleAreaH : wordleAvailH;
  const wordleTileSize = Math.max(44, Math.min(88,
    Math.min(Math.floor(wordleMeasuredH / 6) - TILE_GAP, Math.floor(availableWidth / 5) - TILE_GAP),
  ));

  const [showHelp, setShowHelp] = useState(false);
  const [copyConfirmed, setCopyConfirmed] = useState(false);
  const [activeBoard, setActiveBoard] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const isQuordle = gameMode === 'quordle';

  function scrollTo(index: number) {
    scrollRef.current?.scrollTo({ x: index * screenW, animated: true });
    setActiveBoard(index);
  }

  // Reset scroll position when a new multi-board game starts.
  useEffect(() => {
    if (isQuordle && quordleStore.guesses.length === 0) {
      setActiveBoard(0);
      scrollRef.current?.scrollTo({ x: 0, animated: false });
    }
  }, [isQuordle, quordleStore.guesses.length]);

  // Route actions and state to the appropriate store.
  const addLetter    = isQuordle ? quordleStore.addLetter    : wordleStore.addLetter;
  const removeLetter = isQuordle ? quordleStore.removeLetter : wordleStore.removeLetter;
  const submitGuess  = isQuordle ? quordleStore.submitGuess  : wordleStore.submitGuess;
  const toast        = isQuordle ? quordleStore.toast        : wordleStore.toast;
  const clearToast   = isQuordle ? quordleStore.clearToast   : wordleStore.clearToast;
  const gameStatus   = isQuordle ? quordleStore.gameStatus   : wordleStore.gameStatus;

  const [shakeKey, setShakeKey] = useState(0);
  const toastOpacity = useSharedValue(0);

  // ── End-of-game overlay ──────────────────────────────────────────────────
  const [endGameVisible, setEndGameVisible] = useState(false);
  const endGameOpacity = useSharedValue(0);
  const endGameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevGameStatusRef = useRef(gameStatus);

  const endGameAnimStyle = useAnimatedStyle(() => ({ opacity: endGameOpacity.value }));

  function dismissEndGame() {
    if (endGameTimerRef.current) { clearTimeout(endGameTimerRef.current); endGameTimerRef.current = null; }
    endGameOpacity.value = withTiming(0, { duration: 300 });
    setTimeout(() => setEndGameVisible(false), 320);
  }

  useEffect(() => {
    const prev = prevGameStatusRef.current;
    prevGameStatusRef.current = gameStatus;
    if (gameStatus === prev) return;

    if (gameStatus !== 'playing' && prev === 'playing') {
      // Show overlay after per-board animations finish.
      // Won: ~1800ms (after wave + ✓ overlay appear); Lost: ~2500ms (after shake + ✗ overlay appear).
      const delay = gameStatus === 'won' ? 1800 : 2500;
      endGameTimerRef.current = setTimeout(() => {
        setEndGameVisible(true);
        endGameOpacity.value = withTiming(1, { duration: 300 });
        // Auto-dismiss after 3 seconds.
        endGameTimerRef.current = setTimeout(dismissEndGame, 3000);
      }, delay);
    }

    if (gameStatus === 'playing') {
      if (endGameTimerRef.current) { clearTimeout(endGameTimerRef.current); endGameTimerRef.current = null; }
      setEndGameVisible(false);
      endGameOpacity.value = 0;
    }

    return () => {
      if (endGameTimerRef.current) { clearTimeout(endGameTimerRef.current); endGameTimerRef.current = null; }
    };
  }, [gameStatus]);

  // ── Compute end-game overlay content ────────────────────────────────────
  let endEmoji = '';
  let endMessage = '';
  let endWordsNode: React.ReactNode = null;

  if (gameStatus !== 'playing') {
    if (!isQuordle) {
      endEmoji = gameStatus === 'won' ? '🎉' : '😢';
      endMessage = gameStatus === 'won' ? 'Solved!' : 'Better luck next time';
      endWordsNode = <Text style={styles.endWordText}>{wordleStore.answer}</Text>;
    } else {
      const { answers, solvedBoards, boardCount } = quordleStore;
      const solvedCount = solvedBoards.filter(Boolean).length;
      if (gameStatus === 'won') {
        endEmoji = '🎉';
        endMessage = boardCount === 1 ? 'Solved!' : 'You got them all!';
        endWordsNode = (
          <Text style={styles.endWordText}>{answers.join('  ')}</Text>
        );
      } else {
        const isPartial = solvedCount > 0;
        endEmoji = isPartial ? '😅' : '😢';
        endMessage = isPartial ? `${solvedCount} out of ${boardCount}!` : 'Better luck next time';
        endWordsNode = (
          <View style={styles.endWordRow}>
            {answers.map((w, i) => (
              <Text key={i} style={[styles.endWordItem, { color: solvedBoards[i] ? '#5BA75A' : '#E24B4A' }]}>
                {solvedBoards[i] ? '✓' : '✗'} {w}
              </Text>
            ))}
          </View>
        );
      }
    }
  }

  // ── Blur focused tab button so Enter goes to game keydown handler ────────
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web' && typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }, []),
  );

  // Physical keyboard — web only. capture: true intercepts before any focused button.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    function onKeyDown(e: KeyboardEvent) {
      const { key } = e;
      const isGameKey = key === 'Enter' || key === 'Backspace' || /^[a-zA-Z]$/.test(key);
      if (!isGameKey) return;
      (document.activeElement as HTMLElement | null)?.blur();
      e.preventDefault();
      if (key === 'Enter') submitGuess();
      else if (key === 'Backspace') removeLetter();
      else addLetter(key.toUpperCase());
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
      ? buildQuordleShareText(quordleStore.guesses, gameStatus as 'won' | 'lost', colorBlindMode, quordleStore.boardCount)
      : buildShareText(wordleStore.guesses, gameStatus as 'won' | 'lost', colorBlindMode, hardMode);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopyConfirmed(true);
      setTimeout(() => setCopyConfirmed(false), 1500);
    }
  }

  // Shared end-game overlay — rendered on top of either layout.
  const endGameOverlay = endGameVisible ? (
    <Animated.View style={[StyleSheet.absoluteFill, styles.endGameOverlay, endGameAnimStyle]}>
      <Pressable
        style={[StyleSheet.absoluteFill, styles.endGamePressable]}
        onPress={dismissEndGame}
        {...(noFocus as any)}
      >
        <Text style={styles.endGameEmoji}>{endEmoji}</Text>
        <Text style={styles.endGameMessage}>{endMessage}</Text>
        {endWordsNode}
        <Pressable
          style={styles.shareButton}
          onPress={() => { handleShare(); dismissEndGame(); }}
          {...(noFocus as any)}
        >
          <Text style={styles.shareButtonText}>Share ↗</Text>
        </Pressable>
      </Pressable>
    </Animated.View>
  ) : null;

  const headerProps = { language, setLanguage, hardMode, setHardMode, darkTheme, setDarkTheme, colors, setShowHelp };

  // ── Multi-board swipeable layout ────────────────────────────────────────
  if (isQuordle) {
    const { guesses: qGuesses, currentGuess: qCurrent, solvedBoards, boardCount, maxGuesses } = quordleStore;
    const qKeyStatuses = deriveQuordleKeyStatuses(qGuesses);
    const solvedCount = solvedBoards.filter(Boolean).length;
    const qResultText = gameStatus === 'won' ? 'Solved! 🎉' : 'Game over';

    // Static estimate used as GameBoard's first-render fallback before it measures itself.
    const qAvailH = totalH - KBD_H - DOTS_H;
    const qFallbackTile = Math.max(20, Math.min(72,
      Math.min(Math.floor(availableWidth / 5) - TILE_GAP, Math.floor(qAvailH / maxGuesses) - TILE_GAP),
    ));

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        {renderHeader({ ...headerProps, title: boardCountName(boardCount) })}

        {/* Board progress indicators — hidden when only 1 board */}
        {boardCount > 1 && (
          <View style={styles.dotRow}>
            {solvedBoards.map((solved, i) => {
              const isActive   = activeBoard === i;
              const greenCount = solved ? 0 : boardCorrectCount(qGuesses, i);
              const hasYellow  = solved ? false : boardHasYellow(qGuesses, i);

              const squareColor = darkTheme ? '#ffffff' : '#878a8c';

              const strokeColor = solved || (!hasYellow && greenCount > 0)
                ? '#6aaa64'
                : hasYellow ? '#c9b458' : '#878a8c';
              const fillColor = solved
                ? '#6aaa64'
                : hasYellow
                ? (darkTheme ? colors.background as string : '#ffffff')
                : 'transparent';

              return (
                <Pressable
                  key={i}
                  {...(noFocus as any)}
                  hitSlop={6}
                  onPress={() => scrollTo(i)}
                  accessibilityLabel={
                    solved   ? `Board ${i + 1} — solved`
                    : isActive ? `Board ${i + 1} — current`
                    : `Board ${i + 1}${greenCount > 0 ? `, ${greenCount} correct` : ''}`
                  }
                >
                  <View style={styles.indicatorWrap}>
                    {isActive && !solved ? (
                      <View style={[styles.indicatorSquare, { borderColor: squareColor }]}>
                        <Ionicons name="play" size={10} color={squareColor} />
                      </View>
                    ) : (
                      <View style={[styles.indicatorCircle, { borderColor: strokeColor, backgroundColor: fillColor }]}>
                        {solved
                          ? <Text style={styles.indicatorCheckText}>✓</Text>
                          : greenCount > 0
                          ? <Text style={styles.indicatorGreenNum}>{greenCount}</Text>
                          : null}
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
        {boardCount === 1 && <View style={{ height: DOTS_H }} />}

        {/* Horizontally paged boards */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.boardScroll}
          onMomentumScrollEnd={(e) => {
            const board = Math.round(e.nativeEvent.contentOffset.x / screenW);
            setActiveBoard(board);
          }}
          scrollEventThrottle={16}
        >
          {Array.from({ length: boardCount }, (_, i) => {
            const solvedRow = boardSolvedAtRow(qGuesses, i);
            const isSolved = solvedRow >= 0;
            const visibleGuesses = isSolved ? qGuesses.slice(0, solvedRow + 1) : qGuesses;
            return (
              <BoardPage
                key={i}
                style={[styles.boardPage, { width: screenW, backgroundColor: colors.background }]}
              >
                <GameBoard
                  words={visibleGuesses.map(g => g.word)}
                  boardResults={visibleGuesses.map(g => g.boardResults[i])}
                  currentGuess={isSolved ? '' : qCurrent}
                  flexMode
                  tileSize={qFallbackTile}
                  maxGuesses={maxGuesses}
                  solved={isSolved}
                  gameOver={gameStatus === 'lost' && !isSolved}
                  answer={quordleStore.answers[i]}
                  shakeKey={shakeKey}
                />
              </BoardPage>
            );
          })}
        </ScrollView>

        <View style={styles.messageArea}>
          {gameStatus !== 'playing' ? (
            <View style={styles.resultRow}>
              <Text style={[styles.resultText, { color: colors.text }]} numberOfLines={1}>
                {copyConfirmed ? 'Copied!' : qResultText}
              </Text>
              {!copyConfirmed && (
                <Pressable {...(noFocus as any)} onPress={handleShare} hitSlop={12} accessibilityLabel="Share result">
                  <Ionicons name="share-social-outline" size={20} color="#878a8c" />
                </Pressable>
              )}
            </View>
          ) : solvedCount > 0 && solvedCount < boardCount ? (
            <Text style={styles.progressText}>{solvedCount}/{boardCount} solved</Text>
          ) : null}
          <Animated.View style={[styles.toastOverlay, toastStyle]} pointerEvents="none">
            <View style={styles.toastPill}>
              <Text style={styles.toastText}>{toast}</Text>
            </View>
          </Animated.View>
        </View>

        <Keyboard onKey={handleKey} keyStatuses={qKeyStatuses} keyHeight={keyHeight} />
        <HelpModal visible={showHelp} onClose={() => setShowHelp(false)} hardMode={hardMode} />
        {endGameOverlay}
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
      edges={['top']}
    >
      {renderHeader({ ...headerProps, title: 'Wordout' })}

      <View style={styles.boardArea} onLayout={e => setWordleAreaH(e.nativeEvent.layout.height)}>
        <GameBoard
          guesses={guesses}
          currentGuess={currentGuess}
          tileSize={wordleTileSize}
          shakeKey={shakeKey}
          gameOver={gameStatus === 'lost'}
          solved={gameStatus === 'won'}
          answer={answer}
        />
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

      <Keyboard onKey={handleKey} keyStatuses={keyStatuses} keyHeight={keyHeight} />
      <HelpModal visible={showHelp} onClose={() => setShowHelp(false)} hardMode={hardMode} />
      {endGameOverlay}
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
      <View style={styles.iconGroupLeft}>
        <Pressable
          {...(noFocus as any)}
          hitSlop={12}
          accessibilityLabel={language === 'en_us' ? 'American English — tap to switch' : 'British English — tap to switch'}
          onPress={() => {
            const next = language === 'en_us' ? 'en_gb' : 'en_us';
            if (isGameInProgress()) confirmAbandon(() => setLanguage(next));
            else setLanguage(next);
          }}
        >
          <Text style={styles.flagEmoji}>{language === 'en_us' ? '🇺🇸' : '🇬🇧'}</Text>
        </Pressable>
        <Pressable
          {...(noFocus as any)}
          hitSlop={12}
          accessibilityLabel={hardMode ? 'Hard mode on — tap to disable' : 'Hard mode off — tap to enable'}
          onPress={() => setHardMode(!hardMode)}
        >
          <Text style={styles.flagEmoji}>{hardMode ? '🔥' : '🐣'}</Text>
        </Pressable>
      </View>
      <View style={styles.headerTitleWrapper}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
      </View>
      <View style={styles.iconGroupRight}>
        <Pressable
          {...(noFocus as any)}
          hitSlop={12}
          accessibilityLabel={darkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
          onPress={() => setDarkTheme(!darkTheme)}
        >
          <Ionicons name={darkTheme ? 'sunny-outline' : 'moon-outline'} size={21} color="#878a8c" />
        </Pressable>
        <Pressable
          {...(noFocus as any)}
          hitSlop={12}
          accessibilityLabel="How to play"
          onPress={() => setShowHelp(true)}
        >
          <Ionicons name="help-circle-outline" size={22} color="#878a8c" />
        </Pressable>
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
    height: 50,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  iconGroupLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconGroupRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  headerTitleWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // Multi-board progress indicators
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    gap: 6,
  },
  indicatorWrap: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorSquare: {
    width: 24,
    height: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorCheckText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
  },
  indicatorGreenNum: {
    color: '#6aaa64',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 15,
  },
  boardScroll: {
    flex: 1,
  },
  boardPage: {
    // flex: 1 caused flex-basis: 0 in CSS (web), overriding the explicit
    // width: screenW inline style and collapsing pages to screenW/boardCount.
    // flexShrink: 0 prevents that while keeping width: screenW authoritative
    // on both Yoga (native) and CSS (web).
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
    paddingBottom: 4,
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
  // End-of-game full-screen overlay
  endGameOverlay: {
    zIndex: 100,
  },
  endGamePressable: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  endGameEmoji: {
    fontSize: 48,
    lineHeight: 56,
  },
  endGameMessage: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  endWordText: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: '600',
    letterSpacing: 3,
    textAlign: 'center',
  },
  endWordRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  endWordItem: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
  },
  shareButton: {
    marginTop: 8,
    backgroundColor: '#5BA75A',
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 6,
  },
  shareButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
