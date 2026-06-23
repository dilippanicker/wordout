import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Tile, TileStatus } from './Tile';
import { FlipTile } from './FlipTile';
import { GuessResult, LetterResult } from '@/store/gameStore';

const COLS = 5;
const STAGGER = 150; // ms between each tile flip

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
  label,
  flexMode = false,
}: GameBoardProps) {
  // In flex mode we measure the board container and compute tile size ourselves.
  const [boardLayout, setBoardLayout] = useState({ width: 0, height: 0 });
  const effectiveTileSize = (() => {
    if (!flexMode || boardLayout.width === 0) return tileSize;
    const cellW = Math.floor(boardLayout.width / COLS) - 4;
    const cellH = Math.floor(boardLayout.height / maxGuesses) - 4;
    return Math.max(16, Math.min(cellW, cellH));
  })();

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

    // Per-row data: letter text and colour status.
    const word   = words   != null ? (words[row] ?? '')            : (guesses?.[row]?.word ?? '');
    const result = boardResults != null ? (boardResults[row] ?? []) : (guesses?.[row]?.results ?? []);

    const tiles = Array.from({ length: COLS }, (_, col) => {
      if (hasSubmitted) {
        const letter = word[col] ?? '';
        const status = (result[col] ?? 'absent') as TileStatus;
        if (row === animatingRow) {
          return <FlipTile key={col} letter={letter} status={status} delay={col * STAGGER} size={effectiveTileSize} />;
        }
        return <Tile key={col} letter={letter} status={status} size={effectiveTileSize} />;
      }

      if (isActive) {
        const letter = currentGuess[col] ?? '';
        return <Tile key={col} letter={letter} status={letter ? 'filled' : 'empty'} size={effectiveTileSize} />;
      }

      return <Tile key={col} size={effectiveTileSize} />;
    });

    if (isActive) {
      return <ShakeRow key={row} shakeKey={shakeKey}>{tiles}</ShakeRow>;
    }
    return <View key={row} style={styles.row}>{tiles}</View>;
  });

  return (
    <View style={[styles.wrapper, flexMode && styles.wrapperFlex]}>
      {label ? (
        <Text style={[styles.label, solved && styles.labelSolved]}>{label}</Text>
      ) : null}
      <View
        style={[styles.board, flexMode && styles.boardFlex, solved && styles.solvedBoard]}
        onLayout={flexMode ? e => setBoardLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height }) : undefined}
      >
        {rows}
      </View>
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
  labelSolved: {
    color: '#6aaa64',
  },
  board: {
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 4,
  },
  boardFlex: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  solvedBoard: {
    borderColor: '#6aaa64',
  },
  row: {
    flexDirection: 'row',
  },
});
