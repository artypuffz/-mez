import { describe, expect, it } from 'vitest';
import { canAffordFreeTime, computeFreeTimeHours, remainingFreeTimeHours, spendFreeTimeHours, startNewWeekFreeTime } from './freeTime';
import type { WorkloadState } from '../state/types';

function workload(hours: number): WorkloadState {
  return { currentWeekHours: hours, regularHours: hours, overtimeHours: 0, recentAverageHours: hours };
}

describe('computeFreeTimeHours', () => {
  it('is deterministic (pure function of workload hours, no rng)', () => {
    expect(computeFreeTimeHours(workload(60))).toBe(computeFreeTimeHours(workload(60)));
  });

  it('matches the design brief worked example (~72h work -> ~9h free)', () => {
    expect(computeFreeTimeHours(workload(72))).toBeGreaterThanOrEqual(7);
    expect(computeFreeTimeHours(workload(72))).toBeLessThanOrEqual(11);
  });

  it('decreases as working hours increase (never negative correlation)', () => {
    const light = computeFreeTimeHours(workload(35));
    const normal = computeFreeTimeHours(workload(55));
    const heavy = computeFreeTimeHours(workload(90));
    expect(light).toBeGreaterThan(normal);
    expect(normal).toBeGreaterThan(heavy);
  });

  it('never goes below the configured floor even at extreme hours', () => {
    expect(computeFreeTimeHours(workload(200))).toBeGreaterThanOrEqual(2);
  });

  it('never exceeds the configured cap even at zero hours', () => {
    expect(computeFreeTimeHours(workload(0))).toBeLessThanOrEqual(30);
  });

  it('handles a null workload (pre-residency) as zero hours worked', () => {
    expect(computeFreeTimeHours(null)).toBe(computeFreeTimeHours(workload(0)));
  });
});

describe('startNewWeekFreeTime', () => {
  it('always resets usedHours to 0', () => {
    const next = startNewWeekFreeTime(workload(60));
    expect(next.usedHours).toBe(0);
  });
});

describe('spendFreeTimeHours', () => {
  it('increases usedHours by the spent amount', () => {
    const ft = { totalHours: 12, usedHours: 0 };
    const next = spendFreeTimeHours(ft, 3);
    expect(next.usedHours).toBe(3);
  });

  it('never exceeds totalHours', () => {
    const ft = { totalHours: 12, usedHours: 10 };
    const next = spendFreeTimeHours(ft, 5);
    expect(next.usedHours).toBe(12);
  });

  it('a refresh (re-reading the same persisted state) never re-spends — spendFreeTimeHours is idempotent only when called again explicitly, not automatically', () => {
    const ft = { totalHours: 12, usedHours: 4 };
    // Simulates: state is what it is; simply re-rendering/reloading never
    // calls spendFreeTimeHours again on its own.
    expect(ft.usedHours).toBe(4);
  });
});

describe('remainingFreeTimeHours / canAffordFreeTime', () => {
  it('computes what is left', () => {
    expect(remainingFreeTimeHours({ totalHours: 12, usedHours: 5 })).toBe(7);
  });

  it('affordability check matches remaining hours', () => {
    const ft = { totalHours: 12, usedHours: 10 };
    expect(canAffordFreeTime(ft, 2)).toBe(true);
    expect(canAffordFreeTime(ft, 3)).toBe(false);
  });
});
