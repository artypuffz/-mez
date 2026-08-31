export interface WeeklyResourceConfig {
  fatigueRngRange: [number, number];
  stressRngRange: [number, number];

  fatigueRecoveryThreshold: number;
  fatigueRecoveryAmount: number;

  stressRecoveryThreshold: number;
  stressRecoveryAmount: number;

  burnoutStressThreshold: number;
  burnoutFatigueThreshold: number;
  burnoutIncrease: number;

  burnoutLowThreshold: number;
  burnoutDecrease: number;

  // hiddenProfile fields are 0-100; divide down to a small weekly nudge.
  // mobbingRisk is deliberately not read here — it's an event-weighting
  // parameter for Phase 5+, not a passive resource driver.
  programPressureDivisor: number;
}

// Not final balancing — see the Phase 4 report's lightweight simulation
// numbers for what this actually produces over a full residency.
//
// The recovery threshold/amount pairs matter more than they look: with
// weekly pressure in the 4-8 range (branch baseline + program modifier),
// a recovery amount smaller than that pressure never actually corrects
// anything — it only slows the climb to the 100 ceiling, where a
// no-event baseline then sits permanently maxed out. These values are
// picked so recovery is close to (or above) typical pressure once
// triggered, giving each branch a soft equilibrium band instead of a
// guaranteed march to the ceiling within the first year.
export const DEFAULT_WEEKLY_RESOURCE_CONFIG: WeeklyResourceConfig = {
  fatigueRngRange: [-1, 1],
  stressRngRange: [-1, 1],

  fatigueRecoveryThreshold: 50,
  fatigueRecoveryAmount: 8,

  stressRecoveryThreshold: 55,
  stressRecoveryAmount: 7,

  burnoutStressThreshold: 60,
  burnoutFatigueThreshold: 60,
  burnoutIncrease: 1,

  burnoutLowThreshold: 30,
  burnoutDecrease: 1,

  programPressureDivisor: 25,
};
