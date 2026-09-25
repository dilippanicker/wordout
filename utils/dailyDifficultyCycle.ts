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

// Steps the active difficulty within the accessible list, always wrapping around — forward
// from the last entry goes back to the first, backward from the first goes to the last.
// Never blocks: even past a loss, there's somewhere to land (the caller decides whether to
// delay that landing — see isDailyDeadEndStep below).
export function stepDailyDifficulty(
  games: Record<Difficulty, DailyGameState>,
  currDiff: Difficulty,
  direction: 1 | -1,
): Difficulty {
  const accessible = accessibleDailyDifficulties(games);
  const currIdx = accessible.indexOf(currDiff);
  return accessible[(currIdx + direction + accessible.length) % accessible.length];
}

// True when stepping forward from currDiff would wrap past a loss on the last accessible
// difficulty — i.e. you just tried to unlock the next one and can't. Checked by position in
// the list, not by list length — losing Hard after winning Easy hits this exactly the same
// way losing Easy on its own does (accessible = [easy, hard] either way, just longer).
// Backward never hits this — moving back into already-accessible difficulties is always a
// normal step, never a "trying to unlock more" attempt.
export function isDailyDeadEndStep(
  games: Record<Difficulty, DailyGameState>,
  currDiff: Difficulty,
  direction: 1 | -1,
): boolean {
  if (direction !== 1) return false;
  const accessible = accessibleDailyDifficulties(games);
  const currIdx = accessible.indexOf(currDiff);
  if (currIdx !== accessible.length - 1) return false;
  const last = games[accessible[accessible.length - 1]];
  return last.status === 'completed' && !last.solved;
}
