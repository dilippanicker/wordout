import { useCallback } from 'react';
import { View, Text, Switch, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useTheme } from 'expo-router';
import { useSettingsStore, Language } from '@/store/settingsStore';
import { useStatsStore } from '@/store/statsStore';

export default function SettingsScreen() {
  const { dark, colors } = useTheme();
  const {
    language, setLanguage,
    hardMode, setHardMode,
    darkTheme, setDarkTheme,
    colorBlindMode, setColorBlindMode,
  } = useSettingsStore();

  const { totalGames, wins, currentStreak, maxStreak, guessCounts, clearSettingsBadge } = useStatsStore();

  // Clear the badge dot whenever this screen comes into view.
  useFocusEffect(
    useCallback(() => {
      clearSettingsBadge();
    }, [clearSettingsBadge]),
  );

  const containerBg = dark ? colors.background : '#f6f7f8';
  const winPct = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const maxCount = Math.max(...Object.values(guessCounts), 1);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: containerBg }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Statistics ──────────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>STATISTICS</Text>
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

        <View style={{ height: 32 }} />
      </ScrollView>
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
  const pct = maxCount === 0 ? 3 : Math.max(3, Math.round((count / maxCount) * 100));
  return (
    <View style={styles.distRow}>
      <Text style={[styles.distNum, { color: colors.text }]}>{num}</Text>
      <View style={styles.distTrack}>
        <View style={[styles.distBar, { width: `${pct}%` }]}>
          <Text style={styles.distCount}>{count}</Text>
        </View>
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
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#787c7e',
    letterSpacing: 0.8,
    marginTop: 28,
    marginBottom: 8,
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
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  statCell: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    color: '#787c7e',
    marginTop: 2,
    textAlign: 'center',
  },
  // Distribution
  distContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
  },
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 22,
  },
  distNum: {
    width: 16,
    fontSize: 13,
    fontWeight: '600',
    marginRight: 6,
  },
  distTrack: {
    flex: 1,
  },
  distBar: {
    backgroundColor: '#6aaa64',
    height: 20,
    borderRadius: 2,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 6,
    minWidth: 20,
  },
  distCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
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
    paddingVertical: 14,
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
});
