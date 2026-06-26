import { ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BoardStats } from '@/store/statsStore';

const GREEN = '#5BA75A';
const GREY = '#888780';

interface Props {
  gameStatus: 'playing' | 'won' | 'lost';
  isQuordle: boolean;
  isDaily: boolean;
  currentGuessNum: number;
  maxGuesses: number;
  boardCount: number;
  solvedCount: number;
  justSolvedInfo: { boardNum: number; guessCount: number } | null;
  practiceStats: BoardStats;
  dailyStats: BoardStats;
  shareConfirmed?: boolean;
  onShare: () => void;
  onOpenStats: () => void;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
}

export function BottomStrip({
  gameStatus, isQuordle, isDaily,
  currentGuessNum, maxGuesses, boardCount, solvedCount,
  justSolvedInfo, practiceStats, dailyStats,
  shareConfirmed, onShare, onOpenStats,
  textColor, backgroundColor, borderColor,
}: Props) {
  const isGameOver = gameStatus === 'won' || gameStatus === 'lost';
  const stats = (isDaily && !isQuordle) ? dailyStats : practiceStats;
  const streak = stats.currentStreak;
  const streakColor = streak > 0 ? GREEN : GREY;
  const personalBest = getPersonalBest(stats);

  const statsIcon = (
    <Pressable onPress={onOpenStats} hitSlop={10} style={styles.statsBtn}>
      <Ionicons name="bar-chart-outline" size={20} color={GREEN} />
    </Pressable>
  );

  let content: ReactNode;

  if (isGameOver) {
    // State 3 — game over
    const winPct = stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : 0;
    const streakEmoji = isDaily ? '🔥' : '⚡';
    content = (
      <View style={styles.row}>
        <View style={styles.gameOverLeft}>
          <StatChip label="Played" value={stats.totalGames} textColor={textColor} />
          <StatChip label="Win%" value={winPct} textColor={textColor} />
          <View style={styles.streakChip}>
            <Text style={[styles.streakEmoji, { color: streakColor }]}>{streakEmoji}</Text>
            <Text style={[styles.streakNum, { color: streakColor }]}>{streak}</Text>
          </View>
          {!isDaily && (
            <Pressable onPress={onShare} style={styles.shareBtn} hitSlop={8}>
              <Text style={styles.shareText}>{shareConfirmed ? 'Copied ✓' : 'Share'}</Text>
              {!shareConfirmed && <Ionicons name="share-outline" size={14} color="#fff" />}
            </Pressable>
          )}
        </View>
        {statsIcon}
      </View>
    );
  } else if (isQuordle && justSolvedInfo !== null) {
    // State 2 — board just solved flash (multi-board playing)
    const remaining = boardCount - solvedCount;
    content = (
      <View style={styles.row}>
        <View style={styles.solvedLeft}>
          <Text style={[styles.solvedText, { color: GREEN }]}>
            Board {justSolvedInfo.boardNum} solved in {justSolvedInfo.guessCount} ✓
          </Text>
          {personalBest !== null && (
            <Text style={[styles.bestText, { color: textColor }]}>
              {'  |  '}🏆 Best: {personalBest}
            </Text>
          )}
        </View>
        {statsIcon}
      </View>
    );
  } else {
    // State 1 — playing
    const remaining = boardCount - solvedCount;
    content = (
      <View style={styles.row}>
        <Text style={[styles.guessText, { color: textColor }]}>
          {'Guess '}
          <Text style={styles.guessNum}>{currentGuessNum + 1}</Text>
          {' of '}
          <Text style={styles.guessNum}>{maxGuesses}</Text>
          {isQuordle && solvedCount > 0
            ? `  ·  ${solvedCount} solved  ·  ${remaining} remaining`
            : null}
        </Text>
        {statsIcon}
      </View>
    );
  }

  return (
    <View style={[styles.strip, { backgroundColor, borderTopColor: borderColor }]}>
      {content}
    </View>
  );
}

function StatChip({ label, value, textColor }: { label: string; value: number; textColor: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={[styles.statNum, { color: textColor }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function getPersonalBest(stats: BoardStats): number | null {
  const keys = Object.keys(stats.guessCounts)
    .map(Number)
    .filter(k => (stats.guessCounts[String(k)] ?? 0) > 0);
  return keys.length > 0 ? Math.min(...keys) : null;
}

const styles = StyleSheet.create({
  strip: {
    height: 50,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  guessText: {
    fontSize: 14,
    flex: 1,
  },
  guessNum: {
    fontWeight: '700',
  },
  statsBtn: {
    paddingLeft: 12,
  },
  // State 2
  solvedLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  solvedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bestText: {
    fontSize: 14,
  },
  // State 3
  gameOverLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statChip: {
    alignItems: 'center',
  },
  statNum: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  statLabel: {
    fontSize: 10,
    color: GREY,
    lineHeight: 12,
  },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  streakEmoji: {
    fontSize: 14,
  },
  streakNum: {
    fontSize: 16,
    fontWeight: '700',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: GREEN,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  shareText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
