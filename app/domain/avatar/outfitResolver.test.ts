import { describe, expect, it } from 'vitest';
import { resolveOutfitContext } from './outfitResolver';
import type { WeeklySchedule } from '../state/types';

function scheduleWith(activity: 'ameliyathane' | 'vizit'): WeeklySchedule {
  return {
    residencyWeek: 1,
    days: [{ dayIndex: 0, date: '2026-01-05', slots: [{ activity, startHour: 8, endHour: 12 }] }],
  };
}

describe('resolveOutfitContext', () => {
  it('is casual before/outside residency (character creation, tus, preference, gameover)', () => {
    for (const phase of ['character_creation', 'tus', 'preference', 'gameover'] as const) {
      expect(resolveOutfitContext({ phase, schedule: null })).toBe('casual');
    }
  });

  it('is specialist once the career phase is specialist', () => {
    expect(resolveOutfitContext({ phase: 'specialist', schedule: null })).toBe('specialist');
  });

  it('is white_coat during specialist_exam', () => {
    expect(resolveOutfitContext({ phase: 'specialist_exam', schedule: null })).toBe('white_coat');
  });

  it('is white_coat during residency with no OR slot this week', () => {
    expect(resolveOutfitContext({ phase: 'residency', schedule: scheduleWith('vizit') })).toBe('white_coat');
  });

  it('is white_coat during residency with no schedule yet (never crashes on null)', () => {
    expect(resolveOutfitContext({ phase: 'residency', schedule: null })).toBe('white_coat');
  });

  it('is surgical during residency when this week includes an ameliyathane slot', () => {
    expect(resolveOutfitContext({ phase: 'residency', schedule: scheduleWith('ameliyathane') })).toBe('surgical');
  });

  it('never reads/depends on anything other than phase and schedule (no gameplay side effects)', () => {
    const input = { phase: 'residency' as const, schedule: scheduleWith('vizit') };
    const before = JSON.parse(JSON.stringify(input));
    resolveOutfitContext(input);
    expect(input).toEqual(before);
  });
});
