import { Modal, View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions, Linking } from 'react-native';
import { useTheme } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Tile, TileStatus } from './Tile';
import {
  SINGLE_BOARD_RULES, COLOR_KEY, COLOR_BLIND_NOTE, MULTI_BOARD_RULES,
  RIBBON_DESCRIPTION, BOARD_IND_TEXTS, TOP_ICON_TEXTS, RIBBON_ICON_TEXTS,
  FOOTER_ICON_TEXTS, FEEDBACK_PROMPT, FEEDBACK_LINK_TEXT, OPEN_SOURCE_PROMPT,
  OPEN_SOURCE_LINK_TEXT, MADE_BY, WATCH_TUTORIAL_LABEL, DAILY_PROGRESSION,
} from '@/constants/helpContent';

import { Difficulty, useSettingsStore } from '@/store/settingsStore';

interface HelpModalProps {
  visible: boolean;
  onClose: () => void;
  difficulty: Difficulty;
  onWatchTutorial?: () => void;
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

// Icon/indicator render functions — paired with text from constants/helpContent.ts

const BOARD_IND_RENDER_FNS: Array<() => React.ReactNode> = [
  () => <IndicatorSquare />,
  () => <IndicatorCircle borderColor="#878a8c" />,
  () => <IndicatorCircle borderColor="#c9b458" />,
  () => (
    <IndicatorCircle borderColor="#6aaa64">
      <Text style={indStyles.greenNum}>2</Text>
    </IndicatorCircle>
  ),
  () => (
    <IndicatorCircle borderColor="#c9b458">
      <Text style={indStyles.greenNum}>2</Text>
    </IndicatorCircle>
  ),
  () => (
    <IndicatorCircle borderColor="#6aaa64" backgroundColor="#6aaa64">
      <Text style={indStyles.checkText}>✓</Text>
    </IndicatorCircle>
  ),
];

const TOP_ICON_RENDER_FNS: Array<() => React.ReactNode> = [
  () => <Text style={styles.flagPair}>🇺🇸 🇬🇧</Text>,
  () => <Text style={styles.flagPair}>🐣</Text>,
  () => <Text style={styles.flagPair}>💪</Text>,
  () => <Text style={styles.flagPair}>💀</Text>,
  () => <Ionicons name="refresh-outline" size={18} color="#878a8c" />,
  () => (
    <View style={styles.trianglePair}>
      <View style={styles.triangleLeft} />
      <View style={styles.triangleRight} />
    </View>
  ),
  () => <Ionicons name="moon-outline" size={18} color="#878a8c" />,
  () => <Ionicons name="sunny-outline" size={18} color="#878a8c" />,
  () => <Ionicons name="settings-outline" size={18} color="#878a8c" />,
  () => <Ionicons name="help-circle-outline" size={18} color="#878a8c" />,
];

const RIBBON_ICON_RENDER_FNS: Array<() => React.ReactNode> = [
  () => <Ionicons name="calendar-outline" size={18} color="#5BA75A" />,
  () => <Text style={styles.statsEmoji}>🎮</Text>,
];

const FOOTER_ICON_RENDER_FNS: Array<() => React.ReactNode> = [
  () => <Text style={styles.statsEmoji}>📊</Text>,
  () => <Text style={styles.statsEmoji}>🔥</Text>,
  () => <Text style={styles.statsEmoji}>⚡</Text>,
];

// Merged row definitions (render fn + text from constants)
const BOARD_IND_ROWS: IndRowDef[] = BOARD_IND_RENDER_FNS.map((renderIndicator, i) => ({ renderIndicator, text: BOARD_IND_TEXTS[i] }));
const TOP_ICON_ROWS: IconRowDef[] = TOP_ICON_RENDER_FNS.map((renderIcon, i) => ({ renderIcon, text: TOP_ICON_TEXTS[i] }));
const RIBBON_ICON_ROWS: IconRowDef[] = RIBBON_ICON_RENDER_FNS.map((renderIcon, i) => ({ renderIcon, text: RIBBON_ICON_TEXTS[i] }));
const FOOTER_ICON_ROWS: IconRowDef[] = FOOTER_ICON_RENDER_FNS.map((renderIcon, i) => ({ renderIcon, text: FOOTER_ICON_TEXTS[i] }));

export function HelpModal({ visible, onClose, difficulty, onWatchTutorial }: HelpModalProps) {
  const { colors } = useTheme();
  const { height: screenHeight } = useWindowDimensions();

  function handleWatchTutorial() {
    onClose();
    useSettingsStore.getState().setTutorialSeen(false);
    onWatchTutorial?.();
  }

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

          {onWatchTutorial && (
            <Pressable style={styles.watchTutorialBtn} onPress={handleWatchTutorial}>
              <Text style={styles.watchTutorialText}>{WATCH_TUTORIAL_LABEL}</Text>
            </Pressable>
          )}

          <ScrollView
            style={[styles.scrollView, { maxHeight: screenHeight * 0.72 }]}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            bounces={false}
            nestedScrollEnabled={true}
          >

            {/* ── SINGLE BOARD ──────────────────────────────────────── */}
            <Text style={styles.sectionLabel}>SINGLE BOARD</Text>
            {SINGLE_BOARD_RULES.map((rule, i) => (
              <Text key={i} style={[styles.rule, { color: colors.text }]}>
                {rule.split('**').map((part, j) =>
                  j % 2 === 1 ? <Text key={j} style={styles.bold}>{part}</Text> : part,
                )}
              </Text>
            ))}

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

            <Text style={[styles.colorKey, { color: colors.text }]}>{COLOR_KEY}</Text>
            <Text style={styles.mutedNote}>{COLOR_BLIND_NOTE}</Text>

            {/* ── DAILY MODE ──────────────────────────────────────── */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={styles.sectionLabel}>DAILY MODE</Text>
            <Text style={[styles.rule, { color: colors.text }]}>{DAILY_PROGRESSION}</Text>

            {/* ── MULTI-BOARD MODE ────────────────────────────────── */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={styles.sectionLabel}>MULTI-BOARD MODE</Text>
            {MULTI_BOARD_RULES.map((rule, i) => (
              <Text key={i} style={[styles.rule, { color: colors.text }]}>
                {rule.split('**').map((part, j) =>
                  j % 2 === 1 ? <Text key={j} style={styles.bold}>{part}</Text> : part,
                )}
              </Text>
            ))}

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
              {RIBBON_DESCRIPTION}
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
            <Text style={styles.feedbackPrompt}>{FEEDBACK_PROMPT}</Text>
            <Pressable
              onPress={() => Linking.openURL('https://github.com/dilippanicker/wordout/issues')}
              hitSlop={8}
            >
              <Text style={styles.feedbackLink}>{FEEDBACK_LINK_TEXT}</Text>
            </Pressable>
            <Text style={[styles.feedbackPrompt, { marginTop: 16 }]}>{OPEN_SOURCE_PROMPT}</Text>
            <Pressable
              onPress={() => Linking.openURL('https://github.com/dilippanicker/wordout')}
              hitSlop={8}
            >
              <Text style={styles.feedbackLink}>{OPEN_SOURCE_LINK_TEXT}</Text>
            </Pressable>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.madeBy, { color: colors.text }]}>{MADE_BY}</Text>

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
  watchTutorialBtn: {
    marginHorizontal: 24,
    marginTop: 16,
    backgroundColor: '#5BA75A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  watchTutorialText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
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
