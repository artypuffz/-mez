import { describe, expect, it } from 'vitest';
import { generateOnCallSchedule } from './generateSchedule';
import { createSeededRng } from '../rng/seededRng';
import { getBranchDefinition } from '../config/branches';
import { GLOBAL_SHIFT_BOUNDS } from '../config/onCallEconomyConfig';

const icOnCall = getBranchDefinition('ic_hastaliklari').onCallProfile;
const cerrahiOnCall = getBranchDefinition('genel_cerrahi').onCallProfile;

function baseInput(overrides: Partial<Parameters<typeof generateOnCallSchedule>[0]> = {}) {
  return {
    monthKey: '2028-10',
    generatedAtWeek: 20,
    onCallProfile: icOnCall,
    seniorityStage: 'orta' as const,
    activeResidents: 8,
    targetResidents: 9,
    staffingPressure: 40,
    rng: createSeededRng('sched-seed'),
    ...overrides,
  };
}

describe('generateOnCallSchedule', () => {
  it('is deterministic for the same rng seed/month (refresh must not reroll)', () => {
    const a = generateOnCallSchedule(baseInput({ rng: createSeededRng('same-seed') }));
    const b = generateOnCallSchedule(baseInput({ rng: createSeededRng('same-seed') }));
    expect(a).toEqual(b);
  });

  it('a different seed can produce a different schedule', () => {
    const a = generateOnCallSchedule(baseInput({ rng: createSeededRng('seed-a') }));
    const b = generateOnCallSchedule(baseInput({ rng: createSeededRng('seed-b') }));
    expect(a).not.toEqual(b);
  });

  it('branch baseline affects the shift count — genel cerrahi trends higher than iç hastalıkları', () => {
    const samples = (profile: typeof icOnCall) =>
      Array.from({ length: 20 }, (_, i) => generateOnCallSchedule(baseInput({ onCallProfile: profile, rng: createSeededRng(`branch-${i}`) })).player.totalShifts);
    const icAvg = samples(icOnCall).reduce((a, b) => a + b, 0) / 20;
    const cerrahiAvg = samples(cerrahiOnCall).reduce((a, b) => a + b, 0) / 20;
    expect(cerrahiAvg).toBeGreaterThan(icAvg);
  });

  it('seniority affects the shift count — comez trends higher than kıdemli, all else equal', () => {
    const samples = (stage: 'comez' | 'kidemli') =>
      Array.from({ length: 20 }, (_, i) => generateOnCallSchedule(baseInput({ seniorityStage: stage, rng: createSeededRng(`sen-${i}`) })).player.totalShifts);
    const comezAvg = samples('comez').reduce((a, b) => a + b, 0) / 20;
    const kidemliAvg = samples('kidemli').reduce((a, b) => a + b, 0) / 20;
    expect(comezAvg).toBeGreaterThan(kidemliAvg);
  });

  it('a staffing shortage trends the shift count up, all else equal', () => {
    const samples = (activeResidents: number) =>
      Array.from({ length: 20 }, (_, i) => generateOnCallSchedule(baseInput({ activeResidents, targetResidents: 9, rng: createSeededRng(`staff-${i}`) })).player.totalShifts);
    const fullAvg = samples(9).reduce((a, b) => a + b, 0) / 20;
    const shortAvg = samples(2).reduce((a, b) => a + b, 0) / 20;
    expect(shortAvg).toBeGreaterThan(fullAvg);
  });

  it('respects the branch min/max clamp and the global [2,12] safety band', () => {
    for (let i = 0; i < 50; i++) {
      const schedule = generateOnCallSchedule(baseInput({ activeResidents: 0, staffingPressure: 100, rng: createSeededRng(`clamp-${i}`) }));
      expect(schedule.player.totalShifts).toBeGreaterThanOrEqual(Math.max(GLOBAL_SHIFT_BOUNDS[0], icOnCall.minMonthlyShifts));
      expect(schedule.player.totalShifts).toBeLessThanOrEqual(Math.min(GLOBAL_SHIFT_BOUNDS[1], icOnCall.maxMonthlyShifts));
      expect(schedule.player.totalShifts).toBeGreaterThanOrEqual(GLOBAL_SHIFT_BOUNDS[0]);
      expect(schedule.player.totalShifts).toBeLessThanOrEqual(GLOBAL_SHIFT_BOUNDS[1]);
    }
  });

  it('never double-books the player on the same date', () => {
    const schedule = generateOnCallSchedule(baseInput());
    const dates = schedule.assignments.map((a) => a.date);
    expect(new Set(dates).size).toBe(dates.length);
  });

  it('every assignment date falls within the requested month', () => {
    const schedule = generateOnCallSchedule(baseInput({ monthKey: '2028-02' }));
    expect(schedule.assignments.every((a) => a.date.startsWith('2028-02'))).toBe(true);
  });

  it('player.totalShifts/weekendShifts always match the actual assignments array', () => {
    const schedule = generateOnCallSchedule(baseInput());
    expect(schedule.player.totalShifts).toBe(schedule.assignments.length);
    expect(schedule.player.weekendShifts).toBe(schedule.assignments.filter((a) => a.type === 'weekend').length);
  });
});
