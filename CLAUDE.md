# Wordle / Quordle — React Native (Expo)

## Stack
- Expo SDK (file-based routing via Expo Router)
- TypeScript
- Zustand for state
- react-native-reanimated for tile flip animations

## Key decisions
- GameBoard.tsx is a single reusable component — Quordle renders 4 of them
- Word lists are bundled JSON in assets/wordlists/ (not fetched at runtime)
- Two variants: en_us and en_gb, selected in settings

## Word list
- answers_en_us/gb.json  ~1,500 curated answers
- guesses_en_us/gb.json  ~9,000 valid guesses
- No plurals, no proper nouns, no 3rd-person verb forms

## Commands
- npx expo start
- npx expo start --android
