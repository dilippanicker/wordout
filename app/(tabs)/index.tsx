import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, TouchableOpacity, ScrollView, StyleSheet, ColorValue, useWindowDimensions, Platform } from 'react-native';
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
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { GameBoard } from '@/components/GameBoard';
import { BoardIndicator } from '@/components/BoardIndicator';
import { Keyboard, kbdHeight } from '@/components/Keyboard';
import { HelpModal } from '@/components/HelpModal';
import { BottomStrip } from '@/components/BottomStrip';
import { StatsModal } from '@/components/StatsModal';
import { TutorialOverlay } from '@/components/TutorialOverlay';
import { useGameStore, GuessResult, LetterResult } from '@/store/gameStore';
import { useQuordleStore, QuordleGuess } from '@/store/quordleStore';
import { useSettingsStore, boardCountName, BOARD_COUNTS, BoardCount, maxGuessesForDifficulty, Difficulty } from '@/store/settingsStore';
import { useDailyStore, getDailyIndex } from '@/store/dailyStore';
import { useStatsStore, emptyBoardStats } from '@/store/statsStore';
import { isGameInProgress, confirmAbandon } from '@/utils/abandon';
import { TileStatus } from '@/components/Tile';

const noFocus = { tabIndex: -1, onMouseDown: (e: any) => e.preventDefault() };
const END_GAME_DISMISS_MS = 5000;

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

function deriveQuordleKeyStatuses(guesses: QuordleGuess[], boardIndex: number): Record<string, TileStatus> {
  const map: Record<string, TileStatus> = {};
  for (const guess of guesses) {
    const results = guess.boardResults[boardIndex];
    if (!results) continue;
    for (let i = 0; i < 5; i++) {
      const letter = guess.word[i];
      const result = results[i] as TileStatus;
      if (!map[letter] || STATUS_PRIORITY[result] > STATUS_PRIORITY[map[letter]]) {
        map[letter] = result;
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

function buildDailyShareText(guesses: GuessResult[], solved: boolean, colorBlind: boolean, difficulty: Difficulty): string {
  const idx = getDailyIndex();
  const count = solved ? String(guesses.length) : 'X';
  const maxG = maxGuessesForDifficulty(difficulty, 1);
  const CORRECT = colorBlind ? '🟧' : '🟩';
  const PRESENT = colorBlind ? '🟦' : '🟨';
  const ABSENT = '⬛';
  const grid = guesses
    .map(({ results }) => results.map((r: LetterResult) =>
      r === 'correct' ? CORRECT : r === 'present' ? PRESENT : ABSENT,
    ).join(''))
    .join('\n');
  const diffEmoji = DIFFICULTY_EMOJI[difficulty];
  const label = solved ? `${diffEmoji} solved in` : `${diffEmoji} failed`;
  return `Wordout Daily #${idx} — ${label} ${count}/${maxG}\n\n${grid}`;
}

function buildQuordleShareText(guesses: QuordleGuess[], status: 'won' | 'lost', colorBlind: boolean, bc: number, difficulty: Difficulty): string {
  const CORRECT = colorBlind ? '🟧' : '🟩';
  const PRESENT = colorBlind ? '🟦' : '🟨';
  const ABSENT = '⬛';
  const count = status === 'won' ? String(guesses.length) : 'X';
  const maxGuesses = maxGuessesForDifficulty(difficulty, bc);
  const name = boardCountName(bc);
  const header = `${name} ${DIFFICULTY_EMOJI[difficulty]} ${count}/${maxGuesses}`;
  if (bc === 1) {
    const grid = guesses.map(({ boardResults }) =>
      boardResults[0].map(r => r === 'correct' ? CORRECT : r === 'present' ? PRESENT : ABSENT).join('')
    ).join('\n');
    return `${header}\n\n${grid}`;
  }
  const LABELS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];
  const boards = Array.from({ length: bc }, (_, b) => {
    const grid = guesses.map(g => g.boardResults[b].map(r =>
      r === 'correct' ? CORRECT : r === 'present' ? PRESENT : ABSENT,
    ).join('')).join('\n');
    return `${LABELS[b]}\n${grid}`;
  });
  return `${header}\n\n${boards.join('\n\n')}`;
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
    difficulty, setDifficulty,
    darkTheme, setDarkTheme,
    colorBlindMode,
    gameMode, setGameMode,
    boardCount, setBoardCount,
  } = useSettingsStore();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: screenH, width: screenW } = useWindowDimensions();

  // Layout constants
  const HEADER_H = 50;
  const MSG_H = 44;
  const DOTS_H = 36;       // multi-board indicator row
  const WORD_DOTS_H = 44;  // single-board mode icon row (includes label)
  const TAB_H = 50 + insets.bottom;   // BottomStrip content + bottom safe area
  const TILE_GAP = 4;

  const totalH = screenH - insets.top - insets.bottom - HEADER_H - MSG_H - TAB_H;
  const keyHeight = Math.min(60, Math.floor(totalH * 0.08));
  const KBD_H = kbdHeight(keyHeight);
  const availableWidth = screenW - 16;

  // Single-board tile sizing (includes WORD_DOTS_H for the 📅/🎮 indicator row)
  const wordleAvailH = totalH - KBD_H - WORD_DOTS_H;
  const [wordleAreaH, setWordleAreaH] = useState(0);
  const wordleMeasuredH = wordleAreaH > 0 ? wordleAreaH : wordleAvailH;
  const wordleTileSize = Math.max(44, Math.min(88,
    Math.min(Math.floor(wordleMeasuredH / 6) - TILE_GAP, Math.floor(availableWidth / 5) - TILE_GAP),
  ));

  // Derived state
  const isQuordle = gameMode === 'quordle';
  const isDaily = !isQuordle && dailyStore.activeWordleMode === 'daily';

  // Active daily difficulty and game state
  const activeDailyDiff = dailyStore.activeDailyDifficulty;
  const activeDailyGame = dailyStore.games[activeDailyDiff];

  // Active game status across all sub-modes
  const activeGameStatus: 'playing' | 'won' | 'lost' = isQuordle
    ? quordleStore.gameStatus
    : isDaily
    ? (activeDailyGame.status === 'completed'
        ? (activeDailyGame.solved ? 'won' : 'lost')
        : 'playing')
    : wordleStore.gameStatus;

  // Route actions to the active sub-mode
  const addLetter          = isQuordle ? quordleStore.addLetter          : isDaily ? dailyStore.addLetter          : wordleStore.addLetter;
  const removeLetter       = isQuordle ? quordleStore.removeLetter       : isDaily ? dailyStore.removeLetter       : wordleStore.removeLetter;
  const submitGuess        = isQuordle ? quordleStore.submitGuess        : isDaily ? dailyStore.submitGuess        : wordleStore.submitGuess;
  const toast              = isQuordle ? quordleStore.toast              : isDaily ? dailyStore.toast              : wordleStore.toast;
  const clearToast         = isQuordle ? quordleStore.clearToast         : isDaily ? dailyStore.clearToast         : wordleStore.clearToast;

  // Stats for bottom strip
  const statsStore = useStatsStore();
  const activeStats = isQuordle
    ? (statsStore.byMode[String(boardCount)] ?? emptyBoardStats())
    : isDaily
    ? activeDailyGame.stats
    : (statsStore.byMode['wordle'] ?? emptyBoardStats());
  const gameStats = {
    played: activeStats.totalGames,
    winPct: activeStats.totalGames > 0 ? Math.round(activeStats.wins / activeStats.totalGames * 100) : 0,
    streak: activeStats.currentStreak,
    streakEmoji: isDaily ? `${DIFFICULTY_EMOJI[activeDailyDiff]}🔥` : '⚡',
  };

  // UI state
  const [showHelp, setShowHelp] = useState(false);
  const [copyConfirmed, setCopyConfirmed] = useState(false);
  const [activeBoard, setActiveBoard] = useState(0);
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [countdown, setCountdown] = useState(() => msToHMS(msUntilMidnight()));
  // Per-board overlays suppressed until end-game popup is dismissed
  const [overlayLocked, setOverlayLocked] = useState(false);
  // System-level toast (e.g. gate blocked)
  const [systemToast, setSystemToast] = useState<string | null>(null);
  const systemToastOpacity = useSharedValue(0);
  const systemToastStyle = useAnimatedStyle(() => ({ opacity: systemToastOpacity.value }));
  // Peek animation: briefly shows next difficulty emoji in header after daily win
  const peekScale = useSharedValue(1);
  const [peekDiffEmoji, setPeekDiffEmoji] = useState<string | null>(null);
  const peekAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: peekScale.value }] }));
  const scrollRef = useRef<ScrollView>(null);
  // Countdown updates every second
  useEffect(() => {
    const id = setInterval(() => setCountdown(msToHMS(msUntilMidnight())), 1000);
    return () => clearInterval(id);
  }, []);

  // Startup: reset for new day, then funnel to the next unplayed daily difficulty
  useEffect(() => {
    useDailyStore.getState().checkAndReset();
    const { games } = useDailyStore.getState();
    if (games.easy.status === 'available') {
      useDailyStore.getState().setActiveWordleMode('daily');
      useDailyStore.getState().setActiveDailyDifficulty('easy');
    } else if (games.easy.status === 'completed' && games.easy.solved && games.hard.status === 'available') {
      useDailyStore.getState().setActiveWordleMode('daily');
      useDailyStore.getState().setActiveDailyDifficulty('hard');
    } else if (games.hard.status === 'completed' && games.hard.solved && games.extreme.status === 'available') {
      useDailyStore.getState().setActiveWordleMode('daily');
      useDailyStore.getState().setActiveDailyDifficulty('extreme');
    }
    // Else: restore last played (activeWordleMode + activeDailyDifficulty as persisted)
  }, []);

  // First-launch tutorial: fires once unless the user opted out via "Don't show again"
  useEffect(() => {
    if (!useSettingsStore.getState().tutorialSeen) setShowTutorial(true);
  }, []);

  function handleWatchTutorial() {
    setStatsModalVisible(false);
    setShowTutorial(true);
  }

  // Check for new day whenever screen gains focus
  useFocusEffect(useCallback(() => {
    dailyStore.checkAndReset();
  }, []));

  // Start/resume daily whenever mode switches to daily or active difficulty changes
  useEffect(() => {
    if (isDaily) {
      const diff = useDailyStore.getState().activeDailyDifficulty;
      useDailyStore.getState().startOrResumeDailyGame(diff);
    }
  }, [dailyStore.activeWordleMode, isQuordle, dailyStore.activeDailyDifficulty]);

  // Reset scroll on new quordle game; also fires when boardCount changes (settings B2)
  useEffect(() => {
    if (isQuordle && quordleStore.guesses.length === 0) {
      setActiveBoard(0);
      scrollRef.current?.scrollTo({ x: 0, animated: false });
    }
  }, [isQuordle, quordleStore.guesses.length, quordleStore.boardCount]);

  // B2: clamp activeBoard when boardCount shrinks (e.g. settings 4-out → 2-out)
  useEffect(() => {
    setActiveBoard(prev => {
      if (isQuordle && prev >= quordleStore.boardCount) {
        scrollRef.current?.scrollTo({ x: 0, animated: false });
        return 0;
      }
      return prev;
    });
  }, [isQuordle, quordleStore.boardCount]);

  // Active board solved state for persistent footer display (B7)
  const activeBoardSolved = isQuordle ? (quordleStore.solvedBoards[activeBoard] ?? false) : false;
  const activeBoardSolvedGuess = isQuordle ? boardSolvedAtRow(quordleStore.guesses, activeBoard) + 1 : 0;

  function showSystemToast(msg: string) {
    setSystemToast(msg);
    systemToastOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withDelay(2400, withTiming(0, { duration: 300 })),
    );
    setTimeout(() => setSystemToast(null), 2900);
  }

  function scrollTo(index: number) {
    scrollRef.current?.scrollTo({ x: index * screenW, animated: true });
    setActiveBoard(index);
  }

  // Mode cycling
  function cycleTo(n: BoardCount) {
    const doIt = () => {
      setBoardCount(n);
      if (n === 1) {
        setGameMode('wordle');
      } else {
        setGameMode('quordle');
        useQuordleStore.getState().switchBoardCount(n);
      }
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

  function handleDifficultyToggle() {
    if (isDaily) {
      const { games, activeDailyDifficulty: currDiff } = useDailyStore.getState();
      // Build accessible list: include a difficulty if it's played (playing/completed)
      // OR if the previous difficulty was won — that unlocks the next slot.
      const accessible: Difficulty[] = [];
      let prevWon = true; // Easy is always the starting point
      for (const d of DIFFICULTY_CYCLE) {
        if (games[d].status === 'playing' || games[d].status === 'completed' || prevWon) {
          accessible.push(d);
        } else {
          break;
        }
        prevWon = games[d].status === 'completed' && games[d].solved;
      }
      // Single-entry dead end: only one difficulty accessible and it was lost
      if (accessible.length === 1 && games[accessible[0]].status === 'completed' && !games[accessible[0]].solved) {
        const msg = accessible[0] === 'easy'
          ? `Easy ${DIFFICULTY_EMOJI.easy} lost, can't play Hard ${DIFFICULTY_EMOJI.hard}`
          : `Hard ${DIFFICULTY_EMOJI.hard} lost, can't play Extreme ${DIFFICULTY_EMOJI.extreme}`;
        showSystemToast(msg);
        return;
      }
      const currIdx = accessible.indexOf(currDiff);
      const nextDiff = accessible[(currIdx + 1) % accessible.length];
      useDailyStore.getState().setActiveDailyDifficulty(nextDiff);
      return;
    }

    const idx = DIFFICULTY_CYCLE.indexOf(difficulty);
    const next = DIFFICULTY_CYCLE[(idx + 1) % DIFFICULTY_CYCLE.length];

    if (isQuordle) {
      // Quordle: lock if complete, confirmAbandon if in-progress
      if (activeGameStatus !== 'playing') {
        showSystemToast('Game complete — start a new game to change difficulty');
        return;
      }
      if (isGameInProgress()) {
        confirmAbandon(() => { setDifficulty(next); useQuordleStore.getState().newGame(); });
      } else {
        setDifficulty(next);
      }
      return;
    }

    // Single-board practice: snapshot-aware switch, no lock, no confirm
    useGameStore.getState().switchDifficulty(next);
    setDifficulty(next);
  }

  function handleNewGame() {
    if (isDaily) {
      // Daily games can't be restarted
      const game = useDailyStore.getState().games[useDailyStore.getState().activeDailyDifficulty];
      if (game.status === 'completed') {
        showSystemToast(`Next daily in ${msToHMS(msUntilMidnight())}`);
      } else {
        showSystemToast("Daily game can't be restarted");
      }
      return;
    }
    const doIt = () => {
      if (isQuordle) {
        useQuordleStore.getState().newGame();
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
    setTimeout(() => {
      setEndGameVisible(false);
      setOverlayLocked(false);
      // Peek animation: after daily win, briefly flash the next difficulty emoji
      if (isDaily && activeDailyGame.solved) {
        const nextDiff = activeDailyDiff === 'easy' ? 'hard' : activeDailyDiff === 'hard' ? 'extreme' : null;
        if (nextDiff) {
          setPeekDiffEmoji(DIFFICULTY_EMOJI[nextDiff]);
          peekScale.value = withSequence(
            withTiming(1.7, { duration: 200 }),
            withDelay(1000, withTiming(1, { duration: 200 })),
          );
          setTimeout(() => setPeekDiffEmoji(null), 1450);
        }
      }
    }, 320);
  }

  // B3: When mode, board count, or daily difficulty changes, clear overlay and sync status ref.
  useEffect(() => {
    if (endGameTimerRef.current) { clearTimeout(endGameTimerRef.current); endGameTimerRef.current = null; }
    setEndGameVisible(false);
    endGameOpacity.value = 0;
    setOverlayLocked(false);
    prevGameStatusRef.current = activeGameStatus;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isQuordle, isDaily, boardCount, dailyStore.activeDailyDifficulty]);

  useEffect(() => {
    const prev = prevGameStatusRef.current;
    prevGameStatusRef.current = activeGameStatus;
    if (activeGameStatus === prev) return;

    if (activeGameStatus !== 'playing' && prev === 'playing') {
      // Check if celebration was already shown for this game
      const alreadyShown = isDaily
        ? useDailyStore.getState().games[useDailyStore.getState().activeDailyDifficulty].celebrationShown
        : isQuordle
        ? useQuordleStore.getState().celebrationShown
        : useGameStore.getState().celebrationShown;

      if (!alreadyShown) {
        // Mark immediately so any concurrent re-render can't double-fire
        if (isDaily) {
          const diff = useDailyStore.getState().activeDailyDifficulty;
          useDailyStore.getState().setCelebrationShown(diff, true);
        } else if (isQuordle) {
          useQuordleStore.getState().setCelebrationShown(true);
        } else {
          useGameStore.getState().setCelebrationShown(true);
        }

        setOverlayLocked(true); // suppress per-board overlays until popup dismissed
        const delay = activeGameStatus === 'won' ? 4200 : 3200;
        endGameTimerRef.current = setTimeout(() => {
          endGameTimerRef.current = null;
          if (activeGameStatus === 'won') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          setEndGameVisible(true);
          endGameOpacity.value = withTiming(1, { duration: 300 });
          // auto-dismiss handled by [endGameVisible] effect (B4)
        }, delay);
      }
    }

    if (activeGameStatus === 'playing') {
      setOverlayLocked(false);
      if (endGameTimerRef.current) { clearTimeout(endGameTimerRef.current); endGameTimerRef.current = null; }
      setEndGameVisible(false);
      endGameOpacity.value = 0;
    }

    return () => {
      if (endGameTimerRef.current) { clearTimeout(endGameTimerRef.current); endGameTimerRef.current = null; }
    };
  }, [activeGameStatus]);

  // B4: auto-dismiss overlay after END_GAME_DISMISS_MS — separate from outer delay timer
  useEffect(() => {
    if (!endGameVisible) return;
    const timer = setTimeout(dismissEndGame, END_GAME_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [endGameVisible]);

  // B4b: countdown ticker while overlay is visible
  const [dismissCountdown, setDismissCountdown] = useState(0);
  useEffect(() => {
    if (!endGameVisible) { setDismissCountdown(0); return; }
    setDismissCountdown(Math.ceil(END_GAME_DISMISS_MS / 1000));
    const id = setInterval(() => setDismissCountdown(n => Math.max(0, n - 1)), 1000);
    return () => clearInterval(id);
  }, [endGameVisible]);

  // ── End-game overlay content ─────────────────────────────────────────────
  let endEmoji = '';
  let endMessage = '';
  let endWordsNode: React.ReactNode = null;
  let endSolveCount: string | null = null;

  if (activeGameStatus !== 'playing') {
    if (isDaily) {
      endEmoji = activeGameStatus === 'won' ? '🎉' : '😢';
      endMessage = activeGameStatus === 'won' ? 'Solved!' : 'Better luck next time';
      endWordsNode = <Text style={styles.endWordText}>{dailyStore.dailyAnswers[activeDailyDiff]}</Text>;
      if (activeGameStatus === 'won') {
        const maxG = maxGuessesForDifficulty(activeDailyDiff, 1);
        endSolveCount = `Solved in ${activeDailyGame.guesses.length}/${maxG} tries ${DIFFICULTY_EMOJI[activeDailyDiff]}`;
      }
    } else if (!isQuordle) {
      endEmoji = activeGameStatus === 'won' ? '🎉' : '😢';
      endMessage = activeGameStatus === 'won' ? 'Solved!' : 'Better luck next time';
      endWordsNode = <Text style={styles.endWordText}>{wordleStore.answer}</Text>;
      if (activeGameStatus === 'won') {
        const maxG = maxGuessesForDifficulty(difficulty, 1);
        endSolveCount = `Solved in ${wordleStore.guesses.length}/${maxG} tries ${DIFFICULTY_EMOJI[difficulty]}`;
      }
    } else {
      const { answers, solvedBoards, boardCount: bc } = quordleStore;
      const solvedCount = solvedBoards.filter(Boolean).length;
      if (activeGameStatus === 'won') {
        endEmoji = '🎉';
        endMessage = bc === 1 ? 'Solved!' : 'You got them all!';
        endWordsNode = <Text style={styles.endWordText}>{answers.join('  ')}</Text>;
        endSolveCount = `Solved in ${quordleStore.guesses.length}/${quordleStore.maxGuesses} tries ${DIFFICULTY_EMOJI[difficulty]}`;
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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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

  function handleTilePress(col: number) {
    if (isDaily) {
      const state = useDailyStore.getState();
      const currentGuess = state.games[state.activeDailyDifficulty].currentGuess;
      state.setCurrentGuess(currentGuess.slice(0, col));
    } else if (isQuordle) {
      useQuordleStore.getState().setCurrentGuess(useQuordleStore.getState().currentGuess.slice(0, col));
    } else {
      useGameStore.getState().setCurrentGuess(useGameStore.getState().currentGuess.slice(0, col));
    }
  }

  async function handleShare() {
    if (activeGameStatus === 'playing') return;
    let text: string;
    if (isDaily) {
      text = buildDailyShareText(activeDailyGame.guesses, activeDailyGame.solved, colorBlindMode, activeDailyDiff);
    } else if (isQuordle) {
      text = buildQuordleShareText(quordleStore.guesses, activeGameStatus, colorBlindMode, quordleStore.boardCount, difficulty);
    } else {
      text = buildShareText(wordleStore.guesses, activeGameStatus, colorBlindMode, difficulty === 'hard');
    }
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopyConfirmed(true);
      setTimeout(() => setCopyConfirmed(false), 1500);
    }
  }

  // ── Play Now button (daily progression) ─────────────────────────────────
  // Show when current daily difficulty is won and the next difficulty hasn't started yet
  const playNowDiff: Difficulty | null = isDaily
    ? (activeDailyDiff === 'easy' && activeDailyGame.solved && dailyStore.games.hard.status === 'available'
        ? 'hard'
        : activeDailyDiff === 'hard' && activeDailyGame.solved && dailyStore.games.extreme.status === 'available'
        ? 'extreme'
        : null)
    : null;
  const playNowLabel = playNowDiff ? `${DIFFICULTY_EMOJI[playNowDiff]} Unlocked! Play Now` : null;

  function handlePlayNow() {
    if (playNowDiff) useDailyStore.getState().setActiveDailyDifficulty(playNowDiff);
  }

  // ── Shared end-game overlay ──────────────────────────────────────────────
  const endGameOverlay = endGameVisible ? (
    <Animated.View style={[StyleSheet.absoluteFill, styles.endGameOverlay, endGameAnimStyle]}>
      <TouchableOpacity
        style={[StyleSheet.absoluteFill, styles.endGamePressable]}
        onPress={dismissEndGame}
        activeOpacity={1}
        {...(noFocus as any)}
      >
        <View style={styles.endGameHelpRow}>
          <Pressable
            style={styles.endGameHelpBtn}
            onPress={(e) => { e.stopPropagation?.(); setShowHelp(true); }}
            {...(noFocus as any)}
          >
            <Ionicons name="help-circle-outline" size={24} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>
        <View style={[styles.endGameContent, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.endGameEmoji}>{endEmoji}</Text>
          <Text style={styles.endGameMessage}>{endMessage}</Text>
          {endWordsNode}
          {endSolveCount ? <Text style={styles.endSolveCount}>{endSolveCount}</Text> : null}
          {isDaily && (
            <>
              <Text style={styles.endCountdownLabel}>Next daily in</Text>
              <Text style={styles.endCountdownValue}>{countdown}</Text>
            </>
          )}
          {isDaily && (
            <Pressable
              style={styles.shareButton}
              onPress={(e) => { e.stopPropagation?.(); handleShare(); }}
              {...(noFocus as any)}
            >
              {copyConfirmed
                ? <Text style={styles.shareButtonText}>Copied! ✓</Text>
                : <View style={styles.shareButtonInner}>
                    <Text style={styles.shareButtonText}>Share</Text>
                    <Ionicons name="share-social-outline" size={16} color="#fff" />
                  </View>
              }
            </Pressable>
          )}
          {dismissCountdown > 0 && (
            <Text style={styles.dismissCountdown}>Closing in {dismissCountdown}…</Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  ) : null;

  // ── Multi-board layout ───────────────────────────────────────────────────
  if (isQuordle) {
    const { guesses: qGuesses, currentGuess: qCurrent, solvedBoards, boardCount: bc, maxGuesses } = quordleStore;
    const qKeyStatuses = deriveQuordleKeyStatuses(qGuesses, activeBoard);
    const solvedCount = solvedBoards.filter(Boolean).length;

    const qAvailH = totalH - KBD_H - DOTS_H;
    const BOARD_PAGE_PAD = 12; // boardPage paddingTop(8) + paddingBottom(4) — prevents last row clip
    const qFallbackTile = Math.max(20, Math.min(72,
      Math.min(Math.floor(availableWidth / 5) - TILE_GAP, Math.floor((qAvailH - BOARD_PAGE_PAD) / maxGuesses) - TILE_GAP),
    ));

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        {renderHeader({
          language, setLanguage, difficulty, setDifficulty, darkTheme, setDarkTheme,
          colors, setShowHelp, title: boardCountName(boardCount),
          onNewGame: handleNewGame, onCyclePrev: cyclePrev, onCycleNext: cycleNext,
          onSettings: () => router.navigate('/(tabs)/settings' as never),
          onDifficultyToggle: handleDifficultyToggle,
          diffPeekStyle: peekAnimStyle,
          diffPeekEmoji: peekDiffEmoji,
        })}

        {/* Board progress indicators */}
        {bc > 1 && (
          <View style={styles.dotRow}>
            {solvedBoards.map((solved, i) => {
              const isActive   = activeBoard === i;
              const greenCount = solved ? 0 : boardCorrectCount(qGuesses, i);
              const hasYellow  = solved ? false : boardHasYellow(qGuesses, i);
              return (
                <BoardIndicator
                  key={i}
                  solved={solved}
                  isActive={isActive}
                  greenCount={greenCount}
                  hasYellow={hasYellow}
                  onPress={() => scrollTo(i)}
                  accessibilityLabel={
                    solved ? `Board ${i + 1} — solved`
                    : isActive ? `Board ${i + 1} — current`
                    : `Board ${i + 1}${greenCount > 0 ? `, ${greenCount} correct` : ''}`
                  }
                />
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
                  key={`${boardCount}-${i}`}
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
                  suppressOverlay={overlayLocked}
                  waveShown={quordleStore.waveDoneBoards[i] ?? false}
                  onWaveDone={() => useQuordleStore.getState().setWaveDone(i)}
                  onCurrentGuessTilePress={handleTilePress}
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
          <Animated.View style={[styles.toastOverlay, systemToastStyle]} pointerEvents="none">
            {systemToast ? <View style={styles.toastPill}><Text style={styles.toastText}>{systemToast}</Text></View> : null}
          </Animated.View>
        </View>

        <Keyboard onKey={handleKey} keyStatuses={qKeyStatuses} keyHeight={keyHeight} enterActive={qCurrent.length === 5} />

        <BottomStrip
          gameStatus={activeGameStatus}
          isQuordle
          isDaily={false}
          currentGuessNum={qGuesses.length}
          maxGuesses={maxGuesses}
          boardCount={bc}
          solvedCount={solvedCount}
          difficulty={difficulty}
          activeBoardIndex={activeBoard}
          activeBoardSolved={activeBoardSolved}
          activeBoardSolvedGuess={activeBoardSolvedGuess}
          onOpenStats={() => setStatsModalVisible(true)}
          onOpenHelp={() => setShowHelp(true)}
          onNewGame={handleNewGame}
          textColor={colors.text as string}
          backgroundColor={colors.card as string}
          borderColor={colors.border as string}
          gameStats={gameStats}
        />

        <HelpModal visible={showHelp} onClose={() => setShowHelp(false)} difficulty={difficulty} onWatchTutorial={handleWatchTutorial} />
        <StatsModal visible={statsModalVisible} onClose={() => setStatsModalVisible(false)} onWatchTutorial={handleWatchTutorial} />
        {endGameOverlay}
        {showTutorial && <TutorialOverlay onClose={() => setShowTutorial(false)} />}
      </SafeAreaView>
    );
  }

  // ── Wordle / daily layout ────────────────────────────────────────────────
  // In daily mode, use dailyStore active game; in practice, use wordleStore.
  const guesses: GuessResult[] = isDaily ? activeDailyGame.guesses : wordleStore.guesses;
  const currentGuess = isDaily ? activeDailyGame.currentGuess : wordleStore.currentGuess;
  const answer = isDaily ? dailyStore.dailyAnswers[activeDailyDiff] : wordleStore.answer;
  const keyStatuses = deriveKeyStatuses(guesses);
  const winMessage = WIN_MESSAGES[Math.min(guesses.length - 1, WIN_MESSAGES.length - 1)];
  const resultText = activeGameStatus === 'won' ? winMessage : `The word was ${answer}`;

  // Active daily difficulty label for ribbon
  const DIFF_LABEL: Record<Difficulty, string> = { easy: 'Easy', hard: 'Hard', extreme: 'Extreme' };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {renderHeader({
        language, setLanguage,
        difficulty: isDaily ? activeDailyDiff : difficulty,
        setDifficulty, darkTheme, setDarkTheme,
        colors, setShowHelp, title: 'Wordout',
        onNewGame: handleNewGame, onCyclePrev: cyclePrev, onCycleNext: cycleNext,
        onSettings: () => router.navigate('/(tabs)/settings' as never),
        onDifficultyToggle: handleDifficultyToggle,
        diffPeekStyle: peekAnimStyle,
        diffPeekEmoji: peekDiffEmoji,
      })}

      {/* Daily 📅 / Practice 🎮 row — active icon + inline label, inactive faded */}
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
          <View style={[styles.modeIconPill, { opacity: isDaily ? 1 : 0.45 }]}>
            <View style={[styles.modeIconSquare, {
              borderColor: isDaily ? '#5BA75A' : '#878a8c',
              backgroundColor: isDaily ? 'rgba(91,167,90,0.15)' : 'transparent',
            }]}>
              <Ionicons name="calendar-outline" size={13} color={isDaily ? '#5BA75A' : '#878a8c'} />
            </View>
            {isDaily && (
              <Text style={styles.modeLabel} numberOfLines={1}>
                {activeDailyGame.status === 'completed'
                  ? `Next word in ${countdown} ${DIFFICULTY_EMOJI[activeDailyDiff]}`
                  : `Today's · ${DIFF_LABEL[activeDailyDiff]} ${DIFFICULTY_EMOJI[activeDailyDiff]}`}
              </Text>
            )}
          </View>
        </Pressable>

        <View style={styles.modeIconSpacer} />

        <Pressable
          {...(noFocus as any)}
          hitSlop={10}
          onPress={() => {
            if (!isDaily) return;
            dailyStore.setActiveWordleMode('practice');
          }}
          accessibilityLabel="Practice mode"
        >
          <View style={[styles.modeIconPill, { opacity: isDaily ? 0.45 : 1 }]}>
            {!isDaily && (
              <Text style={styles.modeLabel} numberOfLines={1}>
                {`Practice · ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`}
              </Text>
            )}
            <View style={[styles.modeIconSquare, {
              borderColor: isDaily ? '#878a8c' : '#5BA75A',
              backgroundColor: isDaily ? 'transparent' : 'rgba(91,167,90,0.15)',
            }]}>
              <Text style={styles.modeIconEmoji}>🎮</Text>
            </View>
          </View>
        </Pressable>
      </View>

      <View style={styles.boardArea} onLayout={e => setWordleAreaH(e.nativeEvent.layout.height)}>
        <GameBoard
          key={isDaily ? `daily-${activeDailyDiff}` : 'practice'}
          guesses={guesses}
          currentGuess={currentGuess}
          tileSize={wordleTileSize}
          maxGuesses={maxGuessesForDifficulty(isDaily ? activeDailyDiff : difficulty, 1)}
          shakeKey={shakeKey}
          gameOver={activeGameStatus === 'lost'}
          solved={activeGameStatus === 'won'}
          answer={answer}
          suppressOverlay={overlayLocked}
          waveShown={isDaily ? activeDailyGame.waveShown : wordleStore.waveShown}
          onWaveDone={() => {
            if (isDaily) {
              const diff = useDailyStore.getState().activeDailyDifficulty;
              useDailyStore.getState().setWaveShown(diff, true);
            } else {
              useGameStore.getState().setWaveShown(true);
            }
          }}
          onCurrentGuessTilePress={handleTilePress}
        />
      </View>

      {/* Toast-only message area */}
      <View style={styles.messageArea}>
        <Animated.View style={[styles.toastOverlay, toastStyle]} pointerEvents="none">
          <View style={styles.toastPill}>
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        </Animated.View>
        <Animated.View style={[styles.toastOverlay, systemToastStyle]} pointerEvents="none">
          {systemToast ? <View style={styles.toastPill}><Text style={styles.toastText}>{systemToast}</Text></View> : null}
        </Animated.View>
      </View>

      <Keyboard onKey={handleKey} keyStatuses={keyStatuses} keyHeight={keyHeight} enterActive={currentGuess.length === 5} />

      <BottomStrip
        gameStatus={activeGameStatus}
        isQuordle={false}
        isDaily={isDaily}
        currentGuessNum={guesses.length}
        maxGuesses={maxGuessesForDifficulty(isDaily ? activeDailyDiff : difficulty, 1)}
        boardCount={1}
        solvedCount={activeGameStatus === 'won' ? 1 : 0}
        difficulty={isDaily ? activeDailyDiff : difficulty}
        onOpenStats={() => setStatsModalVisible(true)}
        onOpenHelp={() => setShowHelp(true)}
        onNewGame={handleNewGame}
        playNowLabel={playNowLabel}
        onPlayNow={handlePlayNow}
        textColor={colors.text as string}
        backgroundColor={colors.card as string}
        borderColor={colors.border as string}
        gameStats={gameStats}
      />

      <HelpModal visible={showHelp} onClose={() => setShowHelp(false)} difficulty={isDaily ? activeDailyDiff : difficulty} onWatchTutorial={handleWatchTutorial} />
      <StatsModal visible={statsModalVisible} onClose={() => setStatsModalVisible(false)} onWatchTutorial={handleWatchTutorial} />
      {endGameOverlay}
      {showTutorial && <TutorialOverlay onClose={() => setShowTutorial(false)} />}
    </SafeAreaView>
  );
}

// ── Header ──────────────────────────────────────────────────────────────────

interface HeaderProps {
  language: string;
  setLanguage: (l: 'en_us' | 'en_gb') => void;
  difficulty: import('@/store/settingsStore').Difficulty;
  setDifficulty: (d: import('@/store/settingsStore').Difficulty) => void;
  darkTheme: boolean;
  setDarkTheme: (v: boolean) => void;
  colors: { card: ColorValue; border: ColorValue; text: ColorValue };
  setShowHelp: (v: boolean) => void;
  title: string;
  onNewGame: () => void;
  onCyclePrev: () => void;
  onCycleNext: () => void;
  onSettings: () => void;
  onDifficultyToggle: () => void;
  // Peek animation: scale-transform style + optional emoji override for the difficulty icon
  diffPeekStyle?: object;
  diffPeekEmoji?: string | null;
}

const DIFFICULTY_CYCLE: import('@/store/settingsStore').Difficulty[] = ['easy', 'hard', 'extreme'];
const DIFFICULTY_EMOJI: Record<string, string> = { easy: '🐣', hard: '💪', extreme: '💀' };

function renderHeader({
  language, setLanguage, difficulty, setDifficulty, darkTheme, setDarkTheme,
  colors, setShowHelp, title, onNewGame, onCyclePrev, onCycleNext, onSettings, onDifficultyToggle,
  diffPeekStyle, diffPeekEmoji,
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
          accessibilityLabel={`Difficulty: ${difficulty} — tap to cycle`}
          onPress={onDifficultyToggle}
        >
          <Animated.View style={diffPeekStyle}>
            <Text style={styles.flagEmoji}>{diffPeekEmoji ?? DIFFICULTY_EMOJI[difficulty]}</Text>
          </Animated.View>
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

      {/* Center: ◀ mode ▶ */}
      <View style={styles.headerTitleWrapper}>
        <Pressable {...(noFocus as any)} onPress={onCyclePrev} hitSlop={10} style={styles.cycleArrow}>
          <View style={styles.triangleLeft} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        <Pressable {...(noFocus as any)} onPress={onCycleNext} hitSlop={10} style={styles.cycleArrow}>
          <View style={styles.triangleRight} />
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
  triangleLeft: {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#aaa',
  },
  triangleRight: {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#aaa',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // Mode icon row (📅 🎮) for single-board
  modeIconRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  modeIconSpacer: {
    flex: 1,
  },
  modeIconPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeIconSquare: {
    width: 24,
    height: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIconEmoji: {
    fontSize: 13,
    lineHeight: 16,
  },
  modeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5BA75A',
    letterSpacing: 0.2,
    maxWidth: 160,
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
    flexDirection: 'column',
  },
  endGameContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  endGameHelpRow: {
    width: '100%',
    alignItems: 'flex-end',
    paddingRight: 8,
    marginBottom: -8,
  },
  endGameHelpBtn: {
    padding: 8,
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
  endSolveCount: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontWeight: '500',
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
  shareButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shareButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  dismissCountdown: {
    color: '#5BA75A',
    fontSize: 16,
    fontWeight: '700',
  },
  newGameButton: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 6,
  },
  newGameButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  newGameButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
