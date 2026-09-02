import { describe, expect, it } from 'vitest';
import { applyWeeklyBurnout, applyWeeklyFatigue, applyWeeklyStress, updateResourcePressure } from './weeklyResources';
import { createSeededRng } from '../rng/seededRng';
import { getBranchDefinition } from '../config/branches';
import { getResidencyProgram } from '../config/residencyPrograms';
import type { ResourcePressureState } from '../state/types';

const branch = getBranchDefinition('ic_hastaliklari');
const program = getResidencyProgram('baskent_ic');

const ZERO_PRESSURE: ResourcePressureState = {
  highStressWeeks: 0,
  highFatigueWeeks: 0,
  combinedPressureWeeks: 0,
  lowPressureWeeks: 0,
};

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

  it('pulls back down once already high, instead of climbing forever (§2)', () => {
    const rng = createSeededRng('recovery-check');
    const atHigh = applyWeeklyFatigue(90, branch, program, rng);
    // proportional pull at 90 should outweigh typical weekly pressure —
    // net delta should trend down, not up.
    expect(atHigh).toBeLessThan(90);
  });

  it('drains back toward the resting point over many quiet weeks', () => {
    let fatigue = 95;
    const seed = 'drain-check';
    for (let week = 1; week <= 30; week++) {
      fatigue = applyWeeklyFatigue(fatigue, branch, program, createSeededRng(`${seed}-${week}`));
    }
    expect(fatigue).toBeLessThan(60);
  });
});

describe('updateResourcePressure', () => {
  it('increments streaks while the condition holds', () => {
    let pressure = ZERO_PRESSURE;
    pressure = updateResourcePressure(pressure, 65, 65); // both high
    expect(pressure.combinedPressureWeeks).toBe(1);
    pressure = updateResourcePressure(pressure, 65, 65);
    expect(pressure.combinedPressureWeeks).toBe(2);
  });

  // Gameplay Expansion Part A — the root-caused fix: a single
  // non-qualifying week LEAKS the streak by a small, configured amount
  // instead of wiping it back to 0. This is what makes sustained (but not
  // perfectly monotonic) pressure actually accumulate toward burnout.
  it('leaks by a small amount on a non-qualifying week, instead of resetting to 0', () => {
    let pressure = ZERO_PRESSURE;
    for (let i = 0; i < 5; i++) pressure = updateResourcePressure(pressure, 65, 65);
    expect(pressure.combinedPressureWeeks).toBe(5);

    pressure = updateResourcePressure(pressure, 65, 20); // fatigue drops one week
    expect(pressure.combinedPressureWeeks).toBe(4); // leaked by 1, not reset to 0
    expect(pressure.highStressWeeks).toBe(6); // stress-only streak keeps counting
    expect(pressure.highFatigueWeeks).toBe(4); // fatigue streak also just leaks by 1, not reset to 0
  });

  it('a single bad/good week among many opposite weeks barely dents a long streak', () => {
    let pressure = ZERO_PRESSURE;
    for (let i = 0; i < 16; i++) pressure = updateResourcePressure(pressure, 80, 70);
    expect(pressure.combinedPressureWeeks).toBe(16);
    // one single off week (fatigue dips under threshold), then resumes
    pressure = updateResourcePressure(pressure, 80, 55);
    pressure = updateResourcePressure(pressure, 80, 70);
    // still a substantial streak — nowhere near reset to 0/1 the old
    // hard-reset behavior would have produced.
    expect(pressure.combinedPressureWeeks).toBeGreaterThanOrEqual(16);
  });

  it('never goes negative, even after many consecutive non-qualifying weeks', () => {
    let pressure: typeof ZERO_PRESSURE = { ...ZERO_PRESSURE, combinedPressureWeeks: 2 };
    for (let i = 0; i < 10; i++) pressure = updateResourcePressure(pressure, 10, 10);
    expect(pressure.combinedPressureWeeks).toBe(0);
  });

  it('tracks a separate low-pressure streak for recovery, which also leaks rather than resets', () => {
    let pressure = ZERO_PRESSURE;
    pressure = updateResourcePressure(pressure, 10, 10);
    pressure = updateResourcePressure(pressure, 10, 10);
    expect(pressure.lowPressureWeeks).toBe(2);
    pressure = updateResourcePressure(pressure, 40, 10);
    expect(pressure.lowPressureWeeks).toBe(1); // leaked by 1, not reset to 0
  });
});

describe('applyWeeklyBurnout (§3 — sustained-pressure driven)', () => {
  it('does NOT increase from a single bad week', () => {
    const oneWeekPressure = updateResourcePressure(ZERO_PRESSURE, 75, 75);
    expect(applyWeeklyBurnout(10, oneWeekPressure)).toBe(10);
  });

  it('increases moderately once combined pressure has held for the moderate streak length', () => {
    let pressure = ZERO_PRESSURE;
    for (let i = 0; i < 4; i++) pressure = updateResourcePressure(pressure, 75, 75);
    const next = applyWeeklyBurnout(10, pressure);
    expect(next).toBeGreaterThan(10);
  });

  it('increases more once combined pressure has held for the severe streak length', () => {
    let moderate = ZERO_PRESSURE;
    for (let i = 0; i < 4; i++) moderate = updateResourcePressure(moderate, 75, 75);
    let severe = ZERO_PRESSURE;
    for (let i = 0; i < 8; i++) severe = updateResourcePressure(severe, 75, 75);

    const moderateJump = applyWeeklyBurnout(10, moderate) - 10;
    const severeJump = applyWeeklyBurnout(10, severe) - 10;
    expect(severeJump).toBeGreaterThan(moderateJump);
  });

  it('does not increase when only one of stress/fatigue is high, regardless of streak length', () => {
    let pressure = ZERO_PRESSURE;
    for (let i = 0; i < 8; i++) pressure = updateResourcePressure(pressure, 75, 20);
    expect(applyWeeklyBurnout(10, pressure)).toBe(10);
  });

  it('decreases slowly once both resources have stayed comfortably low for a few weeks — not fully irreversible', () => {
    let pressure = ZERO_PRESSURE;
    for (let i = 0; i < 3; i++) pressure = updateResourcePressure(pressure, 10, 10);
    const next = applyWeeklyBurnout(20, pressure);
    expect(next).toBeLessThan(20);
    expect(20 - next).toBeLessThanOrEqual(2); // slow, not a big swing
  });

  it('does not decrease before the low-pressure streak is long enough', () => {
    const pressure = updateResourcePressure(ZERO_PRESSURE, 10, 10); // only 1 week
    expect(applyWeeklyBurnout(20, pressure)).toBe(20);
  });

  it('clamps to [0, 100]', () => {
    let severe = ZERO_PRESSURE;
    for (let i = 0; i < 8; i++) severe = updateResourcePressure(severe, 90, 90);
    expect(applyWeeklyBurnout(100, severe)).toBeLessThanOrEqual(100);

    let low = ZERO_PRESSURE;
    for (let i = 0; i < 3; i++) low = updateResourcePressure(low, 5, 5);
    expect(applyWeeklyBurnout(0, low)).toBeGreaterThanOrEqual(0);
  });
});
