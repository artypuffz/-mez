import { describe, expect, it } from 'vitest';
import { applyDuePendingEffects, resolveCheckpointCandidate, resolveDuePendingEvents } from './scheduled';
import { createEventRepository } from './repository';
import { buildRequirementContext } from './requirements';
import { createInitialGameState } from '../state/createInitialGameState';
import type { EventDefinition } from './types';
import type { GameState } from '../state/types';

function scheduledEvent(overrides: Partial<EventDefinition>): EventDefinition {
  return {
    id: 'ev', title: 'T', description: 'D', category: 'GENERAL', triggerMode: 'scheduled',
    chainId: 'x', chainCheckpoint: 'stage2', choices: [{ id: 'a', text: 'A' }], ...overrides,
  };
}

function stateWith(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialGameState({ name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' });
  return { ...base, ...overrides };
}

describe('resolveCheckpointCandidate', () => {
  it('picks the highest-priority matching normal candidate', () => {
    const low = scheduledEvent({ id: 'low', priority: 5, requirements: { stat: 'career.week', gte: 0 } });
    const high = scheduledEvent({ id: 'high', priority: 10, requirements: { stat: 'career.week', gte: 0 } });
    const ctx = buildRequirementContext(stateWith());
    const result = resolveCheckpointCandidate([low, high], ctx);
    expect(result?.event.id).toBe('high');
    expect(result?.usedFallback).toBe(false);
  });

  it('breaks a priority tie with requirement specificity (more leaves wins)', () => {
    const generic = scheduledEvent({ id: 'generic', priority: 10, requirements: { stat: 'career.week', gte: 0 } });
    const specific = scheduledEvent({
      id: 'specific', priority: 10,
      requirements: { all: [{ stat: 'career.week', gte: 0 }, { stat: 'career.residencyYear', gte: 0 }] },
    });
    const ctx = buildRequirementContext(stateWith());
    const result = resolveCheckpointCandidate([generic, specific], ctx);
    expect(result?.event.id).toBe('specific');
  });

  it('uses the isFallback candidate only when no normal candidate matches', () => {
    const normal = scheduledEvent({ id: 'normal', requirements: { stat: 'career.week', gte: 999 } }); // never matches
    const fallback = scheduledEvent({ id: 'fallback', isFallback: true, requirements: { stat: 'career.week', gte: 0 } });
    const ctx = buildRequirementContext(stateWith());
    const result = resolveCheckpointCandidate([normal, fallback], ctx);
    expect(result?.event.id).toBe('fallback');
    expect(result?.usedFallback).toBe(true);
  });

  it('prefers a matching normal candidate over the fallback even if the fallback would also match', () => {
    const normal = scheduledEvent({ id: 'normal', requirements: { stat: 'career.week', gte: 0 } });
    const fallback = scheduledEvent({ id: 'fallback', isFallback: true, requirements: { stat: 'career.week', gte: 0 } });
    const ctx = buildRequirementContext(stateWith());
    const result = resolveCheckpointCandidate([normal, fallback], ctx);
    expect(result?.event.id).toBe('normal');
  });

  it('throws when a checkpoint has more than one fallback candidate', () => {
    const f1 = scheduledEvent({ id: 'f1', isFallback: true });
    const f2 = scheduledEvent({ id: 'f2', isFallback: true });
    const ctx = buildRequirementContext(stateWith());
    expect(() => resolveCheckpointCandidate([f1, f2], ctx)).toThrow();
  });

  it('returns null when nothing matches and there is no fallback', () => {
    const normal = scheduledEvent({ id: 'normal', requirements: { stat: 'career.week', gte: 999 } });
    const ctx = buildRequirementContext(stateWith());
    expect(resolveCheckpointCandidate([normal], ctx)).toBeNull();
  });

  it('dynamic branching: relationship state, not just the origin flag, decides the winner', () => {
    const dostluk = scheduledEvent({
      id: 'dostluk',
      requirements: { any: [{ relationship: { npc: 'baris', trust: { gte: 10 } } }, { flag: 'path', eq: 'dostluk' }] },
    });
    const gerilim = scheduledEvent({
      id: 'gerilim', isFallback: true,
      requirements: { any: [{ relationship: { npc: 'baris', grudge: { gte: 8 } } }, { flag: 'path', eq: 'gerilim' }] },
    });
    // Origin flag says "gerilim", but interim relationship recovery pushed trust up.
    const state = stateWith({
      flags: { path: 'gerilim' },
      relationships: { baris: { trust: 15, friendship: 0, grudge: 0, mobbingTendency: 0, helpfulness: 0, ego: 0, burnoutNpc: 0 } },
    });
    const ctx = buildRequirementContext(state);
    const result = resolveCheckpointCandidate([dostluk, gerilim], ctx);
    expect(result?.event.id).toBe('dostluk');
  });
});

describe('resolveDuePendingEvents', () => {
  it('does not resolve a pending event before its trigger week', () => {
    const repo = createEventRepository([scheduledEvent({ id: 'a' })]);
    const state = stateWith({ pendingEvents: [{ chainId: 'x', checkpoint: 'stage2', triggerWeek: 20, sourceEventId: 's', sourceChoiceId: 'c' }] });
    const result = resolveDuePendingEvents(state, 15, repo);
    expect(result.resolvedEvents).toEqual([]);
    expect(result.state.pendingEvents).toHaveLength(1);
  });

  it('resolves a pending event exactly at its trigger week and removes it from the queue', () => {
    const repo = createEventRepository([scheduledEvent({ id: 'a' })]);
    const state = stateWith({ pendingEvents: [{ chainId: 'x', checkpoint: 'stage2', triggerWeek: 20, sourceEventId: 's', sourceChoiceId: 'c' }] });
    const result = resolveDuePendingEvents(state, 20, repo);
    expect(result.resolvedEvents.map((e) => e.id)).toEqual(['a']);
    expect(result.state.pendingEvents).toHaveLength(0);
    expect(result.state.activeChains.x).toMatchObject({ chainId: 'x', currentCheckpoint: 'stage2' });
  });

  it('resolved chain events never come from the pool repository index', () => {
    // sanity: even if a pool event happened to share a chainId/checkpoint,
    // getCheckpointCandidates (used here) would never return it — covered
    // directly in repository.test.ts, re-asserted here at this call site.
    const poolStage1 = { ...scheduledEvent({ id: 'stage1_pool' }), triggerMode: 'pool' as const, chainCheckpoint: 'stage2' };
    const repo = createEventRepository([poolStage1]);
    const state = stateWith({ pendingEvents: [{ chainId: 'x', checkpoint: 'stage2', triggerWeek: 5, sourceEventId: 's', sourceChoiceId: 'c' }] });
    const result = resolveDuePendingEvents(state, 5, repo);
    expect(result.resolvedEvents).toEqual([]);
  });
});

describe('applyDuePendingEffects', () => {
  it('applies an effect exactly at its due week and removes it from the queue', () => {
    const state = stateWith({
      resources: { stress: 20, fatigue: 20, burnout: 0, money: 0 },
      pendingEffects: [{ dueWeek: 30, sourceEventId: 's', sourceChoiceId: 'c', effects: { stress: 5 } }],
    });
    const before = applyDuePendingEffects(state, 25);
    expect(before.state.pendingEffects).toHaveLength(1);
    expect(before.state.resources.stress).toBe(20);

    const after = applyDuePendingEffects(state, 30);
    expect(after.state.pendingEffects).toHaveLength(0);
    expect(after.state.resources.stress).toBe(25);
  });
});
