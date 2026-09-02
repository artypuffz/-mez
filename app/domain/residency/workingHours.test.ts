import { describe, expect, it } from 'vitest';
import {
  applyOvertimeHours,
  computeWeeklyWorkload,
  deriveRegularHours,
  effectiveWorkingHoursAxis,
  workingHoursPressureBand,
} from './workingHours';
import { createSeededRng } from '../rng/seededRng';
import { getBranchDefinition } from '../config/branches';
import { getResidencyProgram, RESIDENCY_PROGRAMS } from '../config/residencyPrograms';

const icProgram = getResidencyProgram('baskent_ic'); // workingHours 4.3
const cerrahiProgram = getResidencyProgram('porsuk_cerrahi'); // workingHours 5.0
const psikProgram = getResidencyProgram('baskent_psik'); // workingHours 2.8

describe('deriveRegularHours', () => {
  it('is deterministic for the same rng state', () => {
    expect(deriveRegularHours(4.3, createSeededRng('same'))).toBe(deriveRegularHours(4.3, createSeededRng('same')));
  });

  it('stays inside the §16 band for the axis value', () => {
    for (let i = 0; i < 50; i++) {
      const hours = deriveRegularHours(1.0, createSeededRng(`low-${i}`));
      expect(hours).toBeGreaterThanOrEqual(35);
      expect(hours).toBeLessThanOrEqual(45);
    }
    for (let i = 0; i < 50; i++) {
      const hours = deriveRegularHours(5.0, createSeededRng(`high-${i}`));
      expect(hours).toBeGreaterThanOrEqual(65);
      expect(hours).toBeLessThanOrEqual(90);
    }
  });

  it('a higher workingHours axis produces a higher AVERAGE regular-hours than a lower one (branch difficulty direction)', () => {
    const avg = (axis: number) => {
      const N = 60;
      let sum = 0;
      for (let i = 0; i < N; i++) sum += deriveRegularHours(axis, createSeededRng(`avg-${axis}-${i}`));
      return sum / N;
    };
    expect(avg(5.0)).toBeGreaterThan(avg(3.0));
    expect(avg(3.0)).toBeGreaterThan(avg(1.0));
  });
});

describe('effectiveWorkingHoursAxis', () => {
  it('reads the branch baseline when the program has no difficultyModifier', () => {
    const branch = getBranchDefinition(icProgram.branchId);
    expect(effectiveWorkingHoursAxis(branch, icProgram)).toBe(branch.difficultyBaseline.workingHours);
  });

  it('a program difficultyModifier nudges the axis, clamped 1-5', () => {
    const branch = getBranchDefinition(icProgram.branchId);
    const boosted = { ...icProgram, difficultyModifier: { onCallLoad: 0, workingHours: 0.5 } };
    expect(effectiveWorkingHoursAxis(branch, boosted)).toBeCloseTo(branch.difficultyBaseline.workingHours + 0.5, 5);
  });

  it('branch identity dominates: nearly all real programs ship with modifier 0 in this phase', () => {
    const withModifier = RESIDENCY_PROGRAMS.filter((p) => p.difficultyModifier);
    expect(withModifier.length).toBe(0);
  });
});

describe('computeWeeklyWorkload', () => {
  it('is deterministic for the same rng state', () => {
    const branch = getBranchDefinition(icProgram.branchId);
    const a = computeWeeklyWorkload(branch, icProgram, null, createSeededRng('week-1'));
    const b = computeWeeklyWorkload(branch, icProgram, null, createSeededRng('week-1'));
    expect(a).toEqual(b);
  });

  it('resets overtimeHours to 0 each week regardless of the previous week', () => {
    const branch = getBranchDefinition(icProgram.branchId);
    const previous = { currentWeekHours: 80, regularHours: 40, overtimeHours: 40, recentAverageHours: 60 };
    const next = computeWeeklyWorkload(branch, icProgram, previous, createSeededRng('rollover'));
    expect(next.overtimeHours).toBe(0);
    expect(next.currentWeekHours).toBe(next.regularHours);
  });

  it('a harder branch (Genel Cerrahi, workingHours 5.0) trends higher regularHours than an easier one (Psikiyatri, 2.8)', () => {
    const cerrahiBranch = getBranchDefinition(cerrahiProgram.branchId);
    const psikBranch = getBranchDefinition(psikProgram.branchId);
    const avg = (branch: typeof cerrahiBranch, program: typeof cerrahiProgram) => {
      const N = 40;
      let sum = 0;
      for (let i = 0; i < N; i++) {
        sum += computeWeeklyWorkload(branch, program, null, createSeededRng(`branch-${i}`)).regularHours;
      }
      return sum / N;
    };
    expect(avg(cerrahiBranch, cerrahiProgram)).toBeGreaterThan(avg(psikBranch, psikProgram));
  });

  it('recentAverageHours smooths toward the new week rather than jumping instantly', () => {
    const branch = getBranchDefinition(icProgram.branchId);
    const previous = { currentWeekHours: 40, regularHours: 40, overtimeHours: 0, recentAverageHours: 40 };
    const next = computeWeeklyWorkload(branch, icProgram, previous, createSeededRng('smoothing'));
    // Should sit somewhere between the previous average and this week's fresh value, not equal either exactly
    // (unless they happen to already coincide) and never wildly outside their span.
    const lower = Math.min(previous.recentAverageHours, next.regularHours);
    const upper = Math.max(previous.recentAverageHours, next.regularHours);
    expect(next.recentAverageHours).toBeGreaterThanOrEqual(lower);
    expect(next.recentAverageHours).toBeLessThanOrEqual(upper);
  });
});

describe('applyOvertimeHours', () => {
  it('adds hours to both overtimeHours and currentWeekHours', () => {
    const workload = { currentWeekHours: 40, regularHours: 40, overtimeHours: 0, recentAverageHours: 40 };
    const next = applyOvertimeHours(workload, 4);
    expect(next?.overtimeHours).toBe(4);
    expect(next?.currentWeekHours).toBe(44);
  });

  it('is a safe no-op on a null workload', () => {
    expect(applyOvertimeHours(null, 4)).toBeNull();
  });

  it('never leaves overtimeHours negative', () => {
    const workload = { currentWeekHours: 40, regularHours: 40, overtimeHours: 2, recentAverageHours: 40 };
    const next = applyOvertimeHours(workload, -10);
    expect(next?.overtimeHours).toBeGreaterThanOrEqual(0);
  });
});

describe('workingHoursPressureBand — on-call double-counting check (§17)', () => {
  it('never reads the on-call schedule at all — pure function of hours only', () => {
    // Type-level guarantee: the function only accepts a number. This test
    // documents/locks that contract so a future change can't silently
    // reintroduce an onCall-schedule parameter that would double-count
    // against computeOnCallPressureModifier's own separate contribution.
    expect(workingHoursPressureBand.length).toBe(1);
  });

  it('is a small, banded delta — never proportional to raw hours (never a stress multiplier)', () => {
    const low = workingHoursPressureBand(30);
    const mid = workingHoursPressureBand(50);
    const high = workingHoursPressureBand(95);
    expect(low.fatigue).toBeLessThanOrEqual(0);
    expect(mid.fatigue).toBe(0);
    expect(high.fatigue).toBeGreaterThan(mid.fatigue);
    expect(high.fatigue).toBeLessThanOrEqual(3);
    expect(high.stress).toBeLessThanOrEqual(2);
  });

  it('monotonically increases with hours across every band boundary', () => {
    const points = [30, 44, 45, 59, 60, 74, 75, 89, 90, 120];
    const deltas = points.map((h) => workingHoursPressureBand(h).fatigue + workingHoursPressureBand(h).stress);
    for (let i = 1; i < deltas.length; i++) {
      expect(deltas[i]).toBeGreaterThanOrEqual(deltas[i - 1]);
    }
  });
});
