import { describe, expect, it } from 'vitest';
import { selectPoolEvents } from './selection';
import { createEventRepository } from './repository';
import { buildRequirementContext } from './requirements';
import { createInitialGameState } from '../state/createInitialGameState';
import { createSeededRng } from '../rng/seededRng';
import type { EventDefinition } from './types';
import type { PoolSelectionConfig } from '../config/eventSelection';

function makeEvent(overrides: Partial<EventDefinition>): EventDefinition {
  return {
    id: 'ev', title: 'T', description: 'D', category: 'GENERAL', triggerMode: 'pool',
    weight: 10, choices: [{ id: 'a', text: 'A' }], ...overrides,
  };
}

const ctx = buildRequirementContext(
  createInitialGameState({ name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' })
);

const noQuietConfig: PoolSelectionConfig = { minEventsPerWeek: 1, maxEventsPerWeek: 4, quietWeekProbability: 0, rareChancePerWeek: 0 };
const alwaysQuietConfig: PoolSelectionConfig = { minEventsPerWeek: 1, maxEventsPerWeek: 4, quietWeekProbability: 1, rareChancePerWeek: 0 };
const alwaysRareConfig: PoolSelectionConfig = { minEventsPerWeek: 0, maxEventsPerWeek: 4, quietWeekProbability: 1, rareChancePerWeek: 1 };

describe('selectPoolEvents', () => {
  it('is deterministic for the same seed', () => {
    const repo = createEventRepository([makeEvent({ id: 'a' }), makeEvent({ id: 'b' }), makeEvent({ id: 'c' })]);
    const a = selectPoolEvents(repo, ctx, 10, {}, 4, createSeededRng('same-seed'), noQuietConfig);
    const b = selectPoolEvents(repo, ctx, 10, {}, 4, createSeededRng('same-seed'), noQuietConfig);
    expect(a.selectedEvents.map((e) => e.id)).toEqual(b.selectedEvents.map((e) => e.id));
  });

  it('never selects an ineligible (requirements-failing) event', () => {
    const gated = makeEvent({ id: 'gated', requirements: { stat: 'career.seniorityStage', eq: 'kidemli' } });
    const open = makeEvent({ id: 'open' });
    const repo = createEventRepository([gated, open]);
    for (let i = 0; i < 20; i++) {
      const result = selectPoolEvents(repo, ctx, 10, {}, 4, createSeededRng(`iter-${i}`), noQuietConfig);
      expect(result.selectedEvents.map((e) => e.id)).not.toContain('gated');
    }
  });

  it('never selects an event on cooldown', () => {
    const repo = createEventRepository([makeEvent({ id: 'a', cooldownWeeks: 20 })]);
    const cooldowns = { a: 5 };
    const result = selectPoolEvents(repo, ctx, 10, cooldowns, 4, createSeededRng('x'), noQuietConfig);
    expect(result.selectedEvents.map((e) => e.id)).not.toContain('a');
  });

  it('respects the weekly budget', () => {
    const repo = createEventRepository(Array.from({ length: 10 }, (_, i) => makeEvent({ id: `ev_${i}` })));
    const result = selectPoolEvents(repo, ctx, 10, {}, 2, createSeededRng('budget'), { ...noQuietConfig, minEventsPerWeek: 2 });
    expect(result.selectedEvents.length).toBeLessThanOrEqual(2);
  });

  it('a quiet week (probability 1) selects zero normal events', () => {
    const repo = createEventRepository([makeEvent({ id: 'a' }), makeEvent({ id: 'b' })]);
    const result = selectPoolEvents(repo, ctx, 10, {}, 4, createSeededRng('quiet'), alwaysQuietConfig);
    expect(result.selectedEvents).toEqual([]);
    expect(result.trace.quietWeekRolled).toBe(true);
  });

  it('never selects the same event twice in one week', () => {
    const repo = createEventRepository(Array.from({ length: 3 }, (_, i) => makeEvent({ id: `ev_${i}` })));
    const result = selectPoolEvents(repo, ctx, 10, {}, 4, createSeededRng('dedup'), { ...noQuietConfig, minEventsPerWeek: 3 });
    const ids = result.selectedEvents.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('a rare event can still appear even in an otherwise-quiet week', () => {
    const rareEvent = makeEvent({ id: 'rare', category: 'RARE' });
    const repo = createEventRepository([rareEvent]);
    const result = selectPoolEvents(repo, ctx, 10, {}, 4, createSeededRng('rare-check'), alwaysRareConfig);
    expect(result.trace.rareRolled).toBe(true);
    expect(result.selectedEvents.map((e) => e.id)).toContain('rare');
  });
});
