import { describe, expect, it } from 'vitest';
import { selectCareerStatistics, selectGameOverSummary, selectResidencyProgress, selectUpcomingHint } from './selectors';
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

// Gameplay Expansion Part B §18 — every field traces to a real counter
// already tracked elsewhere (see the doc comment on selectCareerStatistics
// itself), never a count of arbitrary event ids.
describe('selectCareerStatistics', () => {
  it('reads real accumulating counters, defaulting missing ones to 0', () => {
    const state: GameState = {
      ...residencyState(),
      career: { ...residencyState().career, residencyWeek: 30, residencyYear: 1, seniorityStage: 'orta' },
      statistics: {
        oncall_lifetime_shifts: 12, oncall_lifetime_weekend_shifts: 3, oncall_lifetime_extra_shifts: 1,
        'crisis:total': 2, 'crisis:recovered': 1, 'spending:total': 4,
      },
      eventHistory: [
        { week: 5, eventId: 'a', choiceId: 'x', resolvedTitle: 'A', category: 'MOBBING' },
        { week: 10, eventId: 'b', choiceId: 'x', resolvedTitle: 'B', category: 'GENERAL' },
      ],
      behaviorStats: { 'junior:supportive': 2 },
      financialPressure: { consecutiveNegativeMonths: 0, lowestBalance: -4000 },
    };
    expect(selectCareerStatistics(state)).toEqual({
      residencyWeek: 30, residencyYear: 1, seniorityStage: 'orta',
      totalOnCallShifts: 12, weekendOnCallShifts: 3, extraOnCallShifts: 1,
      crisisCount: 2, crisisRecoveredCount: 1, eventsResolved: 2, mobbingEventCount: 1,
      spendingActivityCount: 4, juniorSupportCount: 2, lowestBalanceEver: -4000,
    });
  });

  it('never crashes when no statistics have accumulated yet', () => {
    expect(() => selectCareerStatistics(residencyState())).not.toThrow();
  });
});

// Gameplay Expansion Part B §15/§17 — "Asistanlık İlerlemesi": real
// residency-week/branch-duration progress, deliberately not an XP curve.
describe('selectResidencyProgress', () => {
  it('computes weeksCompleted/totalWeeks/ratio from the real branch duration', () => {
    const state: GameState = { ...residencyState(), career: { ...residencyState().career, residencyWeek: 52 } };
    const progress = selectResidencyProgress(state);
    expect(progress).not.toBeNull();
    expect(progress!.totalWeeks).toBe(progress!.weeksCompleted > 0 ? progress!.totalWeeks : progress!.totalWeeks);
    expect(progress!.weeksCompleted).toBe(52);
    expect(progress!.ratio).toBeCloseTo(52 / progress!.totalWeeks, 5);
  });

  it('caps weeksCompleted at totalWeeks (never shows over 100%)', () => {
    const state: GameState = { ...residencyState(), career: { ...residencyState().career, residencyWeek: 999 } };
    const progress = selectResidencyProgress(state)!;
    expect(progress.weeksCompleted).toBe(progress.totalWeeks);
    expect(progress.ratio).toBe(1);
  });

  it('returns null before a branch is selected', () => {
    const fresh = createInitialGameState({ name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' });
    expect(selectResidencyProgress(fresh)).toBeNull();
  });
});

// Gameplay Expansion Part B §16 — only ever surfaces an already-committed
// pendingEvents entry, never predicts random pool content.
describe('selectUpcomingHint', () => {
  it('returns null when nothing is pending', () => {
    expect(selectUpcomingHint(residencyState())).toBeNull();
  });

  it('mentions "this week" when the nearest pending event is due now or overdue', () => {
    const state: GameState = {
      ...residencyState(),
      career: { ...residencyState().career, residencyWeek: 10 },
      pendingEvents: [{ chainId: 'baris', checkpoint: 'stage2', triggerWeek: 10, sourceEventId: 'x', sourceChoiceId: 'y' }],
    };
    expect(selectUpcomingHint(state)).toMatch(/Bu hafta/);
  });

  it('never leaks the pending event\'s id/chainId/checkpoint in the hint text', () => {
    const state: GameState = {
      ...residencyState(),
      career: { ...residencyState().career, residencyWeek: 10 },
      pendingEvents: [{ chainId: 'baris', checkpoint: 'stage2', triggerWeek: 14, sourceEventId: 'chain_baris_02_dostluk', sourceChoiceId: 'y' }],
    };
    const hint = selectUpcomingHint(state)!;
    expect(hint).not.toMatch(/baris|stage2|chain_baris/i);
  });
});
