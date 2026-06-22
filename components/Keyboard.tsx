import { View, Text, Pressable, StyleSheet } from 'react-native';
import { TileStatus } from './Tile';
import { useSettingsStore } from '@/store/settingsStore';

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
];

interface KeyboardProps {
  onKey?: (key: string) => void;
  keyStatuses?: Partial<Record<string, TileStatus>>;
}

function keyBg(status: TileStatus | undefined, dark: boolean, colorBlind: boolean): string {
  if (!status || status === 'empty' || status === 'filled') {
    return dark ? '#818384' : '#d3d6da';
  }
  if (status === 'correct') return colorBlind ? '#f5793a' : '#6aaa64';
  if (status === 'present') return colorBlind ? '#4a90d9' : '#c9b458';
  return dark ? '#3a3a3c' : '#787c7e'; // absent — slightly darker in dark mode
}

function keyTextColor(status: TileStatus | undefined, dark: boolean): string {
  if (status && status !== 'empty' && status !== 'filled') return '#ffffff';
  return dark ? '#ffffff' : '#1a1a1b';
}

export function Keyboard({ onKey, keyStatuses = {} }: KeyboardProps) {
  const darkTheme = useSettingsStore(s => s.darkTheme);
  const colorBlindMode = useSettingsStore(s => s.colorBlindMode);

  return (
    <View style={styles.keyboard}>
      {ROWS.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((key) => {
            const status = keyStatuses[key];
            return (
              <Pressable
                key={key}
                style={[
                  styles.key,
                  key.length > 1 && styles.wideKey,
                  { backgroundColor: keyBg(status, darkTheme, colorBlindMode) },
                ]}
                onPress={() => onKey?.(key)}
              >
                <Text style={[styles.keyText, { color: keyTextColor(status, darkTheme) }]}>
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
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 6,
  },
  key: {
    minWidth: 32,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2.5,
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  wideKey: {
    minWidth: 52,
  },
  keyText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
});
