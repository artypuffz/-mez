import type { NpcId, OnCallAssignment, OnCallSchedule } from "../state/types";

export type OnCallMutationResult =
  | { ok: true; schedule: OnCallSchedule }
  | { ok: false; error: string };

function withAssignments(schedule: OnCallSchedule, assignments: OnCallAssignment[]): OnCallSchedule {
  return {
    ...schedule,
    assignments,
    player: {
      ...schedule.player,
      totalShifts: assignments.filter((a) => a.assignedNpcId === "player").length,
      weekendShifts: assignments.filter((a) => a.assignedNpcId === "player" && a.type === "weekend").length,
    },
  };
}

// §22/§26 — pure, validated, save-safe schedule mutations. Not wired to
// any content this phase except addExtraShift/removeShift (via
// choice.onCallEffects, see domain/events/effects.ts) — swap/transfer
// exist now so Phase 8's "unfair shift" content has something real to
// call instead of inventing its own ad-hoc state mutation.

// Reassigns one existing assignment to a different holder (player or an
// NpcId) — the basis for both "arkadaşın nöbet değişmek istiyor" (npc ->
// player) and a mobbing-flavored "shift dumped on you" (player -> npc,
// or npc -> npc) event.
export function transferOnCallAssignment(
  schedule: OnCallSchedule,
  assignmentId: string,
  toNpcId: NpcId | "player"
): OnCallMutationResult {
  const index = schedule.assignments.findIndex((a) => a.id === assignmentId);
  if (index === -1) return { ok: false, error: `assignment "${assignmentId}" not found` };

  const next = [...schedule.assignments];
  next[index] = { ...next[index], assignedNpcId: toNpcId, source: "swap" };
  return { ok: true, schedule: withAssignments(schedule, next) };
}

// Exchanges the holders of two existing assignments in one atomic step —
// distinct from two transfers because a single transfer would leave one
// side briefly unassigned-in-spirit; this keeps both dates always covered.
export function swapOnCallAssignment(
  schedule: OnCallSchedule,
  assignmentIdA: string,
  assignmentIdB: string
): OnCallMutationResult {
  if (assignmentIdA === assignmentIdB) return { ok: false, error: "cannot swap an assignment with itself" };
  const indexA = schedule.assignments.findIndex((a) => a.id === assignmentIdA);
  const indexB = schedule.assignments.findIndex((a) => a.id === assignmentIdB);
  if (indexA === -1) return { ok: false, error: `assignment "${assignmentIdA}" not found` };
  if (indexB === -1) return { ok: false, error: `assignment "${assignmentIdB}" not found` };

  const next = [...schedule.assignments];
  const holderA = next[indexA].assignedNpcId;
  const holderB = next[indexB].assignedNpcId;
  next[indexA] = { ...next[indexA], assignedNpcId: holderB, source: "swap" };
  next[indexB] = { ...next[indexB], assignedNpcId: holderA, source: "swap" };
  return { ok: true, schedule: withAssignments(schedule, next) };
}

// Adds a new player shift on a given date (must be within the schedule's
// own month, and not a date the player is already assigned on — no
// double-booking, §33).
export function addExtraShift(
  schedule: OnCallSchedule,
  date: string,
  type: OnCallAssignment["type"]
): OnCallMutationResult {
  if (!date.startsWith(schedule.monthKey)) {
    return { ok: false, error: `date "${date}" is not within schedule month "${schedule.monthKey}"` };
  }
  if (schedule.assignments.some((a) => a.date === date && a.assignedNpcId === "player")) {
    return { ok: false, error: `player already has an assignment on "${date}"` };
  }

  const id = `${schedule.monthKey}-extra-${schedule.assignments.length}`;
  const next = [...schedule.assignments, { id, date, type, assignedNpcId: "player" as const, source: "extra" as const }].sort(
    (a, b) => a.date.localeCompare(b.date)
  );
  const withNext = withAssignments(schedule, next);
  return { ok: true, schedule: { ...withNext, player: { ...withNext.player, extraShifts: schedule.player.extraShifts + 1 } } };
}

// Removes an existing PLAYER assignment entirely (e.g. successfully
// getting out of a shift, not the same as transferring it to someone else).
export function removeShift(schedule: OnCallSchedule, assignmentId: string): OnCallMutationResult {
  const assignment = schedule.assignments.find((a) => a.id === assignmentId);
  if (!assignment) return { ok: false, error: `assignment "${assignmentId}" not found` };
  if (assignment.assignedNpcId !== "player") {
    return { ok: false, error: `assignment "${assignmentId}" is not a player shift` };
  }
  const next = schedule.assignments.filter((a) => a.id !== assignmentId);
  return { ok: true, schedule: withAssignments(schedule, next) };
}
