import type { ExpressionState } from "./types";

export interface ExpressionResolverInput {
  stress: number;
  fatigue: number;
  burnout: number;
  health: number;
}

// Gameplay Expansion Part C section 31 — the ONE place resource
// thresholds turn into a rendered expression. Never spread across UI
// components, and this is a strictly READ-only function: it consumes
// resources but never writes anything back, so expression can never
// itself influence gameplay (section 29's hard rule). Priority order
// (checked top to bottom, first match wins) rather than independent
// per-resource flags, so exactly one expression is ever shown at once.
export function resolveExpression(input: ExpressionResolverInput): ExpressionState {
  const { stress, fatigue, burnout, health } = input;
  if (burnout >= 80) return "burned_out";
  if (health <= 20) return "unhealthy";
  if (fatigue >= 75) return "exhausted";
  if (stress >= 70) return "stressed";
  if (fatigue >= 40 || stress >= 40) return "tired";
  return "normal";
}
