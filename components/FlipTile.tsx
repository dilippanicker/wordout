import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { Tile, TileStatus } from './Tile';

interface FlipTileProps {
  letter: string;
  status: TileStatus;
  delay?: number;
  size?: number;
  tileWidth?: number;
  tileHeight?: number;
}

// Each half of the flip (front collapse + back open)
const HALF_DURATION = 150;

export function FlipTile({ letter, status, delay = 0, size = 60, tileWidth, tileHeight }: FlipTileProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: HALF_DURATION * 2, easing: Easing.linear }),
    );
  }, []);

  // Front face: filled tile that rotates to 90° and disappears at midpoint
  const frontStyle = useAnimatedStyle(() => {
    const angle = interpolate(progress.value, [0, 0.5], [0, 90]);
    return {
      transform: [{ perspective: 1200 }, { rotateY: `${angle}deg` }],
      opacity: progress.value < 0.5 ? 1 : 0,
    };
  });

  // Back face: coloured tile that arrives from -90° starting at midpoint
  const backStyle = useAnimatedStyle(() => {
    const angle = interpolate(progress.value, [0.5, 1], [-90, 0]);
    return {
      transform: [{ perspective: 1200 }, { rotateY: `${angle}deg` }],
      opacity: progress.value >= 0.5 ? 1 : 0,
    };
  });

  const w = tileWidth ?? size;
  const h = tileHeight ?? size;

  return (
    // Match Tile's layout footprint exactly: drawn area is `w × h`, margin: 2 outside
    <View style={{ width: w, height: h, margin: 2 }}>
      <Animated.View style={[StyleSheet.absoluteFill, frontStyle]}>
        <Tile letter={letter} status="filled" tileWidth={w} tileHeight={h} style={noMargin} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, backStyle]}>
        <Tile letter={letter} status={status} tileWidth={w} tileHeight={h} style={noMargin} />
      </Animated.View>
    </View>
  );
}

// Overrides Tile's built-in margin: 2 — the parent wrapper owns spacing instead
const noMargin = { margin: 0 } as const;
