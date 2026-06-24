import { Tabs, useRouter } from 'expo-router';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore, boardCountName, BOARD_COUNTS, BoardCount } from '@/store/settingsStore';
import { useGameStore } from '@/store/gameStore';
import { useQuordleStore } from '@/store/quordleStore';
import { useStatsStore } from '@/store/statsStore';
import { isGameInProgress, confirmAbandon } from '@/utils/abandon';

const noFocus = { tabIndex: -1, onMouseDown: (e: any) => e.preventDefault() };

function NoFocusTabButton(props: any) {
  return (
    <Pressable
      {...props}
      tabIndex={-1}
      onMouseDown={(e: any) => e.preventDefault()}
    />
  );
}

export default function TabLayout() {
  const boardCount = useSettingsStore(s => s.boardCount);
  const setBoardCount = useSettingsStore(s => s.setBoardCount);
  const setGameMode = useSettingsStore(s => s.setGameMode);
  const newGame = useGameStore(s => s.newGame);
  const settingsBadge = useStatsStore(s => s.settingsBadge);
  const router = useRouter();

  function cycleTo(n: BoardCount) {
    const doIt = () => {
      setBoardCount(n);
      if (n === 1) { setGameMode('wordle'); newGame(); }
      else { setGameMode('quordle'); useQuordleStore.getState().newGame(); }
      router.navigate('/(tabs)/' as never);
    };
    if (isGameInProgress()) confirmAbandon(doIt);
    else doIt();
  }

  function cyclePrev() {
    const idx = BOARD_COUNTS.indexOf(boardCount);
    cycleTo(BOARD_COUNTS[(idx - 1 + BOARD_COUNTS.length) % BOARD_COUNTS.length]);
  }

  function cycleNext() {
    const idx = BOARD_COUNTS.indexOf(boardCount);
    cycleTo(BOARD_COUNTS[(idx + 1) % BOARD_COUNTS.length]);
  }

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#6aaa64' }}>

      {/* ── New Game action tab ─────────────────────────────────────────── */}
      <Tabs.Screen
        name="new-game"
        options={{
          title: 'New Game',
          headerShown: false,
          tabBarButton: NoFocusTabButton,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="refresh-outline" size={size} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            const start = () => {
              newGame();
              useQuordleStore.getState().newGame();
              navigation.navigate('index');
            };
            if (isGameInProgress()) confirmAbandon(start);
            else start();
          },
        })}
      />

      {/* ── Game screen — ‹ mode › inline switcher ─────────────────────── */}
      <Tabs.Screen
        name="index"
        options={{
          title: boardCountName(boardCount),
          headerShown: false,
          tabBarButton: (props) => (
            <View style={[tabStyles.container, props.style as any]}>
              <Pressable
                {...(noFocus as any)}
                onPress={cyclePrev}
                hitSlop={8}
                style={tabStyles.arrow}
              >
                <Text style={tabStyles.arrowText}>‹</Text>
              </Pressable>
              <Pressable
                {...(noFocus as any)}
                onPress={props.onPress as any}
                style={tabStyles.nameArea}
              >
                <Text style={tabStyles.modeName}>{boardCountName(boardCount)}</Text>
              </Pressable>
              <Pressable
                {...(noFocus as any)}
                onPress={cycleNext}
                hitSlop={8}
                style={tabStyles.arrow}
              >
                <Text style={tabStyles.arrowText}>›</Text>
              </Pressable>
            </View>
          ),
        }}
      />

      {/* ── Settings ────────────────────────────────────────────────────── */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          headerShown: false,
          tabBarButton: NoFocusTabButton,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
          tabBarBadge: settingsBadge ? '' : undefined,
          tabBarBadgeStyle: {
            minWidth: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#6aaa64',
            fontSize: 0,
            lineHeight: 8,
          },
        }}
      />

    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  arrowText: {
    fontSize: 20,
    color: '#878a8c',
    lineHeight: 24,
  },
  nameArea: {
    paddingHorizontal: 4,
    paddingVertical: 6,
    minWidth: 48,
    alignItems: 'center',
  },
  modeName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6aaa64',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});
