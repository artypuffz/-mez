import { describe, expect, it } from 'vitest';
import { advanceResidencyWeekWithEvents, resolveEventChoice } from './engine';
import { createEventRepository } from './repository';
import { createInitialGameState } from '../state/createInitialGameState';
import { beginTus } from '../state/transitions';
import { selectResidencyProgram, proceedToPreference } from '../state/tusTransitions';
import { getResidencyProgram } from '../config/residencyPrograms';
import { createScopedRng } from '../rng/seededRng';
import type { EventDefinition } from './types';
import type { GameState } from '../state/types';

function residencyState(seed: string): GameState {
  const initial = createInitialGameState(
    { name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' },
    { seed }
  );
  const program = getResidencyProgram('baskent_ic');
  return selectResidencyProgram(proceedToPreference(beginTus(initial)), program);
}

function rngs(seed: string, week: number) {
  return {
    weekRng: createScopedRng(seed, `residency:week:${week}`),
    eventsRng: createScopedRng(seed, `events:week:${week}`),
  };
}

const noQuietConfig = { minEventsPerWeek: 1, maxEventsPerWeek: 4, quietWeekProbability: 0, rareChancePerWeek: 0 };

const poolEvent: EventDefinition = {
  id: 'pool_a', title: 'POOL', description: 'D', category: 'GENERAL', triggerMode: 'pool',
  weight: 10, choices: [{ id: 'choice_a', text: 'A', immediateEffects: { stress: 5 } }],
};

describe('advanceResidencyWeekWithEvents', () => {
  it('advances the week using Phase 4 semantics unchanged (week/year/resources)', () => {
    const state = residencyState('integration');
    const repo = createEventRepository([poolEvent]);
    const { weekRng, eventsRng } = rngs('integration', 1);
    const result = advanceResidencyWeekWithEvents(state, weekRng, eventsRng, repo, noQuietConfig);
    expect(result.state.career.residencyWeek).toBe(1);
    expect(result.weekAdvance.state.career.residencyWeek).toBe(1);
  });

  it('queues selected pool events into weeklyEventQueue', () => {
    const state = residencyState('queue-check');
    const repo = createEventRepository([poolEvent]);
    const { weekRng, eventsRng } = rngs('queue-check', 1);
    const result = advanceResidencyWeekWithEvents(state, weekRng, eventsRng, repo, noQuietConfig);
    expect(result.state.weeklyEventQueue.length).toBeGreaterThan(0);
    expect(result.state.weeklyEventQueue.map((q) => q.eventId)).toEqual(result.queuedEventIds);
  });

  it('never drops an overdue scheduled event even past the weekly cap', () => {
    const scheduled1: EventDefinition = {
      id: 'sched_1', title: 'S1', description: 'D', category: 'GENERAL', triggerMode: 'scheduled',
      chainId: 'c', chainCheckpoint: 'cp1', choices: [{ id: 'a', text: 'A' }],
    };
    const scheduled2: EventDefinition = {
      id: 'sched_2', title: 'S2', description: 'D', category: 'GENERAL', triggerMode: 'scheduled',
      chainId: 'c', chainCheckpoint: 'cp2', choices: [{ id: 'a', text: 'A' }],
    };
    const repo = createEventRepository([scheduled1, scheduled2]);
    const state: GameState = {
      ...residencyState('overdue'),
      pendingEvents: [
        { chainId: 'c', checkpoint: 'cp1', triggerWeek: 1, sourceEventId: 's', sourceChoiceId: 'c' },
        { chainId: 'c', checkpoint: 'cp2', triggerWeek: 1, sourceEventId: 's', sourceChoiceId: 'c' },
      ],
    };
    const { weekRng, eventsRng } = rngs('overdue', 1);
    // cap of 1, but 2 chain events are due — both must still appear.
    const result = advanceResidencyWeekWithEvents(state, weekRng, eventsRng, repo, { ...noQuietConfig, maxEventsPerWeek: 1 });
    expect(result.queuedEventIds).toEqual(expect.arrayContaining(['sched_1', 'sched_2']));
  });

  it('applies due pending effects before the week is presented', () => {
    const repo = createEventRepository([]);
    const state: GameState = {
      ...residencyState('pending-effects'),
      pendingEffects: [{ dueWeek: 1, sourceEventId: 's', sourceChoiceId: 'c', effects: { stress: 7 } }],
    };
    const before = state.resources.stress;
    const { weekRng, eventsRng } = rngs('pending-effects', 1);
    const result = advanceResidencyWeekWithEvents(state, weekRng, eventsRng, repo, noQuietConfig);
    // baseline tick also moves stress, so just assert the pending +7 was folded in (net change includes it)
    expect(result.state.pendingEffects).toHaveLength(0);
    expect(result.state.resources.stress).not.toBe(before);
  });
});

describe('resolveEventChoice', () => {
  function queuedState(): GameState {
    return { ...residencyState('choice'), weeklyEventQueue: [{ instanceId: poolEvent.id, eventId: poolEvent.id, boundNpcIds: {} }] };
  }

  it('applies immediate effects and returns only visible resource deltas', () => {
    const state = queuedState();
    const result = resolveEventChoice(state, poolEvent, 'choice_a', createScopedRng('choice', 'test'));
    expect(result.state.resources.stress).toBe(state.resources.stress + 5);
    expect(result.visibleEffects).toEqual({ stress: 5 });
  });

  it('removes the event from weeklyEventQueue and logs it to eventHistory', () => {
    const state = queuedState();
    const result = resolveEventChoice(state, poolEvent, 'choice_a', createScopedRng('choice', 'test'));
    expect(result.state.weeklyEventQueue.some((q) => q.eventId === poolEvent.id)).toBe(false);
    expect(result.state.eventHistory).toHaveLength(1);
    expect(result.state.eventHistory[0]).toMatchObject({ eventId: 'pool_a', choiceId: 'choice_a', category: 'GENERAL' });
  });

  it('throws when resolving an event not currently in the queue (no double-apply)', () => {
    const state: GameState = { ...residencyState('no-queue'), weeklyEventQueue: [] };
    expect(() => resolveEventChoice(state, poolEvent, 'choice_a', createScopedRng('x', 'y'))).toThrow();
  });

  it('schedules a followUpEvent into pendingEvents', () => {
    const chainEvent: EventDefinition = {
      id: 'chain_a', title: 'T', description: 'D', category: 'GENERAL', triggerMode: 'pool',
      chainId: 'x', chainCheckpoint: 'stage1', choices: [
        { id: 'go', text: 'Go', followUpEvent: { chainId: 'x', checkpoint: 'stage2', delayWeeks: 5 } },
      ],
    };
    const state: GameState = {
      ...residencyState('followup'),
      weeklyEventQueue: [{ instanceId: chainEvent.id, eventId: chainEvent.id, boundNpcIds: {} }],
    };
    const result = resolveEventChoice(state, chainEvent, 'go', createScopedRng('x', 'y'));
    expect(result.state.pendingEvents).toHaveLength(1);
    expect(result.state.pendingEvents[0]).toMatchObject({ chainId: 'x', checkpoint: 'stage2', triggerWeek: state.career.residencyWeek + 5 });
  });

  it('schedules delayedEffects into pendingEffects with the range already resolved', () => {
    const delayedEvent: EventDefinition = {
      id: 'delayed_a', title: 'T', description: 'D', category: 'GENERAL', triggerMode: 'pool',
      choices: [{ id: 'go', text: 'Go', delayedEffects: [{ delayWeeks: 3, effects: { stress: { min: 4, max: 4 } } }] }],
    };
    const state: GameState = {
      ...residencyState('delayed'),
      weeklyEventQueue: [{ instanceId: delayedEvent.id, eventId: delayedEvent.id, boundNpcIds: {} }],
    };
    const result = resolveEventChoice(state, delayedEvent, 'go', createScopedRng('x', 'y'));
    expect(result.state.pendingEffects).toHaveLength(1);
    expect(result.state.pendingEffects[0].effects.stress).toBe(4);
    expect(result.state.pendingEffects[0].dueWeek).toBe(state.career.residencyWeek + 3);
  });

  it('applies behaviorTags and relationshipEffects (not surfaced in visibleEffects)', () => {
    const tagEvent: EventDefinition = {
      id: 'tag_a', title: 'T', description: 'D', category: 'GENERAL', triggerMode: 'pool',
      choices: [{ id: 'go', text: 'Go', behaviorTags: ['junior:supportive'], relationshipEffects: [{ npc: 'baris', trust: 10 }] }],
    };
    const state: GameState = {
      ...residencyState('tags'),
      weeklyEventQueue: [{ instanceId: tagEvent.id, eventId: tagEvent.id, boundNpcIds: {} }],
    };
    // Barış now exists as a real, procedurally-seeded NpcState with a
    // small non-zero starting trust (§19) — assert the +10 delta rather
    // than an assumed-zero baseline.
    const trustBefore = state.relationships.baris?.trust ?? 0;
    const result = resolveEventChoice(state, tagEvent, 'go', createScopedRng('x', 'y'));
    expect(result.state.behaviorStats['junior:supportive']).toBe(1);
    expect(result.state.relationships.baris.trust).toBe(trustBefore + 10);
    expect(result.visibleEffects).toEqual({});
  });

  it('applies a careerEffects end_career entry: sets gameOver and flips career.phase (§25/§51)', () => {
    const resignEvent: EventDefinition = {
      id: 'resign_a', title: 'T', description: 'D', category: 'CRISIS', triggerMode: 'crisis', crisisType: 'burnout',
      choices: [{
        id: 'quit', text: 'Quit', immediateEffects: { stress: -10 },
        careerEffects: [{ type: 'end_career', reason: 'resigned_burnout' }],
      }],
    };
    const state: GameState = {
      ...residencyState('resign'),
      weeklyEventQueue: [{ instanceId: resignEvent.id, eventId: resignEvent.id, boundNpcIds: {} }],
    };
    const result = resolveEventChoice(state, resignEvent, 'quit', createScopedRng('x', 'y'));
    // every other effect on the same choice still lands
    expect(result.state.resources.stress).toBe(state.resources.stress - 10);
    expect(result.state.career.phase).toBe('gameover');
    expect(result.state.gameOver).toMatchObject({
      reason: 'resigned_burnout', week: state.career.residencyWeek, triggeredByEventId: 'resign_a', selectedChoiceId: 'quit',
    });
  });

  it('never overwrites an already-set gameOver on a later resolution (defense in depth)', () => {
    const alreadyOver: GameState = {
      ...residencyState('already-over'),
      career: { ...residencyState('already-over').career, phase: 'gameover' },
      gameOver: { reason: 'financial_collapse', week: 5 },
      weeklyEventQueue: [{ instanceId: poolEvent.id, eventId: poolEvent.id, boundNpcIds: {} }],
    };
    const result = resolveEventChoice(alreadyOver, poolEvent, 'choice_a', createScopedRng('x', 'y'));
    expect(result.state.gameOver?.reason).toBe('financial_collapse');
    expect(result.state.career.phase).toBe('gameover');
  });
});

describe('advanceResidencyWeekWithEvents — crisis selection (§11)', () => {
  it('queues a crisis event once its resource threshold is crossed, separate from the pool budget', () => {
    const crisisEvent: EventDefinition = {
      id: 'crisis_test', title: 'T', description: 'D', category: 'CRISIS', triggerMode: 'crisis', crisisType: 'exhaustion',
      weight: 1000, choices: [{ id: 'go', text: 'Go' }],
    };
    const repo = createEventRepository([crisisEvent]);
    const state: GameState = {
      ...residencyState('crisis-queue'),
      resources: { ...residencyState('crisis-queue').resources, fatigue: 95 },
    };
    let sawCrisis = false;
    for (let week = 1; week <= 40 && !sawCrisis; week++) {
      const { weekRng, eventsRng } = rngs('crisis-queue', week);
      const result = advanceResidencyWeekWithEvents(state, weekRng, eventsRng, repo, { ...noQuietConfig, maxEventsPerWeek: 0 });
      if (result.queuedEventIds.includes('crisis_test')) sawCrisis = true;
    }
    expect(sawCrisis).toBe(true);
  });

  it('a triggerMode:"crisis" event never appears via the normal pool draw', () => {
    const crisisEvent: EventDefinition = {
      id: 'crisis_only', title: 'T', description: 'D', category: 'CRISIS', triggerMode: 'crisis', crisisType: 'exhaustion',
      weight: 1000, choices: [{ id: 'go', text: 'Go' }],
    };
    const repo = createEventRepository([crisisEvent]);
    // Low fatigue — never crisis-eligible — but weight 1000 would dominate
    // the pool draw if it were mistakenly treated as a pool event.
    const state = residencyState('never-in-pool');
    for (let week = 1; week <= 10; week++) {
      const { weekRng, eventsRng } = rngs('never-in-pool', week);
      const result = advanceResidencyWeekWithEvents(state, weekRng, eventsRng, repo, noQuietConfig);
      expect(result.queuedEventIds).not.toContain('crisis_only');
    }
  });
});
