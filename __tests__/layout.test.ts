/**
 * Regression tests for the letterbox gate (constants/layout.ts). The card
 * styling in app/_layout.tsx and the tile/paging clamp in app/(tabs)/index.tsx
 * both key off shouldLetterbox() — these tests pin down when it fires so the
 * native large-screen path (Android 16 ignoring the portrait lock on >=600dp
 * devices) letterboxes while phones provably keep their full-bleed layout.
 */
import { describe, test, expect, afterEach } from '@jest/globals';
import { Platform } from 'react-native';
import { shouldLetterbox, LARGE_SCREEN_MIN_DIM } from '../constants/layout';

const originalOS = Platform.OS;
const setOS = (os: typeof Platform.OS) => {
  (Platform as { OS: typeof Platform.OS }).OS = os;
};
afterEach(() => setOS(originalOS));

describe('shouldLetterbox', () => {
  test('web always letterboxes, at any window size', () => {
    setOS('web');
    expect(shouldLetterbox(390, 844)).toBe(true); // phone-sized window
    expect(shouldLetterbox(430, 820)).toBe(true); // itch.io iframe
    expect(shouldLetterbox(1920, 1080)).toBe(true); // desktop
  });

  test('native phones never letterbox, in either orientation', () => {
    setOS('android');
    expect(shouldLetterbox(360, 800)).toBe(false); // common Android phone
    expect(shouldLetterbox(430, 932)).toBe(false); // largest phone bound
    expect(shouldLetterbox(800, 360)).toBe(false); // phone forced landscape
    expect(shouldLetterbox(440, 950)).toBe(false); // oversized phone, still < 600dp
  });

  test('native large screens letterbox, in either orientation', () => {
    setOS('android');
    expect(shouldLetterbox(800, 1280)).toBe(true); // portrait tablet
    expect(shouldLetterbox(1280, 800)).toBe(true); // landscape tablet
    expect(shouldLetterbox(600, 960)).toBe(true); // sw600dp boundary, inclusive
    expect(shouldLetterbox(673, 841)).toBe(true); // foldable inner screen
  });

  test('gate is Android sw600dp: smallest dimension decides, not width', () => {
    setOS('android');
    // Wide-but-short window (e.g. freeform/split-screen): min dim under 600 → full-bleed
    expect(shouldLetterbox(1280, 599)).toBe(false);
    expect(shouldLetterbox(599, 1280)).toBe(false);
    expect(shouldLetterbox(LARGE_SCREEN_MIN_DIM, LARGE_SCREEN_MIN_DIM)).toBe(true);
  });
});
