import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Stack, ThemeProvider, DefaultTheme, DarkTheme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import 'react-native-reanimated';
import { useSettingsStore } from '@/store/settingsStore';
import { WEB_CARD_MAX_WIDTH, WEB_CARD_MAX_HEIGHT, shouldLetterbox } from '@/constants/layout';

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

  // Always true on web; on native, true only for large screens (>=600dp min
  // dimension) where Android 16+ ignores the portrait lock. Must match the
  // clamp gate in app/(tabs)/index.tsx — see constants/layout.ts.
  const { width: winW, height: winH } = useWindowDimensions();
  const letterbox = shouldLetterbox(winW, winH);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <View style={letterbox ? styles.backdrop : styles.plain}>
      {/* Border marks the card's edge even when maxWidth/maxHeight are a no-op (e.g. an
          undersized itch.io iframe), and on native dark theme where the card (#121213)
          barely contrasts with the backdrop (#1a1a1a) and shadow doesn't render. */}
      <View
        style={[
          letterbox ? styles.card : styles.plain,
          letterbox && { borderColor: darkTheme ? '#3a3a3c' : '#d3d6da', borderWidth: 1 },
        ]}
      >
        <ThemeProvider value={darkTheme ? DARK_THEME : LIGHT_THEME}>
          <StatusBar style={darkTheme ? 'light' : 'dark'} />
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </ThemeProvider>
      </View>
    </View>
  );
}

// Letterboxed (desktop web, native large screens): render as a centered
// phone-width card on a dark backdrop instead of stretching full window size.
// Phones use `plain` (flex:1), the pre-existing native behavior, unchanged.
const styles = StyleSheet.create({
  plain: { flex: 1 },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a' },
  card: {
    flex: 1,
    width: '100%',
    maxWidth: WEB_CARD_MAX_WIDTH,
    maxHeight: WEB_CARD_MAX_HEIGHT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
  },
});
