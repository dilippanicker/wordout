import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { Tile, TileStatus } from './Tile';
import { FlipTile } from './FlipTile';
import { GuessResult, LetterResult } from '@/store/gameStore';

const COLS = 5;
const STAGGER = 150; // ms between each tile flip
// Time (ms) after submit until the last tile's flip finishes + small buffer.
const FLIP_DONE_MS = STAGGER * (COLS - 1) + 350;

// Wraps one tile; bounces up-then-spring-back with a per-tile delay.
function BounceTile({ delay, children }: { delay: number; children: React.ReactNode }) {
  const translateY = useSharedValue(0);
  useEffect(() => {
    translateY.value = withDelay(delay,
      withSequence(
        withTiming(-14, { duration: 100 }),
        withSpring(0, { damping: 6, stiffness: 180 }),
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

  // Overlay opacities — start at 1 if board is already in end state on mount (remount case).
  const winOverlayOpacity  = useSharedValue(solved ? 1 : 0);
  const loseOverlayOpacity = useSharedValue((gameOver && !solved) ? 1 : 0);
  const redTintOpacity     = useSharedValue(0);

  // Board shake on lose + red tint flash + lose overlay fade-in.
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
      // Lose overlay fades in once shake finishes.
      loseOverlayOpacity.value = withDelay(FLIP_DONE_MS + 1100, withTiming(1, { duration: 400 }));
    }
    if (!gameOver && prev) {
      loseOverlayOpacity.value = 0;
      redTintOpacity.value = 0;
    }
  }, [gameOver]);

  // Win overlay fades in after the wave animation completes.
  const prevSolvedRef = useRef(solved);
  useEffect(() => {
    const prev = prevSolvedRef.current;
    prevSolvedRef.current = solved;
    if (solved && !prev) {
      winOverlayOpacity.value = withDelay(1500, withTiming(1, { duration: 400 }));
    }
    if (!solved && prev) {
      winOverlayOpacity.value = 0;
    }
  }, [solved]);

  const boardShakeStyle  = useAnimatedStyle(() => ({ transform: [{ translateX: boardShakeX.value }] }));
  const winOverlayStyle  = useAnimatedStyle(() => ({ opacity: winOverlayOpacity.value }));
  const loseOverlayStyle = useAnimatedStyle(() => ({ opacity: loseOverlayOpacity.value }));
  const redTintStyle     = useAnimatedStyle(() => ({ opacity: redTintOpacity.value }));

  // Normalise to a row count, independent of which API is used.
  const count = words != null ? words.length : (guesses?.length ?? 0);

  const [animatingRow, setAnimatingRow] = useState(-1);
  const prevCount = useRef(count);

  useEffect(() => {
    const prev = prevCount.current;
    prevCount.current = count;
    if (count > prev) setAnimatingRow(count - 1);
    else if (count === 0) setAnimatingRow(-1);
  }, [count]);

  const rows = Array.from({ length: maxGuesses }, (_, row) => {
    const hasSubmitted = row < count;
    const isActive = !solved && row === count;

    const word   = words   != null ? (words[row] ?? '')            : (guesses?.[row]?.word ?? '');
    const result = boardResults != null ? (boardResults[row] ?? []) : (guesses?.[row]?.results ?? []);

    const tiles = Array.from({ length: COLS }, (_, col) => {
      if (hasSubmitted) {
        const letter = word[col] ?? '';
        const status = (result[col] ?? 'absent') as TileStatus;
        if (row === animatingRow) {
          return <FlipTile key={col} letter={letter} status={status} delay={col * STAGGER} tileWidth={effectiveTileW} tileHeight={effectiveTileH} />;
        }
        return <Tile key={col} letter={letter} status={status} tileWidth={effectiveTileW} tileHeight={effectiveTileH} />;
      }

      if (isActive) {
        const letter = currentGuess[col] ?? '';
        return <Tile key={col} letter={letter} status={letter ? 'filled' : 'empty'} tileWidth={effectiveTileW} tileHeight={effectiveTileH} />;
      }

      return <Tile key={col} tileWidth={effectiveTileW} tileHeight={effectiveTileH} />;
    });

    // Wave ALL tiles left→right, top→bottom on solve (50ms stagger between tiles).
    // animatingRow === count - 1 guard ensures this only fires on the winning submission,
    // not on remount (where animatingRow stays -1).
    if (solved && row < count && animatingRow === count - 1) {
      return (
        <View key={row} style={styles.row}>
          {tiles.map((tile, col) => (
            <BounceTile key={col} delay={FLIP_DONE_MS + (row * COLS + col) * 50}>{tile}</BounceTile>
          ))}
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
