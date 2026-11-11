import { Platform } from 'react-native';
import * as StoreReview from 'expo-store-review';
import { useSettingsStore } from '@/store/settingsStore';

export const REVIEW_MIN_WINS = 5;
export const REVIEW_MIN_DAYS_SINCE_INSTALL = 3;
export const REVIEW_MAX_PROMPTS = 3;
export const REVIEW_MIN_DAYS_BETWEEN = 60;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReviewEligibilityInput {
  platform: string;
  won: boolean;
  tutorialShowing: boolean;
  totalWins: number;
  firstLaunchDate: string;
  reviewPromptCount: number;
  lastReviewPromptDate: string;
  now: number;
}

/** Pure gate for everything except StoreReview.isAvailableAsync(), which is async. */
export function isReviewEligible(i: ReviewEligibilityInput): boolean {
  if (i.platform !== 'android') return false;
  if (!i.won || i.tutorialShowing) return false;
  if (i.totalWins < REVIEW_MIN_WINS) return false;
  if (i.reviewPromptCount >= REVIEW_MAX_PROMPTS) return false;

  const first = Date.parse(i.firstLaunchDate);
  if (Number.isNaN(first) || i.now - first < REVIEW_MIN_DAYS_SINCE_INSTALL * DAY_MS) return false;

  if (i.lastReviewPromptDate) {
    const last = Date.parse(i.lastReviewPromptDate);
    if (!Number.isNaN(last) && i.now - last < REVIEW_MIN_DAYS_BETWEEN * DAY_MS) return false;
  }
  return true;
}

/**
 * Request the native in-app review dialog if every gate passes. Fails silently.
 * `tutorialShowing` is a getter so callers can pass a ref read at fire time —
 * this runs on a delay, so a value captured at call time would be stale.
 * The API never reports whether the user reviewed; we only record that we asked.
 */
export async function maybeRequestReview(won: boolean, tutorialShowing: () => boolean): Promise<void> {
  try {
    const s = useSettingsStore.getState();
    const eligible = isReviewEligible({
      platform: Platform.OS,
      won,
      tutorialShowing: tutorialShowing(),
      totalWins: s.totalWins,
      firstLaunchDate: s.firstLaunchDate,
      reviewPromptCount: s.reviewPromptCount,
      lastReviewPromptDate: s.lastReviewPromptDate,
      now: Date.now(),
    });
    if (!eligible) return;
    if (!(await StoreReview.isAvailableAsync())) return;
    await StoreReview.requestReview();
    useSettingsStore.getState().recordReviewPrompt(new Date().toISOString());
  } catch {
    // fail silently
  }
}
