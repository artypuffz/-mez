import { describe, expect, it } from 'vitest';
import { filterAvailablePrograms } from './filterAvailablePrograms';
import { RESIDENCY_PROGRAMS, PRODUCTION_PROGRAMS } from '../config/residencyPrograms';
import { DEFAULT_TUS_SCORE_CONFIG } from '../config/tusScoreConfig';
import { resolveEntryThreshold } from './resolveEntryThreshold';

describe('filterAvailablePrograms', () => {
  it('excludes scored programs above the given score', () => {
    const lowScore = 22;
    const result = filterAvailablePrograms(RESIDENCY_PROGRAMS, lowScore);
    for (const program of result) {
      const threshold = resolveEntryThreshold(program);
      if (threshold !== undefined) {
        expect(threshold).toBeLessThanOrEqual(lowScore);
      }
    }
    expect(result.length).toBeLessThan(RESIDENCY_PROGRAMS.length);
  });

  it('includes every program whose threshold is met', () => {
    const highScore = 95;
    const result = filterAvailablePrograms(RESIDENCY_PROGRAMS, highScore);
    const expectedIds = RESIDENCY_PROGRAMS.filter((p) => {
      const threshold = resolveEntryThreshold(p);
      return threshold === undefined || threshold <= highScore;
    }).map((p) => p.id);
    expect(result.map((p) => p.id).sort()).toEqual(expectedIds.sort());
  });

  // Android Device QA Hotfix 1, Issue 2 — this is the fix for the original
  // Phase 11 bug: real ÖSYM programs have no official minScore, but they
  // now ALWAYS carry a computed gameplayEntryThreshold (see
  // deriveGameplayEntryThreshold in residencyPrograms.ts), so
  // resolveEntryThreshold never returns undefined for a real program.
  // "No official score" must never again mean "always available".
  it('every real production program carries a resolvable entry threshold', () => {
    for (const program of PRODUCTION_PROGRAMS) {
      expect(resolveEntryThreshold(program)).toBeDefined();
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

  // Android Device QA Hotfix 1, Issue 2 — a low score must not select
  // every program; this is the core symptom the ticket reported.
  it('a low score cannot select every production program', () => {
    const lowScore = DEFAULT_TUS_SCORE_CONFIG.minScore;
    const result = filterAvailablePrograms(PRODUCTION_PROGRAMS, lowScore);
    expect(result.length).toBeLessThan(PRODUCTION_PROGRAMS.length);
  });

  // Monotonicity: raising the score can only add programs, never remove any.
  it('increasing score monotonically expands the available set', () => {
    const scores = [20, 35, 50, 65, 80, 95];
    let previous = new Set<string>();
    for (const score of scores) {
      const current = new Set(filterAvailablePrograms(PRODUCTION_PROGRAMS, score).map((p) => p.id));
      for (const id of previous) {
        expect(current.has(id)).toBe(true);
      }
      previous = current;
    }
  });
});
