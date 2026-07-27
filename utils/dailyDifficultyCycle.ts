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
// Returns null for the single-entry dead end (only one difficulty accessible and it was
// lost) — the caller decides whether that's worth surfacing (e.g. only on a forward step).
export function stepDailyDifficulty(
  games: Record<Difficulty, DailyGameState>,
  currDiff: Difficulty,
  direction: 1 | -1,
): Difficulty | null {
  const accessible = accessibleDailyDifficulties(games);
  if (accessible.length === 1 && games[accessible[0]].status === 'completed' && !games[accessible[0]].solved) {
    return null;
  }
  const currIdx = accessible.indexOf(currDiff);
  return accessible[(currIdx + direction + accessible.length) % accessible.length];
}
