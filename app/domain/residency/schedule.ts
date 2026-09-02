import type { BranchDefinition } from "../config/branches";
import type { SeededRng } from "../rng/seededRng";
import type { OnCallAssignment, ScheduleActivity, ScheduleDay, ScheduleSlot, WeeklySchedule, WorkloadState } from "../state/types";
import {
  classifyScheduleArchetype,
  DEFAULT_SCHEDULE_CONFIG,
  SCHEDULE_ACTIVITY_MIX,
  type NonOnCallActivity,
  type ScheduleConfig,
} from "../config/scheduleConfig";

function addDaysUTC(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function pickWeightedActivity(mix: Record<NonOnCallActivity, number>, rng: SeededRng): NonOnCallActivity {
  const entries = (Object.entries(mix) as [NonOnCallActivity, number][]).filter(([, weight]) => weight > 0);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rng.next() * total;
  for (const [activity, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return activity;
  }
  return entries[entries.length - 1][0];
}

function bosSlot(): ScheduleSlot {
  return { activity: "bos", startHour: 0, endHour: 24 };
}

// Gameplay Expansion Part A §1/§18 — a DISPLAY layer, generated fresh
// every weekly tick. Deliberately reads its two hour/date sources from
// systems that already exist rather than inventing a second work-hours
// model:
//   - workload.regularHours (Phase 11) budgets how many active half-day
//     slots this week gets, before any day is filled in.
//   - onCallAssignments (Phase 7, the CURRENT month's real schedule)
//     decides exactly which day(s) this week are "nöbet" — never a
//     separately rolled nöbet day.
// Deterministic: same (gameSeed, residencyWeek, program) -> same rng
// scope (see the caller in engine.ts) -> same schedule, every time.
export function generateWeeklySchedule(
  branch: BranchDefinition,
  workload: WorkloadState | null,
  onCallAssignments: readonly OnCallAssignment[],
  weekStartDate: string,
  residencyWeek: number,
  rng: SeededRng,
  config: ScheduleConfig = DEFAULT_SCHEDULE_CONFIG
): WeeklySchedule {
  const archetype = classifyScheduleArchetype(branch);
  const mix = SCHEDULE_ACTIVITY_MIX[archetype];

  const weekDates = Array.from({ length: 7 }, (_, i) => addDaysUTC(weekStartDate, i));
  const onCallDatesThisWeek = new Set(
    onCallAssignments.filter((a) => a.assignedNpcId === "player" && weekDates.includes(a.date)).map((a) => a.date)
  );

  const nobetErtesiDates = new Set<string>();
  for (const date of weekDates) {
    if (onCallDatesThisWeek.has(date)) {
      const nextDate = addDaysUTC(date, 1);
      if (weekDates.includes(nextDate) && !onCallDatesThisWeek.has(nextDate)) {
        nobetErtesiDates.add(nextDate);
      }
    }
  }

  const [morningStart, morningEnd] = config.morningSlot;
  const [afternoonStart, afternoonEnd] = config.afternoonSlot;
  const [onCallStart, onCallEnd] = config.onCallSlot;

  const regularHours = workload?.regularHours ?? 0;
  let remainingSlotBudget = Math.round(regularHours / config.hoursPerHalfDaySlot);

  const days: ScheduleDay[] = weekDates.map((date, dayIndex) => {
    const slots: ScheduleSlot[] = [];

    if (onCallDatesThisWeek.has(date)) {
      if (remainingSlotBudget > 0) {
        slots.push({ activity: pickWeightedActivity(mix, rng), startHour: morningStart, endHour: morningEnd });
        remainingSlotBudget--;
      }
      if (remainingSlotBudget > 0) {
        slots.push({ activity: pickWeightedActivity(mix, rng), startHour: afternoonStart, endHour: afternoonEnd });
        remainingSlotBudget--;
      }
      slots.push({ activity: "nobet" as ScheduleActivity, startHour: onCallStart, endHour: onCallEnd });
    } else if (nobetErtesiDates.has(date)) {
      slots.push({ activity: "nobet_ertesi" as ScheduleActivity, startHour: morningStart, endHour: 16 });
    } else if (remainingSlotBudget > 0) {
      slots.push({ activity: pickWeightedActivity(mix, rng), startHour: morningStart, endHour: morningEnd });
      remainingSlotBudget--;
      if (remainingSlotBudget > 0) {
        slots.push({ activity: pickWeightedActivity(mix, rng), startHour: afternoonStart, endHour: afternoonEnd });
        remainingSlotBudget--;
      }
    } else {
      slots.push(bosSlot());
    }

    return { dayIndex, date, slots };
  });

  return { residencyWeek, days };
}
