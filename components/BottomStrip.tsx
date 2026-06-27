import { ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BoardStats } from '@/store/statsStore';
import { Difficulty } from '@/store/settingsStore';

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
  difficulty: Difficulty;
  justSolvedInfo: { boardNum: number; guessCount: number } | null;
  practiceStats: BoardStats;
  dailyStats: BoardStats;
  shareConfirmed?: boolean;
  onShare: () => void;
  onOpenStats: () => void;
  onOpenHelp: () => void;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
}

export function BottomStrip({
  gameStatus, isQuordle, isDaily,
  currentGuessNum, maxGuesses, boardCount, solvedCount, difficulty,
  justSolvedInfo, practiceStats, dailyStats,
  shareConfirmed, onShare, onOpenStats, onOpenHelp,
  textColor, backgroundColor, borderColor,
}: Props) {
  const { bottom: bottomInset } = useSafeAreaInsets();
  const isGameOver = gameStatus === 'won' || gameStatus === 'lost';
  const stats = (isDaily && !isQuordle) ? dailyStats : practiceStats;
  const streak = stats.currentStreak;
  const streakColor = streak > 0 ? GREEN : GREY;
  const personalBest = getPersonalBest(stats);

  const statsIcon = (
    <Pressable onPress={onOpenStats} hitSlop={10} style={styles.statsBtn}>
      <Text style={styles.statsEmoji}>📊</Text>
    </Pressable>
  );

  let content: ReactNode;

  if (gameStatus === 'playing' && currentGuessNum === 0) {
    // Pre-game: show only "? for help" in green
    content = (
      <View style={styles.row}>
        <Pressable style={styles.tipContent} onPress={onOpenHelp} hitSlop={6}>
          <Text style={[styles.helpLink]}>? for help</Text>
        </Pressable>
        {statsIcon}
      </View>
    );
  } else if (isGameOver) {
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
              {shareConfirmed
                ? <Text style={styles.shareText}>Copied ✓</Text>
                : <Ionicons name="share-social-outline" size={18} color="#fff" />
              }
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
    // State 1 — playing: "Guess N of M · ? for help"
    const remaining = boardCount - solvedCount;
    const diffEmoji = difficulty === 'extreme' ? '💀' : difficulty === 'hard' ? '💪' : null;
    const multiInfo = isQuordle && solvedCount > 0 ? `  ·  ${solvedCount} solved  ·  ${remaining} remaining` : '';
    content = (
      <View style={styles.row}>
        <View style={styles.playingLeft}>
          <Text style={[styles.guessText, { color: textColor }]}>
            {'Guess '}
            <Text style={styles.guessNum}>{currentGuessNum + 1}</Text>
            {' of '}
            <Text style={styles.guessNum}>{maxGuesses}</Text>
            {multiInfo}
            {' · '}
            <Text style={styles.helpLink} onPress={onOpenHelp}>? for help</Text>
          </Text>
          {diffEmoji ? <Text style={styles.diffBadge}>{diffEmoji}</Text> : null}
        </View>
        {statsIcon}
      </View>
    );
  }

  return (
    <View style={[styles.strip, { backgroundColor, borderTopColor: borderColor, paddingBottom: bottomInset }]}>
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
    minHeight: 50,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 0,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tipContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpLink: {
    fontSize: 13,
    fontWeight: '600',
    color: GREEN,
  },
  playingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  guessText: {
    fontSize: 14,
    flexShrink: 1,
  },
  guessNum: {
    fontWeight: '700',
  },
  diffBadge: {
    fontSize: 14,
    lineHeight: 18,
  },
  statsBtn: {
    paddingLeft: 12,
  },
  statsEmoji: {
    fontSize: 20,
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
    lineHeight: 18,
    includeFontPadding: false,
  },
  streakNum: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
    includeFontPadding: false,
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
