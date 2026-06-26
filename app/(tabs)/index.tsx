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
import { useFocusEffect, useTheme, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { GameBoard } from '@/components/GameBoard';
import { Keyboard, kbdHeight } from '@/components/Keyboard';
import { HelpModal } from '@/components/HelpModal';
import { BottomStrip } from '@/components/BottomStrip';
import { StatsModal } from '@/components/StatsModal';
import { useGameStore, GuessResult, LetterResult } from '@/store/gameStore';
import { useQuordleStore, QuordleGuess } from '@/store/quordleStore';
import { useSettingsStore, boardCountName, BOARD_COUNTS, BoardCount } from '@/store/settingsStore';
import { useStatsStore, emptyBoardStats } from '@/store/statsStore';
import { useDailyStore, getDailyIndex } from '@/store/dailyStore';
import { isGameInProgress, confirmAbandon } from '@/utils/abandon';
import { TileStatus } from '@/components/Tile';

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

function boardSolvedAtRow(qGuesses: QuordleGuess[], boardIndex: number): number {
  for (let row = 0; row < qGuesses.length; row++) {
    const results = qGuesses[row].boardResults[boardIndex];
    if (results && results.length === 5 && results.every(r => r === 'correct')) return row;
  }
  return -1;
}

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

function buildShareText(guesses: GuessResult[], status: 'won' | 'lost', colorBlind: boolean, hard: boolean): string {
  const count = status === 'won' ? String(guesses.length) : 'X';
  const flag = hard ? '*' : '';
  const CORRECT = colorBlind ? '🟧' : '🟩';
  const PRESENT = colorBlind ? '🟦' : '🟨';
  const ABSENT = '⬛';
  const grid = guesses
    .map(({ results }) => results.map((r: LetterResult) =>
      r === 'correct' ? CORRECT : r === 'present' ? PRESENT : ABSENT,
    ).join(''))
    .join('\n');
  return `Wordout ${count}/6${flag}\n\n${grid}`;
}

function buildDailyShareText(guesses: GuessResult[], solved: boolean, colorBlind: boolean): string {
  const idx = getDailyIndex();
  const count = solved ? String(guesses.length) : 'X';
  const CORRECT = colorBlind ? '🟧' : '🟩';
  const PRESENT = colorBlind ? '🟦' : '🟨';
  const ABSENT = '⬛';
  const grid = guesses
    .map(({ results }) => results.map((r: LetterResult) =>
      r === 'correct' ? CORRECT : r === 'present' ? PRESENT : ABSENT,
    ).join(''))
    .join('\n');
  const label = solved ? 'solved in' : 'failed';
  return `Wordout Daily #${idx} — ${label} ${count}/6\n\n${grid}`;
}

function buildQuordleShareText(guesses: QuordleGuess[], status: 'won' | 'lost', colorBlind: boolean, bc: number): string {
  const CORRECT = colorBlind ? '🟧' : '🟩';
  const PRESENT = colorBlind ? '🟦' : '🟨';
  const ABSENT = '⬛';
  const count = status === 'won' ? String(guesses.length) : 'X';
  const maxGuesses = Math.min(13, 5 + bc);
  const name = boardCountName(bc);
  if (bc === 1) {
    const grid = guesses.map(({ boardResults }) =>
      boardResults[0].map(r => r === 'correct' ? CORRECT : r === 'present' ? PRESENT : ABSENT).join('')
    ).join('\n');
    return `${name} ${count}/${maxGuesses}\n\n${grid}`;
  }
  const LABELS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];
  const boards = Array.from({ length: bc }, (_, b) => {
    const grid = guesses.map(g => g.boardResults[b].map(r =>
      r === 'correct' ? CORRECT : r === 'present' ? PRESENT : ABSENT,
    ).join('')).join('\n');
    return `${LABELS[b]}\n${grid}`;
  });
  return `${name} ${count}/${maxGuesses}\n\n${boards.join('\n\n')}`;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try { await Clipboard.setStringAsync(text); return true; } catch { return false; }
}

// ── Countdown helpers ───────────────────────────────────────────────────────

function msUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return midnight.getTime() - now.getTime();
}

function msToHMS(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ── Misc ────────────────────────────────────────────────────────────────────

const WIN_MESSAGES = ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Phew!'];

function BoardPage({ style, children }: { style: object; children: React.ReactNode }) {
  return <View style={style as any}>{children}</View>;
}

// ── Screen ──────────────────────────────────────────────────────────────────

export default function WordleScreen() {
  const wordleStore = useGameStore();
  const quordleStore = useQuordleStore();
  const dailyStore = useDailyStore();
  const {
    language, setLanguage,
    hardMode, setHardMode,
    darkTheme, setDarkTheme,
    colorBlindMode,
    gameMode, setGameMode,
    boardCount, setBoardCount,
  } = useSettingsStore();
  const { byMode: statsByMode } = useStatsStore();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: screenH, width: screenW } = useWindowDimensions();

  // Layout constants
  const HEADER_H = 50;
  const MSG_H = 44;
  const DOTS_H = 36;
  const TAB_H = 50 + insets.bottom;   // BottomStrip content + bottom safe area
  const TILE_GAP = 4;

  const totalH = screenH - insets.top - insets.bottom - HEADER_H - MSG_H - TAB_H;
  const keyHeight = Math.min(60, Math.floor(totalH * 0.08));
  const KBD_H = kbdHeight(keyHeight);
  const availableWidth = screenW - 16;

  // Single-board tile sizing (includes DOTS_H for the 📅/▶/∞ indicator row)
  const wordleAvailH = totalH - KBD_H - DOTS_H;
  const [wordleAreaH, setWordleAreaH] = useState(0);
  const wordleMeasuredH = wordleAreaH > 0 ? wordleAreaH : wordleAvailH;
  const wordleTileSize = Math.max(44, Math.min(88,
    Math.min(Math.floor(wordleMeasuredH / 6) - TILE_GAP, Math.floor(availableWidth / 5) - TILE_GAP),
  ));

  // Derived state
  const isQuordle = gameMode === 'quordle';
  const isDaily = !isQuordle && dailyStore.activeWordleMode === 'daily';

  // Active game status across all sub-modes
  const activeGameStatus: 'playing' | 'won' | 'lost' = isQuordle
    ? quordleStore.gameStatus
    : isDaily
    ? (dailyStore.dailyStatus === 'completed'
        ? (dailyStore.dailySolved ? 'won' : 'lost')
        : 'playing')
    : wordleStore.gameStatus;

  // Route actions to the active sub-mode
  const addLetter    = isQuordle ? quordleStore.addLetter    : isDaily ? dailyStore.addLetter    : wordleStore.addLetter;
  const removeLetter = isQuordle ? quordleStore.removeLetter : isDaily ? dailyStore.removeLetter : wordleStore.removeLetter;
  const submitGuess  = isQuordle ? quordleStore.submitGuess  : isDaily ? dailyStore.submitGuess  : wordleStore.submitGuess;
  const toast        = isQuordle ? quordleStore.toast        : isDaily ? dailyStore.toast        : wordleStore.toast;
  const clearToast   = isQuordle ? quordleStore.clearToast   : isDaily ? dailyStore.clearToast   : wordleStore.clearToast;

  // Stats for BottomStrip
  const practiceStats = isQuordle
    ? (statsByMode[String(boardCount)] ?? emptyBoardStats())
    : (statsByMode['wordle'] ?? emptyBoardStats());
  const dailyStats = dailyStore.stats;

  // UI state
  const [showHelp, setShowHelp] = useState(false);
  const [copyConfirmed, setCopyConfirmed] = useState(false);
  const [activeBoard, setActiveBoard] = useState(0);
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [justSolvedInfo, setJustSolvedInfo] = useState<{ boardNum: number; guessCount: number } | null>(null);
  const [countdown, setCountdown] = useState(() => msToHMS(msUntilMidnight()));
  const scrollRef = useRef<ScrollView>(null);
  const prevSolvedBoardsRef = useRef<boolean[]>([]);
  const isDailyRef = useRef(isDaily);
  isDailyRef.current = isDaily;

  // Countdown updates every second (only used in daily overlay display)
  useEffect(() => {
    const id = setInterval(() => setCountdown(msToHMS(msUntilMidnight())), 1000);
    return () => clearInterval(id);
  }, []);

  // Startup: open daily if not yet completed today; otherwise keep last-played mode
  useEffect(() => {
    useDailyStore.getState().checkAndReset();
    const { lastPlayedDate, dailyStatus } = useDailyStore.getState();
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dailyDoneToday = lastPlayedDate === today && dailyStatus === 'completed';
    if (!dailyDoneToday) {
      setGameMode('wordle');
      setBoardCount(1);
      useDailyStore.getState().setActiveWordleMode('daily');
    }
  }, []);

  // Check for new day whenever screen gains focus
  useFocusEffect(useCallback(() => {
    dailyStore.checkAndReset();
  }, []));

  // Start/resume daily whenever activeWordleMode switches to 'daily'
  useEffect(() => {
    if (isDaily) dailyStore.startOrResumeDaily();
  }, [dailyStore.activeWordleMode, isQuordle]);

  // Reset scroll on new quordle game
  useEffect(() => {
    if (isQuordle && quordleStore.guesses.length === 0) {
      setActiveBoard(0);
      scrollRef.current?.scrollTo({ x: 0, animated: false });
    }
  }, [isQuordle, quordleStore.guesses.length]);

  // Track justSolvedInfo for BottomStrip State 2
  const solvedBoardsKey = quordleStore.solvedBoards.join(',');
  useEffect(() => {
    if (!isQuordle) { prevSolvedBoardsRef.current = []; return; }
    const curr = quordleStore.solvedBoards;
    const prev = prevSolvedBoardsRef.current;
    const idx = curr.findIndex((s, i) => s && !prev[i]);
    if (idx >= 0) setJustSolvedInfo({ boardNum: idx + 1, guessCount: quordleStore.guesses.length });
    prevSolvedBoardsRef.current = [...curr];
  }, [solvedBoardsKey, isQuordle]);

  useEffect(() => {
    if (justSolvedInfo && quordleStore.guesses.length > justSolvedInfo.guessCount) setJustSolvedInfo(null);
  }, [quordleStore.guesses.length]);

  useEffect(() => {
    if (activeGameStatus !== 'playing') setJustSolvedInfo(null);
  }, [activeGameStatus]);

  function scrollTo(index: number) {
    scrollRef.current?.scrollTo({ x: index * screenW, animated: true });
    setActiveBoard(index);
  }

  // Mode cycling (moved from _layout.tsx)
  function cycleTo(n: BoardCount) {
    const doIt = () => {
      setBoardCount(n);
      if (n === 1) { setGameMode('wordle'); useGameStore.getState().newGame(); }
      else { setGameMode('quordle'); useQuordleStore.getState().newGame(); }
    };
    if (isGameInProgress()) confirmAbandon(doIt);
    else doIt();
  }
  function cyclePrev() {
    const idx = BOARD_COUNTS.indexOf(boardCount);
    cycleTo(BOARD_COUNTS[(idx - 1 + BOARD_COUNTS.length) % BOARD_COUNTS.length]);
  }
  function cycleNext() {
    const idx = BOARD_COUNTS.indexOf(boardCount);
    cycleTo(BOARD_COUNTS[(idx + 1) % BOARD_COUNTS.length]);
  }

  function handleNewGame() {
    const doIt = () => {
      if (isQuordle) {
        useQuordleStore.getState().newGame();
      } else if (isDaily) {
        dailyStore.resetDailyForToday();
      } else {
        wordleStore.newGame();
      }
    };
    if (isGameInProgress()) confirmAbandon(doIt);
    else doIt();
  }

  // ── End-of-game overlay ──────────────────────────────────────────────────
  const [endGameVisible, setEndGameVisible] = useState(false);
  const endGameOpacity = useSharedValue(0);
  const endGameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevGameStatusRef = useRef(activeGameStatus);
  const endGameAnimStyle = useAnimatedStyle(() => ({ opacity: endGameOpacity.value }));

  function dismissEndGame() {
    if (endGameTimerRef.current) { clearTimeout(endGameTimerRef.current); endGameTimerRef.current = null; }
    endGameOpacity.value = withTiming(0, { duration: 300 });
    setTimeout(() => setEndGameVisible(false), 320);
  }

  useEffect(() => {
    const prev = prevGameStatusRef.current;
    prevGameStatusRef.current = activeGameStatus;
    if (activeGameStatus === prev) return;

    if (activeGameStatus !== 'playing' && prev === 'playing') {
      const delay = activeGameStatus === 'won' ? 4200 : 3200;
      endGameTimerRef.current = setTimeout(() => {
        setEndGameVisible(true);
        endGameOpacity.value = withTiming(1, { duration: 300 });
        // Daily overlay stays until tapped; practice/quordle auto-dismiss after 3s.
        if (!isDailyRef.current) {
          endGameTimerRef.current = setTimeout(dismissEndGame, 3000);
        }
      }, delay);
    }

    if (activeGameStatus === 'playing') {
      if (endGameTimerRef.current) { clearTimeout(endGameTimerRef.current); endGameTimerRef.current = null; }
      setEndGameVisible(false);
      endGameOpacity.value = 0;
    }

    return () => {
      if (endGameTimerRef.current) { clearTimeout(endGameTimerRef.current); endGameTimerRef.current = null; }
    };
  }, [activeGameStatus]);

  // ── End-game overlay content ─────────────────────────────────────────────
  let endEmoji = '';
  let endMessage = '';
  let endWordsNode: React.ReactNode = null;

  if (activeGameStatus !== 'playing') {
    if (isDaily) {
      endEmoji = activeGameStatus === 'won' ? '🎉' : '😢';
      endMessage = activeGameStatus === 'won' ? 'Solved!' : 'Better luck next time';
      endWordsNode = <Text style={styles.endWordText}>{dailyStore.dailyAnswer}</Text>;
    } else if (!isQuordle) {
      endEmoji = activeGameStatus === 'won' ? '🎉' : '😢';
      endMessage = activeGameStatus === 'won' ? 'Solved!' : 'Better luck next time';
      endWordsNode = <Text style={styles.endWordText}>{wordleStore.answer}</Text>;
    } else {
      const { answers, solvedBoards, boardCount: bc } = quordleStore;
      const solvedCount = solvedBoards.filter(Boolean).length;
      if (activeGameStatus === 'won') {
        endEmoji = '🎉';
        endMessage = bc === 1 ? 'Solved!' : 'You got them all!';
        endWordsNode = <Text style={styles.endWordText}>{answers.join('  ')}</Text>;
      } else {
        const isPartial = solvedCount > 0;
        endEmoji = isPartial ? '😅' : '😢';
        endMessage = isPartial ? `${solvedCount} out of ${bc}!` : 'Better luck next time';
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

  // ── Keyboard / web focus ─────────────────────────────────────────────────
  useFocusEffect(useCallback(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []));

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

  // ── Toast animation ──────────────────────────────────────────────────────
  const [shakeKey, setShakeKey] = useState(0);
  const toastOpacity = useSharedValue(0);
  const toastStyle = useAnimatedStyle(() => ({ opacity: toastOpacity.value }));

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

  function handleKey(key: string) {
    if (key === 'ENTER') submitGuess();
    else if (key === '⌫') removeLetter();
    else addLetter(key);
  }

  async function handleShare() {
    if (activeGameStatus === 'playing') return;
    let text: string;
    if (isDaily) {
      text = buildDailyShareText(dailyStore.dailyGuesses, dailyStore.dailySolved, colorBlindMode);
    } else if (isQuordle) {
      text = buildQuordleShareText(quordleStore.guesses, activeGameStatus, colorBlindMode, quordleStore.boardCount);
    } else {
      text = buildShareText(wordleStore.guesses, activeGameStatus, colorBlindMode, hardMode);
    }
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopyConfirmed(true);
      setTimeout(() => setCopyConfirmed(false), 1500);
    }
  }

  // ── Shared end-game overlay ──────────────────────────────────────────────
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
        {isDaily && (
          <>
            <Text style={styles.endCountdownLabel}>Next daily in</Text>
            <Text style={styles.endCountdownValue}>{countdown}</Text>
          </>
        )}
        <Pressable
          style={styles.shareButton}
          onPress={() => { handleShare(); if (!isDaily) dismissEndGame(); }}
          {...(noFocus as any)}
        >
          {copyConfirmed
            ? <Text style={styles.shareButtonText}>Copied! ✓</Text>
            : <><Text style={styles.shareButtonText}>Share </Text><Ionicons name="share-social-outline" size={16} color="#fff" /></>
          }
        </Pressable>
      </Pressable>
    </Animated.View>
  ) : null;

  // ── Multi-board layout ───────────────────────────────────────────────────
  if (isQuordle) {
    const { guesses: qGuesses, currentGuess: qCurrent, solvedBoards, boardCount: bc, maxGuesses } = quordleStore;
    const qKeyStatuses = deriveQuordleKeyStatuses(qGuesses);
    const solvedCount = solvedBoards.filter(Boolean).length;

    const qAvailH = totalH - KBD_H - DOTS_H;
    const qFallbackTile = Math.max(20, Math.min(72,
      Math.min(Math.floor(availableWidth / 5) - TILE_GAP, Math.floor(qAvailH / maxGuesses) - TILE_GAP),
    ));

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        {renderHeader({
          language, setLanguage, hardMode, setHardMode, darkTheme, setDarkTheme,
          colors, setShowHelp, title: boardCountName(bc),
          onNewGame: handleNewGame, onCyclePrev: cyclePrev, onCycleNext: cycleNext,
          onSettings: () => router.navigate('/(tabs)/settings' as never),
        })}

        {/* Board progress indicators */}
        {bc > 1 && (
          <View style={styles.dotRow}>
            {solvedBoards.map((solved, i) => {
              const isActive   = activeBoard === i;
              const greenCount = solved ? 0 : boardCorrectCount(qGuesses, i);
              const hasYellow  = solved ? false : boardHasYellow(qGuesses, i);
              const squareColor = '#5BA75A';
              const strokeColor = solved || (!hasYellow && greenCount > 0) ? '#6aaa64'
                : hasYellow ? '#c9b458' : '#878a8c';
              const fillColor = solved ? '#6aaa64'
                : hasYellow ? (darkTheme ? colors.background as string : '#ffffff')
                : 'transparent';
              return (
                <Pressable
                  key={i}
                  {...(noFocus as any)}
                  hitSlop={6}
                  onPress={() => scrollTo(i)}
                  accessibilityLabel={
                    solved ? `Board ${i + 1} — solved`
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
        {bc === 1 && <View style={{ height: DOTS_H }} />}

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
          {Array.from({ length: bc }, (_, i) => {
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
                  gameOver={activeGameStatus === 'lost' && !isSolved}
                  answer={quordleStore.answers[i]}
                  shakeKey={shakeKey}
                />
              </BoardPage>
            );
          })}
        </ScrollView>

        {/* Toast-only message area */}
        <View style={styles.messageArea}>
          <Animated.View style={[styles.toastOverlay, toastStyle]} pointerEvents="none">
            <View style={styles.toastPill}>
              <Text style={styles.toastText}>{toast}</Text>
            </View>
          </Animated.View>
        </View>

        <Keyboard onKey={handleKey} keyStatuses={qKeyStatuses} keyHeight={keyHeight} />

        <BottomStrip
          gameStatus={activeGameStatus}
          isQuordle
          isDaily={false}
          currentGuessNum={qGuesses.length}
          maxGuesses={maxGuesses}
          boardCount={bc}
          solvedCount={solvedCount}
          justSolvedInfo={justSolvedInfo}
          practiceStats={practiceStats}
          dailyStats={dailyStats}
          shareConfirmed={copyConfirmed}
          onShare={handleShare}
          onOpenStats={() => setStatsModalVisible(true)}
          textColor={colors.text as string}
          backgroundColor={colors.card as string}
          borderColor={colors.border as string}
        />

        <HelpModal visible={showHelp} onClose={() => setShowHelp(false)} hardMode={hardMode} />
        <StatsModal visible={statsModalVisible} onClose={() => setStatsModalVisible(false)} />
        {endGameOverlay}
      </SafeAreaView>
    );
  }

  // ── Wordle / daily layout ────────────────────────────────────────────────
  // In daily mode, use dailyStore; in practice, use wordleStore.
  const guesses: GuessResult[] = isDaily ? dailyStore.dailyGuesses : wordleStore.guesses;
  const currentGuess = isDaily ? dailyStore.currentGuess : wordleStore.currentGuess;
  const answer = isDaily ? dailyStore.dailyAnswer : wordleStore.answer;
  const keyStatuses = deriveKeyStatuses(guesses);
  const winMessage = WIN_MESSAGES[Math.min(guesses.length - 1, WIN_MESSAGES.length - 1)];
  const resultText = activeGameStatus === 'won' ? winMessage : `The word was ${answer}`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {renderHeader({
        language, setLanguage, hardMode, setHardMode, darkTheme, setDarkTheme,
        colors, setShowHelp, title: 'Wordout',
        onNewGame: handleNewGame, onCyclePrev: cyclePrev, onCycleNext: cycleNext,
        onSettings: () => router.navigate('/(tabs)/settings' as never),
      })}

      {/* Daily 📅 / board indicator ▶ / Practice ∞ row */}
      <View style={styles.modeIconRow}>
        <Pressable
          {...(noFocus as any)}
          hitSlop={10}
          onPress={() => {
            if (isDaily) return;
            dailyStore.setActiveWordleMode('daily');
          }}
          accessibilityLabel="Daily mode"
        >
          <View style={[styles.modeIconSquare, {
            borderColor: isDaily ? '#5BA75A' : '#878a8c',
            backgroundColor: isDaily ? 'rgba(91,167,90,0.15)' : 'transparent',
          }]}>
            <Ionicons name="calendar-outline" size={13} color={isDaily ? '#5BA75A' : '#878a8c'} />
          </View>
        </Pressable>

        <View style={styles.modeIconCenter} />

        <Pressable
          {...(noFocus as any)}
          hitSlop={10}
          onPress={() => {
            if (!isDaily) return;
            dailyStore.setActiveWordleMode('practice');
            useGameStore.getState().newGame();
          }}
          accessibilityLabel="Practice mode"
        >
          <View style={[styles.modeIconSquare, {
            borderColor: isDaily ? '#878a8c' : '#5BA75A',
            backgroundColor: isDaily ? 'transparent' : 'rgba(91,167,90,0.15)',
          }]}>
            <Ionicons name="infinite-outline" size={13} color={isDaily ? '#878a8c' : '#5BA75A'} />
          </View>
        </Pressable>
      </View>

      <View style={styles.boardArea} onLayout={e => setWordleAreaH(e.nativeEvent.layout.height)}>
        <GameBoard
          guesses={guesses}
          currentGuess={currentGuess}
          tileSize={wordleTileSize}
          shakeKey={shakeKey}
          gameOver={activeGameStatus === 'lost'}
          solved={activeGameStatus === 'won'}
          answer={answer}
        />
      </View>

      {/* Toast-only message area */}
      <View style={styles.messageArea}>
        <Animated.View style={[styles.toastOverlay, toastStyle]} pointerEvents="none">
          <View style={styles.toastPill}>
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        </Animated.View>
      </View>

      <Keyboard onKey={handleKey} keyStatuses={keyStatuses} keyHeight={keyHeight} />

      <BottomStrip
        gameStatus={activeGameStatus}
        isQuordle={false}
        isDaily={isDaily}
        currentGuessNum={guesses.length}
        maxGuesses={6}
        boardCount={1}
        solvedCount={activeGameStatus === 'won' ? 1 : 0}
        justSolvedInfo={null}
        practiceStats={practiceStats}
        dailyStats={dailyStats}
        shareConfirmed={copyConfirmed}
        onShare={handleShare}
        onOpenStats={() => setStatsModalVisible(true)}
        textColor={colors.text as string}
        backgroundColor={colors.card as string}
        borderColor={colors.border as string}
      />

      <HelpModal visible={showHelp} onClose={() => setShowHelp(false)} hardMode={hardMode} />
      <StatsModal visible={statsModalVisible} onClose={() => setStatsModalVisible(false)} />
      {endGameOverlay}
    </SafeAreaView>
  );
}

// ── Header ──────────────────────────────────────────────────────────────────

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
  onNewGame: () => void;
  onCyclePrev: () => void;
  onCycleNext: () => void;
  onSettings: () => void;
}

function renderHeader({
  language, setLanguage, hardMode, setHardMode, darkTheme, setDarkTheme,
  colors, setShowHelp, title, onNewGame, onCyclePrev, onCycleNext, onSettings,
}: HeaderProps) {
  return (
    <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>

      {/* Left cluster: 🇬🇧/🇺🇸  💎/🐣  ↺ */}
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
          onPress={() => {
            const newValue = !hardMode;
            if (isGameInProgress()) {
              confirmAbandon(() => {
                setHardMode(newValue);
                const { boardCount } = useSettingsStore.getState();
                if (boardCount > 1) useQuordleStore.getState().newGame();
                else useGameStore.getState().newGame();
              });
            } else {
              setHardMode(newValue);
            }
          }}
        >
          <Text style={styles.flagEmoji}>{hardMode ? '💪' : '🐣'}</Text>
        </Pressable>
        <Pressable
          {...(noFocus as any)}
          hitSlop={12}
          accessibilityLabel="New game"
          onPress={onNewGame}
        >
          <Ionicons name="refresh-outline" size={21} color="#878a8c" />
        </Pressable>
      </View>

      {/* Center: ‹ mode › */}
      <View style={styles.headerTitleWrapper}>
        <Pressable {...(noFocus as any)} onPress={onCyclePrev} hitSlop={8} style={styles.cycleArrow}>
          <Text style={styles.cycleArrowText}>‹</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        <Pressable {...(noFocus as any)} onPress={onCycleNext} hitSlop={8} style={styles.cycleArrow}>
          <Text style={styles.cycleArrowText}>›</Text>
        </Pressable>
      </View>

      {/* Right cluster: 🌙  ⚙  ? */}
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
          accessibilityLabel="Settings"
          onPress={onSettings}
        >
          <Ionicons name="settings-outline" size={21} color="#878a8c" />
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
    paddingHorizontal: 10,
  },
  iconGroupLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconGroupRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  headerTitleWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  cycleArrow: {
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleArrowText: {
    fontSize: 20,
    color: '#878a8c',
    lineHeight: 24,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // Mode icon row (📅 ▶ ∞) for single-board
  modeIconRow: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  modeIconCenter: {
    flex: 1,
    alignItems: 'center',
  },
  modeIconSquare: {
    width: 24,
    height: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
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
  endCountdownLabel: {
    color: '#cccccc',
    fontSize: 14,
    marginTop: -4,
  },
  endCountdownValue: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
    marginTop: -8,
  },
  shareButton: {
    marginTop: 4,
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
