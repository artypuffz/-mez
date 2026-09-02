import type { ResidencyProgram } from "../config/residencyPrograms";
import { getBranchDefinition, getBranchOverallDifficulty } from "../config/branches";
import { getCityDefinition } from "../config/cities";

export type ProgramSortKey = "score" | "difficulty" | "city";

// Phase 11 §26 — score/difficulty/city sorting for a preference list that
// can now hold hundreds of programs. A program with no minScore (see
// residencyPrograms.ts) sorts AFTER every scored program when sorting by
// score, rather than before/undefined-first — "no known score gate" reads
// naturally as "not ranked by score", not as "score 0".
export function sortPrograms(programs: readonly ResidencyProgram[], sortKey: ProgramSortKey): ResidencyProgram[] {
  const copy = [...programs];
  switch (sortKey) {
    case "score":
      return copy.sort((a, b) => {
        if (a.minScore === undefined && b.minScore === undefined) return 0;
        if (a.minScore === undefined) return 1;
        if (b.minScore === undefined) return -1;
        return a.minScore - b.minScore;
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
