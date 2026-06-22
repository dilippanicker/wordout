import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/store/settingsStore';
import { useGameStore } from '@/store/gameStore';
import { useQuordleStore } from '@/store/quordleStore';
import { useStatsStore } from '@/store/statsStore';

export default function TabLayout() {
  const gameMode = useSettingsStore(s => s.gameMode);
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

      {/* ── Game screen (Wordle ↔ Quordle toggle) ──────────────────────── */}
      <Tabs.Screen
        name="index"
        options={{
          title: gameMode === 'wordle' ? 'Wordout' : 'Quadout',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name={gameMode === 'wordle' ? 'grid-outline' : 'apps-outline'}
              size={size}
              color={color}
            />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            // Only toggle mode when already on the game screen.
            // Coming from Settings should return to the game without resetting.
            const state = navigation.getState();
            const currentTab = state.routes[state.index]?.name;
            if (currentTab === 'index') {
              setGameMode(gameMode === 'wordle' ? 'quordle' : 'wordle');
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
