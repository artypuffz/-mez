import { describe, expect, it } from 'vitest';
import { computeOnCallPressureModifier } from './pressure';
import { generateOnCallSchedule } from './generateSchedule';
import { createSeededRng } from '../rng/seededRng';

function schedule(totalShifts: number) {
  return generateOnCallSchedule({
    monthKey: '2028-10',
    generatedAtWeek: 20,
    onCallProfile: { baseMonthlyShifts: totalShifts, minMonthlyShifts: totalShifts, maxMonthlyShifts: totalShifts, weekendBias: 0.3 },
    seniorityStage: 'orta',
    activeResidents: 8,
    targetResidents: 9,
    staffingPressure: 0,
    rng: createSeededRng('pressure-fixture'),
  });
}

describe('computeOnCallPressureModifier', () => {
  it('is empty for a null schedule', () => {
    expect(computeOnCallPressureModifier(null)).toEqual({});
  });

  it('a heavier month produces a larger fatigue/stress nudge than a light one', () => {
    const light = computeOnCallPressureModifier(schedule(2));
    const heavy = computeOnCallPressureModifier(schedule(12));
    expect((heavy.fatigue ?? 0)).toBeGreaterThan(light.fatigue ?? 0);
    expect((heavy.stress ?? 0)).toBeGreaterThan(light.stress ?? 0);
  });

  it('stays small — never anywhere close to Phase 4s own weekly baseline swings', () => {
    const heavy = computeOnCallPressureModifier(schedule(12));
    expect(heavy.fatigue ?? 0).toBeLessThanOrEqual(6);
    expect(heavy.stress ?? 0).toBeLessThanOrEqual(6);
  });
});
