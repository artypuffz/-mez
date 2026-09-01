import { describe, expect, it } from 'vitest';
import { selectGameOverSummary } from './selectors';
import { createInitialGameState } from './createInitialGameState';
import { beginTus } from './transitions';
import { selectResidencyProgram, proceedToPreference } from './tusTransitions';
import { getResidencyProgram } from '../config/residencyPrograms';
import type { GameState } from './types';

function residencyState(): GameState {
  const initial = createInitialGameState({ name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' });
  return selectResidencyProgram(proceedToPreference(beginTus(initial)), getResidencyProgram('baskent_ic'));
}

describe('selectGameOverSummary', () => {
  it('returns null when the career has not ended', () => {
    expect(selectGameOverSummary(residencyState())).toBeNull();
  });

  it('summarizes reason, duration, branch, and the tracked stats', () => {
    const state: GameState = {
      ...residencyState(),
      career: { ...residencyState().career, residencyWeek: 56 },
      gameOver: { reason: 'resigned_burnout', week: 56, triggeredByEventId: 'ev', selectedChoiceId: 'c' },
      financialPressure: { consecutiveNegativeMonths: 0, lowestBalance: -8000 },
      statistics: { 'crisis:total': 4, 'crisis:recovered': 2 },
      eventHistory: [
        { week: 10, eventId: 'a', choiceId: 'x', resolvedTitle: 'A', category: 'MOBBING' },
        { week: 20, eventId: 'b', choiceId: 'x', resolvedTitle: 'B', category: 'MOBBING' },
        { week: 30, eventId: 'c', choiceId: 'x', resolvedTitle: 'C', category: 'GENERAL' },
      ],
      behaviorStats: { 'junior:supportive': 3, 'junior:protected': 1 },
    };
    const summary = selectGameOverSummary(state);
    expect(summary).not.toBeNull();
    expect(summary!.reason).toBe('resigned_burnout');
    expect(summary!.branchName).toBe('İç Hastalıkları');
    expect(summary!.weeksCompleted).toBe(56);
    expect(summary!.durationLabel).toBe('1 yıl 1 ay');
    expect(summary!.stats).toEqual({
      lowestBalance: -8000,
      crisisCount: 4,
      crisisRecoveredCount: 2,
      mobbingEventCount: 2,
      juniorSupportCount: 4,
    });
  });
});
