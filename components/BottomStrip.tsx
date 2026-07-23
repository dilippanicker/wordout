import { ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Difficulty } from '@/store/settingsStore';
import { WEB_CARD_MAX_WIDTH, WEB_CARD_MAX_HEIGHT } from '@/constants/layout';

const GREEN = '#5BA75A';
const GREY = '#888780';

// True when running inside an iframe on web (e.g. itch.io's embed), which overlays its own
// fullscreen-toggle button in the bottom-right corner, on top of our stats icon.
const isIframeEmbedded = Platform.OS === 'web' && typeof window !== 'undefined' && window.self !== window.top;

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
  textColor: string;
  backgroundColor: string;
  borderColor: string;
  gameStats: GameStats;
}

export function BottomStrip({
  gameStatus, isQuordle, isDaily,
  currentGuessNum, maxGuesses, boardCount, solvedCount, difficulty,
  activeBoardIndex, activeBoardSolved, activeBoardSolvedGuess,
  onOpenStats, onOpenHelp, onNewGame,
  textColor, backgroundColor, borderColor,
  gameStats,
}: Props) {
  const { bottom: bottomInset } = useSafeAreaInsets();
  const isGameOver = gameStatus === 'won' || gameStatus === 'lost';

  // Only reserve clearance while our own card is actually rendering edge-to-edge (viewport at
  // or under the web-card cap) — that's the only case where our corner coincides with wherever
  // itch places its button. In itch's real fullscreen the iframe expands to the full screen
  // size, so our card reverts to its normal centered/backdropped desktop-web look with plenty
  // of margin around it — nowhere near itch's corner icon, wherever it ends up. (An earlier
  // attempt tracked document.fullscreenElement directly, assuming itch's fullscreen cascades
  // into our own document via the iframe's allowfullscreen permission — it doesn't in practice,
  // confirmed live: the reservation stayed even after entering itch's fullscreen.)
  const { width: winW, height: winH } = useWindowDimensions();
  const isFullBleedCard = winW <= WEB_CARD_MAX_WIDTH && winH <= WEB_CARD_MAX_HEIGHT;
  const needsIframeInset = isIframeEmbedded && isFullBleedCard;

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
    // Game over: daily → [? for help] [spacer] [📊] (next difficulty auto-starts); others → [? for help] [spacer] [↺ New Game] [📊]
    content = (
      <View style={styles.row}>
        <Pressable onPress={onOpenHelp} hitSlop={6}>
          <Text style={styles.helpLink}>? for help</Text>
        </Pressable>
        <View style={styles.flex1} />
        {!isDaily && (
          <Pressable onPress={onNewGame} hitSlop={6} style={styles.newGameBtn}>
            <Text style={styles.newGameBtnText}>↺ New Game</Text>
          </Pressable>
        )}
        {statsIcon}
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
    <View style={[styles.strip, { backgroundColor, borderTopColor: borderColor, paddingBottom: bottomInset }, needsIframeInset && styles.stripIframeInset]}>
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
  // Clears itch.io's overlaid fullscreen-toggle button in the bottom-right corner (see isIframeEmbedded).
  stripIframeInset: {
    paddingRight: 44,
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
  newGameBtn: {
    backgroundColor: GREEN,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    marginRight: 10,
  },
  newGameBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
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
