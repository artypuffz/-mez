import { evaluateRequirements, type RequirementContext } from "./requirements";
import type { TextVariant } from "./types";

// docs/event-schema.md §5: scan top-down, first requirements match wins,
// fall back to the base text if none match (or none are defined).
export function resolveText(
  base: string,
  variants: TextVariant[] | undefined,
  ctx: RequirementContext
): string {
  if (!variants) return base;
  for (const variant of variants) {
    if (evaluateRequirements(variant.requirements, ctx)) return variant.text;
  }
  return base;
}
