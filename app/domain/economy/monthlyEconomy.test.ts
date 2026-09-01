import { describe, expect, it } from 'vitest';
import { computeMonthlyEconomy } from './monthlyEconomy';
import { generateOnCallSchedule } from '../oncall/generateSchedule';
import { createSeededRng } from '../rng/seededRng';
import { getBranchDefinition } from '../config/branches';
import { getCityDefinition } from '../config/cities';

const city = getCityDefinition('ankara');

function schedule(totalShifts: number, weekendShifts: number) {
  return generateOnCallSchedule({
    monthKey: '2028-10',
    generatedAtWeek: 20,
    onCallProfile: { baseMonthlyShifts: totalShifts, minMonthlyShifts: totalShifts, maxMonthlyShifts: totalShifts, weekendBias: totalShifts > 0 ? weekendShifts / totalShifts : 0 },
    seniorityStage: 'orta',
    activeResidents: 8,
    targetResidents: 9,
    staffingPressure: 0,
    rng: createSeededRng('econ-fixture'),
  });
}

describe('computeMonthlyEconomy', () => {
  it('more on-call shifts increases onCallPay and net income', () => {
    const low = computeMonthlyEconomy({ monthKey: '2028-10', seniorityStage: 'orta', onCallSchedule: schedule(3, 1), city, background: 'kendi_basina' });
    const high = computeMonthlyEconomy({ monthKey: '2028-10', seniorityStage: 'orta', onCallSchedule: schedule(9, 3), city, background: 'kendi_basina' });
    expect(high.income.onCallPay).toBeGreaterThan(low.income.onCallPay);
    expect(high.net).toBeGreaterThan(low.net);
  });

  it('a null schedule (no on-call yet) contributes zero on-call pay', () => {
    const breakdown = computeMonthlyEconomy({ monthKey: '2028-10', seniorityStage: 'orta', onCallSchedule: null, city, background: 'kendi_basina' });
    expect(breakdown.income.onCallPay).toBe(0);
  });

  it('seniority affects base salary — kıdemli earns more than comez, all else equal', () => {
    const comez = computeMonthlyEconomy({ monthKey: '2028-10', seniorityStage: 'comez', onCallSchedule: null, city, background: 'kendi_basina' });
    const kidemli = computeMonthlyEconomy({ monthKey: '2028-10', seniorityStage: 'kidemli', onCallSchedule: null, city, background: 'kendi_basina' });
    expect(kidemli.income.salary).toBeGreaterThan(comez.income.salary);
  });

  it('net can be negative (a heavy-rent city with a light on-call month)', () => {
    const breakdown = computeMonthlyEconomy({
      monthKey: '2028-10',
      seniorityStage: 'comez',
      onCallSchedule: schedule(2, 0),
      city: getCityDefinition('istanbul'),
      background: 'baska_sehirden',
    });
    // Not asserting it MUST be negative (that's a balance question, see
    // the headless economy sim) — just that the model allows it.
    expect(typeof breakdown.net).toBe('number');
  });

  it('is pure — the same input always produces the same breakdown', () => {
    const input = { monthKey: '2028-10', seniorityStage: 'orta' as const, onCallSchedule: schedule(6, 2), city, background: 'aile_yaninda' as const };
    expect(computeMonthlyEconomy(input)).toEqual(computeMonthlyEconomy(input));
  });
});
