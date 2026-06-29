import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Tile, TileStatus } from './Tile';
import { FlipTile } from './FlipTile';
import { GuessResult, LetterResult } from '@/store/gameStore';

const COLS = 5;
const STAGGER = 180; // ms between each tile flip
// Time (ms) after submit until the last tile's flip finishes + small buffer.
// Last tile starts at STAGGER * (COLS-1) = 720ms, flip takes 400ms → done at 1120ms + 50ms buffer.
const FLIP_DONE_MS = STAGGER * (COLS - 1) + 450;
const WAVE_STAGGER = 80; // ms between each tile in the win wave

// Wraps one tile; bounces up-then-spring-back with a per-tile delay.
// onDone fires via runOnJS when the spring settles — used on the last tile to signal wave complete.
function BounceTile({ delay, onDone, children }: { delay: number; onDone?: () => void; children: React.ReactNode }) {
  const translateY = useSharedValue(0);
  useEffect(() => {
    const springCb = onDone
      ? (finished?: boolean) => {
          'worklet';
          if (finished) runOnJS(onDone)();
        }
      : undefined;
    translateY.value = withDelay(delay,
      withSequence(
        withTiming(-14, { duration: 100 }),
        withSpring(0, { damping: 6, stiffness: 180 }, springCb),
      ),
    );
  }, []);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

// Wraps the active row; plays a horizontal shake when shakeKey increments.
function ShakeRow({ children, shakeKey }: { children: React.ReactNode; shakeKey: number }) {
  const translateX = useSharedValue(0);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    translateX.value = withSequence(
      withTiming(-8, { duration: 50 }),
      withTiming( 8, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming( 6, { duration: 50 }),
      withTiming( 0, { duration: 50 }),
    );
  }, [shakeKey]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    flexDirection: 'row',
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

interface GameBoardProps {
  // Single-board (Wordout) mode: pre-merged per-guess results
  guesses?: GuessResult[];
  // Multi-board (Quordle) mode: words shared across all boards,
  // boardResults specific to THIS board (one array per guess)
  words?: string[];
  boardResults?: LetterResult[][];
  // Common
  currentGuess: string;
  tileSize?: number;
  shakeKey?: number;
  maxGuesses?: number;
  solved?: boolean;
  gameOver?: boolean;
  answer?: string;
  label?: string;
  // When true the board stretches to fill its parent and measures itself
  // to compute tile size — no need to pass tileSize from the parent.
  flexMode?: boolean;
  // When true, per-board ✓/✗ overlay is suppressed (shown after end-game popup dismissed).
  suppressOverlay?: boolean;
  // Store-level flag: wave animation already shown for this game — skips re-animation on mode switch.
  waveShown?: boolean;
  // Called when wave animation completes — parent should persist to store.
  onWaveDone?: () => void;
  // Called when a tile in current guess is pressed; col is 0-indexed position
  onCurrentGuessTilePress?: (col: number) => void;
}

export function GameBoard({
  guesses,
  words,
  boardResults,
  currentGuess,
  tileSize = 60,
  shakeKey = 0,
  maxGuesses = 6,
  solved = false,
  gameOver = false,
  answer,
  label,
  flexMode = false,
  suppressOverlay = false,
  waveShown,
  onWaveDone,
  onCurrentGuessTilePress,
}: GameBoardProps) {
  // In flex mode we measure the board container and compute tile dimensions ourselves.
  const [boardLayout, setBoardLayout] = useState({ width: 0, height: 0 });
  const tileFromW = Math.max(16, Math.floor(boardLayout.width / COLS) - 4);
  const tileFromH = Math.max(16, Math.floor(boardLayout.height / maxGuesses) - 4);
  const effectiveTileSize = (!flexMode || boardLayout.width === 0 || boardLayout.height === 0)
    ? tileSize
    : Math.min(tileFromW, tileFromH);
  const effectiveTileW = effectiveTileSize;
  const effectiveTileH = effectiveTileSize;

  // Overlay opacities — always start at 0; effects handle fade-in (including remount case).
  const winOverlayOpacity  = useSharedValue(0);
  const loseOverlayOpacity = useSharedValue(0);
  const redTintOpacity     = useSharedValue(0);

  // Board shake on lose + red tint flash (separate from overlay — overlay is suppressOverlay-gated).
  const boardShakeX = useSharedValue(0);
  const prevGameOverRef = useRef(gameOver);
  useEffect(() => {
    const prev = prevGameOverRef.current;
    prevGameOverRef.current = gameOver;
    if (gameOver && !prev) {
      // 3 shakes, 14px each side, ~910ms total (7 moves × 130ms), delayed until flip finishes.
      boardShakeX.value = withDelay(FLIP_DONE_MS,
        withSequence(
          withTiming(-14, { duration: 130 }),
          withTiming( 14, { duration: 130 }),
          withTiming(-14, { duration: 130 }),
          withTiming( 14, { duration: 130 }),
          withTiming(-14, { duration: 130 }),
          withTiming( 14, { duration: 130 }),
          withTiming(  0, { duration: 130 }),
        ),
      );
      // Red tint flash starts with the shake.
      redTintOpacity.value = withDelay(FLIP_DONE_MS,
        withSequence(
          withTiming(1, { duration: 200 }),
          withDelay(400, withTiming(0, { duration: 500 })),
        ),
      );
    }
    if (!gameOver && prev) {
      redTintOpacity.value = 0;
    }
  }, [gameOver]);

  // Timestamps for first solve/loss — 0 means already in that state on mount (remount), -1 means not yet.
  const solvedTimestampRef = useRef(solved ? 0 : -1);
  const lostTimestampRef   = useRef((gameOver && !solved) ? 0 : -1);

  useEffect(() => {
    if (solved) {
      if (solvedTimestampRef.current === -1) solvedTimestampRef.current = Date.now();
    } else {
      solvedTimestampRef.current = -1;
    }
  }, [solved]);

  useEffect(() => {
    if (gameOver && !solved) {
      if (lostTimestampRef.current === -1) lostTimestampRef.current = Date.now();
    } else {
      lostTimestampRef.current = -1;
    }
  }, [gameOver, solved]);

  // Win overlay: fade in after wave animation completes (delay on first solve, immediate on remount/re-show).
  useEffect(() => {
    if (solved && !suppressOverlay) {
      const ts = solvedTimestampRef.current;
      const elapsed = ts <= 0 ? Infinity : (Date.now() - ts);
      const waveDuration = FLIP_DONE_MS + count * COLS * WAVE_STAGGER + 400;
      if (elapsed < waveDuration) {
        winOverlayOpacity.value = withDelay(waveDuration - elapsed, withTiming(1, { duration: 300 }));
      } else {
        winOverlayOpacity.value = withTiming(1, { duration: 200 });
      }
    } else {
      winOverlayOpacity.value = 0;
    }
  }, [solved, suppressOverlay]);

  // Lose overlay: fade in after board shake completes (delay on first loss, immediate on remount/re-show).
  useEffect(() => {
    if (gameOver && !solved && !suppressOverlay) {
      const ts = lostTimestampRef.current;
      const elapsed = ts <= 0 ? Infinity : (Date.now() - ts);
      const shakeDuration = FLIP_DONE_MS + 7 * 130 + 300; // ~2380ms
      if (elapsed < shakeDuration) {
        loseOverlayOpacity.value = withDelay(shakeDuration - elapsed, withTiming(1, { duration: 300 }));
      } else {
        loseOverlayOpacity.value = withTiming(1, { duration: 200 });
      }
    } else {
      loseOverlayOpacity.value = 0;
    }
  }, [gameOver, suppressOverlay]);

  const boardShakeStyle  = useAnimatedStyle(() => ({ transform: [{ translateX: boardShakeX.value }] }));
  const winOverlayStyle  = useAnimatedStyle(() => ({ opacity: winOverlayOpacity.value }));
  const loseOverlayStyle = useAnimatedStyle(() => ({ opacity: loseOverlayOpacity.value }));
  const redTintStyle     = useAnimatedStyle(() => ({ opacity: redTintOpacity.value }));

  // Normalise to a row count, independent of which API is used.
  const count = words != null ? words.length : (guesses?.length ?? 0);

  const [animatingRow, setAnimatingRow] = useState(-1);
  const prevCount = useRef(count);
  const [waveDoneLocal, setWaveDoneLocal] = useState(false);
  // waveSentRef: onWaveDone has been called for this game instance (prevents double-call)
  const waveSentRef = useRef(false);
  // waveShownRef: sync of the waveShown prop, readable in effects without making waveShown a dep
  const waveShownRef = useRef(waveShown ?? false);
  waveShownRef.current = waveShown ?? false;
  // onWaveDoneRef: latest onWaveDone prop, read via stable callback to avoid stale closure in BounceTile
  const onWaveDoneRef = useRef(onWaveDone);
  onWaveDoneRef.current = onWaveDone;
  // stableHandleWaveDone: stable ref passed to the last BounceTile; fires setWaveDoneLocal + onWaveDone
  // when the last tile's spring animation completes (via runOnJS). Stable so BounceTile's useEffect
  // (which runs once on mount) captures the correct function.
  const stableHandleWaveDone = useCallback(() => {
    if (!waveSentRef.current) {
      waveSentRef.current = true;
      setWaveDoneLocal(true);
      onWaveDoneRef.current?.();
    }
  }, []);

  // Reset when new game starts (waveShown goes false → store reset)
  useEffect(() => {
    if (!(waveShown ?? false)) {
      setWaveDoneLocal(false);
      waveSentRef.current = false;
    }
  }, [waveShown]);

  useEffect(() => {
    const prev = prevCount.current;
    prevCount.current = count;
    if (count > prev) {
      setAnimatingRow(count - 1);
      // Trigger haptic for correct guess if any tiles are green
      if (guesses && guesses[count - 1]) {
        const hasCorrect = guesses[count - 1].results.some(r => r === 'correct');
        if (hasCorrect) {
          setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), FLIP_DONE_MS);
        }
      } else if (boardResults && boardResults[count - 1]) {
        const hasCorrect = boardResults[count - 1].some(r => r === 'correct');
        if (hasCorrect) {
          setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), FLIP_DONE_MS);
        }
      }
    } else if (count === 0) {
      setAnimatingRow(-1);
    }
  }, [count, guesses, boardResults]);

  // isRevisit: store says wave was already shown but this instance hasn't played it yet → skip animation
  // Computed each render using refs (stable during animation, no re-render triggered by ref changes)
  const isRevisit = waveShownRef.current && !waveSentRef.current;

  // Revisit path: store already flagged wave shown for this game — skip animation, go straight to done.
  // Fresh-solve path: wave fires via BounceTile; stableHandleWaveDone is called via runOnJS from
  // the last tile's spring callback, which sets waveDoneLocal and calls onWaveDone at the true end.
  useEffect(() => {
    if (waveShownRef.current && !waveSentRef.current && !waveDoneLocal) {
      setWaveDoneLocal(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved, animatingRow, count, waveDoneLocal]);

  const rows = Array.from({ length: maxGuesses }, (_, row) => {
    const hasSubmitted = row < count;
    const isActive = !solved && row === count;

    const word   = words   != null ? (words[row] ?? '')            : (guesses?.[row]?.word ?? '');
    const result = boardResults != null ? (boardResults[row] ?? []) : (guesses?.[row]?.results ?? []);

    const tiles = Array.from({ length: COLS }, (_, col) => {
      if (hasSubmitted) {
        const letter = word[col] ?? '';
        const status = (result[col] ?? 'absent') as TileStatus;
        if (row === animatingRow && !waveDoneLocal) {
          return <FlipTile key={col} letter={letter} status={status} delay={col * STAGGER} tileWidth={effectiveTileW} tileHeight={effectiveTileH} />;
        }
        return <Tile key={col} letter={letter} status={status} tileWidth={effectiveTileW} tileHeight={effectiveTileH} />;
      }

      if (isActive) {
        const letter = currentGuess[col] ?? '';
        return (
          <Tile
            key={col}
            letter={letter}
            status={letter ? 'filled' : 'empty'}
            tileWidth={effectiveTileW}
            tileHeight={effectiveTileH}
            onPress={letter ? () => onCurrentGuessTilePress?.(col) : undefined}
          />
        );
      }

      return <Tile key={col} tileWidth={effectiveTileW} tileHeight={effectiveTileH} />;
    });

    // Wave fires only on first solve: animatingRow guard prevents accidental triggers,
    // isRevisit (ref-based) prevents re-animation when switching back to a solved board.
    // The last tile (row=count-1, col=COLS-1) receives stableHandleWaveDone via onDone so that
    // onWaveDone + setWaveDoneLocal fire only after the spring animation actually completes.
    if (solved && row < count && animatingRow === count - 1 && !waveDoneLocal && !isRevisit) {
      return (
        <View key={row} style={styles.row}>
          {tiles.map((tile, col) => {
            const isLastTile = row === count - 1 && col === COLS - 1;
            return (
              <BounceTile key={col} delay={FLIP_DONE_MS + (row * COLS + col) * WAVE_STAGGER} onDone={isLastTile ? stableHandleWaveDone : undefined}>
                {tile}
              </BounceTile>
            );
          })}
        </View>
      );
    }

    if (isActive) {
      return <ShakeRow key={row} shakeKey={shakeKey}>{tiles}</ShakeRow>;
    }
    return <View key={row} style={styles.row}>{tiles}</View>;
  });

  return (
    <View style={[styles.wrapper, flexMode && styles.wrapperFlex]}>
      {label ? (
        <Text style={styles.label}>{label}</Text>
      ) : null}
      <Animated.View
        style={[styles.board, flexMode && styles.boardFlex, boardShakeStyle]}
        onLayout={flexMode ? e => setBoardLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height }) : undefined}
      >
        {rows}

        {/* Red tint flash — fires at shake start on lose, fades out before overlay appears */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.redTint, redTintStyle]} pointerEvents="none" />

        {/* Win overlay: dim + big ✓ */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.dimOverlay, winOverlayStyle]} pointerEvents="none">
          <Text style={styles.overlayCheck}>✓</Text>
        </Animated.View>

        {/* Lose overlay: dim + big ✗ + answer word */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.dimOverlay, loseOverlayStyle]} pointerEvents="none">
          <Text style={styles.overlayCross}>✗</Text>
          {answer ? <Text style={styles.overlayAnswer}>{answer}</Text> : null}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'flex-start',
  },
  wrapperFlex: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#878a8c',
    marginLeft: 4,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  board: {
    alignItems: 'center',
  },
  boardFlex: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  redTint: {
    backgroundColor: 'rgba(226,75,74,0.3)',
  },
  dimOverlay: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayCheck: {
    fontSize: 80,
    lineHeight: 90,
    color: '#5BA75A',
    fontWeight: 'bold',
  },
  overlayCross: {
    fontSize: 80,
    lineHeight: 90,
    color: '#E24B4A',
    fontWeight: 'bold',
  },
  overlayAnswer: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: '700',
    letterSpacing: 4,
    marginTop: 8,
  },
});
