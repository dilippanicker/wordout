import { Platform } from 'react-native';

// The game renders as a fixed-size phone-shaped card centered on a dark backdrop
// (instead of stretching full window size) on desktop web and on native large
// screens. 430x932 matches iPhone 14 Pro Max's logical resolution -- a
// recognizable "large phone" bound rather than an arbitrary number.
export const WEB_CARD_MAX_WIDTH = 430;
export const WEB_CARD_MAX_HEIGHT = 932;

// Android's own sw600dp large-screen bucket: phones (including foldable cover
// screens) stay below it in every orientation; tablets and foldable inner
// screens always meet it. Android 16+ ignores our portrait orientation lock on
// these devices (targetSdk 36), so they can render landscape/resizable.
export const LARGE_SCREEN_MIN_DIM = 600;

// Single source of truth for "render the phone-shaped card instead of full-bleed".
// app/_layout.tsx (card styling) and app/(tabs)/index.tsx (tile sizing + board
// paging math) must stay in lockstep -- both call this with the RAW window
// dimensions, never re-derive the condition locally. If one letterboxes and the
// other doesn't, boards overflow and paging offsets go out of sync.
export function shouldLetterbox(windowW: number, windowH: number): boolean {
  if (Platform.OS === 'web') return true; // web always cards (no-op below the cap)
  return Math.min(windowW, windowH) >= LARGE_SCREEN_MIN_DIM;
}
