import { describe, expect, it } from 'vitest';
import { filterAvailablePrograms } from './filterAvailablePrograms';
import { RESIDENCY_PROGRAMS } from '../config/residencyPrograms';
import { DEFAULT_TUS_SCORE_CONFIG } from '../config/tusScoreConfig';

describe('filterAvailablePrograms', () => {
  it('excludes scored programs above the given score', () => {
    const lowScore = 22;
    const result = filterAvailablePrograms(RESIDENCY_PROGRAMS, lowScore);
    for (const program of result) {
      if (program.minScore !== undefined) {
        expect(program.minScore).toBeLessThanOrEqual(lowScore);
      }
    }
    expect(result.length).toBeLessThan(RESIDENCY_PROGRAMS.length);
  });

  it('includes every program whose minScore is met', () => {
    const highScore = 95;
    const result = filterAvailablePrograms(RESIDENCY_PROGRAMS, highScore);
    const expectedIds = RESIDENCY_PROGRAMS.filter(
      (p) => p.minScore === undefined || p.minScore <= highScore
    ).map((p) => p.id);
    expect(result.map((p) => p.id).sort()).toEqual(expectedIds.sort());
  });

  // Phase 11 — real ÖSYM programs ship with no verified minScore; they
  // must stay selectable at every score rather than becoming permanently
  // unreachable because we don't have official taban puanı data for them.
  it('includes every program with no minScore regardless of score', () => {
    const veryLowScore = DEFAULT_TUS_SCORE_CONFIG.minScore;
    const result = filterAvailablePrograms(RESIDENCY_PROGRAMS, veryLowScore);
    const unscoredIds = RESIDENCY_PROGRAMS.filter((p) => p.minScore === undefined).map((p) => p.id);
    expect(unscoredIds.length).toBeGreaterThan(0);
    const resultIds = new Set(result.map((p) => p.id));
    for (const id of unscoredIds) {
      expect(resultIds.has(id)).toBe(true);
    }
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
