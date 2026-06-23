import { Modal, View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions, Linking } from 'react-native';
import { useTheme } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Tile, TileStatus } from './Tile';

interface HelpModalProps {
  visible: boolean;
  onClose: () => void;
  hardMode: boolean;
}

interface ExampleTile { letter: string; status: TileStatus }
interface Example { tiles: ExampleTile[]; description: string }

const EXAMPLES: Example[] = [
  {
    tiles: [
      { letter: 'W', status: 'correct' },
      { letter: 'E', status: 'filled' },
      { letter: 'A', status: 'filled' },
      { letter: 'R', status: 'filled' },
      { letter: 'Y', status: 'filled' },
    ],
    description: 'W is in the word and in the correct spot.',
  },
  {
    tiles: [
      { letter: 'P', status: 'filled' },
      { letter: 'I', status: 'present' },
      { letter: 'L', status: 'filled' },
      { letter: 'L', status: 'filled' },
      { letter: 'S', status: 'filled' },
    ],
    description: 'I is in the word but in the wrong spot.',
  },
  {
    tiles: [
      { letter: 'V', status: 'filled' },
      { letter: 'A', status: 'filled' },
      { letter: 'G', status: 'filled' },
      { letter: 'U', status: 'absent' },
      { letter: 'E', status: 'filled' },
    ],
    description: 'U is not in the word in any spot.',
  },
];

type IconRowDef = { renderIcon: () => React.ReactNode; text: string };

const ICON_ROWS: IconRowDef[] = [
  {
    renderIcon: () => <Ionicons name="refresh-outline" size={18} color="#878a8c" />,
    text: 'Start a new game at any time, abandoning the current game',
  },
  {
    renderIcon: () => <Text style={styles.flagPair}>🇺🇸 🇬🇧</Text>,
    text: 'Switch between American and British English word lists',
  },
  {
    renderIcon: () => <Text style={styles.flagPair}>🐣 🔥</Text>,
    text: 'Hard mode — 🐣 off, 🔥 on. Revealed hints must be used in all future guesses.',
  },
  {
    renderIcon: () => <Ionicons name="moon-outline" size={18} color="#878a8c" />,
    text: 'Toggle dark / light theme',
  },
  {
    renderIcon: () => <Ionicons name="help-circle-outline" size={18} color="#878a8c" />,
    text: 'This help screen',
  },
];

// Small indicator shape helpers used in the BOARD INDICATORS section.
function IndicatorSquare() {
  return (
    <View style={indStyles.square}>
      <Ionicons name="play" size={9} color="#878a8c" />
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

type BoardIndRowDef = { renderIndicator: () => React.ReactNode; text: string };

const BOARD_IND_ROWS: BoardIndRowDef[] = [
  {
    renderIndicator: () => <IndicatorSquare />,
    text: 'Current board you are playing',
  },
  {
    renderIndicator: () => <IndicatorCircle borderColor="#878a8c" />,
    text: 'No guesses yet, or all results were grey',
  },
  {
    renderIndicator: () => (
      <IndicatorCircle borderColor="#6aaa64">
        <Text style={indStyles.greenNum}>3</Text>
      </IndicatorCircle>
    ),
    text: 'Green number = letters in the correct position (greens only, no yellows)',
  },
  {
    renderIndicator: () => (
      <IndicatorCircle borderColor="#c9b458" backgroundColor="#c9b458">
        <Text style={indStyles.greenNum}>2</Text>
      </IndicatorCircle>
    ),
    text: 'Yellow fill = board also has misplaced letters (present but wrong position)',
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

const TILE_SIZE = 46;

export function HelpModal({ visible, onClose, hardMode }: HelpModalProps) {
  const { colors } = useTheme();
  const { height: screenHeight } = useWindowDimensions();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Overlay — View (not Pressable) so it doesn't interfere with ScrollView height */}
      <View style={styles.overlay}>
        <View style={[styles.modalBox, { backgroundColor: colors.card }]}>

          {/* Fixed header — outside ScrollView so it doesn't scroll away */}
          <View style={[styles.header, { borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>How to play</Text>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
              <Text style={styles.closeIcon}>✕</Text>
            </Pressable>
          </View>

          {/* Scrollable content — maxHeight on the ScrollView itself is the reliable pattern;
              flex:1 requires the parent to have an explicit height, maxHeight is not enough. */}
          <ScrollView
            style={[styles.scrollView, { maxHeight: screenHeight * 0.72 }]}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            bounces={false}
            nestedScrollEnabled={true}
          >
            <Text style={[styles.rule, { color: colors.text }]}>
              Guess the word in <Text style={styles.bold}>6 tries.</Text>
            </Text>
            <Text style={[styles.rule, { color: colors.text }]}>
              Each guess must be a valid 5-letter word.
            </Text>
            <Text style={[styles.rule, { color: colors.text }]}>
              After each guess, the colour of the tiles will change to show how close your guess was.
            </Text>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={styles.sectionLabel}>EXAMPLES</Text>

            {EXAMPLES.map(({ tiles, description }, i) => (
              <View key={i} style={styles.example}>
                <View style={styles.exampleRow}>
                  {tiles.map((t, j) => (
                    <Tile key={j} letter={t.letter} status={t.status} size={TILE_SIZE} />
                  ))}
                </View>
                <Text style={[styles.exampleDesc, { color: colors.text }]}>{description}</Text>
              </View>
            ))}

            <Text style={[styles.colorBlindNote, { color: colors.text }]}>
              Enable <Text style={styles.bold}>Color Blind Mode</Text> in Settings to replace green and yellow with high-contrast orange and blue.
            </Text>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={styles.sectionLabel}>MULTI-BOARD MODE</Text>
            <Text style={[styles.rule, { color: colors.text }]}>
              Solve <Text style={styles.bold}>2–8 words simultaneously.</Text> Every guess applies to all boards at once. Choose a board count in Settings.
            </Text>
            <Text style={[styles.rule, { color: colors.text }]}>
              You get <Text style={styles.bold}>5 + board count guesses</Text> (e.g. 9 for Quadout, 13 for 8-out).
            </Text>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={styles.sectionLabel}>BOARD INDICATORS</Text>
            <Text style={[styles.rule, { color: colors.text }]}>
              The row of circles above the board shows the progress of each board at a glance.
            </Text>

            {BOARD_IND_ROWS.map(({ renderIndicator, text }, i) => (
              <View key={i} style={styles.iconRow}>
                <View style={styles.iconCell}>{renderIndicator()}</View>
                <Text style={[styles.iconDesc, { color: colors.text }]}>{text}</Text>
              </View>
            ))}

            {hardMode && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Text style={styles.sectionLabel}>HARD MODE</Text>
                <Text style={[styles.rule, { color: colors.text }]}>
                  Any revealed hints must be used in all subsequent guesses.
                </Text>
              </>
            )}

            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={styles.sectionLabel}>ICONS</Text>

            {ICON_ROWS.map(({ renderIcon, text }, i) => (
              <View key={i} style={styles.iconRow}>
                <View style={styles.iconCell}>{renderIcon()}</View>
                <Text style={[styles.iconDesc, { color: colors.text }]}>{text}</Text>
              </View>
            ))}

            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={styles.feedbackPrompt}>Missing a word or shouldn't be an answer?</Text>
            <Pressable
              onPress={() => Linking.openURL('https://github.com/dilippanicker/wordout/issues/new?template=word-list-issue.md&title=Word+list+issue:+[WORD]')}
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
          </ScrollView>

        </View>
      </View>
    </Modal>
  );
}

// Styles for the small indicator shapes inside the help modal.
const indStyles = StyleSheet.create({
  square: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#878a8c',
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
  scrollView: {
    // maxHeight set inline from screenHeight — no flex:1 needed here
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#878a8c',
    marginBottom: 14,
  },
  example: {
    marginBottom: 18,
  },
  exampleRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  exampleDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  colorBlindNote: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    marginBottom: 4,
    opacity: 0.7,
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
    fontSize: 16,
    lineHeight: 20,
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
});
