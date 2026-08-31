import { describe, expect, it } from 'vitest';
import { filterAvailablePrograms } from './filterAvailablePrograms';
import { RESIDENCY_PROGRAMS } from '../config/residencyPrograms';
import { DEFAULT_TUS_SCORE_CONFIG } from '../config/tusScoreConfig';

describe('filterAvailablePrograms', () => {
  it('excludes programs above the given score', () => {
    const lowScore = 22;
    const result = filterAvailablePrograms(RESIDENCY_PROGRAMS, lowScore);
    for (const program of result) {
      expect(program.minScore).toBeLessThanOrEqual(lowScore);
    }
    expect(result.length).toBeLessThan(RESIDENCY_PROGRAMS.length);
  });

  it('includes every program whose minScore is met', () => {
    const highScore = 95;
    const result = filterAvailablePrograms(RESIDENCY_PROGRAMS, highScore);
    const expectedIds = RESIDENCY_PROGRAMS.filter((p) => p.minScore <= highScore).map((p) => p.id);
    expect(result.map((p) => p.id).sort()).toEqual(expectedIds.sort());
  });

  it('has at least one program available at every 5-point score band in the MVP range', () => {
    for (let score = DEFAULT_TUS_SCORE_CONFIG.minScore; score <= DEFAULT_TUS_SCORE_CONFIG.maxScore; score += 5) {
      const available = filterAvailablePrograms(RESIDENCY_PROGRAMS, score);
      expect(available.length).toBeGreaterThan(0);
    }
  });

  it('never locks the player out at the absolute score floor', () => {
    const result = filterAvailablePrograms(RESIDENCY_PROGRAMS, DEFAULT_TUS_SCORE_CONFIG.minScore);
    expect(result.length).toBeGreaterThan(0);
  });
});
