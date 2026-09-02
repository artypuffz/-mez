import { describe, expect, it } from 'vitest';
import {
  computeFinalHierarchyPressure,
  deriveProceduralCultureModifier,
  hierarchyPressureToMobbingRiskEquivalent,
  resolveFinalHierarchyPressure,
} from './hospitalCulture';
import { getResidencyProgram, RESIDENCY_PROGRAMS } from '../config/residencyPrograms';
import { getBranchDefinition } from '../config/branches';

const realPrograms = RESIDENCY_PROGRAMS.filter((p) => p.sourceType === 'real');

describe('deriveProceduralCultureModifier', () => {
  it('is deterministic for the same (gameSeed, programId)', () => {
    const a = deriveProceduralCultureModifier('seed-1', 'some_program');
    const b = deriveProceduralCultureModifier('seed-1', 'some_program');
    expect(a).toBe(b);
  });

  it('can differ for a different gameSeed on the same program (same real hospital, different run)', () => {
    const values = new Set(
      Array.from({ length: 15 }, (_, i) => deriveProceduralCultureModifier(`seed-${i}`, 'some_program'))
    );
    expect(values.size).toBeGreaterThan(1);
  });

  it('can differ for a different programId on the same seed', () => {
    const a = deriveProceduralCultureModifier('seed-1', 'program_a');
    const b = deriveProceduralCultureModifier('seed-1', 'program_b');
    expect(a).not.toBe(b);
  });

  it('never leaves the -0.7..+0.7 procedural range', () => {
    for (let i = 0; i < 200; i++) {
      const modifier = deriveProceduralCultureModifier(`seed-${i}`, `program-${i}`);
      expect(modifier).toBeGreaterThanOrEqual(-0.7);
      expect(modifier).toBeLessThanOrEqual(0.7);
    }
  });
});

describe('computeFinalHierarchyPressure', () => {
  it('clamps to 0.5-5.0 even at extreme baseline+modifier combinations', () => {
    expect(computeFinalHierarchyPressure(1.0, -0.7)).toBeGreaterThanOrEqual(0.5);
    expect(computeFinalHierarchyPressure(5.0, 0.7)).toBeLessThanOrEqual(5.0);
  });

  it('adds the modifier on top of the branch baseline within range', () => {
    expect(computeFinalHierarchyPressure(4.7, -0.6)).toBeCloseTo(4.1, 5);
    expect(computeFinalHierarchyPressure(4.7, 0.2)).toBeCloseTo(4.9, 5);
  });
});

describe('resolveFinalHierarchyPressure', () => {
  it('is deterministic per (gameSeed, program) for a real program', () => {
    const program = getResidencyProgram(realPrograms[0].id);
    const a = resolveFinalHierarchyPressure('game-seed-x', program);
    const b = resolveFinalHierarchyPressure('game-seed-x', program);
    expect(a).toBe(b);
  });

  it('stays within the branch baseline +/- 0.7, clamped 0.5-5.0', () => {
    const program = getResidencyProgram(realPrograms[10].id);
    const branch = getBranchDefinition(program.branchId);
    const value = resolveFinalHierarchyPressure('game-seed-y', program);
    expect(value).toBeGreaterThanOrEqual(Math.max(0.5, branch.difficultyBaseline.hierarchyPressure - 0.7) - 0.001);
    expect(value).toBeLessThanOrEqual(Math.min(5.0, branch.difficultyBaseline.hierarchyPressure + 0.7) + 0.001);
  });

  it('the SAME real hospital+branch can read differently across different seeds/careers (§12)', () => {
    const program = getResidencyProgram(realPrograms[3].id);
    const values = new Set(
      Array.from({ length: 10 }, (_, i) => resolveFinalHierarchyPressure(`career-${i}`, program))
    );
    expect(values.size).toBeGreaterThan(1);
  });
});

describe('hierarchyPressureToMobbingRiskEquivalent', () => {
  it('maps the 0.5-5.0 range onto 0-100', () => {
    expect(hierarchyPressureToMobbingRiskEquivalent(0.5)).toBe(0);
    expect(hierarchyPressureToMobbingRiskEquivalent(5.0)).toBe(100);
  });
});
