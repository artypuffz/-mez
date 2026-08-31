import type { SeniorityStage } from "../state/types";

export interface SeniorityBoundaries {
  comezEndRatio: number;
  ortaEndRatio: number;
}

// ~30% cömez, ~40% orta, ~30% kıdemli, normalized to the branch's own
// total residency length (not an absolute week count) — see
// getSeniorityStage for why the same week number can mean different
// stages for a 4-year vs a 5-year branch.
export const DEFAULT_SENIORITY_BOUNDARIES: SeniorityBoundaries = {
  comezEndRatio: 0.3,
  ortaEndRatio: 0.7,
};

export function getSeniorityStage(
  residencyWeek: number,
  totalResidencyWeeks: number,
  boundaries: SeniorityBoundaries = DEFAULT_SENIORITY_BOUNDARIES
): SeniorityStage {
  if (residencyWeek <= 0 || totalResidencyWeeks <= 0) return "comez";
  const ratio = residencyWeek / totalResidencyWeeks;
  if (ratio <= boundaries.comezEndRatio) return "comez";
  if (ratio <= boundaries.ortaEndRatio) return "orta";
  return "kidemli";
}
