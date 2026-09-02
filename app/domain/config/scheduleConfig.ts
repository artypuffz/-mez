import type { BranchDefinition } from "./branches";

// Gameplay Expansion Part A §1 — "her branş bütün aktivitelere sahip
// olmak zorunda değil... Genel Cerrahi'de ameliyathane sıkken Psikiyatri
// için aynı yapı zorlanmamalı". Rather than hand-authoring a bespoke
// activity mix for all 26 branches (real content-authoring scope, not a
// core-systems concern), branches are classified into 3 derivable
// archetypes from data that already exists (BRANCH_DEFINITIONS' own name/
// id) — no new per-branch authored table, no risk of drifting out of sync
// as branches are added/renamed.
export type ScheduleArchetype = "surgical" | "outpatient_low_acute" | "medical";

const OUTPATIENT_LOW_ACUTE_IDS = new Set([
  "psikiyatri", "cocuk_ve_ergen_ruh_sagligi", "aile_hekimligi", "deri_ve_zuhrevi_hastaliklari",
]);

export function classifyScheduleArchetype(branch: BranchDefinition): ScheduleArchetype {
  if (OUTPATIENT_LOW_ACUTE_IDS.has(branch.id)) return "outpatient_low_acute";
  if (branch.name.includes("Cerrahi")) return "surgical";
  return "medical";
}

export type NonOnCallActivity = "vizit" | "servis" | "poliklinik" | "ameliyathane" | "egitim";

// Weights sum to 1.0 per archetype — used to weighted-pick each active
// (non-nöbet, non-nöbet-ertesi) day's activity. Deliberately coarse (5
// categories, 3 archetypes) — a display/flavor layer, not new balance
// data; none of this feeds resource pressure (that's still entirely
// workload/onCall, per the "no second work-hours model" rule).
export const SCHEDULE_ACTIVITY_MIX: Record<ScheduleArchetype, Record<NonOnCallActivity, number>> = {
  surgical: { ameliyathane: 0.35, servis: 0.25, poliklinik: 0.15, vizit: 0.15, egitim: 0.1 },
  medical: { poliklinik: 0.3, servis: 0.25, vizit: 0.25, egitim: 0.15, ameliyathane: 0.05 },
  outpatient_low_acute: { poliklinik: 0.45, vizit: 0.2, egitim: 0.2, servis: 0.15, ameliyathane: 0 },
};

export interface ScheduleConfig {
  // Each active half-day slot's clock hours — purely cosmetic, the
  // TOTAL weekly hour budget always comes from workload.regularHours.
  morningSlot: [number, number];
  afternoonSlot: [number, number];
  onCallSlot: [number, number]; // 20:00-08:00
  // Roughly how many active-half-day-hours the display budget consumes
  // per non-nöbet day before the rest of the week reads as "boş" — a
  // display pacing knob, not a resource formula.
  hoursPerHalfDaySlot: number;
}

export const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
  morningSlot: [8, 12],
  afternoonSlot: [13, 17],
  onCallSlot: [20, 8],
  hoursPerHalfDaySlot: 4,
};
