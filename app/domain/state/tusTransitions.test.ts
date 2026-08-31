import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './createInitialGameState';
import { beginTus } from './transitions';
import {
  startTusExam,
  recordTusExamChoice,
  generateTusResult,
  proceedToPreference,
  selectResidencyProgram,
} from './tusTransitions';
import { createSeededRng } from '../rng/seededRng';
import { DEFAULT_TUS_SCORE_CONFIG } from '../config/tusScoreConfig';
import { getResidencyProgram } from '../config/residencyPrograms';

function freshState(seed: string) {
  const initial = createInitialGameState(
    { name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' },
    { seed }
  );
  return beginTus(initial);
}

describe('startTusExam', () => {
  it('selects the configured number of events and moves to the exam step', () => {
    const state = startTusExam(freshState('start-exam'), 'duzenli', createSeededRng('start-exam:rng'));
    expect(state.tus.prepProfileId).toBe('duzenli');
    expect(state.tus.examEventIds).toHaveLength(DEFAULT_TUS_SCORE_CONFIG.examEventCount);
    expect(state.tus.step).toBe('exam');
    expect(state.tus.examLog).toEqual([]);
  });
});

describe('recordTusExamChoice', () => {
  it('appends to the log and stays on the exam step until all events are answered', () => {
    let state = startTusExam(freshState('record'), 'duzenli', createSeededRng('record:rng'));
    const [first, second, third] = state.tus.examEventIds;

    state = recordTusExamChoice(state, first, 'any-choice');
    expect(state.tus.examLog).toHaveLength(1);
    expect(state.tus.step).toBe('exam');

    state = recordTusExamChoice(state, second, 'any-choice');
    expect(state.tus.step).toBe('exam');

    state = recordTusExamChoice(state, third, 'any-choice');
    const remaining = state.tus.examEventIds.length - state.tus.examLog.length;
    expect(state.tus.step).toBe(remaining === 0 ? 'result' : 'exam');
  });

  it('flips to the result step once every picked event has an answer', () => {
    let state = startTusExam(freshState('finish'), 'duzenli', createSeededRng('finish:rng'));
    for (const eventId of state.tus.examEventIds) {
      state = recordTusExamChoice(state, eventId, 'any-choice');
    }
    expect(state.tus.step).toBe('result');
    expect(state.tus.examLog).toHaveLength(state.tus.examEventIds.length);
  });
});

describe('generateTusResult', () => {
  it('sets career.tusScore exactly once and is idempotent after that', () => {
    let state = startTusExam(freshState('result'), 'duzenli', createSeededRng('result:rng'));
    for (const eventId of state.tus.examEventIds) {
      state = recordTusExamChoice(state, eventId, 'dummy-choice');
    }
    expect(state.career.tusScore).toBeUndefined();

    const withResult = generateTusResult(state, createSeededRng('result:score'));
    expect(withResult.career.tusScore).toBeTypeOf('number');

    const again = generateTusResult(withResult, createSeededRng('different-seed-should-not-matter'));
    expect(again.career.tusScore).toBe(withResult.career.tusScore);
  });

  it('throws if called before a prep profile was selected', () => {
    const state = freshState('no-profile');
    expect(() => generateTusResult(state, createSeededRng('no-profile:rng'))).toThrow();
  });
});

describe('proceedToPreference', () => {
  it('moves career.phase to preference', () => {
    const state = proceedToPreference(freshState('preference'));
    expect(state.career.phase).toBe('preference');
  });
});

describe('selectResidencyProgram', () => {
  it('assigns branch/hospital/city, sets currentCity, and starts residency at week 0', () => {
    const program = getResidencyProgram('baskent_ic');
    const state = selectResidencyProgram(proceedToPreference(freshState('program')), program);

    expect(state.career.branch).toBe(program.branchId);
    expect(state.career.hospital).toBe(program.hospitalId);
    expect(state.career.city).toBe(program.cityId);
    expect(state.character.currentCity).toBe(program.cityId);
    expect(state.career.phase).toBe('residency');
    expect(state.career.residencyWeek).toBe(0);
    expect(state.career.residencyYear).toBe(1);
    expect(state.career.seniorityStage).toBe('comez');
  });

  it('keeps hometown separate from the residency city', () => {
    const program = getResidencyProgram('egekiyi_ic');
    const initial = createInitialGameState(
      { name: 'Ada', age: 26, gender: 'kadın', hometown: 'Trabzon', background: 'aile_yaninda' },
      { seed: 'hometown-check' }
    );
    const state = selectResidencyProgram(beginTus(initial), program);
    expect(state.character.hometown).toBe('Trabzon');
    expect(state.character.currentCity).toBe('izmir');
  });
});
