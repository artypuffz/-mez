import type { GameState } from "../state/types";
import { getSpendingActivity, type SpendingActivityDefinition } from "../config/spendingActivities";
import { canAffordFreeTime, spendFreeTimeHours } from "../residency/freeTime";
import { applyRelationshipEffects, applyResourceDelta, applyStatistics } from "../events/effects";
import { buildRequirementContext, evaluateRequirements } from "../events/requirements";

export type SpendingActivityRejection =
  | "unknown_activity"
  | "not_eligible"
  | "on_cooldown"
  | "insufficient_money"
  | "insufficient_time";

export type ResolveSpendingActivityResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: SpendingActivityRejection };

function cooldownStatKey(activityId: string): string {
  return `spending:lastResolvedWeek:${activityId}`;
}

// Gameplay Expansion Part B §10 — read-only display helper so the
// Harcamalar screen can show "X hafta sonra tekrar" without re-deriving
// (or duplicating) the cooldown key convention itself.
export function getSpendingActivityCooldownRemaining(state: GameState, activityId: string, currentWeek: number): number {
  const activity = getSpendingActivity(activityId);
  if (!activity?.cooldownWeeks) return 0;
  const lastWeek = state.statistics[cooldownStatKey(activityId)];
  if (lastWeek === undefined) return 0;
  return Math.max(0, activity.cooldownWeeks - (currentWeek - lastWeek));
}

// Read-only — lets a UI disable/explain an activity before the player
// taps it, using the exact same checks resolveSpendingActivity itself
// enforces (§9: "requirement uygun değilse aktivite görünmemeli veya
// disabled gerekçesi açıkça gösterilmeli").
export function checkSpendingActivityEligibility(
  state: GameState,
  activityId: string,
  currentWeek: number
): { ok: true } | { ok: false; reason: SpendingActivityRejection } {
  const activity = getSpendingActivity(activityId);
  if (!activity) return { ok: false, reason: "unknown_activity" };

  const ctx = buildRequirementContext(state);
  if (activity.requirements && !evaluateRequirements(activity.requirements, ctx)) {
    return { ok: false, reason: "not_eligible" };
  }

  if (activity.cooldownWeeks) {
    const lastWeek = state.statistics[cooldownStatKey(activityId)];
    if (lastWeek !== undefined && currentWeek - lastWeek < activity.cooldownWeeks) {
      return { ok: false, reason: "on_cooldown" };
    }
  }

  if (state.resources.money < activity.cost.money) return { ok: false, reason: "insufficient_money" };
  if (!canAffordFreeTime(state.freeTime, activity.cost.freeTimeHours)) return { ok: false, reason: "insufficient_time" };

  return { ok: true };
}

// §11 — applies every effect IMMEDIATELY (money, freeTimeHours, and the
// activity's ResolvedResourceDelta), same "resolve once, persist
// instantly" shape as resolveEventChoice. Double-submit prevention is a
// store-layer concern (an isResolvingSpending-style guard), same pattern
// as isResolvingEvent for events — this function itself is a pure,
// single application, safe to call exactly once per real player action.
export function resolveSpendingActivity(
  state: GameState,
  activityId: string,
  currentWeek: number
): ResolveSpendingActivityResult {
  const eligibility = checkSpendingActivityEligibility(state, activityId, currentWeek);
  if (!eligibility.ok) return eligibility;

  const activity = getSpendingActivity(activityId) as SpendingActivityDefinition;

  const resources = applyResourceDelta(state.resources, { ...activity.effects, money: (activity.effects.money ?? 0) - activity.cost.money });
  const freeTime = spendFreeTimeHours(state.freeTime, activity.cost.freeTimeHours);
  const relationships = applyRelationshipEffects(state.relationships, activity.relationshipEffects);
  const statistics = applyStatistics(state.statistics, {
    increment: { "spending:total": 1, [`spending:total:${activity.category}`]: 1 },
  });
  const withCooldown = { ...statistics, [cooldownStatKey(activityId)]: currentWeek };

  return {
    ok: true,
    state: { ...state, resources, freeTime, relationships, statistics: withCooldown },
  };
}
