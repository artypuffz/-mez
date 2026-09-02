import type { SeededRng } from "../rng/seededRng";
import type { BranchDefinition } from "../config/branches";
import type { ResidencyProgram } from "../config/residencyPrograms";
import type { ResourcePressureState } from "../state/types";
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

// A proportional pull toward `restingPoint`, applied on top of whatever
// pressure already moved `current` this week. Only ever pulls DOWN (both
// resources' resting points sit near the floor) — never pushes a low
// value up. See residencySimulation.ts's WeeklyResourceConfig doc comment
// for why this replaced the old threshold-gated fixed recovery.
function pullTowardResting(current: number, restingPoint: number, rate: number, floor: number): number {
  if (current <= restingPoint) return current;
  const pull = Math.max(floor, Math.round((current - restingPoint) * rate));
  return Math.max(restingPoint, current - pull);
}

// Fatigue: short-term. Rises with the week's pressure, then pulled back
// toward a low resting point every week (§2) — the pull is proportional,
// so sustained heavy pressure (many events, heavy on-call) still climbs
// toward a high equilibrium, while a genuinely light week actually drains
// down, not just "stops climbing as fast".
export function applyWeeklyFatigue(
  current: number,
  branch: BranchDefinition,
  program: ResidencyProgram,
  rng: SeededRng,
  config: WeeklyResourceConfig = DEFAULT_WEEKLY_RESOURCE_CONFIG
): number {
  const [min, max] = config.fatigueRngRange;
  const pressure = branch.weeklyBaseline.fatiguePressure + getProgramFatigueModifier(program, config) + rng.int(min, max);
  const afterPressure = clamp(current + pressure);
  return pullTowardResting(afterPressure, config.fatigueRestingPoint, config.fatiguePullRate, config.fatiguePullFloor);
}

// Stress: medium-term. Same proportional-pull shape as fatigue, but a
// slower pull rate (see DEFAULT_WEEKLY_RESOURCE_CONFIG) — it lingers
// longer at the same pressure level, matching "fatigue'dan daha yavaş
// toparlanmalı" (§2).
export function applyWeeklyStress(
  current: number,
  branch: BranchDefinition,
  program: ResidencyProgram,
  rng: SeededRng,
  config: WeeklyResourceConfig = DEFAULT_WEEKLY_RESOURCE_CONFIG
): number {
  const [min, max] = config.stressRngRange;
  const pressure = branch.weeklyBaseline.stressPressure + getProgramStressModifier(program, config) + rng.int(min, max);
  const afterPressure = clamp(current + pressure);
  return pullTowardResting(afterPressure, config.stressRestingPoint, config.stressPullRate, config.stressPullFloor);
}

// Phase 9 §3, fixed in Gameplay Expansion Part A — sustained-pressure
// streak bookkeeping that drives burnout. Called with THIS week's
// already-ticked stress/fatigue (matching the existing fatigue -> stress
// -> burnout tick order). A streak LEAKS by pressureStreakLeakPerWeek the
// moment its condition stops holding, rather than hard-resetting to 0 —
// see WeeklyResourceConfig.pressureStreakLeakPerWeek's doc comment for
// why the old reset-to-zero behavior was a real bug, root-caused via a
// live trace. Still never goes negative, still genuinely drains to 0
// given enough consecutive non-qualifying weeks — this is a leak, not a
// removal of the recovery path.
export function updateResourcePressure(
  current: ResourcePressureState,
  stress: number,
  fatigue: number,
  config: WeeklyResourceConfig = DEFAULT_WEEKLY_RESOURCE_CONFIG
): ResourcePressureState {
  const highStress = stress >= config.burnoutHighStressThreshold;
  const highFatigue = fatigue >= config.burnoutHighFatigueThreshold;
  const lowBoth = stress < config.burnoutLowStressThreshold && fatigue < config.burnoutLowFatigueThreshold;
  const leak = config.pressureStreakLeakPerWeek;

  const step = (holds: boolean, streak: number) => (holds ? streak + 1 : Math.max(0, streak - leak));

  return {
    highStressWeeks: step(highStress, current.highStressWeeks),
    highFatigueWeeks: step(highFatigue, current.highFatigueWeeks),
    combinedPressureWeeks: step(highStress && highFatigue, current.combinedPressureWeeks),
    lowPressureWeeks: step(lowBoth, current.lowPressureWeeks),
  };
}

// Burnout: long-term, deliberately sluggish in both directions, and now
// driven by the SUSTAINED-pressure streak (updateResourcePressure) rather
// than this single week's stress/fatigue in isolation — a single bad week
// no longer moves it at all (§2: "bir haftalık kötü olay burnout'u aşırı
// artırmamalı"); it takes several consecutive bad weeks to register, and
// more to register seriously (§3). Recovery is similarly streak-gated and
// slower than accrual, but real — not fully irreversible.
export function applyWeeklyBurnout(
  currentBurnout: number,
  pressure: ResourcePressureState,
  config: WeeklyResourceConfig = DEFAULT_WEEKLY_RESOURCE_CONFIG
): number {
  if (pressure.combinedPressureWeeks >= config.burnoutStreakSevereWeeks) {
    return clamp(currentBurnout + config.burnoutIncreaseSevere);
  }
  if (pressure.combinedPressureWeeks >= config.burnoutStreakModerateWeeks) {
    return clamp(currentBurnout + config.burnoutIncreaseModerate);
  }
  if (pressure.lowPressureWeeks >= config.burnoutRecoveryStreakWeeks) {
    return clamp(currentBurnout - config.burnoutDecrease);
  }
  return clamp(currentBurnout);
}
