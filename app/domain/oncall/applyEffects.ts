import type { NpcId, OnCallSchedule } from "../state/types";
import type { SeededRng } from "../rng/seededRng";
import { enumerateMonthDays } from "./monthDays";
import { addExtraShift, removeShift, transferOnCallAssignment } from "./mutations";

// Deliberately duplicated rather than importing domain/events/npcTargets
// — domain/oncall never depends on domain/events (only the reverse), so
// this stays a self-contained leaf domain. Same tiny contract: exactly
// one of npc/boundNpc is set.
interface NpcTargetRef {
  npc?: string;
  boundNpc?: string;
}
function resolveNpcTargetId(target: NpcTargetRef, boundNpcIds: Record<string, string>): NpcId | undefined {
  if (target.npc) return target.npc;
  if (target.boundNpc) return boundNpcIds[target.boundNpc];
  return undefined;
}

// §23 (Phase 7) + §13 (Phase 8) — the one place `choice.onCallEffects`
// (see domain/events/types.ts) actually mutates a schedule. Small, fixed
// surface area: add/remove a player shift, and transfer an EXISTING
// player shift onto an NPC (the "kıdemli olunca nöbet dağıtma gücü"
// power-reversal mechanic, §14/§30 — the player choosing to offload a
// shift they already hold). There's no "transfer an NPC's shift to the
// player" counterpart because NPCs never hold assignments in this
// player-centric schedule model (§25/§37 of the Phase 7 report) —
// narratively that's just add_player_shift with different flavor text.
export type OnCallEffect =
  | { type: "add_player_shift"; count: number; shiftType?: "weekday" | "weekend" }
  | { type: "remove_player_shift"; count: number }
  | { type: "transfer_player_shift_to_npc"; target: NpcTargetRef };

export function applyOnCallEffects(
  schedule: OnCallSchedule | null,
  effects: OnCallEffect[] | undefined,
  rng: SeededRng,
  boundNpcIds: Record<string, string> = {}
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
    } else if (effect.type === "transfer_player_shift_to_npc") {
      const npcId = resolveNpcTargetId(effect.target, boundNpcIds);
      const playerAssignments = current.assignments.filter((a) => a.assignedNpcId === "player");
      if (npcId && playerAssignments.length > 0) {
        const source = rng.pick(playerAssignments);
        const result = transferOnCallAssignment(current, source.id, npcId);
        if (result.ok) current = result.schedule;
      }
    }
  }
  return current;
}
