import type { OnCallAssignment, OnCallSchedule, SeniorityStage } from "../state/types";
import type { SeededRng } from "../rng/seededRng";
import type { BranchOnCallProfile } from "../config/branches";
import { calculateStaffingLoad } from "./staffingLoad";
import { enumerateMonthDays } from "./monthDays";
import {
  BOUNDED_VARIATION_RANGE,
  GLOBAL_SHIFT_BOUNDS,
  SENIORITY_SHIFT_MODIFIER,
  staffingLoadShiftModifier,
} from "../config/onCallEconomyConfig";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Fisher-Yates over a seeded rng, deterministic for a given rng state.
function shuffle<T>(items: T[], rng: SeededRng): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export interface GenerateOnCallScheduleInput {
  monthKey: string; // YYYY-MM
  generatedAtWeek: number;
  onCallProfile: BranchOnCallProfile;
  seniorityStage: SeniorityStage;
  activeResidents: number;
  targetResidents: number;
  staffingPressure: number;
  previousActiveResidents?: number;
  rng: SeededRng;
}

// §3/§7 — deterministic for a given rng state (the caller scopes it as
// `oncall:${monthKey}`, same pattern as every other seeded subsystem), and
// player-centric (§25/§37): only the player's own shifts become concrete
// OnCallAssignment entries this phase, not a full per-NPC schedule.
export function generateOnCallSchedule(input: GenerateOnCallScheduleInput): OnCallSchedule {
  const { monthKey, generatedAtWeek, onCallProfile, seniorityStage, activeResidents, targetResidents, staffingPressure, previousActiveResidents, rng } = input;

  const staffingLoad = calculateStaffingLoad({ activeResidents, targetResidents, staffingPressure });

  const branchMin = Math.max(GLOBAL_SHIFT_BOUNDS[0], onCallProfile.minMonthlyShifts);
  const branchMax = Math.min(GLOBAL_SHIFT_BOUNDS[1], onCallProfile.maxMonthlyShifts);

  const [varMin, varMax] = BOUNDED_VARIATION_RANGE;
  const rawTotal =
    onCallProfile.baseMonthlyShifts +
    staffingLoadShiftModifier(staffingLoad) +
    SENIORITY_SHIFT_MODIFIER[seniorityStage] +
    rng.int(varMin, varMax);
  const totalShifts = clamp(rawTotal, branchMin, branchMax);

  const rawWeekend = Math.round(totalShifts * onCallProfile.weekendBias);
  const weekendShifts = clamp(rawWeekend, 0, totalShifts);
  const weekdayShifts = totalShifts - weekendShifts;

  const monthDays = enumerateMonthDays(monthKey);
  const weekdayDates = monthDays.filter((d) => !d.isWeekend).map((d) => d.date);
  const weekendDates = monthDays.filter((d) => d.isWeekend).map((d) => d.date);

  const pickedWeekendDates = shuffle(weekendDates, rng).slice(0, Math.min(weekendShifts, weekendDates.length));
  const pickedWeekdayDates = shuffle(weekdayDates, rng).slice(0, Math.min(weekdayShifts, weekdayDates.length));

  const assignments: OnCallAssignment[] = [
    ...pickedWeekendDates.map((date, i) => ({
      id: `${monthKey}-p-we-${i}`,
      date,
      type: "weekend" as const,
      assignedNpcId: "player" as const,
      source: "generated" as const,
    })),
    ...pickedWeekdayDates.map((date, i) => ({
      id: `${monthKey}-p-wd-${i}`,
      date,
      type: "weekday" as const,
      assignedNpcId: "player" as const,
      source: "generated" as const,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return {
    monthKey,
    generatedAtWeek,
    player: {
      totalShifts: assignments.length,
      weekendShifts: assignments.filter((a) => a.type === "weekend").length,
      holidayShifts: 0,
      extraShifts: 0,
    },
    clinicSummary: { activeResidents, staffingLoad, previousActiveResidents },
    assignments,
  };
}
