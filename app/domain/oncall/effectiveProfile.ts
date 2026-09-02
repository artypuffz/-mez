import { deriveOnCallProfile, type BranchDefinition, type BranchOnCallProfile } from "../config/branches";
import type { ResidencyProgram } from "../config/residencyPrograms";

// Phase 11 §14/§22 — the real integration point: onCallLoad reaches the
// EXISTING generateOnCallSchedule/BranchOnCallProfile machinery unchanged
// (reuse, not replace). A program's own difficultyModifier.onCallLoad
// (almost always 0 this phase, see residencyPrograms.ts) nudges the
// EFFECTIVE onCallLoad axis before re-running the exact same
// deriveOnCallProfile formula every new branch's static profile already
// uses — branch identity stays dominant (§22), and the global 2-12
// GLOBAL_SHIFT_BOUNDS safety net (already inside deriveOnCallProfile /
// generateOnCallSchedule) still applies either way.
export function resolveEffectiveOnCallProfile(branch: BranchDefinition, program: ResidencyProgram): BranchOnCallProfile {
  const modifier = program.difficultyModifier?.onCallLoad ?? 0;
  if (modifier === 0) return branch.onCallProfile;
  const effectiveOnCallLoad = Math.min(5, Math.max(1, branch.difficultyBaseline.onCallLoad + modifier));
  return deriveOnCallProfile(effectiveOnCallLoad);
}
