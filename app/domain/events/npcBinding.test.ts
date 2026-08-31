import { describe, expect, it } from 'vitest';
import { advanceResidencyWeekWithEvents, resolveEventChoice } from './engine';
import { createEventRepository } from './repository';
import { isEventEligible, hasAlreadyOccurred } from './choices';
import { buildRequirementContext } from './requirements';
import { resolveCheckpointCandidate } from './scheduled';
import { createInitialGameState } from '../state/createInitialGameState';
import { beginTus } from '../state/transitions';
import { selectResidencyProgram, proceedToPreference } from '../state/tusTransitions';
import { getResidencyProgram } from '../config/residencyPrograms';
import { createScopedRng, createSeededRng } from '../rng/seededRng';
import type { EventDefinition } from './types';
import type { GameState } from '../state/types';

const program = getResidencyProgram('baskent_ic');

function residencyState(seed: string): GameState {
  const initial = createInitialGameState(
    { name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' },
    { seed }
  );
  return selectResidencyProgram(proceedToPreference(beginTus(initial)), program);
}

const noQuiet = { minEventsPerWeek: 1, maxEventsPerWeek: 4, quietWeekProbability: 0, rareChancePerWeek: 0 };

describe('once (§21)', () => {
  const onceEvent: EventDefinition = {
    id: 'once_a', title: 'T', description: 'D', category: 'GENERAL', triggerMode: 'pool',
    weight: 1000, once: true, choices: [{ id: 'go', text: 'Go' }],
  };

  it('is eligible before it has ever occurred, and ineligible once eventHistory contains it', () => {
    const state = residencyState('once-check');
    const ctx = buildRequirementContext(state);
    expect(isEventEligible(onceEvent, ctx, [])).toBe(true);
    expect(isEventEligible(onceEvent, ctx, [{ eventId: 'once_a' }])).toBe(false);
    expect(hasAlreadyOccurred('once_a', [{ eventId: 'once_a' }])).toBe(true);
  });

  it('is distinct from cooldownWeeks — a cooldown reopens, once never does', () => {
    const cooldownOnly: EventDefinition = { ...onceEvent, id: 'cooldown_a', once: false, cooldownWeeks: 4 };
    expect(cooldownOnly.once).toBe(false);
  });

  it('works for scheduled/checkpoint candidates too — a once candidate drops out of the race once it has occurred', () => {
    const candidate: EventDefinition = {
      id: 'once_checkpoint', title: 'T', description: 'D', category: 'GENERAL', triggerMode: 'scheduled',
      chainId: 'x', chainCheckpoint: 'stage1', once: true, choices: [{ id: 'a', text: 'A' }],
    };
    const state = residencyState('once-checkpoint');
    const ctx = buildRequirementContext(state);
    expect(resolveCheckpointCandidate([candidate], ctx, [])?.event.id).toBe('once_checkpoint');
    expect(resolveCheckpointCandidate([candidate], ctx, [{ eventId: 'once_checkpoint' }])).toBeNull();
  });

  it('a real engine week never re-queues a once event once it is in eventHistory', () => {
    const repo = createEventRepository([onceEvent]);
    let state: GameState = { ...residencyState('once-engine'), eventHistory: [{ week: 0, eventId: 'once_a', choiceId: 'go', resolvedTitle: 'T', category: 'GENERAL' }] };
    const weekRng = createScopedRng('once-engine', 'residency:week:1');
    const eventsRng = createScopedRng('once-engine', 'events:week:1');
    const result = advanceResidencyWeekWithEvents(state, weekRng, eventsRng, repo, noQuiet);
    expect(result.state.weeklyEventQueue.some((q) => q.eventId === 'once_a')).toBe(false);
  });
});

describe('NPC-selector binding freezes at queue time (§16)', () => {
  const selectorEvent: EventDefinition = {
    id: 'selector_a', title: 'T', description: 'D', category: 'GENERAL', triggerMode: 'pool',
    weight: 1000, cooldownWeeks: 0,
    npcSelectors: { primary: { randomActiveByRole: 'nurse' } },
    choices: [{ id: 'go', text: 'Go', relationshipEffects: [{ boundNpc: 'primary', trust: 5 }] }],
  };

  it('binds once when queued, and a JSON round-trip ("refresh") keeps the same bound npc', () => {
    const repo = createEventRepository([selectorEvent]);
    const state = residencyState('bind-refresh');
    const weekRng = createScopedRng('bind-refresh', 'residency:week:1');
    const eventsRng = createScopedRng('bind-refresh', 'events:week:1');
    const result = advanceResidencyWeekWithEvents(state, weekRng, eventsRng, repo, noQuiet);

    const queued = result.state.weeklyEventQueue.find((q) => q.eventId === 'selector_a');
    expect(queued).toBeDefined();
    expect(queued!.boundNpcIds.primary).toBeDefined();

    const reloaded: GameState = JSON.parse(JSON.stringify(result.state));
    const reloadedQueued = reloaded.weeklyEventQueue.find((q) => q.eventId === 'selector_a');
    expect(reloadedQueued!.boundNpcIds.primary).toBe(queued!.boundNpcIds.primary);
  });

  it('resolveEventChoice applies the relationship effect to the FROZEN bound npc, not a re-selected one', () => {
    const repo = createEventRepository([selectorEvent]);
    const state = residencyState('bind-resolve');
    const weekRng = createScopedRng('bind-resolve', 'residency:week:1');
    const eventsRng = createScopedRng('bind-resolve', 'events:week:1');
    const advanced = advanceResidencyWeekWithEvents(state, weekRng, eventsRng, repo, noQuiet);
    const queued = advanced.state.weeklyEventQueue.find((q) => q.eventId === 'selector_a')!;
    const boundId = queued.boundNpcIds.primary;
    const trustBefore = advanced.state.relationships[boundId]?.trust ?? 0;

    const result = resolveEventChoice(advanced.state, selectorEvent, 'go', createSeededRng('resolve'));
    expect(result.state.relationships[boundId].trust).toBe(trustBefore + 5);
  });
});

describe('requiredNpcTemplate (§17)', () => {
  const barisOnlyEvent: EventDefinition = {
    id: 'baris_only', title: 'T', description: 'D', category: 'GENERAL', triggerMode: 'pool',
    requiredNpcTemplate: 'baris', choices: [{ id: 'go', text: 'Go' }],
  };

  it('is eligible when the "baris" template npc is active in the roster', () => {
    const state = residencyState('template-check');
    const ctx = buildRequirementContext(state);
    expect(isEventEligible(barisOnlyEvent, ctx)).toBe(true);
  });

  it('is ineligible once baris has left', () => {
    const state = residencyState('template-left');
    const left: GameState = { ...state, npcs: { ...state.npcs, baris: { ...state.npcs.baris, active: false } } };
    const ctx = buildRequirementContext(left);
    expect(isEventEligible(barisOnlyEvent, ctx)).toBe(false);
  });
});

describe('npcTransitions choice effect (§12/§31)', () => {
  const transitionEvent: EventDefinition = {
    id: 'baris_promotion', title: 'T', description: 'D', category: 'GENERAL', triggerMode: 'pool',
    choices: [{ id: 'go', text: 'Go', npcTransitions: [{ npc: 'baris', type: 'became_specialist' }] }],
  };

  it('applies an authored, immediate transition to the target npc when the choice resolves', () => {
    const state = residencyState('transition-check');
    const queued: GameState = { ...state, weeklyEventQueue: [{ instanceId: transitionEvent.id, eventId: transitionEvent.id, boundNpcIds: {} }] };
    const result = resolveEventChoice(queued, transitionEvent, 'go', createSeededRng('r'));
    expect(result.state.npcs.baris.role).toBe('specialist');
    expect(result.state.npcs.baris.career.stage).toBe('specialist');
    expect(result.npcTransitions).toEqual([{ npcId: 'baris', type: 'became_specialist', week: state.career.residencyWeek }]);
  });
});
