import { Tabs } from 'expo-router';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore, boardCountName, BOARD_COUNTS } from '@/store/settingsStore';
import { useGameStore } from '@/store/gameStore';
import { useQuordleStore } from '@/store/quordleStore';
import { useStatsStore } from '@/store/statsStore';

// Wraps each tab bar button so mouse clicks don't steal keyboard focus.
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
            newGame();
            useQuordleStore.getState().newGame();
            navigation.navigate('index');
          },
        })}
      />

      {/* ── Game screen — tap cycles through board counts ──────────────── */}
      <Tabs.Screen
        name="index"
        options={{
          title: boardCountName(boardCount),
          headerShown: false,
          tabBarButton: NoFocusTabButton,
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name={boardCount === 1 ? 'grid-outline' : 'apps-outline'}
              size={size}
              color={color}
            />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            const state = navigation.getState();
            const currentTab = state.routes[state.index]?.name;
            if (currentTab === 'index') {
              // Cycle to the next board count.
              const nextCount = BOARD_COUNTS[(BOARD_COUNTS.indexOf(boardCount) + 1) % BOARD_COUNTS.length];
              setBoardCount(nextCount);
              if (nextCount === 1) {
                setGameMode('wordle');
                newGame();
              } else {
                setGameMode('quordle');
                useQuordleStore.getState().newGame();
              }
            }
            navigation.navigate('index');
          },
        })}
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
