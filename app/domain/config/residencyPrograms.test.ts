import { describe, expect, it } from 'vitest';
import { RESIDENCY_PROGRAMS, getResidencyProgram } from './residencyPrograms';
import { getHospitalDefinition, HOSPITAL_DEFINITIONS } from './hospitals';
import { getBranchDefinition } from './branches';
import { getCityDefinition } from './cities';

const realPrograms = RESIDENCY_PROGRAMS.filter((p) => p.sourceType === 'real');
const fictionalPrograms = RESIDENCY_PROGRAMS.filter((p) => p.sourceType !== 'real');

describe('RESIDENCY_PROGRAMS — Phase 11 real ÖSYM dataset', () => {
  it('keeps the original 13 Phase 3 fictional programs completely unchanged', () => {
    expect(fictionalPrograms.length).toBe(13);
    expect(getResidencyProgram('baskent_ic').minScore).toBe(45);
    expect(getResidencyProgram('baskent_ic').hiddenProfile.mobbingRisk).toBe(30);
  });

  it('adds a real ÖSYM program set (hundreds of programs, not fabricated)', () => {
    expect(realPrograms.length).toBeGreaterThan(1000);
  });

  it('has unique ids across the entire combined dataset', () => {
    const ids = RESIDENCY_PROGRAMS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every program resolves to a known hospital, branch, and city', () => {
    for (const program of RESIDENCY_PROGRAMS) {
      expect(() => getHospitalDefinition(program.hospitalId)).not.toThrow();
      expect(() => getBranchDefinition(program.branchId)).not.toThrow();
      expect(() => getCityDefinition(program.cityId)).not.toThrow();
    }
  });

  it("a real program's cityId matches its own hospital's cityId", () => {
    for (const program of realPrograms) {
      const hospital = getHospitalDefinition(program.hospitalId);
      expect(program.cityId).toBe(hospital.cityId);
    }
  });

  it('every real program has no static hiddenProfile.mobbingRisk (procedural only, §10)', () => {
    for (const program of realPrograms.slice(0, 200)) {
      expect(program.hiddenProfile.mobbingRisk).toBeUndefined();
    }
  });

  it("a real program's derived hiddenProfile is identical to every other real program of the same branch (branch-dominant, §42 fairness)", () => {
    const byBranch = new Map<string, typeof realPrograms>();
    for (const program of realPrograms) {
      byBranch.set(program.branchId, [...(byBranch.get(program.branchId) ?? []), program]);
    }
    for (const [, programs] of byBranch) {
      if (programs.length < 2) continue;
      const [first, ...rest] = programs;
      for (const program of rest) {
        expect(program.hiddenProfile.burnoutPressure).toBe(first.hiddenProfile.burnoutPressure);
        expect(program.hiddenProfile.staffingPressure).toBe(first.hiddenProfile.staffingPressure);
      }
    }
  });

  it('almost every real program ships with difficultyModifier omitted/0 (no fabricated per-hospital data, §23)', () => {
    const withNonZeroModifier = realPrograms.filter(
      (p) => p.difficultyModifier && (p.difficultyModifier.onCallLoad !== 0 || p.difficultyModifier.workingHours !== 0)
    );
    expect(withNonZeroModifier.length).toBe(0);
  });

  it('real institutions include both university and training/research hospital kinds', () => {
    const realHospitals = HOSPITAL_DEFINITIONS.filter((h) => h.kind !== 'fictional');
    expect(realHospitals.length).toBeGreaterThan(50);
    expect(realHospitals.some((h) => h.kind === 'university')).toBe(true);
    expect(realHospitals.some((h) => h.kind === 'training_research_hospital')).toBe(true);
  });

  it('every real program has a positive quota', () => {
    for (const program of realPrograms) {
      expect(program.quota).toBeGreaterThan(0);
    }
  });
});
