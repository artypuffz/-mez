import type { ResidencyProgram } from "../config/residencyPrograms";

// Phase 11 — a program with no minScore has no known official TUS score
// gate (see ResidencyProgram.minScore's doc comment: most real ÖSYM
// programs this phase have no verified taban puanı data). Treating that
// as "score requirement not met" would make every real program entirely
// unreachable regardless of score, which defeats the point of adding
// them; treating it as "no gate, always available" is the honest reading
// of "we don't have this data" rather than a fabricated pass/fail.
export function filterAvailablePrograms(
  programs: readonly ResidencyProgram[],
  tusScore: number
): ResidencyProgram[] {
  return programs.filter((p) => p.minScore === undefined || tusScore >= p.minScore);
}
