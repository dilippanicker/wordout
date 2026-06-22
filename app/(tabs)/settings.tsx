import { useCallback, useState } from 'react';
import { View, Text, Switch, Pressable, StyleSheet, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useTheme, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore, Language } from '@/store/settingsStore';
import { useStatsStore } from '@/store/statsStore';

export default function SettingsScreen() {
  const { dark, colors } = useTheme();
  const router = useRouter();
  const {
    language, setLanguage,
    hardMode, setHardMode,
    darkTheme, setDarkTheme,
    colorBlindMode, setColorBlindMode,
  } = useSettingsStore();

  const { totalGames, wins, currentStreak, maxStreak, guessCounts, clearSettingsBadge, resetStats } = useStatsStore();

  // Clear the badge dot whenever this screen comes into view.
  useFocusEffect(
    useCallback(() => {
      clearSettingsBadge();
    }, [clearSettingsBadge]),
  );

  const containerBg = dark ? colors.background : '#f6f7f8';
  const winPct = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const maxCount = Math.max(...Object.values(guessCounts), 1);
  const [confirmVisible, setConfirmVisible] = useState(false);

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

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Statistics ──────────────────────────────────────────────── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderText}>STATISTICS</Text>
          <Pressable onPress={() => setConfirmVisible(true)} hitSlop={12} accessibilityLabel="Reset statistics">
            <Ionicons name="trash-outline" size={15} color="#787c7e" />
          </Pressable>
        </View>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statsRow}>
            <StatCell label="Games" value={totalGames} colors={colors} />
            <StatCell label="Win %" value={winPct} colors={colors} />
            <StatCell label="Streak" value={currentStreak} colors={colors} />
            <StatCell label="Max" value={maxStreak} colors={colors} />
          </View>
        </View>

        {/* ── Guess distribution ─────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>GUESS DISTRIBUTION</Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.distContainer}>
            {(['1', '2', '3', '4', '5', '6'] as const).map((n) => (
              <DistBar
                key={n}
                num={n}
                count={guessCounts[n]}
                maxCount={maxCount}
                colors={colors}
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
          <SwitchRow label="Color Blind Mode" description="High-contrast orange and blue" value={colorBlindMode} onChange={setColorBlindMode} last />
        </View>

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

function StatCell({ label, value, colors }: { label: string; value: number; colors: { text: string } }) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function DistBar({ num, count, maxCount, colors }: {
  num: string;
  count: number;
  maxCount: number;
  colors: { text: string };
}) {
  // Use flex proportions instead of % widths — more reliable in RN flex containers.
  const pct = count === 0 ? 10 : Math.round((count / maxCount) * 100);
  return (
    <View style={styles.distRow}>
      <Text style={[styles.distNum, { color: colors.text }]}>{num}</Text>
      <View style={styles.distTrack}>
        <View style={[styles.distBar, { flex: pct }]}>
          <Text style={styles.distCount}>{count}</Text>
        </View>
        {pct < 100 && <View style={{ flex: 100 - pct }} />}
      </View>
    </View>
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
  // Row variant (Statistics) — icon sits on the right.
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 6,
    paddingHorizontal: 16,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#787c7e',
    letterSpacing: 0.8,
  },
  // Plain text variant for all other section labels.
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#787c7e',
    letterSpacing: 0.8,
    marginTop: 18,
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
    paddingVertical: 10,
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 4,
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
  // Language picker
  picker: {
    flexDirection: 'row',
  },
  segment: {
    flex: 1,
    paddingVertical: 11,
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
    paddingVertical: 11,
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
});
