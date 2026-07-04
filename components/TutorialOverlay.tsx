import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence } from 'react-native-reanimated';
import { useTheme } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Tile, TileStatus } from './Tile';
import { FlipTile } from './FlipTile';
import { useSettingsStore } from '@/store/settingsStore';

const COLS = 5;
const BOARD_ROWS = 6;
const TILE_SIZE = 34;

const SCRIPT: { word: string; results: TileStatus[] }[] = [
  { word: 'RAISE', results: ['present', 'absent', 'absent', 'correct', 'absent'] },
  { word: 'CLOUT', results: ['absent', 'absent', 'correct', 'absent', 'correct'] },
  { word: 'FROST', results: ['correct', 'correct', 'correct', 'correct', 'correct'] },
];

// ── Timing constants (ms) — tune the whole sequence from here ───────────────
const PRE_TYPE_PAUSE_MS = 500;
const LETTER_TYPE_MS = 200;
const PRE_ENTER_PAUSE_MS = 500;
const TILE_STAGGER_MS = 180; // matches GameBoard's STAGGER
const FLIP_ROW_MS = TILE_STAGGER_MS * (COLS - 1) + 450; // matches GameBoard's FLIP_DONE_MS formula
const LEGEND_FADE_MS = 400;
const AFTER_RAISE_PAUSE_MS = 1500;
const AFTER_CLOUT_PAUSE_MS = 1500;
const WIN_FLASH_MS = 400;
const END_REVEAL_DELAY_MS = 400;

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface TutorialOverlayProps {
  onClose: () => void;
}

export function TutorialOverlay({ onClose }: TutorialOverlayProps) {
  const { colors, dark } = useTheme();
  const [typedText, setTypedText] = useState('');
  const [submittedCount, setSubmittedCount] = useState(0);
  const [flippingRow, setFlippingRow] = useState(-1);
  const [showLegend, setShowLegend] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const cancelledRef = useRef(false);
  const backdropOpacity = useSharedValue(0);
  const legendOpacity = useSharedValue(0);
  const winFlashScale = useSharedValue(1);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const legendStyle = useAnimatedStyle(() => ({ opacity: legendOpacity.value }));
  const winFlashStyle = useAnimatedStyle(() => ({ transform: [{ scale: winFlashScale.value }] }));

  useEffect(() => {
    backdropOpacity.value = withTiming(1, { duration: 300 });
    cancelledRef.current = false;
    runSequence();
    return () => { cancelledRef.current = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function typeWord(word: string) {
    for (let i = 1; i <= word.length; i++) {
      if (cancelledRef.current) return;
      setTypedText(word.slice(0, i));
      await wait(LETTER_TYPE_MS);
    }
  }

  async function runSequence() {
    await wait(PRE_TYPE_PAUSE_MS);
    for (let row = 0; row < SCRIPT.length; row++) {
      if (cancelledRef.current) return;
      await typeWord(SCRIPT[row].word);
      if (cancelledRef.current) return;
      await wait(PRE_ENTER_PAUSE_MS);
      if (cancelledRef.current) return;

      setTypedText('');
      setSubmittedCount(row + 1);
      setFlippingRow(row);
      await wait(FLIP_ROW_MS);
      if (cancelledRef.current) return;
      setFlippingRow(-1);

      if (row === 0) {
        setShowLegend(true);
        legendOpacity.value = withTiming(1, { duration: LEGEND_FADE_MS });
        await wait(AFTER_RAISE_PAUSE_MS);
      } else if (row === 1) {
        await wait(AFTER_CLOUT_PAUSE_MS);
      } else {
        winFlashScale.value = withSequence(
          withTiming(1.06, { duration: WIN_FLASH_MS / 2 }),
          withTiming(1, { duration: WIN_FLASH_MS / 2 }),
        );
        await wait(WIN_FLASH_MS + END_REVEAL_DELAY_MS);
      }
      if (cancelledRef.current) return;
    }
    setShowEnd(true);
  }

  function skip() {
    if (cancelledRef.current) return; // already at end state
    cancelledRef.current = true;
    setTypedText('');
    setSubmittedCount(SCRIPT.length);
    setFlippingRow(-1);
    setShowLegend(true);
    legendOpacity.value = 1;
    winFlashScale.value = 1;
    setShowEnd(true);
  }

  function handleGotIt() {
    if (dontShowAgain) useSettingsStore.getState().setTutorialSeen(true);
    onClose();
  }

  const rows = Array.from({ length: BOARD_ROWS }, (_, row) => {
    const isSubmitted = row < submittedCount;
    const isActive = !isSubmitted && row === submittedCount && submittedCount < SCRIPT.length;

    const tiles = Array.from({ length: COLS }, (_, col) => {
      if (isSubmitted) {
        const { word, results } = SCRIPT[row];
        if (row === flippingRow) {
          return <FlipTile key={col} letter={word[col]} status={results[col]} delay={col * TILE_STAGGER_MS} size={TILE_SIZE} />;
        }
        return <Tile key={col} letter={word[col]} status={results[col]} size={TILE_SIZE} />;
      }
      if (isActive) {
        const letter = typedText[col] ?? '';
        return <Tile key={col} letter={letter} status={letter ? 'filled' : 'empty'} size={TILE_SIZE} />;
      }
      return <Tile key={col} size={TILE_SIZE} />;
    });

    const rowView = <View key={row} style={styles.row}>{tiles}</View>;
    if (row === SCRIPT.length - 1) {
      return <Animated.View key={row} style={winFlashStyle}>{rowView}</Animated.View>;
    }
    return rowView;
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, backdropStyle]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={skip} accessibilityLabel="Skip tutorial">
        <View style={styles.centerWrap} pointerEvents="box-none">
          <Pressable style={[styles.card, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation?.()}>
            <Text style={[styles.title, { color: colors.text }]}>How to Play</Text>

            <View style={styles.board}>{rows}</View>

            {showLegend && (
              <Animated.View style={[styles.legend, { backgroundColor: dark ? '#2c2c2e' : '#f7f7f8' }, legendStyle]}>
                <View style={styles.legendRow}>
                  <Text style={styles.legendEmoji}>🟩</Text>
                  <Text style={[styles.legendText, { color: colors.text }]}>Right letter, right position</Text>
                </View>
                <View style={styles.legendRow}>
                  <Text style={styles.legendEmoji}>🟨</Text>
                  <Text style={[styles.legendText, { color: colors.text }]}>Right letter, wrong position</Text>
                </View>
                <View style={styles.legendRow}>
                  <Text style={styles.legendEmoji}>⬛</Text>
                  <Text style={[styles.legendText, { color: colors.text }]}>Not in the word</Text>
                </View>
              </Animated.View>
            )}

            {showEnd && (
              <View style={styles.endRow}>
                <Pressable
                  style={styles.checkboxRow}
                  onPress={(e) => { e.stopPropagation?.(); setDontShowAgain(v => !v); }}
                  hitSlop={8}
                >
                  <View style={[styles.checkbox, dontShowAgain && styles.checkboxChecked]}>
                    {dontShowAgain && <Ionicons name="checkmark" size={14} color="#ffffff" />}
                  </View>
                  <Text style={[styles.checkboxLabel, { color: colors.text }]}>Don't show again</Text>
                </Pressable>

                <Pressable
                  style={styles.gotItButton}
                  onPress={(e) => { e.stopPropagation?.(); handleGotIt(); }}
                >
                  <Text style={styles.gotItText}>Got it!</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    zIndex: 200,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 16,
    maxWidth: 360,
    width: '100%',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  board: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  legend: {
    alignSelf: 'stretch',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendEmoji: {
    fontSize: 14,
  },
  legendText: {
    fontSize: 13,
    flexShrink: 1,
  },
  endRow: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 14,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#878a8c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#5BA75A',
    borderColor: '#5BA75A',
  },
  checkboxLabel: {
    fontSize: 14,
  },
  gotItButton: {
    alignSelf: 'stretch',
    backgroundColor: '#5BA75A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  gotItText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
});
