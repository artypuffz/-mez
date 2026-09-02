import { describe, expect, it } from 'vitest';
import { filterPrograms, sortPrograms } from './sortPrograms';
import { RESIDENCY_PROGRAMS } from '../config/residencyPrograms';
import { getBranchDefinition, getBranchOverallDifficulty } from '../config/branches';
import { getCityDefinition } from '../config/cities';

describe('sortPrograms', () => {
  it('sorts by score ascending, with unscored programs after every scored one', () => {
    const sorted = sortPrograms(RESIDENCY_PROGRAMS, 'score');
    const scoredIndices = sorted.map((p, i) => (p.minScore !== undefined ? i : -1)).filter((i) => i >= 0);
    const unscoredIndices = sorted.map((p, i) => (p.minScore === undefined ? i : -1)).filter((i) => i >= 0);
    if (scoredIndices.length > 0 && unscoredIndices.length > 0) {
      expect(Math.max(...scoredIndices)).toBeLessThan(Math.min(...unscoredIndices));
    }
    for (let i = 1; i < scoredIndices.length; i++) {
      expect(sorted[scoredIndices[i]].minScore!).toBeGreaterThanOrEqual(sorted[scoredIndices[i - 1]].minScore!);
    }
  });

  it('sorts by difficulty ascending', () => {
    const sorted = sortPrograms(RESIDENCY_PROGRAMS.slice(0, 200), 'difficulty');
    for (let i = 1; i < sorted.length; i++) {
      const prev = getBranchOverallDifficulty(getBranchDefinition(sorted[i - 1].branchId));
      const curr = getBranchOverallDifficulty(getBranchDefinition(sorted[i].branchId));
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  it('sorts by city name (Turkish-aware)', () => {
    const sorted = sortPrograms(RESIDENCY_PROGRAMS.slice(0, 50), 'city');
    for (let i = 1; i < sorted.length; i++) {
      const prevName = getCityDefinition(sorted[i - 1].cityId).name;
      const currName = getCityDefinition(sorted[i].cityId).name;
      expect(currName.localeCompare(prevName, 'tr')).toBeGreaterThanOrEqual(0);
    }
  });

  it('never mutates the input array', () => {
    const input = [...RESIDENCY_PROGRAMS.slice(0, 10)];
    const before = [...input];
    sortPrograms(input, 'score');
    expect(input).toEqual(before);
  });
});

describe('filterPrograms', () => {
  it('filters by cityId', () => {
    const result = filterPrograms(RESIDENCY_PROGRAMS, { cityId: 'ankara' });
    expect(result.length).toBeGreaterThan(0);
    for (const p of result) expect(p.cityId).toBe('ankara');
  });

  it('filters by branchId', () => {
    const result = filterPrograms(RESIDENCY_PROGRAMS, { branchId: 'kardiyoloji' });
    expect(result.length).toBeGreaterThan(0);
    for (const p of result) expect(p.branchId).toBe('kardiyoloji');
  });

  it('filters by both city and branch combined', () => {
    const result = filterPrograms(RESIDENCY_PROGRAMS, { cityId: 'istanbul', branchId: 'genel_cerrahi' });
    for (const p of result) {
      expect(p.cityId).toBe('istanbul');
      expect(p.branchId).toBe('genel_cerrahi');
    }
  });

  it('returns everything when no filters are set', () => {
    const result = filterPrograms(RESIDENCY_PROGRAMS, {});
    expect(result.length).toBe(RESIDENCY_PROGRAMS.length);
  });
});
