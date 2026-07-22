import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Stack, ThemeProvider, DefaultTheme, DarkTheme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useSettingsStore } from '@/store/settingsStore';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

// Custom themes so navigation chrome (header, tab bar) matches our palette.
const LIGHT_THEME = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: '#ffffff', card: '#ffffff', text: '#1a1a1b', border: '#d3d6da' },
};
const DARK_THEME = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: '#121213', card: '#1a1a1b', text: '#ffffff', border: '#3a3a3c' },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Must be called before any early returns (Rules of Hooks).
  // Starts with the persisted default; re-renders after AsyncStorage hydration.
  const darkTheme = useSettingsStore(s => s.darkTheme);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <ThemeProvider value={darkTheme ? DARK_THEME : LIGHT_THEME}>
      <StatusBar style={darkTheme ? 'light' : 'dark'} />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
