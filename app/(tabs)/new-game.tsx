import { Redirect } from 'expo-router';

// This screen exists purely to give the "New Game" tab a valid route.
// The tab's tabPress listener always calls e.preventDefault() so the
// user never actually lands here — navigation goes to index instead.
export default function NewGameScreen() {
  return <Redirect href="/(tabs)/" />;
}
