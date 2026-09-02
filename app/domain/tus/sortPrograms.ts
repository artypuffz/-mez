import type { ResidencyProgram } from "../config/residencyPrograms";
import { getBranchDefinition, getBranchOverallDifficulty } from "../config/branches";
import { getCityDefinition } from "../config/cities";
import { resolveEntryThreshold } from "./resolveEntryThreshold";

export type ProgramSortKey = "score" | "difficulty" | "city";

// Phase 11 §26, updated by Android Device QA Hotfix 1 Issue 2 —
// score/difficulty/city sorting for a preference list that can now hold
// hundreds of programs. Reads through resolveEntryThreshold (minScore OR
// gameplayEntryThreshold) rather than minScore alone, so real programs
// sort by their actual gate too. A program with no known threshold at all
// sorts AFTER every thresholded program when sorting by score, rather
// than before/undefined-first — "no known score gate" reads naturally as
// "not ranked by score", not as "score 0".
export function sortPrograms(programs: readonly ResidencyProgram[], sortKey: ProgramSortKey): ResidencyProgram[] {
  const copy = [...programs];
  switch (sortKey) {
    case "score":
      return copy.sort((a, b) => {
        const scoreA = resolveEntryThreshold(a);
        const scoreB = resolveEntryThreshold(b);
        if (scoreA === undefined && scoreB === undefined) return 0;
        if (scoreA === undefined) return 1;
        if (scoreB === undefined) return -1;
        return scoreA - scoreB;
      });
    case "difficulty":
      return copy.sort(
        (a, b) => getBranchOverallDifficulty(getBranchDefinition(a.branchId)) - getBranchOverallDifficulty(getBranchDefinition(b.branchId))
      );
    case "city":
      return copy.sort((a, b) => getCityDefinition(a.cityId).name.localeCompare(getCityDefinition(b.cityId).name, "tr"));
    default:
      return copy;
  }
}

export function filterPrograms(
  programs: readonly ResidencyProgram[],
  filters: { cityId?: string; branchId?: string }
): ResidencyProgram[] {
  return programs.filter(
    (p) => (!filters.cityId || p.cityId === filters.cityId) && (!filters.branchId || p.branchId === filters.branchId)
  );
}
