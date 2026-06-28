// Help screen text content — edit here to update help without touching component code

export const SINGLE_BOARD_RULES = [
  'Guess the word in **6 tries.**',
  'Each guess must be a valid 5-letter word. After each guess, the colour of the tiles will change to show how close you were.',
];

export const COLOR_KEY = '🟩 correct position   🟨 right letter, wrong spot   ⬛ not in word';
export const COLOR_BLIND_NOTE = 'Enable Color Blind Mode in Settings for high-contrast orange and blue.';

export const MULTI_BOARD_RULES = [
  'Solve **2–8 words simultaneously.** Every guess applies to all boards at once. Use the **◄ ►** arrows in the header to switch between modes.',
  'You get **5 + board count guesses** (e.g. 9 for 4-out, 13 for 8-out).',
];

export const RIBBON_DESCRIPTION =
  'The Ribbon shows your current mode, difficulty, board indicators, and contextual status (such as the next word countdown when today\'s game is complete).';

export const BOARD_IND_TEXTS = [
  'Board you are currently playing',
  'No correct letters yet',
  'Has misplaced letters, no greens yet',
  '2 letters in correct position, no misplaced',
  '2 correct position + misplaced letters',
  'Board solved',
];

export const TOP_ICON_TEXTS = [
  'Switch between American and British English',
  'Easy mode — no constraints on future guesses',
  'Hard mode — revealed hints must be used in all future guesses',
  'Extreme mode — limited guesses, count depends on board count',
  'New game — abandon the current game and start fresh',
  'Cycle through board counts (Wordout, 2-out, 3-out, 4-out, 6-out, 8-out)',
  'Dark theme',
  'Light theme',
  'Settings',
  'This help screen',
];

export const RIBBON_ICON_TEXTS = [
  'Daily word — one new puzzle per day (green when active)',
  'Practice mode — unlimited games (green when active)',
];

export const FOOTER_ICON_TEXTS = [
  'Statistics — view scores and guess distribution',
  'Daily streak — consecutive days solving the daily word',
  'Practice streak — consecutive practice wins, resets on loss',
];

export const FEEDBACK_PROMPT = 'Missing or wrong word?';
export const FEEDBACK_LINK_TEXT = 'Submit on GitHub →';
export const OPEN_SOURCE_PROMPT = 'Wordout is free and open source.';
export const OPEN_SOURCE_LINK_TEXT = 'View source on GitHub →';
export const MADE_BY = 'Made with ♥ by Onglipo Labs';
