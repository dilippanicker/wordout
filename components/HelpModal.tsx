import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
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

const TILE_SIZE = 46;

export function HelpModal({ visible, onClose, hardMode }: HelpModalProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
          <View style={[styles.header, { borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>How to play</Text>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
              <Text style={styles.closeIcon}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
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
            <Text style={styles.sectionLabel}>QUADOUT</Text>
            <Text style={[styles.rule, { color: colors.text }]}>
              In Quadout, solve <Text style={styles.bold}>4 words simultaneously</Text> with <Text style={styles.bold}>9 guesses.</Text> Every guess applies to all 4 boards.
            </Text>

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

            <View style={{ height: 8 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
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
    width: '90%',
    maxWidth: 380,
    maxHeight: '85%',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  closeBtn: {
    position: 'absolute',
    right: 0,
  },
  closeIcon: {
    fontSize: 18,
    color: '#878a8c',
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
  // Icons section
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
});
