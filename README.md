# Wordout

A free, open-source word puzzle game for Android with no ads, no tracking, and a carefully curated word list.

## Download

**[⬇ Download latest APK](https://github.com/dilippanicker/wordout/releases/latest/download/wordout.apk)**

Built automatically on every release via GitHub Actions. No login required.

## Features

- **Wordout** — classic 5-letter word game, 6 guesses
- **Multi-board mode** — solve 2, 3, 4, 6, or 8 words simultaneously; every guess applies to all boards at once
  - 2-out (7 guesses), 3-out (8 guesses), 4-out (9 guesses), 6-out (11 guesses), 8-out (13 guesses)
  - Swipe between boards; progress indicators show letters found per board at a glance
  - Use **‹ ›** arrows in the bottom tab to cycle board modes instantly
- **American and British English** word lists
- **Hard mode** — revealed hints must be used in all future guesses
- **Color blind mode** — high-contrast orange and blue instead of green and yellow
- **Dark / light theme**
- **Stats tracking** with guess distribution, per game mode
- **Share results** as emoji grid
- **Win / lose animations** — green shimmer on game win; unsolved boards dim on game loss
- **Enter key on right** option — swaps ⌫ and ENTER positions on the keyboard
- Confirms before abandoning an in-progress game (New Game, board switch, language change)
- No ads, no accounts, no tracking

## Word List

Unlike most Wordle clones, the word list is carefully curated:

- No proper nouns (no names, no place names)
- No plurals
- No 3rd-person verb forms (walks, takes)
- Separate American and British English variants
- ~1,500 answer words — over 4 years of daily play
- ~9,000 valid guess words

The word list pipeline is open source in `wordlist/` — see the scripts in that directory.

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

### Run locally

```bash
git clone https://github.com/dilippanicker/wordout.git
cd wordout
npm install
npx expo start
```

### Build APK

```bash
npx eas-cli build --platform android --profile preview --non-interactive
```

Requires an [Expo account](https://expo.dev) and EAS CLI (`npm install -g eas-cli`).

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

Word list improvements are welcome. Open an issue or PR if you spot a word that shouldn't be an answer, or a common word that's missing from the guess list.

## Licence

MIT — see [LICENSE](LICENSE)

---

*No ads. No accounts. Just words.*
