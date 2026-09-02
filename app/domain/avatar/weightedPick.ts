import type { SeededRng } from "../rng/seededRng";

export interface WeightedOption<T> {
  id: T;
  weight: number;
}

// Shared by every gender-aware/seniority-aware avatar draw (see
// genderAwareGeneration.ts and npcAvatar.ts's hairColorWeights) — a plain
// weighted-random pick over a deterministic rng, so "trend, not guarantee"
// weighting logic is written once.
export function weightedPick<T>(rng: SeededRng, weighted: WeightedOption<T>[]): T {
  const total = weighted.reduce((sum, w) => sum + w.weight, 0);
  let roll = rng.next() * total;
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) return entry.id;
  }
  return weighted[weighted.length - 1].id;
}
