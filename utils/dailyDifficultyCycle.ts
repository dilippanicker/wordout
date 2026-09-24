import { Difficulty } from '@/store/settingsStore';
import { DailyGameState } from '@/store/dailyStore';

export const DIFFICULTY_CYCLE: Difficulty[] = ['easy', 'hard', 'extreme'];

// Build accessible list: include a difficulty if it's played (playing/completed)
// OR if the previous difficulty was won — that unlocks the next slot.
export function accessibleDailyDifficulties(games: Record<Difficulty, DailyGameState>): Difficulty[] {
  const accessible: Difficulty[] = [];
  let prevWon = true; // Easy is always the starting point
  for (const d of DIFFICULTY_CYCLE) {
    if (games[d].status === 'playing' || games[d].status === 'completed' || prevWon) {
      accessible.push(d);
    } else {
      break;
    }
    prevWon = games[d].status === 'completed' && games[d].solved;
  }
  return accessible;
}

// Steps the active difficulty within the accessible list, wrapping in either direction.
// Returns null for the forward dead end: you're on the last accessible difficulty and it
// was lost, so there's nothing further to unlock. Checked by position in the list, not by
// list length — losing Hard after winning Easy hits this exactly the same way losing Easy
// on its own does (accessible = [easy, hard] either way, just longer). Backward never hits
// this — moving back into already-accessible difficulties is always a normal step, never a
// "trying to unlock more" attempt — so it's just a no-op when there's nowhere else to go.
export function stepDailyDifficulty(
  games: Record<Difficulty, DailyGameState>,
  currDiff: Difficulty,
  direction: 1 | -1,
): Difficulty | null {
  const accessible = accessibleDailyDifficulties(games);
  const currIdx = accessible.indexOf(currDiff);
  if (direction === 1 && currIdx === accessible.length - 1) {
    const last = games[accessible[accessible.length - 1]];
    if (last.status === 'completed' && !last.solved) return null;
  }
  return accessible[(currIdx + direction + accessible.length) % accessible.length];
}
