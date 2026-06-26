import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { useTheme } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStatsStore, emptyBoardStats, BoardStats } from '@/store/statsStore';
import { useDailyStore } from '@/store/dailyStore';
import { useSettingsStore } from '@/store/settingsStore';
import { HelpModal } from './HelpModal';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function StatsModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const { gameMode, boardCount, difficulty } = useSettingsStore();
  const { byMode, resetStats } = useStatsStore();
  const { stats: dailyStats, activeWordleMode, setActiveWordleMode, resetDailyStats } = useDailyStore();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const isQuordle = gameMode === 'quordle' || boardCount > 1;
  const modeKey = gameMode === 'wordle' ? 'wordle' : String(boardCount);
  const practiceStats = byMode[modeKey] ?? emptyBoardStats();
  const maxGuesses = isQuordle ? Math.min(13, 5 + boardCount) : 6;

  const shownStats = (!isQuordle && activeWordleMode === 'daily') ? dailyStats : practiceStats;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>

          {/* Header */}
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
            <Pressable style={styles.helpBtn} onPress={() => setShowHelp(true)} hitSlop={12}>
              <Ionicons name="help-circle-outline" size={20} color="#878a8c" />
            </Pressable>
            <Text style={[styles.title, { color: colors.text }]}>STATISTICS</Text>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={20} color={colors.text as string} />
            </Pressable>
          </View>

          {/* Daily | Practice tabs — single-board only */}
          {!isQuordle && (
            <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
              <Pressable
                style={[styles.tab, activeWordleMode === 'daily' && styles.tabActive]}
                onPress={() => setActiveWordleMode('daily')}
              >
                <Text style={[styles.tabText, activeWordleMode === 'daily' && styles.tabTextActive]}>Daily</Text>
              </Pressable>
              <Pressable
                style={[styles.tab, activeWordleMode === 'practice' && styles.tabActive]}
                onPress={() => setActiveWordleMode('practice')}
              >
                <Text style={[styles.tabText, activeWordleMode === 'practice' && styles.tabTextActive]}>Practice</Text>
              </Pressable>
            </View>
          )}

          {/* Stats row */}
          <StatGrid stats={shownStats} textColor={colors.text as string} />

          {/* Distribution */}
          <Text style={[styles.distLabel, { color: colors.text }]}>GUESS DISTRIBUTION</Text>
          <DistChart stats={shownStats} maxGuesses={maxGuesses} textColor={colors.text as string} />

          {/* Reset */}
          <Pressable style={styles.resetBtn} onPress={() => setConfirmVisible(true)}>
            <Ionicons name="trash-outline" size={14} color="#787c7e" />
            <Text style={styles.resetText}>Reset stats</Text>
          </Pressable>

        </Pressable>
      </Pressable>

      <HelpModal visible={showHelp} onClose={() => setShowHelp(false)} difficulty={difficulty} />

      {/* Reset confirmation */}
      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setConfirmVisible(false)}>
          <View style={[styles.confirmSheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.confirmTitle, { color: colors.text }]}>Reset all stats?</Text>
            <Text style={styles.confirmMessage}>This cannot be undone.</Text>
            <View style={[styles.confirmButtons, { borderTopColor: colors.border }]}>
              <Pressable style={styles.confirmBtn} onPress={() => setConfirmVisible(false)}>
                <Text style={[styles.confirmBtnText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <View style={[styles.confirmDivider, { backgroundColor: colors.border }]} />
              <Pressable
                style={styles.confirmBtn}
                onPress={() => { resetStats(); resetDailyStats(); setConfirmVisible(false); onClose(); }}
              >
                <Text style={[styles.confirmBtnText, styles.confirmDestructive]}>Reset</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </Modal>
  );
}

function StatGrid({ stats, textColor }: { stats: BoardStats; textColor: string }) {
  const winPct = stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : 0;
  return (
    <View style={styles.statRow}>
      <StatCell label="Played" value={stats.totalGames} textColor={textColor} />
      <StatCell label="Win %" value={winPct} textColor={textColor} />
      <StatCell label="Streak" value={stats.currentStreak} textColor={textColor} />
      <StatCell label="Best" value={stats.maxStreak} textColor={textColor} />
    </View>
  );
}

function StatCell({ label, value, textColor }: { label: string; value: number; textColor: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function DistChart({ stats, maxGuesses, textColor }: { stats: BoardStats; maxGuesses: number; textColor: string }) {
  const maxCount = Math.max(...Object.values(stats.guessCounts).map(Number), 1);
  return (
    <View style={styles.distContainer}>
      {Array.from({ length: maxGuesses }, (_, i) => {
        const n = String(i + 1);
        return (
          <DistBar key={n} num={n} count={stats.guessCounts[n] ?? 0} maxCount={maxCount} textColor={textColor} />
        );
      })}
    </View>
  );
}

function DistBar({ num, count, maxCount, textColor }: {
  num: string; count: number; maxCount: number; textColor: string;
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    width: 320,
    borderRadius: 16,
    overflow: 'hidden',
    paddingBottom: 8,
  },
  sheetHeader: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  closeBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  helpBtn: {
    position: 'absolute',
    left: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  // Tabs
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#5BA75A',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#787c7e',
  },
  tabTextActive: {
    color: '#5BA75A',
    fontWeight: '700',
  },
  // Stat cells
  statRow: {
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
  distLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: 8,
    color: '#787c7e',
  },
  distContainer: {
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 12,
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
    backgroundColor: '#5BA75A',
    height: 16,
    borderRadius: 2,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 5,
    minWidth: 24,
  },
  distCount: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  // Reset
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  resetText: {
    fontSize: 13,
    color: '#787c7e',
  },
  // Confirm modal
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
