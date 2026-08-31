import type { ResidencyProgram } from "../config/residencyPrograms";

export function filterAvailablePrograms(
  programs: readonly ResidencyProgram[],
  tusScore: number
): ResidencyProgram[] {
  return programs.filter((p) => tusScore >= p.minScore);
}
