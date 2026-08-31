import { describe, expect, it } from 'vitest';
import { applyWeeklyBurnout, applyWeeklyFatigue, applyWeeklyStress } from './weeklyResources';
import { createSeededRng } from '../rng/seededRng';
import { getBranchDefinition } from '../config/branches';
import { getResidencyProgram } from '../config/residencyPrograms';

const branch = getBranchDefinition('ic_hastaliklari');
const program = getResidencyProgram('baskent_ic');

describe('applyWeeklyFatigue / applyWeeklyStress', () => {
  it('clamp to [0, 100]', () => {
    const highFatigue = applyWeeklyFatigue(99, branch, program, createSeededRng('clamp-fatigue-high'));
    expect(highFatigue).toBeLessThanOrEqual(100);
    const lowFatigue = applyWeeklyFatigue(0, branch, program, createSeededRng('clamp-fatigue-low'));
    expect(lowFatigue).toBeGreaterThanOrEqual(0);

    const highStress = applyWeeklyStress(99, branch, program, createSeededRng('clamp-stress-high'));
    expect(highStress).toBeLessThanOrEqual(100);
    const lowStress = applyWeeklyStress(0, branch, program, createSeededRng('clamp-stress-low'));
    expect(lowStress).toBeGreaterThanOrEqual(0);
  });

  it('is deterministic for the same seed', () => {
    const a = applyWeeklyFatigue(30, branch, program, createSeededRng('det-fatigue'));
    const b = applyWeeklyFatigue(30, branch, program, createSeededRng('det-fatigue'));
    expect(a).toBe(b);
  });

  it('recovers somewhat once already high, instead of climbing forever', () => {
    const rng = createSeededRng('recovery-check');
    const atRecoveryThreshold = applyWeeklyFatigue(65, branch, program, rng);
    // net delta should be small/negative-leaning near the recovery point,
    // not a runaway climb
    expect(atRecoveryThreshold - 65).toBeLessThan(5);
  });
});

describe('applyWeeklyBurnout', () => {
  it('increases when both stress and fatigue are high', () => {
    const next = applyWeeklyBurnout({ stress: 75, fatigue: 75, currentBurnout: 10 });
    expect(next).toBeGreaterThan(10);
  });

  it('does not increase when only one of stress/fatigue is high', () => {
    const next = applyWeeklyBurnout({ stress: 75, fatigue: 20, currentBurnout: 10 });
    expect(next).toBeLessThanOrEqual(10);
  });

  it('decreases slowly when both stress and fatigue are comfortably low', () => {
    const next = applyWeeklyBurnout({ stress: 10, fatigue: 10, currentBurnout: 20 });
    expect(next).toBeLessThan(20);
    expect(20 - next).toBeLessThanOrEqual(2); // slow, not a big swing
  });

  it('clamps to [0, 100]', () => {
    expect(applyWeeklyBurnout({ stress: 90, fatigue: 90, currentBurnout: 100 })).toBeLessThanOrEqual(100);
    expect(applyWeeklyBurnout({ stress: 5, fatigue: 5, currentBurnout: 0 })).toBeGreaterThanOrEqual(0);
  });

  it('moves noticeably slower than fatigue under sustained high pressure', () => {
    // one week of high fatigue can add several points; one week of
    // high stress+fatigue only adds burnoutIncrease (small, by design)
    const fatigueJump = applyWeeklyFatigue(40, getBranchDefinition('genel_cerrahi'), program, createSeededRng('slow-burnout'));
    const burnoutJump = applyWeeklyBurnout({ stress: 75, fatigue: 75, currentBurnout: 40 });
    expect(burnoutJump - 40).toBeLessThan(fatigueJump - 40 || 1);
  });
});
