import { describe, expect, it } from 'vitest';
import { getResidencyYear } from './residencyYear';

describe('getResidencyYear', () => {
  it('is year 1 before any week has passed', () => {
    expect(getResidencyYear(0)).toBe(1);
  });

  it('is year 1 for week 1', () => {
    expect(getResidencyYear(1)).toBe(1);
  });

  it('is still year 1 at week 52 — the naive floor(week/52)+1 gets this wrong', () => {
    expect(getResidencyYear(52)).toBe(1);
  });

  it('becomes year 2 at week 53', () => {
    expect(getResidencyYear(53)).toBe(2);
  });

  it('is still year 2 at week 104', () => {
    expect(getResidencyYear(104)).toBe(2);
  });

  it('becomes year 3 at week 105', () => {
    expect(getResidencyYear(105)).toBe(3);
  });

  it('matches total-weeks expectations for a 4-year branch (208 weeks)', () => {
    expect(getResidencyYear(207)).toBe(4);
    expect(getResidencyYear(208)).toBe(4);
  });

  it('matches total-weeks expectations for a 5-year branch (260 weeks)', () => {
    expect(getResidencyYear(259)).toBe(5);
    expect(getResidencyYear(260)).toBe(5);
  });
});
