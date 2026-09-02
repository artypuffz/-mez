import type { CareerPhase, WeeklySchedule } from "../state/types";
import type { OutfitContext } from "./types";

export interface OutfitResolverInput {
  phase: CareerPhase;
  schedule: WeeklySchedule | null;
}

// Gameplay Expansion Part C section 30 — outfit is CONTEXTUAL, resolved
// from real career state every time it's rendered, never chosen by
// content/UI and never persisted (so it can never drift from what the
// state actually says). Physical identity (skin/face/hair/etc, see
// PlayerAvatar) is completely untouched by this — outfit only changes
// what layers on top.
export function resolveOutfitContext(input: OutfitResolverInput): OutfitContext {
  const { phase, schedule } = input;
  if (phase === "specialist") return "specialist";
  if (phase === "specialist_exam") return "white_coat";
  if (phase !== "residency") return "casual";
  // §13/§30 — this week's actual schedule decides surgical vs. plain white
  // coat; never a second guess about the branch, always the real Part A
  // schedule state.
  const hasOrTheatreThisWeek = schedule?.days.some((day) => day.slots.some((slot) => slot.activity === "ameliyathane")) ?? false;
  return hasOrTheatreThisWeek ? "surgical" : "white_coat";
}
