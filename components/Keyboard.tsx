import { View, Text, Pressable, StyleSheet } from 'react-native';
import { TileStatus } from './Tile';
import { useSettingsStore } from '@/store/settingsStore';

const noFocus = { tabIndex: -1, onMouseDown: (e: any) => e.preventDefault() };

const ROWS_ENTER_LEFT = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
];
const ROWS_ENTER_RIGHT = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['⌫', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'ENTER'],
];

const ROW_GAP = 8;
const KBD_PADDING = 6;

interface KeyboardProps {
  onKey?: (key: string) => void;
  keyStatuses?: Partial<Record<string, TileStatus>>;
  keyHeight?: number;
  enterActive?: boolean;
}

function keyBg(status: TileStatus | undefined, dark: boolean, colorBlind: boolean): string {
  if (!status || status === 'empty' || status === 'filled') {
    return dark ? '#818384' : '#d3d6da';
  }
  if (status === 'correct') return colorBlind ? '#f5793a' : '#6aaa64';
  if (status === 'present') return colorBlind ? '#4a90d9' : '#c9b458';
  return dark ? '#3a3a3c' : '#787c7e';
}

function keyTextColor(status: TileStatus | undefined, dark: boolean): string {
  if (status && status !== 'empty' && status !== 'filled') return '#ffffff';
  return dark ? '#ffffff' : '#1a1a1b';
}

export function kbdHeight(keyHeight: number): number {
  return 3 * keyHeight + 3 * ROW_GAP + KBD_PADDING;
}

export function Keyboard({ onKey, keyStatuses = {}, keyHeight = 60, enterActive = false }: KeyboardProps) {
  const darkTheme = useSettingsStore(s => s.darkTheme);
  const colorBlindMode = useSettingsStore(s => s.colorBlindMode);
  const enterOnRight = useSettingsStore(s => s.enterOnRight);
  const ROWS = enterOnRight ? ROWS_ENTER_RIGHT : ROWS_ENTER_LEFT;

  return (
    <View style={[styles.keyboard, { height: kbdHeight(keyHeight) }]}>
      {ROWS.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((key) => {
            const status = keyStatuses[key];
            const isActiveEnter = key === 'ENTER' && enterActive;
            return (
              <Pressable
                {...(noFocus as any)}
                key={key}
                style={[
                  styles.key,
                  key.length > 1 && styles.wideKey,
                  isActiveEnter
                    ? styles.enterActive
                    : { backgroundColor: keyBg(status, darkTheme, colorBlindMode) },
                ]}
                onPress={() => onKey?.(key)}
              >
                <Text style={[styles.keyText, isActiveEnter ? styles.enterActiveText : { color: keyTextColor(status, darkTheme) }]}>
                  {key}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    width: '100%',
    paddingHorizontal: 4,
    paddingBottom: KBD_PADDING,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    marginBottom: ROW_GAP,
  },
  key: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2.5,
    borderRadius: 4,
  },
  wideKey: {
    flex: 1.5,
  },
  keyText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  enterActive: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#5BA75A',
  },
  enterActiveText: {
    color: '#5BA75A',
  },
});
