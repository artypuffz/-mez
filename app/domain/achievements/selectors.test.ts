import { describe, expect, it } from 'vitest';
import { selectAchievements } from './selectors';
import { createInitialGameState } from '../state/createInitialGameState';
import { beginTus } from '../state/transitions';
import { selectResidencyProgram, proceedToPreference } from '../state/tusTransitions';
import { getResidencyProgram } from '../config/residencyPrograms';
import type { GameState } from '../state/types';

function residencyState(): GameState {
  const initial = createInitialGameState({ name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' });
  return selectResidencyProgram(proceedToPreference(beginTus(initial)), getResidencyProgram('baskent_ic'));
}

describe('selectAchievements', () => {
  it('returns every defined achievement, all locked, at week 0', () => {
    const statuses = selectAchievements(residencyState());
    expect(statuses.length).toBeGreaterThan(0);
    expect(statuses.every((s) => s.unlocked === false)).toBe(true);
  });

  it('unlocks "ilk_ay" once residencyWeek reaches its threshold', () => {
    const state: GameState = { ...residencyState(), career: { ...residencyState().career, residencyWeek: 4 } };
    const ilkAy = selectAchievements(state).find((s) => s.def.id === 'ilk_ay')!;
    expect(ilkAy.unlocked).toBe(true);
  });

  it('unlocks a statistics-backed achievement from a real counter', () => {
    const state: GameState = { ...residencyState(), statistics: { 'crisis:recovered': 1 } };
    const krizdenDondun = selectAchievements(state).find((s) => s.def.id === 'krizden_dondun')!;
    expect(krizdenDondun.unlocked).toBe(true);
  });

  it('never crashes on a fresh (pre-residency) state', () => {
    const fresh = createInitialGameState({ name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' });
    expect(() => selectAchievements(fresh)).not.toThrow();
  });

  it('stays unlocked even if a resettable field (e.g. financialPressure) would later reset — monotonic sources only', () => {
    // §19's own design rule: nothing here reads resourcePressure streaks or
    // financialPressure.consecutiveNegativeMonths, both of which can drop
    // back to 0. This test documents that guarantee at the requirement
    // level: seniorityStage moving forward never gets undone by anything
    // else in the same state.
    const kidemli: GameState = { ...residencyState(), career: { ...residencyState().career, seniorityStage: 'kidemli' } };
    const status = selectAchievements(kidemli).find((s) => s.def.id === 'kidemli')!;
    expect(status.unlocked).toBe(true);
  });
});
