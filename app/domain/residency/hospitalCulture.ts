import { createScopedRng } from "../rng/seededRng";
import type { ResidencyProgram } from "../config/residencyPrograms";
import { getBranchDefinition } from "../config/branches";

// Phase 11 §11/§12 — the procedural hospital culture modifier. Seeded and
// deterministic per (gameSeed, programId): the same save re-selecting the
// same program always gets the same modifier (§35 test requirement); a
// different seed/career can land a different one for the exact same real
// institution+branch. This is the ONLY mechanism through which a real
// hospital's identity influences hierarchy pressure beyond the branch
// baseline — never a fixed per-institution number (§10).
const PROCEDURAL_CULTURE_RANGE: [number, number] = [-0.7, 0.7];
const FINAL_HIERARCHY_CLAMP: [number, number] = [0.5, 5.0];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function deriveProceduralCultureModifier(gameSeed: string, programId: string): number {
  const rng = createScopedRng(gameSeed, `hospital-culture:${programId}`);
  const [min, max] = PROCEDURAL_CULTURE_RANGE;
  const raw = min + rng.next() * (max - min);
  return Math.round(raw * 100) / 100;
}

// finalHierarchyPressure = branchHierarchyBaseline + proceduralCultureModifier,
// clamped 0.5-5.0 (§11).
export function computeFinalHierarchyPressure(branchHierarchyBaseline: number, culturalModifier: number): number {
  const [min, max] = FINAL_HIERARCHY_CLAMP;
  return clamp(branchHierarchyBaseline + culturalModifier, min, max);
}

// The single entry point every call site (NPC generation fallback, the
// event-weight modifier, the post-selection UI number) should use — one
// formula, computed the same way everywhere.
export function resolveFinalHierarchyPressure(gameSeed: string, program: ResidencyProgram): number {
  const branch = getBranchDefinition(program.branchId);
  const modifier = deriveProceduralCultureModifier(gameSeed, program.id);
  return computeFinalHierarchyPressure(branch.difficultyBaseline.hierarchyPressure, modifier);
}

// Phase 6's cultureBias() (domain/npc/generation.ts) still speaks the
// original Phase 3 0-100 "mobbingRisk" scale — this maps the NEW 0.5-5.0
// hierarchy-pressure scale onto that same 0-100 range so the existing,
// untouched cultureBias()/generatePersonality() pipeline can keep working
// unchanged for both fictional (static mobbingRisk) and real (procedural)
// programs alike.
export function hierarchyPressureToMobbingRiskEquivalent(hierarchyPressure: number): number {
  const [min, max] = FINAL_HIERARCHY_CLAMP;
  return Math.round(((hierarchyPressure - min) / (max - min)) * 100);
}
