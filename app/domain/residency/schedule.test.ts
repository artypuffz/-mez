import { describe, expect, it } from 'vitest';
import { generateWeeklySchedule } from './schedule';
import { getBranchDefinition } from '../config/branches';
import { createSeededRng } from '../rng/seededRng';
import type { OnCallAssignment, WorkloadState } from '../state/types';

const cerrahi = getBranchDefinition('genel_cerrahi');
const psik = getBranchDefinition('psikiyatri');

function workload(hours: number): WorkloadState {
  return { currentWeekHours: hours, regularHours: hours, overtimeHours: 0, recentAverageHours: hours };
}

function onCallOn(...dates: string[]): OnCallAssignment[] {
  return dates.map((date, i) => ({ id: `a${i}`, date, type: 'weekday', assignedNpcId: 'player', source: 'generated' }));
}

describe('generateWeeklySchedule', () => {
  it('is deterministic for the same rng seed', () => {
    const a = generateWeeklySchedule(cerrahi, workload(70), [], '2026-01-05', 10, createSeededRng('sched-1'));
    const b = generateWeeklySchedule(cerrahi, workload(70), [], '2026-01-05', 10, createSeededRng('sched-1'));
    expect(a).toEqual(b);
  });

  it('produces exactly 7 days starting from weekStartDate', () => {
    const s = generateWeeklySchedule(cerrahi, workload(70), [], '2026-01-05', 10, createSeededRng('x'));
    expect(s.days).toHaveLength(7);
    expect(s.days[0].date).toBe('2026-01-05');
    expect(s.days[6].date).toBe('2026-01-11');
    expect(s.days.map((d) => d.dayIndex)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('reflects a real on-call assignment as a "nobet" slot on the exact assigned date', () => {
    const s = generateWeeklySchedule(cerrahi, workload(70), onCallOn('2026-01-07'), '2026-01-05', 10, createSeededRng('x'));
    const nobetDay = s.days.find((d) => d.date === '2026-01-07')!;
    expect(nobetDay.slots.some((slot) => slot.activity === 'nobet')).toBe(true);
  });

  it('marks the day after a nöbet as nobet_ertesi', () => {
    const s = generateWeeklySchedule(cerrahi, workload(70), onCallOn('2026-01-07'), '2026-01-05', 10, createSeededRng('x'));
    const nextDay = s.days.find((d) => d.date === '2026-01-08')!;
    expect(nextDay.slots.some((slot) => slot.activity === 'nobet_ertesi')).toBe(true);
  });

  it('never places ameliyathane for an outpatient/low-acute branch (Psikiyatri)', () => {
    for (let i = 0; i < 20; i++) {
      const s = generateWeeklySchedule(psik, workload(45), [], '2026-01-05', 10, createSeededRng(`psik-${i}`));
      for (const day of s.days) {
        expect(day.slots.some((slot) => slot.activity === 'ameliyathane')).toBe(false);
      }
    }
  });

  it('a surgical branch can place ameliyathane slots across enough seeds', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const s = generateWeeklySchedule(cerrahi, workload(75), [], '2026-01-05', 10, createSeededRng(`cerrahi-${i}`));
      for (const day of s.days) for (const slot of day.slots) seen.add(slot.activity);
    }
    expect(seen.has('ameliyathane')).toBe(true);
  });

  it('a heavier weekly workload fills more active slots (fewer boş days) than a light one', () => {
    const heavy = generateWeeklySchedule(cerrahi, workload(80), [], '2026-01-05', 10, createSeededRng('load'));
    const light = generateWeeklySchedule(cerrahi, workload(20), [], '2026-01-05', 10, createSeededRng('load'));
    const countBos = (s: typeof heavy) => s.days.filter((d) => d.slots.some((sl) => sl.activity === 'bos')).length;
    expect(countBos(light)).toBeGreaterThan(countBos(heavy));
  });

  it('handles a null workload without crashing (pre-residency safety)', () => {
    expect(() => generateWeeklySchedule(cerrahi, null, [], '2026-01-05', 10, createSeededRng('x'))).not.toThrow();
  });

  it('a nöbet on the last day of the week does not crash even though the follow-up day falls outside this window', () => {
    const s = generateWeeklySchedule(cerrahi, workload(70), onCallOn('2026-01-11'), '2026-01-05', 10, createSeededRng('x'));
    expect(s.days).toHaveLength(7);
    expect(s.days[6].slots.some((slot) => slot.activity === 'nobet')).toBe(true);
  });

  it('seniority effect flows through transparently via fewer/more onCall assignments passed in (no separate seniority logic needed here)', () => {
    const fewerShifts = generateWeeklySchedule(cerrahi, workload(70), onCallOn('2026-01-07'), '2026-01-05', 10, createSeededRng('x'));
    const moreShifts = generateWeeklySchedule(cerrahi, workload(70), onCallOn('2026-01-05', '2026-01-08'), '2026-01-05', 10, createSeededRng('x'));
    const countNobet = (s: typeof fewerShifts) => s.days.filter((d) => d.slots.some((sl) => sl.activity === 'nobet')).length;
    expect(countNobet(moreShifts)).toBeGreaterThan(countNobet(fewerShifts));
  });
});
