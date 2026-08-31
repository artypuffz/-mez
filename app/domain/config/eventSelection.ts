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
