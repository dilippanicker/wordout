import { useState, useRef } from 'react';
import { View, Text, Switch, Pressable, StyleSheet, ScrollView, Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore, Language, BOARD_COUNTS, BoardCount, Difficulty, maxGuessesForDifficulty } from '@/store/settingsStore';
import { useDailyStore } from '@/store/dailyStore';
import { useQuordleStore } from '@/store/quordleStore';
import { HelpModal } from '@/components/HelpModal';

export default function SettingsScreen() {
  const { dark, colors } = useTheme();
  const router = useRouter();
  const {
    language, setLanguage,
    difficulty, setDifficulty,
    darkTheme, setDarkTheme,
    colorBlindMode, setColorBlindMode,
    enterOnRight, setEnterOnRight,
    gameMode, setGameMode,
    boardCount, setBoardCount,
  } = useSettingsStore();
  const [showHelp, setShowHelp] = useState(false);
  const [diffLockToast, setDiffLockToast] = useState<string | null>(null);
  const diffLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const containerBg = dark ? colors.background : '#f6f7f8';

  function msToHMS(ms: number): string {
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  function showDiffLockToast() {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const hms = msToHMS(midnight.getTime() - now.getTime());
    const msg = `Daily solved! Next word in ${hms}`;
    setDiffLockToast(msg);
    if (diffLockTimerRef.current) clearTimeout(diffLockTimerRef.current);
    diffLockTimerRef.current = setTimeout(() => setDiffLockToast(null), 3000);
  }

  function handleBoardCountSelect(n: BoardCount) {
    setBoardCount(n);
    if (n === 1) {
      setGameMode('wordle');
    } else {
      setGameMode('quordle');
      useQuordleStore.getState().newGame(); // sync board to new count immediately
    }
  }

  function handleDifficultyChange(d: Difficulty) {
    // Only lock for daily 1-out mode — practice and multi-board can always change difficulty.
    if (gameMode === 'wordle') {
      const { activeWordleMode, dailyStatus, dailyGuesses } = useDailyStore.getState();
      if (activeWordleMode === 'daily') {
        const locked = dailyStatus === 'completed' || (dailyStatus === 'playing' && dailyGuesses.length > 0);
        if (locked) {
          showDiffLockToast();
          return;
        }
      }
    }
    setDifficulty(d);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: containerBg }]} edges={['top', 'bottom']}>
      {diffLockToast && (
        <View style={styles.toastContainer} pointerEvents="none">
          <View style={styles.toastPill}>
            <Text style={styles.toastText}>{diffLockToast}</Text>
          </View>
        </View>
      )}
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
        <Pressable
          style={styles.headerHelp}
          onPress={() => setShowHelp(true)}
          hitSlop={12}
          accessibilityLabel="How to play"
        >
          <Ionicons name="help-circle-outline" size={22} color="#878a8c" />
        </Pressable>
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

        {/* ── Difficulty ────────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>DIFFICULTY</Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <DifficultyRow value={difficulty} onChange={handleDifficultyChange} boardCount={boardCount} />
        </View>

        {/* ── Preferences ───────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>PREFERENCES</Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SwitchRow label="Dark Theme" value={darkTheme} onChange={setDarkTheme} textColor={colors.text as string} />
          <SwitchRow label="Color Blind Mode" description="High-contrast orange and blue" value={colorBlindMode} onChange={setColorBlindMode} textColor={colors.text as string} />
          <SwitchRow label="Enter Key on Right" description="Move ⌫ left, ENTER right" value={enterOnRight} onChange={setEnterOnRight} textColor={colors.text as string} last />
        </View>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Pressable onPress={() => Linking.openURL('https://github.com/dilippanicker/wordout')}>
            <Text style={styles.githubLink}>GitHub ↗</Text>
          </Pressable>
          <Text style={styles.credits}>© 2026 Onglipo Labs · MIT License</Text>
          <Text style={styles.versionText}>
            {Platform.OS === 'android'
              ? `v${Constants.expoConfig?.version ?? '—'} (build ${Constants.expoConfig?.android?.versionCode ?? '—'})`
              : `v${Constants.expoConfig?.version ?? '—'}`
            }
          </Text>
        </View>

      </ScrollView>

      <HelpModal visible={showHelp} onClose={() => setShowHelp(false)} difficulty={difficulty} />
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

function DifficultyRow({ value, onChange, boardCount }: {
  value: Difficulty;
  onChange: (d: Difficulty) => void;
  boardCount: number;
}) {
  const { colors } = useTheme();
  const options: { key: Difficulty; emoji: string; label: string; desc: string }[] = [
    { key: 'easy',    emoji: '🐣', label: 'Easy',    desc: 'No restrictions' },
    { key: 'hard',    emoji: '💪', label: 'Hard',    desc: 'Must use revealed hints' },
    { key: 'extreme', emoji: '💀', label: 'Extreme', desc: `${maxGuessesForDifficulty('extreme', boardCount)} guesses` },
  ];
  return (
    <View>
      {options.map((opt, idx) => (
        <Pressable
          key={opt.key}
          onPress={() => onChange(opt.key)}
          style={[
            styles.row,
            { backgroundColor: colors.card },
            idx < options.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
          ]}
        >
          <View style={styles.labelGroup}>
            <Text style={[styles.label, { color: colors.text as string }]}>{opt.emoji} {opt.label}</Text>
            <Text style={styles.description}>{opt.desc}</Text>
          </View>
          <View style={[styles.diffRadio, value === opt.key && styles.diffRadioActive]}>
            {value === opt.key && <View style={styles.diffRadioDot} />}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function SwitchRow({ label, description, value, onChange, textColor, last = false }: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  textColor: string;
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
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
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
  headerHelp: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
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
  // Difficulty radio
  diffRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#878a8c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diffRadioActive: {
    borderColor: '#6aaa64',
  },
  diffRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6aaa64',
  },
  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 8,
    gap: 8,
  },
  githubLink: {
    fontSize: 13,
    color: '#6aaa64',
    fontWeight: '600',
  },
  credits: {
    fontSize: 11,
    color: '#878a8c',
    textAlign: 'center',
  },
  versionText: {
    fontSize: 11,
    color: '#878a8c',
    textAlign: 'center',
  },
  toastContainer: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  toastPill: {
    backgroundColor: '#1a1a1b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  toastText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
