import type { EventCategory } from "../events/types";

export interface PoolSelectionConfig {
  minEventsPerWeek: number;
  maxEventsPerWeek: number;
  quietWeekProbability: number;
  rareChancePerWeek: number;
}

// Deliberately conservative while the content pool is small (35 example
// events) — see the headless simulation in the Phase 5 report for what
// this actually produces. Real balancing is Phase 8/10.
export const DEFAULT_POOL_SELECTION_CONFIG: PoolSelectionConfig = {
  minEventsPerWeek: 0,
  maxEventsPerWeek: 4,
  quietWeekProbability: 0.35,
  rareChancePerWeek: 0.01,
};

// Phase 11 §20/§21 — a small, GENERIC weight modifier on top of every
// event's own static `weight` (never bypassing requirements/cooldown/once
// — see selectPoolEvents), applied only to categories the spec explicitly
// names as hierarchy-sensitive. hierarchy 1 -> ~0.7x, 3 -> ~1.0x, 5 ->
// ~1.4x, piecewise-linear through those three anchor points (tuned via
// the 500-seed simulation, see the Phase 11 report — never a mechanical
// guarantee like "hierarchy 5 = mobbing every week").
export interface HierarchyWeightConfig {
  sensitiveCategories: EventCategory[];
  atHierarchy1: number;
  atHierarchy3: number;
  atHierarchy5: number;
}

export const DEFAULT_HIERARCHY_WEIGHT_CONFIG: HierarchyWeightConfig = {
  sensitiveCategories: ["MOBBING", "NPC", "CAREER"],
  atHierarchy1: 0.7,
  atHierarchy3: 1.0,
  atHierarchy5: 1.4,
};

export function hierarchyWeightMultiplier(
  hierarchyPressure: number | undefined,
  category: EventCategory,
  config: HierarchyWeightConfig = DEFAULT_HIERARCHY_WEIGHT_CONFIG
): number {
  if (hierarchyPressure === undefined || !config.sensitiveCategories.includes(category)) return 1;
  const clamped = Math.min(5, Math.max(1, hierarchyPressure));
  if (clamped <= 3) {
    const t = (clamped - 1) / 2;
    return config.atHierarchy1 + t * (config.atHierarchy3 - config.atHierarchy1);
  }
  const t = (clamped - 3) / 2;
  return config.atHierarchy3 + t * (config.atHierarchy5 - config.atHierarchy3);
}
