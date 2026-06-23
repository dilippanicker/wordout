import { useCallback, useState } from 'react';
import { View, Text, Switch, Pressable, StyleSheet, ScrollView, Modal } from 'react-native';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useTheme, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore, Language, BOARD_COUNTS, BoardCount } from '@/store/settingsStore';
import { useStatsStore, emptyBoardStats } from '@/store/statsStore';
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

  const { byMode, clearSettingsBadge, resetStats } = useStatsStore();

  // Show stats for the currently active mode.
  const modeKey = gameMode === 'wordle' ? 'wordle' : String(boardCount);
  const activeStats = byMode[modeKey] ?? emptyBoardStats();
  const { totalGames, wins, currentStreak, maxStreak, guessCounts } = activeStats;
  const maxGuessesForMode = gameMode === 'wordle' ? 6 : Math.min(13, 5 + boardCount);

  useFocusEffect(
    useCallback(() => {
      clearSettingsBadge();
    }, [clearSettingsBadge]),
  );

  const containerBg = dark ? colors.background : '#f6f7f8';
  const winPct = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const maxCount = Math.max(...Object.values(guessCounts).map(Number), 1);
  const [confirmVisible, setConfirmVisible] = useState(false);

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

        {/* ── Statistics ──────────────────────────────────────────────── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderText}>STATISTICS</Text>
          <Pressable onPress={() => setConfirmVisible(true)} hitSlop={12} accessibilityLabel="Reset statistics">
            <Ionicons name="trash-outline" size={15} color="#787c7e" />
          </Pressable>
        </View>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statsRow}>
            <StatCell label="Games" value={totalGames} textColor={colors.text as string} />
            <StatCell label="Win %" value={winPct} textColor={colors.text as string} />
            <StatCell label="Streak" value={currentStreak} textColor={colors.text as string} />
            <StatCell label="Max" value={maxStreak} textColor={colors.text as string} />
          </View>
        </View>

        {/* ── Guess distribution ─────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>GUESS DISTRIBUTION</Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.distContainer}>
            {Array.from({ length: maxGuessesForMode }, (_, i) => {
              const n = String(i + 1);
              return (
                <DistBar
                  key={n}
                  num={n}
                  count={guessCounts[n] ?? 0}
                  maxCount={maxCount}
                  textColor={colors.text as string}
                />
              );
            })}
          </View>
        </View>

        {/* ── Game Mode ──────────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>GAME MODE</Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.picker}>
            {BOARD_COUNTS.map((n, idx) => (
              <ModeSegment
                key={n}
                label={n === 1 ? 'Wordout' : n === 4 ? 'Quadout' : `${n}`}
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

      {/* Reset stats confirmation modal */}
      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <Pressable style={styles.confirmBackdrop} onPress={() => setConfirmVisible(false)}>
          <View style={[styles.confirmSheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.confirmTitle, { color: colors.text }]}>Reset all stats?</Text>
            <Text style={styles.confirmMessage}>This cannot be undone.</Text>
            <View style={styles.confirmButtons}>
              <Pressable style={styles.confirmBtn} onPress={() => setConfirmVisible(false)}>
                <Text style={[styles.confirmBtnText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <View style={[styles.confirmDivider, { backgroundColor: colors.border }]} />
              <Pressable style={styles.confirmBtn} onPress={() => { resetStats(); setConfirmVisible(false); }}>
                <Text style={[styles.confirmBtnText, styles.confirmDestructive]}>Reset</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCell({ label, value, textColor }: { label: string; value: number; textColor: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function DistBar({ num, count, maxCount, textColor }: {
  num: string;
  count: number;
  maxCount: number;
  textColor: string;
}) {
  const pct = count === 0 ? 10 : Math.round((count / maxCount) * 100);
  return (
    <View style={styles.distRow}>
      <Text style={[styles.distNum, { color: textColor }]}>{num}</Text>
      <View style={styles.distTrack}>
        <View style={[styles.distBar, { flex: pct }]}>
          <Text style={styles.distCount}>{count}</Text>
        </View>
        {pct < 100 && <View style={{ flex: 100 - pct }} />}
      </View>
    </View>
  );
}

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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
    marginBottom: 6,
    paddingHorizontal: 16,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#787c7e',
    letterSpacing: 0.8,
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
  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 18,
    paddingHorizontal: 8,
  },
  statCell: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    color: '#787c7e',
    marginTop: 1,
    textAlign: 'center',
  },
  // Distribution
  distContainer: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 18,
  },
  distNum: {
    width: 16,
    fontSize: 12,
    fontWeight: '600',
    marginRight: 6,
  },
  distTrack: {
    flex: 1,
    flexDirection: 'row',
  },
  distBar: {
    backgroundColor: '#6aaa64',
    height: 16,
    borderRadius: 2,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 5,
  },
  distCount: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
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
  // Reset confirmation modal
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmSheet: {
    width: 260,
    borderRadius: 14,
    overflow: 'hidden',
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  confirmMessage: {
    fontSize: 13,
    color: '#787c7e',
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  confirmButtons: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#d3d6da',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmDivider: {
    width: StyleSheet.hairlineWidth,
  },
  confirmBtnText: {
    fontSize: 17,
    fontWeight: '400',
  },
  confirmDestructive: {
    color: '#ff3b30',
    fontWeight: '600',
  },
  versionText: {
    fontSize: 12,
    color: '#878a8c',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
});
