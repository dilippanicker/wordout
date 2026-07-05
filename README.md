# Wordout

A free, open-source word puzzle game for Android. No ads, no accounts, no tracking.

## Download

**[⬇ Download latest APK](https://github.com/dilippanicker/wordout/releases/latest/download/wordout.apk)**

Built automatically on every release via GitHub Actions.

## Features

- **Daily Word** — three puzzles per day (🐣 Easy / 💪 Hard / 💀 Extreme), each with a unique word. Win Easy to unlock Hard; win Hard to unlock Extreme. Independent streaks per difficulty.
- **Practice mode** — unlimited games, any board count, any difficulty
- **Multi-board mode** — solve 2, 3, 4, 6, or 8 words simultaneously; every guess applies to all boards at once
  - 2-out (7 guesses), 3-out (8 guesses), 4-out (9 guesses), 6-out (11 guesses), 8-out (13 guesses)
  - Use **◄ ►** arrows in the header to switch between board counts
- **Three difficulty levels**
  - 🐣 Easy — no constraints
  - 💪 Hard — revealed hints must be used in all future guesses
  - 💀 Extreme — limited guesses (count depends on board count)
- **American and British English** word lists
- **Color blind mode** — high-contrast orange and blue
- **Dark / light theme**
- **Stats tracking** with guess distribution per game mode
- **Share results** as emoji grid
- **Win / lose animations** with haptic feedback
- **Haptic feedback** on correct guesses, wrong guesses, and wins
- **Tap any tile to clear rightward** — cursor lands at tapped position
- **Enter key highlights green** when your guess reaches 5 letters, so it's clear when you can submit
- **Enter key on right** option
- Confirms before abandoning an in-progress game
- No ads, no accounts, no tracking

## Screen Layout

- **Header** — language flag, difficulty, new game, board count arrows, theme, settings, help
- **Ribbon** — daily/practice mode icons, board indicators, contextual status
- **Board** — tile grid
- **Keyboard** — on-screen keyboard
- **Footer** — tries remaining, stats, new game button

## Word List

Unlike most Wordle clones, the word list is carefully curated:

- No proper nouns, no place names
- No plurals
- No 3rd-person verb forms (walks, takes)
- Separate American and British English variants
- ~1,500 answer words — over 4 years of daily play
- ~9,000 valid guess words

The word list pipeline is open source in `wordlist/`.

## Tech Stack

- React Native + Expo SDK 56
- Expo Router (file-based navigation)
- Zustand (state management with AsyncStorage persistence)
- react-native-reanimated (tile flip, bounce, and shake animations)
- TypeScript

## Development

### Prerequisites

- Node.js 18+
- npm
- Expo account (for builds)

### Run locally

```bash
git clone https://github.com/dilippanicker/wordout.git
cd wordout
npm install
npx expo start
```

Open in browser at `http://localhost:8081` or scan QR with Expo Go.

### Build APK

Builds run automatically via GitHub Actions on every push. Trigger manually from the Actions tab.

Requires `EXPO_TOKEN` secret set in GitHub repo settings.

Download links after build:
- `https://github.com/dilippanicker/wordout/releases/latest/download/wordout.apk`
- `https://github.com/dilippanicker/wordout/releases/latest/download/wordout.aab`

### Word list pipeline

```bash
cd wordlist
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 curate.py
```

## Minimum Requirements

- Android 8.0+
- Any screen size — tile size and keyboard scale dynamically for all board counts

## Contributing

Word list improvements are welcome. Open an issue or PR if you spot a word that shouldn't be an answer, or a common word missing from the guess list.

## Licence

MIT — see [LICENSE](LICENSE)

---

*No ads. No accounts. Just words.*
