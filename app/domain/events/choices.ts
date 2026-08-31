import { evaluateRequirements, type RequirementContext } from "./requirements";
import type { ChoiceDefinition, EventDefinition } from "./types";

export function getVisibleChoices(
  event: EventDefinition,
  ctx: RequirementContext
): ChoiceDefinition[] {
  return event.choices.filter((choice) => evaluateRequirements(choice.requirements, ctx));
}

// §6: an event whose requirements pass but that has zero visible choices
// must never reach the player — treated as ineligible, as if it had never
// been drawn from the pool (or, for a scheduled/checkpoint candidate, as
// if its own requirements had failed).
export function isEventEligible(event: EventDefinition, ctx: RequirementContext): boolean {
  if (!evaluateRequirements(event.requirements, ctx)) return false;
  return getVisibleChoices(event, ctx).length > 0;
}
