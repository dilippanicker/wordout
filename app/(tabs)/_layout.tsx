import { Tabs } from 'expo-router';

const HIDDEN_TAB: object = { tabBarStyle: { display: 'none' }, headerShown: false };

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#6aaa64' }}>
      <Tabs.Screen name="new-game" options={HIDDEN_TAB} />
      <Tabs.Screen name="index"    options={HIDDEN_TAB} />
      <Tabs.Screen name="settings" options={HIDDEN_TAB} />
    </Tabs>
  );
}
