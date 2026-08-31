import type { EventDefinition } from "./types";

// cooldownWeeks is undefined/0 -> no cooldown restriction at all.
// cooldownWeeks: 999 works "for free" here — no special-casing needed,
// it just means the gap will practically never close within one
// residency (see the Phase 5 report for whether that's distinct enough
// from a true one-shot event).
export function isOnCooldown(
  event: EventDefinition,
  currentWeek: number,
  cooldowns: Record<string, number>
): boolean {
  const cooldownWeeks = event.cooldownWeeks ?? 0;
  if (cooldownWeeks <= 0) return false;
  const lastTriggeredWeek = cooldowns[event.id];
  if (lastTriggeredWeek === undefined) return false;
  return currentWeek - lastTriggeredWeek < cooldownWeeks;
}

export function recordTrigger(
  cooldowns: Record<string, number>,
  eventId: string,
  week: number
): Record<string, number> {
  return { ...cooldowns, [eventId]: week };
}
