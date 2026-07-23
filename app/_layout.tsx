import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Stack, ThemeProvider, DefaultTheme, DarkTheme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, StyleSheet } from 'react-native';
import 'react-native-reanimated';
import { useSettingsStore } from '@/store/settingsStore';
import { WEB_CARD_MAX_WIDTH, WEB_CARD_MAX_HEIGHT } from '@/constants/layout';

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
    <View style={styles.webBackdrop}>
      {/* Border marks the card's edge even when maxWidth/maxHeight are a no-op (e.g. an
          undersized itch.io iframe) and there's no dark backdrop space to show a boundary. */}
      <View
        style={[
          styles.webCard,
          Platform.OS === 'web' && { borderColor: darkTheme ? '#3a3a3c' : '#d3d6da', borderWidth: 1 },
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

// Desktop web: render as a centered phone-width card on a dark backdrop
// instead of stretching full window width. No-op on native (plain flex:1).
const styles = StyleSheet.create({
  webBackdrop: Platform.OS === 'web'
    ? { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a' }
    : { flex: 1 },
  webCard: Platform.OS === 'web'
    ? {
        flex: 1,
        width: '100%',
        maxWidth: WEB_CARD_MAX_WIDTH,
        maxHeight: WEB_CARD_MAX_HEIGHT,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
      }
    : { flex: 1 },
});
