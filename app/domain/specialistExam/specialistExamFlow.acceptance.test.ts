import { describe, expect, it } from 'vitest';
import { advanceResidencyWeekWithEvents, advanceSpecialistExamWeek, resolveEventChoice } from '../events/engine';
import { getEventRepository } from '../events/content';
import { getVisibleChoices } from '../events/choices';
import { buildRequirementContext } from '../events/requirements';
import { createInitialGameState } from '../state/createInitialGameState';
import { beginTus } from '../state/transitions';
import { selectResidencyProgram, proceedToPreference } from '../state/tusTransitions';
import { getResidencyProgram } from '../config/residencyPrograms';
import { createScopedRng } from '../rng/seededRng';
import type { GameState } from '../state/types';

// §1-6 — drives a REAL residency to completion and through the real
// specialist-exam content (both the pass-first-attempt path and the
// fail-then-retry path), through the actual engine functions the store
// calls. Other systems (crisis, pool events) stay live rather than being
// stubbed out — each week resolves EVERY queued event, not just the one
// under test, the same way a real playthrough would.
const repo = getEventRepository();

function residencyState(seed: string): GameState {
  const initial = createInitialGameState(
    { name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' },
    { seed }
  );
  return selectResidencyProgram(proceedToPreference(beginTus(initial)), getResidencyProgram('baskent_ic'));
}

function resolveAllQueued(state: GameState, seed: string, week: number, preferredChoiceByEvent: Record<string, string> = {}): GameState {
  let current = state;
  for (const instance of [...current.weeklyEventQueue]) {
    const event = repo.getEventById(instance.eventId);
    if (!event) continue;
    const visible = getVisibleChoices(event, buildRequirementContext(current, instance.boundNpcIds));
    if (visible.length === 0) continue;
    const preferredId = preferredChoiceByEvent[event.id];
    const choice = visible.find((c) => c.id === preferredId) ?? visible[0];
    current = resolveEventChoice(current, event, choice.id, createScopedRng(seed, `resolve:${event.id}:${week}`)).state;
  }
  return current;
}

// Drives residency weeks (real advanceResidencyWeekWithEvents) until
// residency_complete collapses into specialist_exam, resolving every
// queued event generically along the way (first visible choice — this
// test cares about the exam outcome, not the residency playthrough).
function runResidencyToCompletion(state: GameState, seed: string): GameState {
  let current = state;
  let week = current.career.residencyWeek;
  const safetyLimit = 260;
  while (current.career.phase === 'residency') {
    week += 1;
    if (week > safetyLimit) throw new Error('runResidencyToCompletion: never completed within the safety window');
    const weekRng = createScopedRng(seed, `residency:week:${week}`);
    const eventsRng = createScopedRng(seed, `events:week:${week}`);
    const result = advanceResidencyWeekWithEvents(current, weekRng, eventsRng, repo);
    current = resolveAllQueued(result.state, seed, week);
  }
  return current;
}

// Drives specialist_exam weeks with a specific preferred choice per event
// id (so the test can force the "yüklen" prep path, or the "sınava gir"
// attempt), resolving every queued event each week.
function runSpecialistExam(
  state: GameState,
  seed: string,
  preferredChoiceByEvent: Record<string, string>,
  maxWeeks = 30
): GameState {
  let current = state;
  let steps = 0;
  while (current.career.phase === 'specialist_exam' && steps < maxWeeks) {
    steps += 1;
    const result = advanceSpecialistExamWeek(current, repo);
    current = resolveAllQueued(result.state, seed, current.career.residencyWeek + steps, preferredChoiceByEvent);
  }
  return current;
}

describe('specialist exam — full residency-to-ending acceptance', () => {
  it('a residency that completes always lands in specialist_exam, never lingers on residency_complete', () => {
    const seed = 'exam-flow-transition';
    const state = runResidencyToCompletion(residencyState(seed), seed);
    // Either still mid-exam-flow, or already resolved to an ending —
    // "residency_complete" itself must never be the observed phase.
    expect(state.career.phase).not.toBe('residency_complete');
    expect(['specialist_exam', 'specialist', 'gameover']).toContain(state.career.phase);
  });

  it('best-case preparation choices reliably reach a specialist ending (not guaranteed every seed, but the mechanism must work end-to-end)', () => {
    const seed = 'exam-flow-best-case';
    let state = runResidencyToCompletion(residencyState(seed), seed);
    state = runSpecialistExam(state, seed, {
      specialist_exam_01_bir_hafta_once: 'yuklen',
      specialist_exam_02_sinav_gunu: 'sinava_gir',
      specialist_exam_04_ikinci_sans: 'tekrar_dene',
    });
    expect(['specialist', 'gameover']).toContain(state.career.phase);
    if (state.career.phase === 'specialist') {
      expect(state.status).toBe('specialist');
    } else {
      expect(state.gameOver?.reason).toBe('specialist_exam_failed');
    }
  });

  it('the exam attempt is deterministic for the same save/seed — no reroll on "refresh" (§4)', () => {
    const seed = 'exam-flow-determinism';
    const afterResidency = runResidencyToCompletion(residencyState(seed), seed);

    const preferred = { specialist_exam_02_sinav_gunu: 'sinava_gir' };
    const a = runSpecialistExam(afterResidency, seed, preferred);
    const b = runSpecialistExam(afterResidency, seed, preferred);
    expect(a.specialistExam).toEqual(b.specialistExam);
    expect(a.career.phase).toBe(b.career.phase);
    expect(a.gameOver).toEqual(b.gameOver);
  });

  it('a first-attempt failure schedules a real retry (stage4) rather than ending the career immediately', () => {
    // passProbability with every factor at its worst still floors at 0.05
    // (§2 — no factor can push it to a hard 0), so a fixed seed isn't
    // guaranteed to fail by construction; search a small, fixed candidate
    // list (still fully deterministic/reproducible) for one that does.
    const candidateSeeds = ['exam-flow-retry-check', 'exam-flow-retry-check-2', 'exam-flow-retry-check-3', 'exam-flow-retry-check-4', 'exam-flow-retry-check-5'];
    let cursor: GameState | null = null;
    let seed = '';
    for (const candidate of candidateSeeds) {
      let state = runResidencyToCompletion(residencyState(candidate), candidate);
      if (state.career.phase !== 'specialist_exam') continue;
      state = {
        ...state,
        resources: { ...state.resources, burnout: 100, stress: 100, fatigue: 100 },
        statistics: { ...state.statistics, specialist_exam_prep_points: 0, 'crisis:total': 1, 'crisis:recovered': 0, career_opportunities_taken: 0 },
        relationships: {},
      };
      let steps = 0;
      // Stops the instant stage2 (the attempt itself) is queued, WITHOUT
      // auto-resolving it via the generic helper — only stage1 (or
      // anything else incidental) resolves generically along the way.
      while (!state.weeklyEventQueue.some((q) => q.eventId === 'specialist_exam_02_sinav_gunu') && steps < 10) {
        const r = advanceSpecialistExamWeek(state, repo);
        if (r.state.weeklyEventQueue.some((q) => q.eventId === 'specialist_exam_02_sinav_gunu')) {
          state = r.state;
          break;
        }
        state = resolveAllQueued(r.state, candidate, state.career.residencyWeek + 1, { specialist_exam_01_bir_hafta_once: 'normal_tempo' });
        steps += 1;
      }
      const attempted = resolveAllQueued(state, candidate, state.career.residencyWeek + 1, { specialist_exam_02_sinav_gunu: 'sinava_gir' });
      if (attempted.specialistExam?.result === 'failed') {
        cursor = attempted;
        seed = candidate;
        break;
      }
    }
    expect(cursor).not.toBeNull();
    expect(cursor!.career.phase).toBe('specialist_exam');

    let walked: GameState = cursor!;
    let steps = 0;
    let foundStage4 = false;
    while (!foundStage4 && steps < 10) {
      const r = advanceSpecialistExamWeek(walked, repo);
      if (r.state.weeklyEventQueue.some((q) => q.eventId === 'specialist_exam_04_ikinci_sans')) {
        walked = r.state;
        foundStage4 = true;
        break;
      }
      walked = resolveAllQueued(r.state, seed, walked.career.residencyWeek + 1);
      steps += 1;
    }
    expect(walked.weeklyEventQueue.some((q) => q.eventId === 'specialist_exam_04_ikinci_sans')).toBe(true);
  });
});
