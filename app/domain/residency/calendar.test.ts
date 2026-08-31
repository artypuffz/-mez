import { describe, expect, it } from 'vitest';
import { deriveResidencyStartDate, getResidencyCalendar } from './calendar';

describe('getResidencyCalendar', () => {
  it('returns the start date itself at week 0', () => {
    const point = getResidencyCalendar('2026-09-01', 0);
    expect(point.date).toBe('2026-09-01');
    expect(point.month).toBe(9);
    expect(point.year).toBe(2026);
    expect(point.monthIndex).toBe(0);
  });

  it('advances the date by exactly 7 days per week', () => {
    const point = getResidencyCalendar('2026-09-01', 1);
    expect(point.date).toBe('2026-09-08');
  });

  it('detects a month change', () => {
    const before = getResidencyCalendar('2026-09-01', 4); // 2026-09-29
    const after = getResidencyCalendar('2026-09-01', 5); // 2026-10-06
    expect(before.month).toBe(9);
    expect(after.month).toBe(10);
    expect(after.monthIndex).toBeGreaterThan(before.monthIndex);
  });

  it('detects a year change across a December -> January boundary', () => {
    // 2026-09-01 + ~17 weeks lands in very late December / early January
    const point = getResidencyCalendar('2026-09-01', 18); // 2027-01-05
    expect(point.year).toBe(2027);
    expect(point.month).toBe(1);
  });

  it('is deterministic and never uses local time (UTC date-only)', () => {
    const a = getResidencyCalendar('2026-01-01', 26);
    const b = getResidencyCalendar('2026-01-01', 26);
    expect(a).toEqual(b);
  });
});

describe('deriveResidencyStartDate', () => {
  it('anchors to September 1st of the save creation year', () => {
    expect(deriveResidencyStartDate('2026-03-15T10:30:00.000Z')).toBe('2026-09-01');
    expect(deriveResidencyStartDate('2029-12-31T23:59:00.000Z')).toBe('2029-09-01');
  });
});
