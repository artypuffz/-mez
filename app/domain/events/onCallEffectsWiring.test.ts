import { describe, expect, it } from 'vitest';
import { advanceResidencyWeekWithEvents, resolveEventChoice } from './engine';
import { createEventRepository } from './repository';
import { createInitialGameState } from '../state/createInitialGameState';
import { beginTus } from '../state/transitions';
import { selectResidencyProgram, proceedToPreference } from '../state/tusTransitions';
import { getResidencyProgram } from '../config/residencyPrograms';
import { createScopedRng, createSeededRng } from '../rng/seededRng';
import type { EventDefinition } from './types';
import type { GameState } from '../state/types';

const program = getResidencyProgram('baskent_ic');
const repo = createEventRepository([]);

function stateWithSchedule(seed: string): GameState {
  const initial = createInitialGameState(
    { name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'kendi_basina' },
    { seed }
  );
  let state = selectResidencyProgram(proceedToPreference(beginTus(initial)), program);
  for (let week = 1; week <= 6 && !state.onCall.schedule; week++) {
    const weekRng = createScopedRng(seed, `residency:week:${week}`);
    const eventsRng = createScopedRng(seed, `events:week:${week}`);
    state = advanceResidencyWeekWithEvents(state, weekRng, eventsRng, repo).state;
  }
  return state;
}

describe('choice.onCallEffects wiring (§23)', () => {
  it('add_player_shift via a resolved choice actually mutates state.onCall.schedule', () => {
    const state = stateWithSchedule('oncall-effect-add');
    expect(state.onCall.schedule).not.toBeNull();
    const before = state.onCall.schedule!.player.totalShifts;

    const extraShiftEvent: EventDefinition = {
      id: 'extra_shift_offer', title: 'T', description: 'D', category: 'ON_CALL', triggerMode: 'pool',
      choices: [{ id: 'accept', text: 'Accept', onCallEffects: [{ type: 'add_player_shift', count: 1 }] }],
    };
    const queued: GameState = {
      ...state,
      weeklyEventQueue: [{ instanceId: extraShiftEvent.id, eventId: extraShiftEvent.id, boundNpcIds: {} }],
    };
    const result = resolveEventChoice(queued, extraShiftEvent, 'accept', createSeededRng('r'));
    expect(result.state.onCall.schedule!.player.totalShifts).toBe(before + 1);
  });

  it('remove_player_shift via a resolved choice removes a shift', () => {
    const state = stateWithSchedule('oncall-effect-remove');
    expect(state.onCall.schedule).not.toBeNull();
    const before = state.onCall.schedule!.player.totalShifts;

    const swapRequestEvent: EventDefinition = {
      id: 'shift_swap_request', title: 'T', description: 'D', category: 'ON_CALL', triggerMode: 'pool',
      choices: [{ id: 'agree', text: 'Agree', onCallEffects: [{ type: 'remove_player_shift', count: 1 }] }],
    };
    const queued: GameState = {
      ...state,
      weeklyEventQueue: [{ instanceId: swapRequestEvent.id, eventId: swapRequestEvent.id, boundNpcIds: {} }],
    };
    const result = resolveEventChoice(queued, swapRequestEvent, 'agree', createSeededRng('r'));
    expect(result.state.onCall.schedule!.player.totalShifts).toBe(Math.max(0, before - 1));
  });

  it('a choice with no onCallEffects leaves the schedule untouched', () => {
    const state = stateWithSchedule('oncall-effect-noop');
    const plainEvent: EventDefinition = {
      id: 'plain_event', title: 'T', description: 'D', category: 'GENERAL', triggerMode: 'pool',
      choices: [{ id: 'go', text: 'Go' }],
    };
    const queued: GameState = { ...state, weeklyEventQueue: [{ instanceId: plainEvent.id, eventId: plainEvent.id, boundNpcIds: {} }] };
    const result = resolveEventChoice(queued, plainEvent, 'go', createSeededRng('r'));
    expect(result.state.onCall.schedule).toEqual(state.onCall.schedule);
  });
});
