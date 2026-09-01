import type { SeniorityStage } from "../state/types";

// §3/§39 — an outer safety net regardless of what a branch's own
// min/max say, so a future content/config change can't push a month's
// shift count to an unrealistic extreme.
export const GLOBAL_SHIFT_BOUNDS: [number, number] = [2, 12];

// §4 — deliberately not a flat "kıdemli = az nöbet" rule: comez carries a
// bit more, orta is the baseline, kıdemli carries a bit less. Supervision
// events (Phase 8 content) are what's meant to compensate kıdemli's lower
// count narratively, not this number.
export const SENIORITY_SHIFT_MODIFIER: Record<SeniorityStage, number> = {
  none: 0,
  comez: 2,
  orta: 0,
  kidemli: -2,
};

// §5 — calculateStaffingLoad's weighting between "how far under the
// fully-staffed target the active roster is" and the program's own
// static staffingPressure profile.
export const STAFFING_LOAD_CONFIG = {
  shortageWeight: 0.7,
  pressureWeight: 0.3,
};

// staffingLoad (0..100) -> additive shifts, floor-divided so it never
// swings wildly: 0 at load<25, +1 at 25-49, +2 at 50-74, +3 at 75-99, +4 at 100.
export function staffingLoadShiftModifier(staffingLoad: number): number {
  return Math.floor(staffingLoad / 25);
}

export const BOUNDED_VARIATION_RANGE: [number, number] = [-1, 1];

// §11 — weekly fatigue/stress nudge from the CURRENT month's on-call
// schedule, layered on top of (never replacing) Phase 4's baseline tick.
export const ON_CALL_PRESSURE_DIVISORS = {
  fatigue: 3,
  stress: 4,
};

// §14 — flat per-shift rate plus a weekend bonus; kept simple on purpose,
// no branch-specific pay rates (branch already differentiates SHIFT COUNT,
// doubling down on pay rate too would just compound the same variable).
export const ON_CALL_PAY_CONFIG = {
  payPerShift: 900,
  weekendBonusPerShift: 400,
};

// §13 — fictional TL figures, not a real-salary simulation (see the
// design rationale in the Phase 7 report). Proportions matter more than
// absolute realism: a comez earns noticeably less than a kıdemli, on-call
// pay is a meaningful fraction of the base, not a rounding error.
//
// Tuned against the headless economy sim (§30/§17) rather than picked
// blindly — the first pass (baseSalary 28000, +4000/+9000 seniority) left
// the average run stacking >1.2M TL over a residency with 0% ever going
// negative, which is exactly the "everyone hoards millions" failure mode
// §30 explicitly calls out. These lower figures bring the average month
// down to a small buffer instead of a landslide (see the report).
export const SALARY_CONFIG = {
  baseSalary: 17000,
  seniorityModifier: {
    none: 0,
    comez: 0,
    orta: 3000,
    kidemli: 6500,
  } satisfies Record<SeniorityStage, number>,
};

// §15 — base (city/background-independent) monthly expenses. Rent is
// computed separately (city rentIndex + background), see
// domain/economy/expenses.ts.
export const BASE_MONTHLY_EXPENSES = {
  food: 5500,
  utilities: 1600,
  fixedOther: 1200,
};

// §16 — city cost/rent indices (0..100) scaled into TL. A fixed
// reference rent at index 50 keeps the scale legible without hardcoding
// a city name anywhere in the formula.
export const CITY_COST_CONFIG = {
  rentAtIndex50: 7500,
  transportAtIndex50: 1600,
};
