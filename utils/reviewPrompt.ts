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

/**
 * Pure gate for everything except StoreReview.isAvailableAsync(), which is async.
 * Returns the name of the first failing gate, or null when eligible.
 */
export function reviewBlockedBy(i: ReviewEligibilityInput): string | null {
  if (i.platform !== 'android') return 'platform';
  if (!i.won) return 'not-won';
  if (i.tutorialShowing) return 'tutorial';
  if (i.totalWins < REVIEW_MIN_WINS) return 'wins';
  if (i.reviewPromptCount >= REVIEW_MAX_PROMPTS) return 'prompt-cap';

  const first = Date.parse(i.firstLaunchDate);
  if (Number.isNaN(first) || i.now - first < REVIEW_MIN_DAYS_SINCE_INSTALL * DAY_MS) return 'first-launch';

  if (i.lastReviewPromptDate) {
    const last = Date.parse(i.lastReviewPromptDate);
    if (!Number.isNaN(last) && i.now - last < REVIEW_MIN_DAYS_BETWEEN * DAY_MS) return 'cooldown';
  }
  return null;
}

export function isReviewEligible(i: ReviewEligibilityInput): boolean {
  return reviewBlockedBy(i) === null;
}

/**
 * Request the native in-app review dialog if every gate passes. Fails silently.
 * `tutorialShowing` is a getter so callers can pass a ref read at fire time —
 * this runs on a delay, so a value captured at call time would be stale.
 * The API never reports whether the user reviewed; we only record that we asked.
 */
export async function maybeRequestReview(won: boolean, tutorialShowing: () => boolean): Promise<void> {
  // Outcome is stored on-device only (shown in Settings' hidden diagnostics row); never sent anywhere.
  const record = (outcome: string) => {
    try { useSettingsStore.getState().setReviewOutcome(outcome, new Date().toISOString()); } catch { /* ignore */ }
  };
  try {
    const s = useSettingsStore.getState();
    const blocked = reviewBlockedBy({
      platform: Platform.OS,
      won,
      tutorialShowing: tutorialShowing(),
      totalWins: s.totalWins,
      firstLaunchDate: s.firstLaunchDate,
      reviewPromptCount: s.reviewPromptCount,
      lastReviewPromptDate: s.lastReviewPromptDate,
      now: Date.now(),
    });
    if (blocked) { record(`blocked:${blocked}`); return; }
    if (!(await StoreReview.isAvailableAsync())) { record('unavailable'); return; }
    await StoreReview.requestReview();
    useSettingsStore.getState().recordReviewPrompt(new Date().toISOString());
    record('requested');
  } catch (e) {
    record(`error:${(e instanceof Error ? e.message : String(e)).slice(0, 80)}`);
  }
}

export const REVIEW_DELAY_MS = 1500;

/**
 * Schedule the review request after a win's end-game celebration is dismissed.
 * `scheduledRef` is the caller's per-win flag: the first call for a win sets it and
 * schedules; later calls for the same win (e.g. a tap landing just before the 5s
 * auto-dismiss fires, so dismiss runs twice) are ignored. The caller resets it
 * to false when a new game starts. Returns the timer id, or null if nothing was scheduled.
 */
export function scheduleReviewAfterWin(
  status: 'playing' | 'won' | 'lost',
  tutorialShowing: () => boolean,
  scheduledRef: { current: boolean },
  delayMs: number = REVIEW_DELAY_MS,
): ReturnType<typeof setTimeout> | null {
  if (status !== 'won' || scheduledRef.current) return null;
  scheduledRef.current = true;
  return setTimeout(() => { void maybeRequestReview(true, tutorialShowing); }, delayMs);
}
