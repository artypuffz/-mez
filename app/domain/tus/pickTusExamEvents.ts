import type { SeededRng } from "../rng/seededRng";
import type { TusExamEventDefinition } from "../config/tusExamEvents";

// Picks `count` events from the pool without replacement, order = draw
// order. Deterministic for a given rng, so the same seed always produces
// the same subset+order for a given playthrough.
export function pickTusExamEvents(
  pool: readonly TusExamEventDefinition[],
  count: number,
  rng: SeededRng
): TusExamEventDefinition[] {
  const remaining = pool.map((_, i) => i);
  const picked: number[] = [];
  const n = Math.min(count, remaining.length);

  for (let i = 0; i < n; i++) {
    const drawIndex = rng.int(0, remaining.length - 1);
    picked.push(remaining[drawIndex]);
    remaining.splice(drawIndex, 1);
  }

  return picked.map((i) => pool[i]);
}
