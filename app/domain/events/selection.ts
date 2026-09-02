import type { SeededRng } from "../rng/seededRng";
import type { RequirementContext } from "./requirements";
import { isEventEligible } from "./choices";
import { isOnCooldown } from "./cooldown";
import type { EventRepository } from "./repository";
import type { EventDefinition } from "./types";
import {
  DEFAULT_POOL_SELECTION_CONFIG,
  hierarchyWeightMultiplier,
  type PoolSelectionConfig,
} from "../config/eventSelection";

export interface PoolSelectionTrace {
  poolSize: number;
  eligibleIds: string[];
  cooldownRejectedIds: string[];
  requirementsRejectedIds: string[];
  budget: number;
  rareRolled: boolean;
  rareSelectedId?: string;
  quietWeekRolled: boolean;
  selectedIds: string[];
}

export interface PoolSelectionResult {
  selectedEvents: EventDefinition[];
  trace: PoolSelectionTrace;
}

function weightedSampleWithoutReplacement(
  items: EventDefinition[],
  count: number,
  rng: SeededRng,
  hierarchyPressure?: number
): EventDefinition[] {
  const pool = items.map((event) => ({
    event,
    weight: Math.max(0.0001, (event.weight ?? 1) * hierarchyWeightMultiplier(hierarchyPressure, event.category)),
  }));
  const picked: EventDefinition[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const total = pool.reduce((sum, p) => sum + p.weight, 0);
    let roll = rng.next() * total;
    let index = 0;
    for (; index < pool.length; index++) {
      roll -= pool[index].weight;
      if (roll <= 0) break;
    }
    index = Math.min(index, pool.length - 1);
    picked.push(pool[index].event);
    pool.splice(index, 1);
  }
  return picked;
}

// Only triggerMode:"pool" events ever reach this — repository.getPoolEvents()
// already excludes "scheduled" ones (§4.1). Eligibility = requirements pass
// AND not on cooldown AND at least one visible choice (§6, via isEventEligible).
export function selectPoolEvents(
  repository: EventRepository,
  ctx: RequirementContext,
  currentWeek: number,
  cooldowns: Record<string, number>,
  budget: number,
  rng: SeededRng,
  config: PoolSelectionConfig = DEFAULT_POOL_SELECTION_CONFIG,
  eventHistory: { eventId: string }[] = []
): PoolSelectionResult {
  const pool = repository.getPoolEvents();
  const cooldownRejectedIds: string[] = [];
  const requirementsRejectedIds: string[] = [];
  const eligible: EventDefinition[] = [];

  for (const event of pool) {
    if (isOnCooldown(event, currentWeek, cooldowns)) {
      cooldownRejectedIds.push(event.id);
      continue;
    }
    if (!isEventEligible(event, ctx, eventHistory)) {
      requirementsRejectedIds.push(event.id);
      continue;
    }
    eligible.push(event);
  }

  const trace: PoolSelectionTrace = {
    poolSize: pool.length,
    eligibleIds: eligible.map((e) => e.id),
    cooldownRejectedIds,
    requirementsRejectedIds,
    budget,
    rareRolled: false,
    quietWeekRolled: false,
    selectedIds: [],
  };

  if (budget <= 0) return { selectedEvents: [], trace };

  let remainingBudget = budget;
  const selected: EventDefinition[] = [];

  // Rare check is independent of the quiet-week roll and of normal
  // weighting — a rare event "boğulmasın" (§29) even in an otherwise
  // quiet week.
  const rareCandidates = eligible.filter((e) => e.category === "RARE");
  trace.rareRolled = rng.next() < config.rareChancePerWeek;
  if (trace.rareRolled && rareCandidates.length > 0 && remainingBudget > 0) {
    const [rare] = weightedSampleWithoutReplacement(rareCandidates, 1, rng, ctx.career.hierarchyPressure);
    selected.push(rare);
    trace.rareSelectedId = rare.id;
    remainingBudget -= 1;
  }

  trace.quietWeekRolled = rng.next() < config.quietWeekProbability;
  if (!trace.quietWeekRolled && remainingBudget > 0) {
    const normalCandidates = eligible.filter((e) => e.id !== trace.rareSelectedId && e.category !== "RARE");
    const min = Math.min(config.minEventsPerWeek, remainingBudget);
    const count = min >= remainingBudget ? remainingBudget : rng.int(min, remainingBudget);
    selected.push(...weightedSampleWithoutReplacement(normalCandidates, count, rng, ctx.career.hierarchyPressure));
  }

  trace.selectedIds = selected.map((e) => e.id);
  return { selectedEvents: selected, trace };
}
