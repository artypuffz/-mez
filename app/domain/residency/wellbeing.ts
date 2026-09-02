import type { ResourcePressureState, WorkloadState } from "../state/types";
import { DEFAULT_WELLBEING_CONFIG, type WellbeingConfig } from "../config/wellbeingConfig";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface HealthInputs {
  resourcePressure: ResourcePressureState;
  burnout: number;
  workload: WorkloadState | null;
  // Resolved by the caller from lifestyle.foodTier + ownership.housing
  // (domain/economy/lifestyle.ts) — a small standing modifier, not a
  // streak. This is the ONE channel through which a player's spending
  // decisions reach health passively every week (active recovery comes
  // from resolving a "dinlenme" spending activity instead, via
  // ResolvedResourceDelta.health).
  lifestyleHealthModifier: number;
}

// Gameplay Expansion Part A §4 — health is never driven by events alone
// (every event effect is optional/occasional; this passive weekly tick
// always runs). Reuses the ALREADY-FIXED (leaky) resourcePressure
// counters as its "sustained bad/good conditions" signal, exactly like
// burnout, rather than a second parallel streak struct — see
// weeklyResources.ts's updateResourcePressure fix. health=0 never ends
// the career on its own (§4's explicit rule; only future crisis
// eligibility may read it).
export function applyWeeklyHealth(
  currentHealth: number,
  inputs: HealthInputs,
  config: WellbeingConfig = DEFAULT_WELLBEING_CONFIG
): number {
  const { health: cfg } = config;
  const { resourcePressure, burnout, workload, lifestyleHealthModifier } = inputs;
  let delta = 0;

  if (resourcePressure.combinedPressureWeeks >= cfg.severeStrainWeeks) {
    delta += cfg.moderateStrainDelta + cfg.severeStrainDelta;
  } else if (resourcePressure.combinedPressureWeeks >= cfg.moderateStrainWeeks) {
    delta += cfg.moderateStrainDelta;
  }

  if (burnout >= cfg.burnoutThreshold) delta += cfg.burnoutDelta;

  const currentWeekHours = workload?.currentWeekHours ?? 0;
  if (currentWeekHours >= cfg.heavyHoursThreshold) delta += cfg.heavyHoursDelta;

  if (resourcePressure.lowPressureWeeks >= cfg.restRecoveryLowPressureWeeks && currentWeekHours < cfg.restRecoveryMaxHours) {
    delta += cfg.restRecoveryDelta;
  }

  delta += lifestyleHealthModifier;
  delta = clamp(delta, cfg.minWeeklyDelta, cfg.maxWeeklyDelta);

  return clamp(currentHealth + delta, 0, 100);
}

export interface SocialInputs {
  workload: WorkloadState | null;
  freeTimeHoursThisWeek: number;
}

// §4 — social life is distinct from any single NPC's RelationshipState;
// it degrades from a structurally busy week (long hours, little free
// time) and passively recovers on a genuinely light one. ACTIVE increases
// (arkadaşlarla dışarı çıkmak vb.) come from resolving a spending
// activity's own immediate ResolvedResourceDelta.social, not from this
// passive tick.
export function applyWeeklySocial(
  currentSocial: number,
  inputs: SocialInputs,
  config: WellbeingConfig = DEFAULT_WELLBEING_CONFIG
): number {
  const { social: cfg } = config;
  const { workload, freeTimeHoursThisWeek } = inputs;
  let delta = 0;

  const currentWeekHours = workload?.currentWeekHours ?? 0;
  if (currentWeekHours >= cfg.heavyHoursThreshold) delta += cfg.heavyHoursDelta;

  if (freeTimeHoursThisWeek <= cfg.lowFreeTimeThreshold) {
    delta += cfg.lowFreeTimeDelta;
  } else if (freeTimeHoursThisWeek >= cfg.ampleFreeTimeThreshold) {
    delta += cfg.ampleFreeTimeDelta;
  }

  delta = clamp(delta, cfg.minWeeklyDelta, cfg.maxWeeklyDelta);
  return clamp(currentSocial + delta, 0, 100);
}
