import type { SeededRng } from "../rng/seededRng";
import type { WorkloadState } from "../state/types";
import type { BranchDefinition } from "../config/branches";
import type { ResidencyProgram } from "../config/residencyPrograms";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Phase 11 §22 — branch identity dominates; the program's own small
// modifier (range -0.5..+0.5, almost always 0 in this phase's dataset —
// see residencyPrograms.ts) is a minor nudge on top, never the other way
// around.
export function effectiveWorkingHoursAxis(branch: BranchDefinition, program: ResidencyProgram): number {
  const modifier = program.difficultyModifier?.workingHours ?? 0;
  return clamp(branch.difficultyBaseline.workingHours + modifier, 1, 5);
}

// Phase 11 §16 — the starting balance bands (workingHours 1 -> 35-45h ...
// 5 -> 65-90h+), read as 5 anchor points and linearly interpolated between
// them for a fractional axis value, then perturbed with a small seeded
// roll within that week's band — "arcade-friendly", not literal uniform
// random noise with no structure.
const HOUR_BAND_ANCHORS: [number, [number, number]][] = [
  [1, [35, 45]],
  [2, [40, 50]],
  [3, [45, 60]],
  [4, [55, 75]],
  [5, [65, 90]],
];

function interpolateBand(axis: number): [number, number] {
  const clamped = clamp(axis, 1, 5);
  for (let i = 0; i < HOUR_BAND_ANCHORS.length - 1; i++) {
    const [lowAxis, lowBand] = HOUR_BAND_ANCHORS[i];
    const [highAxis, highBand] = HOUR_BAND_ANCHORS[i + 1];
    if (clamped >= lowAxis && clamped <= highAxis) {
      const t = (clamped - lowAxis) / (highAxis - lowAxis);
      return [lowBand[0] + t * (highBand[0] - lowBand[0]), lowBand[1] + t * (highBand[1] - lowBand[1])];
    }
  }
  return HOUR_BAND_ANCHORS[HOUR_BAND_ANCHORS.length - 1][1];
}

export function deriveRegularHours(workingHoursAxis: number, rng: SeededRng): number {
  const [min, max] = interpolateBand(workingHoursAxis);
  const raw = min + rng.next() * (max - min);
  return Math.round(raw);
}

const RECENT_AVERAGE_SMOOTHING = 0.3; // weight on the new week (EMA)

// Phase 11 §16 — runs once per week (mirroring the existing on-call
// pressure nudge's own weekly cadence, see engine.ts), independent of
// whatever the player does with events that week. `previous` is the state
// BEFORE this tick (used only for recentAverageHours' EMA) — overtimeHours
// always resets to 0 at the start of a new week; any workloadEffects a
// choice applies THIS week accumulate on top via applyOvertimeHours below,
// they are never carried over from last week.
export function computeWeeklyWorkload(
  branch: BranchDefinition,
  program: ResidencyProgram,
  previous: WorkloadState | null,
  rng: SeededRng
): WorkloadState {
  const axis = effectiveWorkingHoursAxis(branch, program);
  const regularHours = deriveRegularHours(axis, rng);
  const recentAverageHours = previous
    ? Math.round(previous.recentAverageHours * (1 - RECENT_AVERAGE_SMOOTHING) + regularHours * RECENT_AVERAGE_SMOOTHING)
    : regularHours;
  return {
    currentWeekHours: regularHours,
    regularHours,
    overtimeHours: 0,
    recentAverageHours,
  };
}

// Phase 11 §19 — the workloadEffects DSL's only mutation: adds overtime
// hours to the CURRENT week's tally. A pure, no-op-safe helper (never
// throws) mirroring applyOnCallEffects' shape.
export function applyOvertimeHours(workload: WorkloadState | null, hours: number): WorkloadState | null {
  if (!workload || hours === 0) return workload;
  const overtimeHours = Math.max(0, workload.overtimeHours + hours);
  return {
    ...workload,
    overtimeHours,
    currentWeekHours: Math.max(0, workload.regularHours + overtimeHours),
  };
}

export interface WorkloadPressureDelta {
  fatigue: number;
  stress: number;
}

// Phase 11 §18 — a SMALL banded nudge, one more input into the existing,
// untouched Phase 9 resource-pull model (applied the same way as
// computeOnCallPressureModifier in engine.ts) — never a stress
// multiplier, never proportional to the raw hour count. Deliberately reads
// off regularHours + overtimeHours only (never the on-call schedule), so
// it can never double-count on-call's own separate, pre-existing pressure
// contribution (§17) — see docs/program-data-sources.md / the Phase 11
// report for the headless-simulation check that verifies this.
export function workingHoursPressureBand(hours: number): WorkloadPressureDelta {
  if (hours < 45) return { fatigue: -1, stress: 0 };
  if (hours < 60) return { fatigue: 0, stress: 0 };
  if (hours < 75) return { fatigue: 1, stress: 0 };
  if (hours < 90) return { fatigue: 2, stress: 1 };
  return { fatigue: 3, stress: 2 };
}
