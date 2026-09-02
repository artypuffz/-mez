import type { FreeTimeState, WorkloadState } from "../state/types";
import { DEFAULT_FREE_TIME_CONFIG, type FreeTimeConfig } from "../config/freeTimeConfig";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Gameplay Expansion Part A §3/§4 (Determinizm) — a PURE function of
// workload.currentWeekHours (itself already deterministic per
// gameSeed+week+program, see domain/residency/workingHours.ts). No
// additional rng draw here — freeTime never needs its own seed scope,
// it's a direct derivation, never a second independent source of truth.
export function computeFreeTimeHours(
  workload: WorkloadState | null,
  config: FreeTimeConfig = DEFAULT_FREE_TIME_CONFIG
): number {
  const hours = workload?.currentWeekHours ?? 0;
  const raw = config.baseHours - config.hoursPerWorkHour * hours;
  return Math.round(clamp(raw, config.minFreeTimeHours, config.maxFreeTimeHours));
}

// Called once per weekly tick — resets usedHours to 0 for the new week
// (spending is a THIS-WEEK budget, never carried over) and recomputes
// totalHours from the just-updated workload.
export function startNewWeekFreeTime(
  workload: WorkloadState | null,
  config: FreeTimeConfig = DEFAULT_FREE_TIME_CONFIG
): FreeTimeState {
  return { totalHours: computeFreeTimeHours(workload, config), usedHours: 0 };
}

// Spends freeTimeHours immediately (§11 — no delayed application). Never
// allows usedHours to exceed totalHours or go negative; the caller
// (spending activity resolver) is expected to have already checked
// affordability via canAffordFreeTime, this is the actual mutation.
export function spendFreeTimeHours(freeTime: FreeTimeState, hours: number): FreeTimeState {
  if (hours <= 0) return freeTime;
  const usedHours = clamp(freeTime.usedHours + hours, 0, freeTime.totalHours);
  return { ...freeTime, usedHours };
}

export function remainingFreeTimeHours(freeTime: FreeTimeState): number {
  return Math.max(0, freeTime.totalHours - freeTime.usedHours);
}

export function canAffordFreeTime(freeTime: FreeTimeState, hours: number): boolean {
  return remainingFreeTimeHours(freeTime) >= hours;
}
