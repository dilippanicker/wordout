import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Tile, TileStatus } from './Tile';
import { FlipTile } from './FlipTile';
import { GuessResult } from '@/store/gameStore';

const MAX_ROWS = 6;
const COLS = 5;
const STAGGER = 150; // ms between each tile flip

// Wraps the active row; plays a horizontal shake when shakeKey increments.
function ShakeRow({ children, shakeKey }: { children: React.ReactNode; shakeKey: number }) {
  const translateX = useSharedValue(0);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    translateX.value = withSequence(
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(6, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  }, [shakeKey]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    flexDirection: 'row',
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

interface GameBoardProps {
  guesses: GuessResult[];
  currentGuess: string;
  tileSize?: number;
  shakeKey?: number;
}

export function GameBoard({ guesses, currentGuess, tileSize = 60, shakeKey = 0 }: GameBoardProps) {
  const [animatingRow, setAnimatingRow] = useState(-1);
  const prevGuessCount = useRef(guesses.length);

  useEffect(() => {
    const prev = prevGuessCount.current;
    prevGuessCount.current = guesses.length;

    if (guesses.length > prev) {
      setAnimatingRow(guesses.length - 1);
    } else if (guesses.length === 0) {
      setAnimatingRow(-1);
    }
  }, [guesses.length]);

  return (
    <View style={styles.board}>
      {Array.from({ length: MAX_ROWS }, (_, row) => {
        const submitted = guesses[row];
        const isActive = row === guesses.length;

        const tiles = Array.from({ length: COLS }, (_, col) => {
          if (submitted) {
            if (row === animatingRow) {
              return (
                <FlipTile
                  key={col}
                  letter={submitted.word[col]}
                  status={submitted.results[col] as TileStatus}
                  delay={col * STAGGER}
                  size={tileSize}
                />
              );
            }
            return (
              <Tile
                key={col}
                letter={submitted.word[col]}
                status={submitted.results[col] as TileStatus}
                size={tileSize}
              />
            );
          }

          if (isActive) {
            const letter = currentGuess[col] ?? '';
            return (
              <Tile
                key={col}
                letter={letter}
                status={letter ? 'filled' : 'empty'}
                size={tileSize}
              />
            );
          }

          return <Tile key={col} size={tileSize} />;
        });

        if (isActive) {
          return (
            <ShakeRow key={row} shakeKey={shakeKey}>
              {tiles}
            </ShakeRow>
          );
        }

        return (
          <View key={row} style={styles.row}>
            {tiles}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  board: { alignItems: 'center' },
  row: { flexDirection: 'row' },
});
