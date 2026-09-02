import { describe, expect, it } from 'vitest';
import { applyWeeklyHealth, applyWeeklySocial } from './wellbeing';
import type { ResourcePressureState, WorkloadState } from '../state/types';

const ZERO_PRESSURE: ResourcePressureState = { highStressWeeks: 0, highFatigueWeeks: 0, combinedPressureWeeks: 0, lowPressureWeeks: 0 };

function workload(hours: number): WorkloadState {
  return { currentWeekHours: hours, regularHours: hours, overtimeHours: 0, recentAverageHours: hours };
}

describe('applyWeeklyHealth', () => {
  it('does not change on a single ordinary week', () => {
    const next = applyWeeklyHealth(80, {
      resourcePressure: ZERO_PRESSURE,
      burnout: 10,
      workload: workload(45),
      lifestyleHealthModifier: 0,
    });
    expect(next).toBe(80);
  });

  it('drops under sustained combined pressure (moderate streak)', () => {
    const pressure = { ...ZERO_PRESSURE, combinedPressureWeeks: 4 };
    const next = applyWeeklyHealth(80, { resourcePressure: pressure, burnout: 10, workload: workload(45), lifestyleHealthModifier: 0 });
    expect(next).toBeLessThan(80);
  });

  it('drops MORE under severe sustained pressure than moderate', () => {
    const moderate = { ...ZERO_PRESSURE, combinedPressureWeeks: 4 };
    const severe = { ...ZERO_PRESSURE, combinedPressureWeeks: 8 };
    const moderateDrop = 80 - applyWeeklyHealth(80, { resourcePressure: moderate, burnout: 10, workload: workload(45), lifestyleHealthModifier: 0 });
    const severeDrop = 80 - applyWeeklyHealth(80, { resourcePressure: severe, burnout: 10, workload: workload(45), lifestyleHealthModifier: 0 });
    expect(severeDrop).toBeGreaterThan(moderateDrop);
  });

  it('drops under high burnout even with no current stress/fatigue streak', () => {
    const next = applyWeeklyHealth(80, { resourcePressure: ZERO_PRESSURE, burnout: 85, workload: workload(45), lifestyleHealthModifier: 0 });
    expect(next).toBeLessThan(80);
  });

  it('drops under heavy weekly hours directly', () => {
    const next = applyWeeklyHealth(80, { resourcePressure: ZERO_PRESSURE, burnout: 10, workload: workload(90), lifestyleHealthModifier: 0 });
    expect(next).toBeLessThan(80);
  });

  it('recovers after a genuine sustained low-pressure streak with light hours', () => {
    const pressure = { ...ZERO_PRESSURE, lowPressureWeeks: 4 };
    const next = applyWeeklyHealth(50, { resourcePressure: pressure, burnout: 0, workload: workload(40), lifestyleHealthModifier: 0 });
    expect(next).toBeGreaterThan(50);
  });

  it('does NOT recover if hours are still at/above the rest threshold (but below the heavy-hours penalty threshold, so delta is exactly 0)', () => {
    const pressure = { ...ZERO_PRESSURE, lowPressureWeeks: 4 };
    const next = applyWeeklyHealth(50, { resourcePressure: pressure, burnout: 0, workload: workload(65), lifestyleHealthModifier: 0 });
    expect(next).toBe(50);
  });

  it('a positive lifestyle modifier nudges health up even in an otherwise neutral week', () => {
    const next = applyWeeklyHealth(50, { resourcePressure: ZERO_PRESSURE, burnout: 10, workload: workload(45), lifestyleHealthModifier: 2 });
    expect(next).toBeGreaterThan(50);
  });

  it('a negative lifestyle modifier nudges health down', () => {
    const next = applyWeeklyHealth(50, { resourcePressure: ZERO_PRESSURE, burnout: 10, workload: workload(45), lifestyleHealthModifier: -2 });
    expect(next).toBeLessThan(50);
  });

  it('clamps to [0,100]', () => {
    const severe = { ...ZERO_PRESSURE, combinedPressureWeeks: 8 };
    expect(applyWeeklyHealth(0, { resourcePressure: severe, burnout: 90, workload: workload(95), lifestyleHealthModifier: -5 })).toBeGreaterThanOrEqual(0);
    const lowPressure = { ...ZERO_PRESSURE, lowPressureWeeks: 5 };
    expect(applyWeeklyHealth(100, { resourcePressure: lowPressure, burnout: 0, workload: workload(30), lifestyleHealthModifier: 5 })).toBeLessThanOrEqual(100);
  });

  it('never a huge single-week swing (bounded delta range)', () => {
    const severe = { ...ZERO_PRESSURE, combinedPressureWeeks: 8 };
    const next = applyWeeklyHealth(50, { resourcePressure: severe, burnout: 90, workload: workload(95), lifestyleHealthModifier: -5 });
    expect(50 - next).toBeLessThanOrEqual(5);
  });
});

describe('applyWeeklySocial', () => {
  it('does not change on an ordinary week', () => {
    const next = applyWeeklySocial(50, { workload: workload(45), freeTimeHoursThisWeek: 10 });
    expect(next).toBe(50);
  });

  it('drops on a heavy-hours week', () => {
    const next = applyWeeklySocial(50, { workload: workload(90), freeTimeHoursThisWeek: 4 });
    expect(next).toBeLessThan(50);
  });

  it('drops when free time is scarce, independent of raw hours', () => {
    const next = applyWeeklySocial(50, { workload: workload(45), freeTimeHoursThisWeek: 3 });
    expect(next).toBeLessThan(50);
  });

  it('passively recovers on a genuinely light week (ample free time)', () => {
    const next = applyWeeklySocial(50, { workload: workload(35), freeTimeHoursThisWeek: 20 });
    expect(next).toBeGreaterThan(50);
  });

  it('clamps to [0,100]', () => {
    expect(applyWeeklySocial(0, { workload: workload(95), freeTimeHoursThisWeek: 0 })).toBeGreaterThanOrEqual(0);
    expect(applyWeeklySocial(100, { workload: workload(30), freeTimeHoursThisWeek: 25 })).toBeLessThanOrEqual(100);
  });
});
