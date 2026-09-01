import type { SeededRng } from "../rng/seededRng";
import type { RequirementContext } from "../events/requirements";
import { isEventEligible } from "../events/choices";
import { isOnCooldown } from "../events/cooldown";
import type { EventRepository } from "../events/repository";
import type { CrisisType, EventDefinition } from "../events/types";
import { CRISIS_ENGINE_CONFIG, CRISIS_TYPE_CONFIG, type CrisisTypeConfig } from "../config/crisisConfig";

export interface CrisisSelectionTrace {
  globalCooldownActive: boolean;
  eligibleTypes: CrisisType[];
  rolledType?: CrisisType;
  rolledProbability?: number;
  selectedId?: string;
}

export interface CrisisSelectionResult {
  event: EventDefinition | null;
  trace: CrisisSelectionTrace;
}

// §12 — global priority order across types; a type's own eligibility+roll
// only matters if every higher-priority type was either ineligible this
// week or ineligible content-wise (no un-cooled-down, requirement-passing
// crisis event of that type actually exists).
const PRIORITY_ORDER: CrisisType[] = ["exhaustion", "burnout", "financial", "career"];

function eligibleTypesAndDrivingValue(ctx: RequirementContext): Partial<Record<CrisisType, number>> {
  const result: Partial<Record<CrisisType, number>> = {};
  const cfg = CRISIS_ENGINE_CONFIG;

  if (ctx.resources.fatigue >= cfg.exhaustionFatigueThreshold) {
    result.exhaustion = ctx.resources.fatigue;
  }
  if (
    ctx.resources.burnout >= cfg.burnoutThreshold ||
    ctx.resourcePressure.combinedPressureWeeks >= cfg.burnoutCombinedPressureWeeksThreshold
  ) {
    result.burnout = Math.max(ctx.resources.burnout, cfg.burnoutThreshold + ctx.resourcePressure.combinedPressureWeeks);
  }
  if (
    ctx.resources.money < cfg.financialMoneyThreshold &&
    ctx.financialPressure.consecutiveNegativeMonths >= cfg.financialConsecutiveNegativeMonthsThreshold
  ) {
    result.financial = -ctx.resources.money;
  }
  // career has no numeric driving signal at the engine level — eligibility
  // is entirely content-requirement-driven (§22); mark it as "always a
  // candidate" here, the actual EventDefinition requirements decide.
  result.career = 0;

  return result;
}

function rollProbability(config: CrisisTypeConfig, drivingValue: number, threshold: number): number {
  if (config.extraProbabilityPerPoint === 0) return config.baseProbability;
  const over = Math.max(0, drivingValue - threshold);
  return Math.min(config.maxProbability, config.baseProbability + config.extraProbabilityPerPoint * over);
}

const TYPE_THRESHOLD: Record<CrisisType, number> = {
  exhaustion: CRISIS_ENGINE_CONFIG.exhaustionFatigueThreshold,
  burnout: CRISIS_ENGINE_CONFIG.burnoutThreshold,
  financial: -CRISIS_ENGINE_CONFIG.financialMoneyThreshold,
  career: 0,
};

// Picks AT MOST one crisis event for the week, entirely separate from
// selectPoolEvents's weighted draw (§11). Priority order + a global
// cooldown (§30) keep this from ever piling more than one major crisis
// onto a single week, or immediately re-firing the week after one
// resolves.
export function selectCrisisEvent(
  repository: EventRepository,
  ctx: RequirementContext,
  currentWeek: number,
  lastCrisisWeek: number | null,
  cooldowns: Record<string, number>,
  eventHistory: { eventId: string }[],
  rng: SeededRng
): CrisisSelectionResult {
  const globalCooldownActive =
    lastCrisisWeek !== null && currentWeek - lastCrisisWeek < CRISIS_ENGINE_CONFIG.globalCrisisCooldownWeeks;

  const eligible = eligibleTypesAndDrivingValue(ctx);
  const eligibleTypes = PRIORITY_ORDER.filter((t) => eligible[t] !== undefined);

  const trace: CrisisSelectionTrace = { globalCooldownActive, eligibleTypes };

  if (globalCooldownActive) return { event: null, trace };

  const pool = repository.getCrisisEvents();

  for (const type of PRIORITY_ORDER) {
    const drivingValue = eligible[type];
    if (drivingValue === undefined) continue;

    const candidates = pool.filter((e) => e.crisisType === type);
    const usable = candidates.filter(
      (e) => !isOnCooldown(e, currentWeek, cooldowns) && isEventEligible(e, ctx, eventHistory)
    );
    if (usable.length === 0) continue;

    const probability = rollProbability(CRISIS_TYPE_CONFIG[type], drivingValue, TYPE_THRESHOLD[type]);
    const roll = rng.next();
    if (roll >= probability) continue;

    trace.rolledType = type;
    trace.rolledProbability = probability;

    // Deterministic pick among usable candidates of this type — weighted
    // by the same `weight` field pool events use, so multi-event crisis
    // types (e.g. several distinct financial-crisis openers) aren't
    // always the same one.
    const total = usable.reduce((sum, e) => sum + Math.max(0.0001, e.weight ?? 1), 0);
    let roll2 = rng.next() * total;
    let chosen = usable[usable.length - 1];
    for (const candidate of usable) {
      roll2 -= Math.max(0.0001, candidate.weight ?? 1);
      if (roll2 <= 0) {
        chosen = candidate;
        break;
      }
    }

    trace.selectedId = chosen.id;
    return { event: chosen, trace };
  }

  return { event: null, trace };
}
