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
  // Active board info for multi-board persistent status display (B7)
  activeBoardIndex?: number;
  activeBoardSolved?: boolean;
  activeBoardSolvedGuess?: number;
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
  activeBoardIndex, activeBoardSolved, activeBoardSolvedGuess,
  onOpenStats, onOpenHelp, onNewGame, countdown,
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
    // Pre-game: show only "? for help" in green + 📊
    content = (
      <View style={styles.row}>
        <Pressable style={styles.tipContent} onPress={onOpenHelp} hitSlop={6}>
          <Text style={[styles.helpLink]}>? for help</Text>
        </Pressable>
        {statsIcon}
      </View>
    );
  } else if (isGameOver) {
    // Game over: [? for help] [spacer] [📊] [↺ New Game / countdown] — all on one line (B1)
    content = (
      <View style={styles.row}>
        <Pressable onPress={onOpenHelp} hitSlop={6}>
          <Text style={styles.helpLink}>? for help</Text>
        </Pressable>
        <View style={styles.flex1} />
        {statsIcon}
        {isDaily && countdown ? (
          <Text style={[styles.countdownText]}>{countdown}</Text>
        ) : !isDaily ? (
          <Pressable onPress={onNewGame} hitSlop={6} style={styles.newGameBtn}>
            <Text style={styles.newGameText}>↺ New Game</Text>
          </Pressable>
        ) : null}
      </View>
    );
  } else if (isQuordle && activeBoardSolved) {
    // Multi-board: active board is solved — show persistent solved status (B7)
    const boardNum = (activeBoardIndex ?? 0) + 1;
    const guessCount = activeBoardSolvedGuess ?? 0;
    content = (
      <View style={styles.row}>
        <View style={styles.solvedLeft}>
          <Text style={[styles.solvedText, { color: GREEN }]}>
            Board {boardNum} solved in {guessCount} ✓
          </Text>
        </View>
        {statsIcon}
      </View>
    );
  } else {
    // Playing: "⏳ N tries left · ? for help"
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
  flex1: {
    flex: 1,
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
  // Game-over action items
  countdownText: {
    fontSize: 13,
    fontWeight: '600',
    color: GREEN,
    paddingLeft: 10,
  },
  newGameBtn: {
    paddingLeft: 10,
  },
  newGameText: {
    fontSize: 13,
    fontWeight: '600',
    color: GREEN,
  },
  // Multi-board solved state (B7)
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
