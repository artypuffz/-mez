import { describe, expect, it } from 'vitest';
import { validateProgramDataset } from './validateProgramDataset';
import { RESIDENCY_PROGRAMS, type ResidencyProgram } from '../config/residencyPrograms';

describe('validateProgramDataset', () => {
  it('finds zero errors on the real shipped dataset', () => {
    const issues = validateProgramDataset();
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors).toEqual([]);
  });

  it('reports a warning per branch with an unverified residencyYears default (honest, not hidden)', () => {
    const issues = validateProgramDataset();
    const durationWarnings = issues.filter((i) => i.message.includes('UNVERIFIED default residencyYears'));
    expect(durationWarnings.length).toBe(23); // the 23 new branches, see branches.ts
  });

  it('catches a duplicate program id', () => {
    const base = RESIDENCY_PROGRAMS[0];
    const dupe: ResidencyProgram = { ...base };
    const issues = validateProgramDataset([base, dupe]);
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('Duplicate program id'))).toBe(true);
  });

  it('catches an unknown branch/city/hospital', () => {
    const bad: ResidencyProgram = {
      id: 'bad_program',
      hospitalId: 'not_a_real_hospital',
      branchId: 'not_a_real_branch',
      cityId: 'not_a_real_city',
      visibleProfile: { education: 'medium', workload: 'medium', onCallDensity: 'medium', academicEnvironment: 'medium', cityCost: 'medium' },
      hiddenProfile: { burnoutPressure: 50, staffingPressure: 50 },
    };
    const issues = validateProgramDataset([bad]);
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors.some((i) => i.message.includes('Unknown hospitalId'))).toBe(true);
    expect(errors.some((i) => i.message.includes('Unknown branchId'))).toBe(true);
    expect(errors.some((i) => i.message.includes('Unknown cityId'))).toBe(true);
  });

  it('catches an invalid quota', () => {
    const base = RESIDENCY_PROGRAMS.find((p) => p.sourceType === 'real')!;
    const bad: ResidencyProgram = { ...base, id: 'bad_quota', quota: -3 };
    const issues = validateProgramDataset([bad]);
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('Invalid quota'))).toBe(true);
  });

  it('catches an out-of-range gameplayEntryThreshold on a real program', () => {
    const base = RESIDENCY_PROGRAMS.find((p) => p.sourceType === 'real')!;
    const bad: ResidencyProgram = { ...base, id: 'bad_score', gameplayEntryThreshold: 9999 };
    const issues = validateProgramDataset([bad]);
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('outside the valid TUS score range'))).toBe(true);
  });

  // TUS System Redesign — a legacy fictional program's minScore is a
  // frozen Phase 3 balance number, intentionally exempt from the live
  // [50, 85] score range (see validateProgramDataset.ts's own comment).
  it('does not hold a legacy fictional minScore to the live TUS score range', () => {
    const base = RESIDENCY_PROGRAMS.find((p) => p.sourceType === 'fictional')!;
    const legacyStyle: ResidencyProgram = { ...base, id: 'legacy_style', minScore: 20, gameplayEntryThreshold: undefined };
    const issues = validateProgramDataset([legacyStyle]);
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('outside the valid TUS score range'))).toBe(false);
  });

  it('catches a difficultyModifier out of the -0.5..+0.5 range', () => {
    const base = RESIDENCY_PROGRAMS.find((p) => p.sourceType === 'real')!;
    const bad: ResidencyProgram = { ...base, id: 'bad_modifier', difficultyModifier: { onCallLoad: 2, workingHours: 0 } };
    const issues = validateProgramDataset([bad]);
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('difficultyModifier.onCallLoad'))).toBe(true);
  });

  // Android Device QA Hotfix 1, Issue 2 — regression guard for the original
  // bug: a real program with no threshold at all must fail validation
  // rather than silently becoming universally selectable.
  it('catches a real program missing gameplayEntryThreshold', () => {
    const base = RESIDENCY_PROGRAMS.find((p) => p.sourceType === 'real')!;
    const bad: ResidencyProgram = { ...base, id: 'bad_no_threshold', gameplayEntryThreshold: undefined };
    const issues = validateProgramDataset([bad]);
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('missing gameplayEntryThreshold'))).toBe(true);
  });

  it('warns (does not error) on a same institution+branch appearing twice', () => {
    const base = RESIDENCY_PROGRAMS.find((p) => p.sourceType === 'real')!;
    const secondRow: ResidencyProgram = { ...base, id: `${base.id}__extra` };
    const issues = validateProgramDataset([base, secondRow]);
    expect(issues.some((i) => i.severity === 'warning' && i.message.includes('appears in 2 program rows'))).toBe(true);
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('institution+branch'))).toBe(false);
  });
});
