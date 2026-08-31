import { describe, expect, it } from 'vitest';
import { advanceResidencyWeek } from './advanceResidencyWeek';
import { createInitialGameState } from '../state/createInitialGameState';
import { beginTus } from '../state/transitions';
import { selectResidencyProgram, proceedToPreference } from '../state/tusTransitions';
import { getResidencyProgram } from '../config/residencyPrograms';
import { createScopedRng } from '../rng/seededRng';
import type { GameState } from '../state/types';

function residencyState(programId: string, seed: string): GameState {
  const initial = createInitialGameState(
    { name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' },
    { seed, now: () => '2026-03-15T00:00:00.000Z' }
  );
  const program = getResidencyProgram(programId);
  return selectResidencyProgram(proceedToPreference(beginTus(initial)), program);
}

function weekRng(seed: string, week: number) {
  return createScopedRng(seed, `residency:week:${week}`);
}

describe('advanceResidencyWeek', () => {
  it('moves week 0 to week 1', () => {
    const state = residencyState('baskent_ic', 'week01');
    const result = advanceResidencyWeek(state, weekRng('week01', 1));
    expect(result.state.career.residencyWeek).toBe(1);
    expect(result.state.career.residencyYear).toBe(1);
  });

  it('never touches money', () => {
    const state = residencyState('baskent_ic', 'money-check');
    const result = advanceResidencyWeek(state, weekRng('money-check', 1));
    expect(result.state.resources.money).toBe(state.resources.money);
  });

  it('is deterministic for the same state + seed + week', () => {
    const state = residencyState('baskent_ic', 'determinism');
    const a = advanceResidencyWeek(state, weekRng('determinism', 1));
    const b = advanceResidencyWeek(state, weekRng('determinism', 1));
    expect(a.state.resources).toEqual(b.state.resources);
    expect(a.resourceDelta).toEqual(b.resourceDelta);
  });

  it('reports a seniorityChanged transition exactly when the stage flips', () => {
    let state = residencyState('baskent_ic', 'seniority-transition');
    let flippedAt = -1;
    for (let week = 1; week <= 63; week++) {
      const result = advanceResidencyWeek(state, weekRng('seniority-transition', week));
      state = result.state;
      if (result.transitions.seniorityChanged) {
        expect(result.transitions.seniorityChanged).toEqual({ from: 'comez', to: 'orta' });
        flippedAt = week;
        break;
      }
    }
    expect(flippedAt).toBe(63); // matches seniority.test.ts's 208-week boundary
  });

  it('reports monthChanged/yearChanged transitions when the calendar crosses a boundary', () => {
    let state = residencyState('baskent_ic', 'calendar-transition');
    let sawMonthChange = false;
    let sawYearChange = false;
    for (let week = 1; week <= 20; week++) {
      const result = advanceResidencyWeek(state, weekRng('calendar-transition', week));
      state = result.state;
      if (result.transitions.monthChanged) sawMonthChange = true;
      if (result.transitions.yearChanged) sawYearChange = true;
    }
    expect(sawMonthChange).toBe(true);
    expect(sawYearChange).toBe(true); // started 2026-09-01, 20 weeks crosses into 2027
  });

  it('completes a 4-year branch (208 weeks) at exactly week 208 and blocks further advance', () => {
    let state = residencyState('baskent_ic', 'complete-4yr');
    for (let week = 1; week <= 208; week++) {
      state = advanceResidencyWeek(state, weekRng('complete-4yr', week)).state;
    }
    expect(state.career.residencyWeek).toBe(208);
    expect(state.career.phase).toBe('residency_complete');
    expect(() => advanceResidencyWeek(state, weekRng('complete-4yr', 209))).toThrow();
  });

  it('completes a 5-year branch (260 weeks) at exactly week 260', () => {
    let state = residencyState('yesilkent_cerrahi', 'complete-5yr');
    let result;
    for (let week = 1; week <= 260; week++) {
      result = advanceResidencyWeek(state, weekRng('complete-5yr', week));
      state = result.state;
    }
    expect(state.career.residencyWeek).toBe(260);
    expect(state.career.phase).toBe('residency_complete');
    expect(result!.transitions.residencyCompleted).toBe(true);
  });

  it('runs headlessly in a plain loop with no UI involvement (Phase 5+ balancing needs this)', () => {
    let state = residencyState('baskent_ic', 'headless-loop');
    for (let week = 1; week <= 100; week++) {
      state = advanceResidencyWeek(state, weekRng('headless-loop', week)).state;
    }
    expect(state.career.residencyWeek).toBe(100);
    expect(state.resources.stress).toBeGreaterThanOrEqual(0);
    expect(state.resources.stress).toBeLessThanOrEqual(100);
  });

  it('throws outside the residency phase', () => {
    const initial = createInitialGameState({
      name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda',
    });
    expect(() => advanceResidencyWeek(beginTus(initial), weekRng('not-residency', 1))).toThrow();
  });
});
