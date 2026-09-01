import type { OnCallSchedule } from "../state/types";
import type { SeededRng } from "../rng/seededRng";
import { enumerateMonthDays } from "./monthDays";
import { addExtraShift, removeShift } from "./mutations";

// §23 — the one place `choice.onCallEffects` (see domain/events/types.ts)
// actually mutates a schedule. Deliberately tiny surface: only
// add/remove player shifts this phase (§22 — swap/transfer exist as
// tested pure helpers for Phase 8 content, not wired to any effect yet).
export type OnCallEffect =
  | { type: "add_player_shift"; count: number; shiftType?: "weekday" | "weekend" }
  | { type: "remove_player_shift"; count: number };

export function applyOnCallEffects(
  schedule: OnCallSchedule | null,
  effects: OnCallEffect[] | undefined,
  rng: SeededRng
): OnCallSchedule | null {
  if (!schedule || !effects || effects.length === 0) return schedule;

  let current = schedule;
  for (const effect of effects) {
    if (effect.type === "add_player_shift") {
      for (let i = 0; i < effect.count; i++) {
        const monthDays = enumerateMonthDays(current.monthKey);
        const takenDates = new Set(current.assignments.filter((a) => a.assignedNpcId === "player").map((a) => a.date));
        const candidates = monthDays.filter(
          (d) => !takenDates.has(d.date) && (effect.shiftType === undefined || d.isWeekend === (effect.shiftType === "weekend"))
        );
        if (candidates.length === 0) break;
        const chosen = rng.pick(candidates);
        const result = addExtraShift(current, chosen.date, chosen.isWeekend ? "weekend" : "weekday");
        if (result.ok) current = result.schedule;
      }
    } else if (effect.type === "remove_player_shift") {
      for (let i = 0; i < effect.count; i++) {
        const playerAssignments = current.assignments.filter((a) => a.assignedNpcId === "player");
        if (playerAssignments.length === 0) break;
        const target = rng.pick(playerAssignments);
        const result = removeShift(current, target.id);
        if (result.ok) current = result.schedule;
      }
    }
  }
  return current;
}
