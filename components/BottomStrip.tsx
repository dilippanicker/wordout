import { ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Difficulty } from '@/store/settingsStore';

const GREEN = '#5BA75A';
const GREY = '#888780';

interface GameStats {
  played: number;
  winPct: number;
  streak: number;
  streakEmoji: string;
}

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
  onOpenStats: () => void;
  onOpenHelp: () => void;
  onNewGame: () => void;
  countdown?: string;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
  gameStats: GameStats;
}

export function BottomStrip({
  gameStatus, isQuordle, isDaily,
  currentGuessNum, maxGuesses, boardCount, solvedCount, difficulty,
  justSolvedInfo, onOpenStats, onOpenHelp, onNewGame, countdown,
  textColor, backgroundColor, borderColor,
  gameStats,
}: Props) {
  const { bottom: bottomInset } = useSafeAreaInsets();
  const isGameOver = gameStatus === 'won' || gameStatus === 'lost';

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
    // State 3 — game over: stats row + action (↺ New Game for practice, countdown for daily)
    const { played, winPct, streak, streakEmoji } = gameStats;
    content = (
      <View style={styles.gameOverStack}>
        <View style={styles.row}>
          <View style={styles.playingLeft}>
            <Text style={[styles.guessText, { color: textColor }]}>
              {`${played} played · ${winPct}% win · `}
              <Text style={{ color: streak > 0 ? GREEN : GREY }}>{streakEmoji} {streak}</Text>
            </Text>
          </View>
          {statsIcon}
        </View>
        {isDaily && countdown ? (
          <Text style={[styles.nextWordText, { color: textColor }]}>Next word in {countdown}</Text>
        ) : !isDaily ? (
          <Pressable onPress={onNewGame} hitSlop={6} style={styles.newGameRow}>
            <Text style={styles.newGameText}>↺ New Game</Text>
          </Pressable>
        ) : null}
      </View>
    );
  } else if (isQuordle && justSolvedInfo !== null) {
    // State 2 — board just solved flash (multi-board playing)
    content = (
      <View style={styles.row}>
        <View style={styles.solvedLeft}>
          <Text style={[styles.solvedText, { color: GREEN }]}>
            Board {justSolvedInfo.boardNum} solved in {justSolvedInfo.guessCount} ✓
          </Text>
        </View>
        {statsIcon}
      </View>
    );
  } else {
    // State 1 — playing: "⏳ N tries left · ? for help"
    const triesLeft = maxGuesses - currentGuessNum;
    const triesText = triesLeft === 1 ? '1 try left' : `${triesLeft} tries left`;
    const diffEmoji = difficulty === 'extreme' ? '💀' : difficulty === 'hard' ? '💪' : null;
    content = (
      <View style={styles.row}>
        <View style={styles.playingLeft}>
          <Text style={[styles.guessText, { color: textColor }]}>
            {'⏳ '}{triesText}
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
  // State 3 game-over stack (stats row + action row)
  gameOverStack: {
    gap: 3,
  },
  nextWordText: {
    fontSize: 12,
    opacity: 0.65,
    paddingLeft: 0,
  },
  newGameRow: {
    alignSelf: 'flex-start',
  },
  newGameText: {
    fontSize: 13,
    fontWeight: '600',
    color: GREEN,
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
});
