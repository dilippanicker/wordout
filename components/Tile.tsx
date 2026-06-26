import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useSettingsStore } from '@/store/settingsStore';

export type TileStatus = 'empty' | 'filled' | 'correct' | 'present' | 'absent';

interface TileProps {
  letter?: string;
  status?: TileStatus;
  size?: number;
  tileWidth?: number;
  tileHeight?: number;
  style?: ViewStyle;
}

function tileColors(status: TileStatus, dark: boolean, colorBlind: boolean) {
  switch (status) {
    case 'empty':
      return { borderColor: dark ? '#3a3a3c' : '#d3d6da', backgroundColor: 'transparent' as const };
    case 'filled':
      return { borderColor: dark ? '#565758' : '#878a8c', backgroundColor: 'transparent' as const };
    case 'correct': {
      const c = colorBlind ? '#f5793a' : '#6aaa64';
      return { borderColor: c, backgroundColor: c };
    }
    case 'present': {
      const c = colorBlind ? '#4a90d9' : '#c9b458';
      return { borderColor: c, backgroundColor: c };
    }
    case 'absent':
      return { borderColor: dark ? '#3a3a3c' : '#787c7e', backgroundColor: dark ? '#3a3a3c' : '#787c7e' };
  }
}

export function Tile({ letter = '', status = 'empty', size = 60, tileWidth, tileHeight, style }: TileProps) {
  const darkTheme = useSettingsStore(s => s.darkTheme);
  const colorBlindMode = useSettingsStore(s => s.colorBlindMode);

  const colorStyle = tileColors(status, darkTheme, colorBlindMode);
  const letterColor =
    status === 'empty' || status === 'filled'
      ? (darkTheme ? '#ffffff' : '#1a1a1b')
      : '#ffffff';

  const w = tileWidth ?? size;
  const h = tileHeight ?? size;

  return (
    <View style={[styles.tile, colorStyle, { width: w, height: h }, style]}>
      <Text style={[styles.letter, { fontSize: Math.min(w, h) * 0.45, color: letterColor }]}>
        {letter.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
  },
  letter: {
    fontWeight: 'bold',
  },
});
