import { View, Text, Switch, Pressable, StyleSheet, ScrollView } from 'react-native';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore, Language, BOARD_COUNTS, BoardCount } from '@/store/settingsStore';
import { useGameStore } from '@/store/gameStore';
import { useQuordleStore } from '@/store/quordleStore';

export default function SettingsScreen() {
  const { dark, colors } = useTheme();
  const router = useRouter();
  const {
    language, setLanguage,
    hardMode, setHardMode,
    darkTheme, setDarkTheme,
    colorBlindMode, setColorBlindMode,
    enterOnRight, setEnterOnRight,
    gameMode, setGameMode,
    boardCount, setBoardCount,
  } = useSettingsStore();

  const containerBg = dark ? colors.background : '#f6f7f8';

  function handleBoardCountSelect(n: BoardCount) {
    setBoardCount(n);
    if (n === 1) {
      setGameMode('wordle');
      useGameStore.getState().newGame();
    } else {
      setGameMode('quordle');
      useQuordleStore.getState().newGame();
    }
    router.navigate('/(tabs)/' as never);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: containerBg }]} edges={['bottom']}>
      {/* Settings navigation header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable
          style={styles.headerBack}
          onPress={() => router.navigate('/(tabs)/' as never)}
          hitSlop={12}
          accessibilityLabel="Back to game"
        >
          <Ionicons name="chevron-back" size={24} color="#6aaa64" />
        </Pressable>
        <View style={styles.headerTitleWrapper} pointerEvents="none">
          <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>

        {/* ── Game Mode ──────────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>GAME MODE</Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.picker}>
            {BOARD_COUNTS.map((n, idx) => (
              <ModeSegment
                key={n}
                label={n === 1 ? 'Wordout' : `${n}-out`}
                active={(n === 1 && gameMode === 'wordle') || (n > 1 && gameMode === 'quordle' && boardCount === n)}
                onPress={() => handleBoardCountSelect(n)}
                last={idx === BOARD_COUNTS.length - 1}
              />
            ))}
          </View>
        </View>

        {/* ── Word list ──────────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>WORD LIST</Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <LanguagePicker value={language} onChange={setLanguage} />
        </View>

        {/* ── Preferences ───────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>PREFERENCES</Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SwitchRow label="Hard Mode" description="Must use revealed hints" value={hardMode} onChange={setHardMode} />
          <SwitchRow label="Dark Theme" value={darkTheme} onChange={setDarkTheme} />
          <SwitchRow label="Color Blind Mode" description="High-contrast orange and blue" value={colorBlindMode} onChange={setColorBlindMode} />
          <SwitchRow label="Enter Key on Right" description="Move ⌫ left, ENTER right" value={enterOnRight} onChange={setEnterOnRight} last />
        </View>

        {/* ── Version ───────────────────────────────────────────────── */}
        <Text style={styles.versionText}>
          Wordout v{Constants.expoConfig?.version ?? '—'} (build {Constants.expoConfig?.android?.versionCode ?? '—'})
        </Text>

      </ScrollView>

    </SafeAreaView>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ModeSegment({ label, active, onPress, last }: {
  label: string;
  active: boolean;
  onPress: () => void;
  last: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      style={[
        styles.modeSegment,
        !last && styles.modeSegmentBorder,
        { backgroundColor: active ? '#6aaa64' : colors.card, borderColor: colors.border },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.modeSegmentText, { color: active ? '#fff' : '#787c7e' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function LanguagePicker({ value, onChange }: { value: Language; onChange: (v: Language) => void }) {
  return (
    <View style={styles.picker}>
      <Segment label="American English" active={value === 'en_us'} onPress={() => onChange('en_us')} left />
      <Segment label="British English"  active={value === 'en_gb'} onPress={() => onChange('en_gb')} />
    </View>
  );
}

function Segment({ label, active, onPress, left = false }: {
  label: string;
  active: boolean;
  onPress: () => void;
  left?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      style={[
        styles.segment,
        left && styles.segmentLeft,
        { backgroundColor: active ? '#6aaa64' : colors.card, borderColor: colors.border },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.segmentText, { color: active ? '#fff' : '#787c7e' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function SwitchRow({ label, description, value, onChange, last = false }: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.card },
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
      ]}
    >
      <View style={styles.labelGroup}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: '#6aaa64' }} />
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBack: {
    position: 'absolute',
    left: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  headerTitleWrapper: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#787c7e',
    letterSpacing: 0.8,
    marginTop: 26,
    marginBottom: 6,
    paddingHorizontal: 16,
  },
  section: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  // Mode segment (compact 6-option row)
  modeSegment: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSegmentBorder: {
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  modeSegmentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Language picker
  picker: {
    flexDirection: 'row',
  },
  segment: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  segmentLeft: {
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Switch rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  labelGroup: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 16,
  },
  description: {
    fontSize: 13,
    color: '#787c7e',
    marginTop: 2,
  },
  versionText: {
    fontSize: 12,
    color: '#878a8c',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
});
