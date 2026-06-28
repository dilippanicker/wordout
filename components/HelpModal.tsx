import { Modal, View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions, Linking } from 'react-native';
import { useTheme } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Tile, TileStatus } from './Tile';

import { Difficulty } from '@/store/settingsStore';

interface HelpModalProps {
  visible: boolean;
  onClose: () => void;
  difficulty: Difficulty;
}

const TILE_SIZE = 44;
type ExTile = { letter: string; status: TileStatus };

// RAISE vs FROST: R=present, A=absent, I=absent, S=correct, E=absent
const EXAMPLE_RAISE: ExTile[] = [
  { letter: 'R', status: 'present' },
  { letter: 'A', status: 'absent' },
  { letter: 'I', status: 'absent' },
  { letter: 'S', status: 'correct' },
  { letter: 'E', status: 'absent' },
];

// CLOUT vs FROST: C=absent, L=absent, O=correct, U=absent, T=correct
const EXAMPLE_CLOUT: ExTile[] = [
  { letter: 'C', status: 'absent' },
  { letter: 'L', status: 'absent' },
  { letter: 'O', status: 'correct' },
  { letter: 'U', status: 'absent' },
  { letter: 'T', status: 'correct' },
];

function IndicatorSquare() {
  return (
    <View style={indStyles.square}>
      <Ionicons name="play" size={9} color="#5BA75A" />
    </View>
  );
}

function IndicatorCircle({
  borderColor,
  backgroundColor = 'transparent',
  children,
}: {
  borderColor: string;
  backgroundColor?: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={[indStyles.circle, { borderColor, backgroundColor }]}>
      {children}
    </View>
  );
}

type IconRowDef = { renderIcon: () => React.ReactNode; text: string };
type IndRowDef = { renderIndicator: () => React.ReactNode; text: string };

const BOARD_IND_ROWS: IndRowDef[] = [
  {
    renderIndicator: () => <IndicatorSquare />,
    text: 'Board you are currently playing',
  },
  {
    renderIndicator: () => <IndicatorCircle borderColor="#878a8c" />,
    text: 'No correct letters yet',
  },
  {
    renderIndicator: () => <IndicatorCircle borderColor="#c9b458" />,
    text: 'Has misplaced letters, no greens yet',
  },
  {
    renderIndicator: () => (
      <IndicatorCircle borderColor="#6aaa64">
        <Text style={indStyles.greenNum}>2</Text>
      </IndicatorCircle>
    ),
    text: '2 letters in correct position, no misplaced',
  },
  {
    renderIndicator: () => (
      <IndicatorCircle borderColor="#c9b458">
        <Text style={indStyles.greenNum}>2</Text>
      </IndicatorCircle>
    ),
    text: '2 correct position + misplaced letters',
  },
  {
    renderIndicator: () => (
      <IndicatorCircle borderColor="#6aaa64" backgroundColor="#6aaa64">
        <Text style={indStyles.checkText}>✓</Text>
      </IndicatorCircle>
    ),
    text: 'Board solved',
  },
];

const TOP_ICON_ROWS: IconRowDef[] = [
  {
    renderIcon: () => <Text style={styles.flagPair}>🇺🇸 🇬🇧</Text>,
    text: 'Switch between American and British English',
  },
  {
    renderIcon: () => <Text style={styles.flagPair}>🐣</Text>,
    text: 'Easy mode — no constraints on future guesses',
  },
  {
    renderIcon: () => <Text style={styles.flagPair}>💪</Text>,
    text: 'Hard mode — revealed hints must be used in all future guesses',
  },
  {
    renderIcon: () => <Text style={styles.flagPair}>💀</Text>,
    text: 'Extreme mode — limited guesses, count depends on board count',
  },
  {
    renderIcon: () => <Ionicons name="refresh-outline" size={18} color="#878a8c" />,
    text: 'New game — abandon the current game and start fresh',
  },
  {
    renderIcon: () => (
      <View style={styles.trianglePair}>
        <View style={styles.triangleLeft} />
        <View style={styles.triangleRight} />
      </View>
    ),
    text: 'Cycle through board counts (Wordout, 2-out, 3-out, 4-out, 6-out, 8-out)',
  },
  {
    renderIcon: () => <Ionicons name="moon-outline" size={18} color="#878a8c" />,
    text: 'Dark theme',
  },
  {
    renderIcon: () => <Ionicons name="sunny-outline" size={18} color="#878a8c" />,
    text: 'Light theme',
  },
  {
    renderIcon: () => <Ionicons name="settings-outline" size={18} color="#878a8c" />,
    text: 'Settings',
  },
  {
    renderIcon: () => <Ionicons name="help-circle-outline" size={18} color="#878a8c" />,
    text: 'This help screen',
  },
];

const RIBBON_ICON_ROWS: IconRowDef[] = [
  {
    renderIcon: () => <Ionicons name="calendar-outline" size={18} color="#5BA75A" />,
    text: 'Daily word — one new puzzle per day (green when active)',
  },
  {
    renderIcon: () => <Text style={styles.statsEmoji}>🎮</Text>,
    text: 'Practice mode — unlimited games (green when active)',
  },
];

const FOOTER_ICON_ROWS: IconRowDef[] = [
  {
    renderIcon: () => <Text style={styles.statsEmoji}>📊</Text>,
    text: 'Statistics — view scores and guess distribution',
  },
  {
    renderIcon: () => <Text style={styles.statsEmoji}>🔥</Text>,
    text: 'Daily streak — consecutive days solving the daily word',
  },
  {
    renderIcon: () => <Text style={styles.statsEmoji}>⚡</Text>,
    text: 'Practice streak — consecutive practice wins, resets on loss',
  },
];

export function HelpModal({ visible, onClose, difficulty }: HelpModalProps) {
  const { colors } = useTheme();
  const { height: screenHeight } = useWindowDimensions();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalBox, { backgroundColor: colors.card }]}>

          <View style={[styles.header, { borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>HOW TO PLAY</Text>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
              <Text style={styles.closeIcon}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            style={[styles.scrollView, { maxHeight: screenHeight * 0.72 }]}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            bounces={false}
            nestedScrollEnabled={true}
          >

            {/* ── SINGLE BOARD ──────────────────────────────────────── */}
            <Text style={styles.sectionLabel}>SINGLE BOARD</Text>
            <Text style={[styles.rule, { color: colors.text }]}>
              Guess the word in <Text style={styles.bold}>6 tries.</Text>
            </Text>
            <Text style={[styles.rule, { color: colors.text }]}>
              Each guess must be a valid 5-letter word. After each guess, the colour of the tiles will change to show how close you were.
            </Text>

            <Text style={[styles.subLabel, { color: colors.text }]}>EXAMPLE</Text>

            <View style={styles.exampleRow}>
              {EXAMPLE_RAISE.map((t, j) => <Tile key={j} letter={t.letter} status={t.status} size={TILE_SIZE} />)}
            </View>
            <View style={styles.exampleRow}>
              {EXAMPLE_CLOUT.map((t, j) => <Tile key={j} letter={t.letter} status={t.status} size={TILE_SIZE} />)}
            </View>
            <View style={[styles.exampleRow, styles.exampleRowLast]}>
              {Array.from({ length: 5 }, (_, j) => <Tile key={j} size={TILE_SIZE} />)}
            </View>

            <Text style={[styles.colorKey, { color: colors.text }]}>
              {'🟩 correct position   🟨 right letter, wrong spot   ⬛ not in word'}
            </Text>
            <Text style={styles.mutedNote}>
              Enable Color Blind Mode in Settings for high-contrast orange and blue.
            </Text>

            {/* ── MULTI-BOARD MODE ────────────────────────────────── */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={styles.sectionLabel}>MULTI-BOARD MODE</Text>
            <Text style={[styles.rule, { color: colors.text }]}>
              Solve <Text style={styles.bold}>2–8 words simultaneously.</Text> Every guess applies to all boards at once. Use the <Text style={styles.bold}>◄ ►</Text> arrows in the header to switch between modes.
            </Text>
            <Text style={[styles.rule, { color: colors.text }]}>
              You get <Text style={styles.bold}>5 + board count guesses</Text> (e.g. 9 for 4-out, 13 for 8-out).
            </Text>

            {/* ── BOARD INDICATORS ────────────────────────────────── */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={styles.sectionLabel}>BOARD INDICATORS</Text>
            {BOARD_IND_ROWS.map(({ renderIndicator, text }, i) => (
              <View key={i} style={styles.iconRow}>
                <View style={styles.iconCell}>{renderIndicator()}</View>
                <Text style={[styles.iconDesc, { color: colors.text }]}>{text}</Text>
              </View>
            ))}

            {/* ── ICONS ───────────────────────────────────────────── */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={styles.sectionLabel}>ICONS</Text>

            <Text style={[styles.subLabel, { color: colors.text }]}>Top bar</Text>
            {TOP_ICON_ROWS.map(({ renderIcon, text }, i) => (
              <View key={i} style={styles.iconRow}>
                <View style={styles.iconCell}>{renderIcon()}</View>
                <Text style={[styles.iconDesc, { color: colors.text }]}>{text}</Text>
              </View>
            ))}

            <Text style={[styles.subLabel, { color: colors.text, marginTop: 10 }]}>Ribbon</Text>
            <Text style={[styles.rule, { color: colors.text, marginBottom: 12 }]}>
              The Ribbon shows your current mode, difficulty, board indicators, and contextual status (such as the next word countdown when today's game is complete).
            </Text>
            {RIBBON_ICON_ROWS.map(({ renderIcon, text }, i) => (
              <View key={i} style={styles.iconRow}>
                <View style={styles.iconCell}>{renderIcon()}</View>
                <Text style={[styles.iconDesc, { color: colors.text }]}>{text}</Text>
              </View>
            ))}

            <Text style={[styles.subLabel, { color: colors.text, marginTop: 10 }]}>Footer</Text>
            {FOOTER_ICON_ROWS.map(({ renderIcon, text }, i) => (
              <View key={i} style={styles.iconRow}>
                <View style={styles.iconCell}>{renderIcon()}</View>
                <Text style={[styles.iconDesc, { color: colors.text }]}>{text}</Text>
              </View>
            ))}

            {/* ── FOOTER ──────────────────────────────────────────── */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={styles.feedbackPrompt}>Missing or wrong word?</Text>
            <Pressable
              onPress={() => Linking.openURL('https://github.com/dilippanicker/wordout/issues')}
              hitSlop={8}
            >
              <Text style={styles.feedbackLink}>Submit on GitHub →</Text>
            </Pressable>
            <Text style={[styles.feedbackPrompt, { marginTop: 16 }]}>Wordout is free and open source.</Text>
            <Pressable
              onPress={() => Linking.openURL('https://github.com/dilippanicker/wordout')}
              hitSlop={8}
            >
              <Text style={styles.feedbackLink}>View source on GitHub →</Text>
            </Pressable>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.madeBy, { color: colors.text }]}>Made with ♥ by Onglipo Labs</Text>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const indStyles = StyleSheet.create({
  square: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#5BA75A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greenNum: {
    color: '#6aaa64',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
  },
  checkText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 13,
  },
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '90%',
    maxWidth: 380,
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  closeBtn: {
    position: 'absolute',
    right: 24,
  },
  closeIcon: {
    fontSize: 18,
    color: '#878a8c',
  },
  scrollView: {},
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#878a8c',
    marginBottom: 12,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginBottom: 10,
    marginTop: 4,
  },
  rule: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
  bold: {
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 16,
  },
  exampleRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  exampleRowLast: {
    marginBottom: 14,
  },
  colorKey: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  mutedNote: {
    fontSize: 12,
    lineHeight: 17,
    color: '#878a8c',
    marginBottom: 4,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCell: {
    width: 36,
    alignItems: 'center',
    marginRight: 12,
  },
  iconDesc: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
  },
  flagPair: {
    fontSize: 15,
    lineHeight: 20,
  },
  statsEmoji: {
    fontSize: 16,
    lineHeight: 20,
  },
  trianglePair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  triangleLeft: {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#aaa',
  },
  triangleRight: {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#aaa',
  },
  feedbackPrompt: {
    fontSize: 13,
    color: '#878a8c',
    textAlign: 'center',
    marginBottom: 6,
  },
  feedbackLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6aaa64',
    textAlign: 'center',
  },
  madeBy: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.5,
  },
});
