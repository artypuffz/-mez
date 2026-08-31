import { evaluateRequirements, type RequirementContext } from "./requirements";
import type { ChoiceDefinition, EventDefinition } from "./types";

export function getVisibleChoices(
  event: EventDefinition,
  ctx: RequirementContext
): ChoiceDefinition[] {
  return event.choices.filter((choice) => evaluateRequirements(choice.requirements, ctx));
}

// §21 — once eventHistory contains this event's id even once, it's never
// eligible again, pool or scheduled/chain alike. Distinct from
// cooldownWeeks (see cooldown.ts): a cooldown always reopens eventually,
// `once` never does.
export function hasAlreadyOccurred(eventId: string, eventHistory: { eventId: string }[]): boolean {
  return eventHistory.some((entry) => entry.eventId === eventId);
}

// §6: an event whose requirements pass but that has zero visible choices
// must never reach the player — treated as ineligible, as if it had never
// been drawn from the pool (or, for a scheduled/checkpoint candidate, as
// if its own requirements had failed). §17: requiredNpcTemplate gates on
// that template's NpcState actually existing (active) in the roster —
// content never checks a name directly.
export function isEventEligible(
  event: EventDefinition,
  ctx: RequirementContext,
  eventHistory: { eventId: string }[] = []
): boolean {
  if (event.once && hasAlreadyOccurred(event.id, eventHistory)) return false;
  if (event.requiredNpcTemplate && !ctx.activeNpcTemplateIds.has(event.requiredNpcTemplate)) return false;
  if (!evaluateRequirements(event.requirements, ctx)) return false;
  return getVisibleChoices(event, ctx).length > 0;
}
