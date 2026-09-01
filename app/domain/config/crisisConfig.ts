import type { CrisisType } from "../events/types";

// Phase 9 §10/§12 — thresholds decide ELIGIBILITY (a crisis of this type
// can be rolled for at all this week); probability then decides whether
// it actually fires, scaling with how far past the threshold the driving
// signal is. Being at burnout=90 every week does not mean the same crisis
// every week (§10) — eligibility recurring is not the same as firing.
export interface CrisisTypeConfig {
  // Global (across all crisis types) priority order — lower fires first
  // when more than one type is eligible+rolled the same week (§12).
  priorityRank: number;
  baseProbability: number;
  // probability = min(maxProbability, baseProbability + extraPerPoint *
  // (drivingValue - threshold)), only once drivingValue >= threshold.
  extraProbabilityPerPoint: number;
  maxProbability: number;
}

export const CRISIS_TYPE_CONFIG: Record<CrisisType, CrisisTypeConfig> = {
  // §13 — short-term, fatigue-driven, highest priority: an acutely
  // exhausted week reads as more urgent than a slow-burn burnout crisis.
  exhaustion: { priorityRank: 1, baseProbability: 0.12, extraProbabilityPerPoint: 0.02, maxProbability: 0.55 },
  // §14 — long-term, sustained-pressure-driven.
  burnout: { priorityRank: 2, baseProbability: 0.10, extraProbabilityPerPoint: 0.02, maxProbability: 0.5 },
  // §19 — driven by financialPressure, not a resource meter.
  financial: { priorityRank: 3, baseProbability: 0.15, extraProbabilityPerPoint: 0.03, maxProbability: 0.6 },
  // §22 — driven entirely by content requirements (behaviorStats/flags
  // from mobbing/hierarchy chains); no numeric "driving value" exists at
  // the engine level, so its own probability is flat once eligible.
  career: { priorityRank: 4, baseProbability: 0.2, extraProbabilityPerPoint: 0, maxProbability: 0.2 },
};

export const CRISIS_ENGINE_CONFIG = {
  // §9/§13 — an acutely exhausted week.
  exhaustionFatigueThreshold: 76,
  // §14 — burnout crisis eligibility: either burnout itself is already
  // high, or sustained pressure has been building for a while even if
  // burnout (which lags) hasn't caught all the way up yet.
  burnoutThreshold: 70,
  burnoutCombinedPressureWeeksThreshold: 6,
  // §19/§20 — financial crisis eligibility.
  financialMoneyThreshold: -5000,
  financialConsecutiveNegativeMonthsThreshold: 2,

  // §30 — global cooldown across every crisis type/id, on top of each
  // crisis EventDefinition's own once/cooldownWeeks.
  globalCrisisCooldownWeeks: 3,
};
