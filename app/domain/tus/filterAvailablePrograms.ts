import type { ResidencyProgram } from "../config/residencyPrograms";
import { resolveEntryThreshold } from "./resolveEntryThreshold";

// Android Device QA Hotfix 1, Issue 2 — the score gate now ALWAYS applies
// for every production (real) program: deriveGameplayEntryThreshold
// (domain/config/residencyPrograms.ts) sets gameplayEntryThreshold for
// every single real program, so resolveEntryThreshold never returns
// undefined for one. A program can only fall through to "no known
// threshold, always available" if BOTH minScore and gameplayEntryThreshold
// are genuinely absent — which no longer happens for any program actually
// reachable through new-game discovery (PRODUCTION_PROGRAMS); it's kept
// as a defensive fallback, not the common case, so a future program type
// that genuinely has no threshold data still fails safe (available) rather
// than crashing or becoming permanently unreachable.
export function filterAvailablePrograms(
  programs: readonly ResidencyProgram[],
  tusScore: number
): ResidencyProgram[] {
  return programs.filter((p) => {
    const threshold = resolveEntryThreshold(p);
    return threshold === undefined || tusScore >= threshold;
  });
}
