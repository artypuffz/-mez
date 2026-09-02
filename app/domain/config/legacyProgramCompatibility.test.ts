import { describe, expect, it } from 'vitest';
import {
  RESIDENCY_PROGRAMS,
  PRODUCTION_PROGRAMS,
  LEGACY_PROGRAMS,
  getResidencyProgram,
} from './residencyPrograms';
import { selectAvailablePrograms } from '../state/selectors';
import { createInitialGameState } from '../state/createInitialGameState';
import { beginTus } from '../state/transitions';
import { selectResidencyProgram, proceedToPreference } from '../state/tusTransitions';
import { advanceResidencyWeek } from '../residency/advanceResidencyWeek';
import { createScopedRng } from '../rng/seededRng';
import type { GameState } from '../state/types';

// Android Device QA Hotfix 1, Issue 3 — proves the split between
// PRODUCTION_PROGRAMS (new-game discovery, real-only) and LEGACY_PROGRAMS
// (kept only so an old save's already-committed program still resolves).
describe('production/legacy program pool split', () => {
  it('LEGACY_PROGRAMS is exactly the 13 Phase 3 fictional programs', () => {
    expect(LEGACY_PROGRAMS).toHaveLength(13);
    for (const program of LEGACY_PROGRAMS) {
      expect(program.sourceType).toBe('fictional');
    }
  });

  it('PRODUCTION_PROGRAMS contains only real programs, none fictional', () => {
    expect(PRODUCTION_PROGRAMS.length).toBeGreaterThan(2000);
    for (const program of PRODUCTION_PROGRAMS) {
      expect(program.sourceType).toBe('real');
    }
  });

  it('PRODUCTION_PROGRAMS and LEGACY_PROGRAMS are disjoint and together equal RESIDENCY_PROGRAMS', () => {
    const productionIds = new Set(PRODUCTION_PROGRAMS.map((p) => p.id));
    const legacyIds = new Set(LEGACY_PROGRAMS.map((p) => p.id));
    for (const id of legacyIds) expect(productionIds.has(id)).toBe(false);
    expect(RESIDENCY_PROGRAMS.length).toBe(PRODUCTION_PROGRAMS.length + LEGACY_PROGRAMS.length);
  });

  it('getResidencyProgram (the by-id resolver used by every save, old or new) can still resolve a legacy id', () => {
    for (const program of LEGACY_PROGRAMS) {
      expect(getResidencyProgram(program.id).id).toBe(program.id);
    }
  });

  it('new-game TUS discovery (selectAvailablePrograms) never surfaces a legacy id, at any score', () => {
    const legacyIds = new Set(LEGACY_PROGRAMS.map((p) => p.id));
    const initial = createInitialGameState({ name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' });
    let state = proceedToPreference(beginTus(initial));
    for (const score of [20, 45, 65, 85, 98]) {
      state = { ...state, career: { ...state.career, tusScore: score } };
      for (const program of selectAvailablePrograms(state)) {
        expect(legacyIds.has(program.id)).toBe(false);
      }
    }
  });
});

describe('legacy save safety', () => {
  function legacyResidencyState(programId: string, seed: string): GameState {
    const initial = createInitialGameState(
      { name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' },
      { seed, now: () => '2026-03-15T00:00:00.000Z' }
    );
    // Simulates a save that committed to a program before this hotfix,
    // when fictional programs were still offered by the preference screen.
    const program = getResidencyProgram(programId);
    expect(program.sourceType).toBe('fictional');
    return selectResidencyProgram(proceedToPreference(beginTus(initial)), program);
  }

  it('a save already committed to a legacy fictional program loads without crashing', () => {
    expect(() => legacyResidencyState('baskent_ic', 'legacy-load')).not.toThrow();
  });

  it('does not silently move the player to a different hospital/branch/city', () => {
    const program = getResidencyProgram('baskent_ic');
    const state = legacyResidencyState('baskent_ic', 'legacy-identity');
    expect(state.career.hospital).toBe(program.hospitalId);
    expect(state.career.branch).toBe(program.branchId);
    expect(state.career.city).toBe(program.cityId);
    expect(state.tus.selectedProgramId).toBe('baskent_ic');
  });

  it('residency continues week over week on a legacy program without error or corruption', () => {
    let state = legacyResidencyState('baskent_ic', 'legacy-continue');
    for (let week = 1; week <= 5; week++) {
      const result = advanceResidencyWeek(state, createScopedRng('legacy-continue', `residency:week:${week}`));
      state = result.state;
      expect(state.career.residencyWeek).toBe(week);
      expect(state.tus.selectedProgramId).toBe('baskent_ic');
    }
  });
});
