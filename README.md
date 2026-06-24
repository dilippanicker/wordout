# Wordout

A free, open-source word puzzle game for Android with no ads, no tracking, and a carefully curated word list.

## Features
- **Wordout** — classic 5-letter word game, 6 guesses
- **Multi-board mode** — solve 2, 3, 4, 6, or 8 words simultaneously; every guess applies to all boards at once
  - 2-out (7 guesses), 3-out (8 guesses), Quadout (9 guesses), 6-out (11 guesses), 8-out (13 guesses)
  - Swipe between boards; progress indicators show correct letters found per board
  - Tap the middle tab to cycle through board counts instantly
- American English and British English word lists
- Hard mode — revealed hints must be used in future guesses
- Color blind mode — high contrast orange and blue
- Dark theme
- Stats tracking with guess distribution (per game mode)
- Share results as emoji grid
- Win animation (bounce wave) and loss animation (board shake)
- Enter key on right option (swaps ⌫ and ENTER positions)
- No ads, no accounts, no tracking

## Word List
Unlike most Wordle clones, our word list is carefully curated:
- No proper nouns (no person names, place names)
- No plurals
- No 3rd-person verb forms (walks, takes)
- Separate American and British English variants
- ~1,500 answer words — over 4 years of daily play
- ~9,000 valid guess words

The word list pipeline is open source in `wordlist/` — see the scripts in that directory.

## Tech Stack
- React Native + Expo SDK 56
- Expo Router (file-based navigation)
- Zustand (state management)
- react-native-reanimated (animations)
- TypeScript

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Run locally
```bash
git clone https://github.com/dilippanicker/wordout.git
cd wordout
npm install
npx expo start
```

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
- Screen: 360×640 minimum (tile size scales dynamically for all board counts)

## Contributing
Word list improvements welcome — open an issue or PR if you spot a word that shouldn't be an answer, or a common word that's missing.

## Licence
MIT — see [LICENSE](LICENSE)

---
*No ads. No accounts. Just words.*
