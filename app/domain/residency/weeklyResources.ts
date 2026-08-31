import type { SeededRng } from "../rng/seededRng";
import type { BranchDefinition } from "../config/branches";
import type { ResidencyProgram } from "../config/residencyPrograms";
import {
  DEFAULT_WEEKLY_RESOURCE_CONFIG,
  type WeeklyResourceConfig,
} from "../config/residencySimulation";

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function getProgramFatigueModifier(
  program: ResidencyProgram,
  config: WeeklyResourceConfig = DEFAULT_WEEKLY_RESOURCE_CONFIG
): number {
  return Math.round(program.hiddenProfile.burnoutPressure / config.programPressureDivisor);
}

export function getProgramStressModifier(
  program: ResidencyProgram,
  config: WeeklyResourceConfig = DEFAULT_WEEKLY_RESOURCE_CONFIG
): number {
  return Math.round(program.hiddenProfile.staffingPressure / config.programPressureDivisor);
}

// Fatigue: short-term. Baseline pressure most weeks, with a partial
// self-correction once it's already fairly high — there's no rest/duty
// system yet to drive recovery explicitly, so this stands in for it.
export function applyWeeklyFatigue(
  current: number,
  branch: BranchDefinition,
  program: ResidencyProgram,
  rng: SeededRng,
  config: WeeklyResourceConfig = DEFAULT_WEEKLY_RESOURCE_CONFIG
): number {
  const [min, max] = config.fatigueRngRange;
  let delta = branch.weeklyBaseline.fatiguePressure + getProgramFatigueModifier(program, config) + rng.int(min, max);
  if (current >= config.fatigueRecoveryThreshold) {
    delta -= config.fatigueRecoveryAmount;
  }
  return clamp(current + delta);
}

// Stress: medium-term. Rises and falls slower than fatigue — its
// recovery threshold/amount are both smaller, so it lingers longer.
export function applyWeeklyStress(
  current: number,
  branch: BranchDefinition,
  program: ResidencyProgram,
  rng: SeededRng,
  config: WeeklyResourceConfig = DEFAULT_WEEKLY_RESOURCE_CONFIG
): number {
  const [min, max] = config.stressRngRange;
  let delta = branch.weeklyBaseline.stressPressure + getProgramStressModifier(program, config) + rng.int(min, max);
  if (current >= config.stressRecoveryThreshold) {
    delta -= config.stressRecoveryAmount;
  }
  return clamp(current + delta);
}

export interface ApplyWeeklyBurnoutInput {
  // These are THIS week's already-ticked fatigue/stress, not last week's
  // — see advanceResidencyWeek's tick order (fatigue -> stress -> burnout).
  stress: number;
  fatigue: number;
  currentBurnout: number;
}

// Burnout: long-term, deliberately sluggish in both directions. Only
// moves when stress AND fatigue are simultaneously past their threshold
// (feeds it) or simultaneously comfortably low (the only recovery this
// phase has — no vacation/leave events exist yet to drive it faster).
export function applyWeeklyBurnout(
  { stress, fatigue, currentBurnout }: ApplyWeeklyBurnoutInput,
  config: WeeklyResourceConfig = DEFAULT_WEEKLY_RESOURCE_CONFIG
): number {
  if (stress > config.burnoutStressThreshold && fatigue > config.burnoutFatigueThreshold) {
    return clamp(currentBurnout + config.burnoutIncrease);
  }
  if (stress < config.burnoutLowThreshold && fatigue < config.burnoutLowThreshold) {
    return clamp(currentBurnout - config.burnoutDecrease);
  }
  return clamp(currentBurnout);
}
