import { describe, expect, it } from 'vitest';
import { advanceResidencyWeek } from './advanceResidencyWeek';
import { createInitialGameState } from '../state/createInitialGameState';
import { beginTus } from '../state/transitions';
import { selectResidencyProgram, proceedToPreference } from '../state/tusTransitions';
import { getResidencyProgram, RESIDENCY_PROGRAMS } from '../config/residencyPrograms';
import { createScopedRng } from '../rng/seededRng';
import type { GameState } from '../state/types';

// Lightweight sanity check per the Phase 4 spec (§20) — NOT final
// balancing. Catches the specific failure mode a first pass here actually
// had: a flat threshold+fixed-recovery model where recovery < typical
// pressure doesn't create an equilibrium, it just slows a still-guaranteed
// march to the 100 ceiling. See docs in domain/config/residencySimulation.ts
// for how the current recovery amounts were picked to avoid that for every
// currently-defined branch+program combination.

function residencyState(programId: string, seed: string): GameState {
  const initial = createInitialGameState(
    { name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' },
    { seed }
  );
  const program = getResidencyProgram(programId);
  return selectResidencyProgram(proceedToPreference(beginTus(initial)), program);
}

function simulateWeeks(programId: string, seed: string, weeks: number) {
  let state = residencyState(programId, seed);
  for (let week = 1; week <= weeks; week++) {
    state = advanceResidencyWeek(state, createScopedRng(seed, `residency:week:${week}`)).state;
  }
  return state;
}

// Phase 11 — RESIDENCY_PROGRAMS now holds ~2200 real ÖSYM programs on top
// of the original 12 fictional ones. Every real program's weekly-pressure
// inputs (branch.weeklyBaseline, hiddenProfile.burnoutPressure/
// staffingPressure) are derived PURELY from its branchId (see
// deriveHiddenProfileFromBranch in residencyPrograms.ts) — two programs
// sharing a branch are numerically identical here, so iterating one
// representative program per branch gives the exact same coverage as
// iterating all ~2200 while staying fast. Every branch is still covered.
function oneProgramPerBranch(): typeof RESIDENCY_PROGRAMS {
  const seen = new Set<string>();
  const representatives: typeof RESIDENCY_PROGRAMS = [];
  for (const program of RESIDENCY_PROGRAMS) {
    if (seen.has(program.branchId)) continue;
    seen.add(program.branchId);
    representatives.push(program);
  }
  return representatives;
}

describe('weekly baseline sanity (no events yet)', () => {
  it('no program saturates stress/fatigue to the ceiling within one year', () => {
    for (const program of oneProgramPerBranch()) {
      const state = simulateWeeks(program.id, `sanity-${program.id}`, 52);
      expect(state.resources.stress).toBeLessThan(90);
      expect(state.resources.fatigue).toBeLessThan(90);
    }
  }, 20000);

  it('no program drives average burnout anywhere near the ceiling within two years', () => {
    for (const program of oneProgramPerBranch()) {
      const N = 20;
      let sum = 0;
      for (let i = 0; i < N; i++) {
        const state = simulateWeeks(program.id, `burnout-${program.id}-${i}`, 104);
        sum += state.resources.burnout;
      }
      expect(sum / N).toBeLessThan(20);
    }
  }, 30000);

  it('resources actually move — the baseline is not a no-op', () => {
    const state = simulateWeeks('baskent_ic', 'movement-check', 52);
    const initial = { stress: 20, fatigue: 15, burnout: 0 };
    expect(state.resources.stress).not.toBe(initial.stress);
    expect(state.resources.fatigue).not.toBe(initial.fatigue);
  });

  it('Genel Cerrahi trends modestly higher than İç Hastalıkları/Psikiyatri, not dramatically so', () => {
    const avgAt = (programId: string) => {
      const N = 40;
      let sum = 0;
      for (let i = 0; i < N; i++) {
        const state = simulateWeeks(programId, `branchdiff-${programId}-${i}`, 52);
        sum += state.resources.stress + state.resources.fatigue;
      }
      return sum / N;
    };

    const cerrahi = avgAt('porsuk_cerrahi');
    const icHastaliklari = avgAt('baskent_ic');
    const psikiyatri = avgAt('baskent_psik');

    expect(cerrahi).toBeGreaterThan(icHastaliklari);
    expect(cerrahi).toBeGreaterThan(psikiyatri);
    // "hafif fark" — modest, not a different game
    expect(cerrahi - icHastaliklari).toBeLessThan(25);
  });

  it('even the hardest program over a full 5-year horizon stays well clear of the ceiling', () => {
    const state = simulateWeeks('bogazkoy_cerrahi', 'full-horizon', 260);
    expect(state.career.phase).toBe('residency_complete');
    expect(state.resources.stress).toBeLessThan(90);
    expect(state.resources.fatigue).toBeLessThan(90);
    expect(state.resources.burnout).toBeLessThan(50);
  });
});
