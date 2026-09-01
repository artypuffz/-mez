import type { OnCallSchedule, ResolvedResourceDelta } from "../state/types";
import { ON_CALL_PRESSURE_DIVISORS } from "../config/onCallEconomyConfig";

// §11 — layered on TOP of Phase 4's baseline weekly tick (never inside
// advanceResidencyWeek itself, same "don't touch Phase 4" discipline as
// Phase 6's NPC lifecycle). A month with a heavy shift count keeps
// nudging fatigue/stress every week it's in effect, not just once at
// generation — deliberately small (floor-divided), no per-shift day
// simulation.
export function computeOnCallPressureModifier(schedule: OnCallSchedule | null): ResolvedResourceDelta {
  if (!schedule) return {};
  const shifts = schedule.player.totalShifts;
  return {
    fatigue: Math.floor(shifts / ON_CALL_PRESSURE_DIVISORS.fatigue),
    stress: Math.floor(shifts / ON_CALL_PRESSURE_DIVISORS.stress),
  };
}
