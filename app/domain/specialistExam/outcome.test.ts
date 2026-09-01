import { describe, expect, it } from 'vitest';
import { calculateSpecialistExamOutcome, buildExamFactors, type SpecialistExamFactors } from './outcome';
import { createSeededRng } from '../rng/seededRng';
import { createInitialGameState } from '../state/createInitialGameState';

function baseFactors(overrides: Partial<SpecialistExamFactors> = {}): SpecialistExamFactors {
  return {
    preparationPoints: 20,
    finalBurnout: 30,
    finalStress: 40,
    finalFatigue: 40,
    crisisRecoveredRatio: 0.5,
    highTrustRelationshipCount: 1,
    careerOpportunitiesTaken: 1,
    attempt: 1,
    ...overrides,
  };
}

describe('calculateSpecialistExamOutcome', () => {
  it('is deterministic for the same factors + seed', () => {
    const a = calculateSpecialistExamOutcome(baseFactors(), createSeededRng('exam-det'));
    const b = calculateSpecialistExamOutcome(baseFactors(), createSeededRng('exam-det'));
    expect(a).toEqual(b);
  });

  it('no single factor alone can push passProbability to the extremes', () => {
    const worstBurnout = calculateSpecialistExamOutcome(baseFactors({ finalBurnout: 100, finalStress: 100, finalFatigue: 100 }), createSeededRng('x'));
    expect(worstBurnout.passProbability).toBeGreaterThan(0.05);
    const zeroEverything = calculateSpecialistExamOutcome(
      baseFactors({ preparationPoints: 0, crisisRecoveredRatio: 0, highTrustRelationshipCount: 0, careerOpportunitiesTaken: 0 }),
      createSeededRng('x')
    );
    expect(zeroEverything.passProbability).toBeGreaterThan(0.3);
  });

  it('higher preparation increases the score', () => {
    const low = calculateSpecialistExamOutcome(baseFactors({ preparationPoints: 0 }), createSeededRng('x'));
    const high = calculateSpecialistExamOutcome(baseFactors({ preparationPoints: 50 }), createSeededRng('x'));
    expect(high.score).toBeGreaterThan(low.score);
  });

  it('higher burnout decreases the score', () => {
    const low = calculateSpecialistExamOutcome(baseFactors({ finalBurnout: 10 }), createSeededRng('x'));
    const high = calculateSpecialistExamOutcome(baseFactors({ finalBurnout: 90 }), createSeededRng('x'));
    expect(high.score).toBeLessThan(low.score);
  });

  it('a second attempt scores higher than an identical first attempt', () => {
    const first = calculateSpecialistExamOutcome(baseFactors({ attempt: 1 }), createSeededRng('x'));
    const second = calculateSpecialistExamOutcome(baseFactors({ attempt: 2 }), createSeededRng('x'));
    expect(second.score).toBeGreaterThan(first.score);
  });

  it('score/probability always stay within [0,100]/[0.05,0.97]', () => {
    const extreme = calculateSpecialistExamOutcome(
      baseFactors({ preparationPoints: 1000, finalBurnout: 0, finalStress: 0, finalFatigue: 0, crisisRecoveredRatio: 1, highTrustRelationshipCount: 99, careerOpportunitiesTaken: 99, attempt: 2 }),
      createSeededRng('x')
    );
    expect(extreme.score).toBeLessThanOrEqual(100);
    expect(extreme.passProbability).toBeLessThanOrEqual(0.97);
  });
});

describe('buildExamFactors', () => {
  it('reads factors off a fresh GameState without throwing, with sane defaults', () => {
    const state = createInitialGameState({ name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' });
    const factors = buildExamFactors(state);
    expect(factors.attempt).toBe(1);
    expect(factors.preparationPoints).toBe(0);
    expect(factors.crisisRecoveredRatio).toBe(0.5); // no crises yet — neutral, not punished
  });
});
