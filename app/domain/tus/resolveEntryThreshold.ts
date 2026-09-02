import type { ResidencyProgram } from "../config/residencyPrograms";

// Android Device QA Hotfix 1, Issue 2/3 — the ONE place a program's TUS
// entry threshold is read, regardless of whether it's a legacy fictional
// program (`minScore`, hand-authored gameplay balance numbers from Phase
// 3) or a real production program (`gameplayEntryThreshold`, derived by
// deriveGameplayEntryThreshold — see domain/config/residencyPrograms.ts).
// Every consumer (filterAvailablePrograms, sortPrograms,
// validateProgramDataset, the TUS preference UI) goes through this
// function instead of reading either field directly, so there is exactly
// one authoritative notion of "this program's required score" — no
// second code path can bypass it.
//
// Neither field is ever an official ÖSYM taban puanı — see
// docs/program-data-sources.md. Both are gameplay numbers; this function
// makes no distinction between them because the UI/domain layer doesn't
// need one (see resolveEntryThresholdLabel in the same concern for the
// one place the DISTINCTION in wording matters).
export function resolveEntryThreshold(program: ResidencyProgram): number | undefined {
  return program.minScore ?? program.gameplayEntryThreshold;
}
