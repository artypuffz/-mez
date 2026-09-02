import { describe, expect, it } from 'vitest';
import { buildRequirementContext, evaluateRequirements, countLeaves } from './requirements';
import { createInitialGameState } from '../state/createInitialGameState';
import type { GameState } from '../state/types';

function ctx(overrides: Partial<GameState> = {}) {
  const base = createInitialGameState({
    name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda',
  });
  const state: GameState = { ...base, ...overrides };
  return buildRequirementContext(state);
}

describe('evaluateRequirements', () => {
  it('returns true when requirements are undefined', () => {
    expect(evaluateRequirements(undefined, ctx())).toBe(true);
  });

  it('evaluates a flag condition', () => {
    const c = ctx({ flags: { hasKey: true } } as Partial<GameState>);
    expect(evaluateRequirements({ flag: 'hasKey', eq: true }, c)).toBe(true);
    expect(evaluateRequirements({ flag: 'hasKey', eq: false }, c)).toBe(false);
    expect(evaluateRequirements({ flag: 'missing', eq: true }, c)).toBe(false);
  });

  it('evaluates a resource stat with gte/lte', () => {
    const c = ctx({ resources: { stress: 42, fatigue: 0, burnout: 0, health: 100, social: 50, money: 0 } });
    expect(evaluateRequirements({ stat: 'resources.stress', gte: 40 }, c)).toBe(true);
    expect(evaluateRequirements({ stat: 'resources.stress', gte: 43 }, c)).toBe(false);
    expect(evaluateRequirements({ stat: 'resources.stress', lte: 42 }, c)).toBe(true);
  });

  it('evaluates career.week (alias for residencyWeek) and seniorityStage', () => {
    const base = createInitialGameState({ name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' });
    const c = buildRequirementContext({
      ...base,
      career: { ...base.career, residencyWeek: 12, seniorityStage: 'comez' },
    });
    expect(evaluateRequirements({ stat: 'career.week', gte: 10 }, c)).toBe(true);
    expect(evaluateRequirements({ stat: 'career.seniorityStage', eq: 'comez' }, c)).toBe(true);
    expect(evaluateRequirements({ stat: 'career.seniorityStage', eq: 'kidemli' }, c)).toBe(false);
  });

  it('supports neq, gt, lt, in, notIn', () => {
    const c = ctx({ resources: { stress: 50, fatigue: 0, burnout: 0, health: 100, social: 50, money: 0 } });
    expect(evaluateRequirements({ stat: 'resources.stress', neq: 40 }, c)).toBe(true);
    expect(evaluateRequirements({ stat: 'resources.stress', gt: 49 }, c)).toBe(true);
    expect(evaluateRequirements({ stat: 'resources.stress', lt: 51 }, c)).toBe(true);
    expect(evaluateRequirements({ stat: 'resources.stress', in: [10, 50, 90] }, c)).toBe(true);
    expect(evaluateRequirements({ stat: 'resources.stress', notIn: [10, 50, 90] }, c)).toBe(false);
  });

  it('evaluates branchIn against career.branch', () => {
    const base = createInitialGameState({ name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' });
    const c = buildRequirementContext({ ...base, career: { ...base.career, branch: 'genel_cerrahi' } });
    expect(evaluateRequirements({ branchIn: ['genel_cerrahi', 'ic_hastaliklari'] }, c)).toBe(true);
    expect(evaluateRequirements({ branchIn: ['psikiyatri'] }, c)).toBe(false);
  });

  it('evaluates a relationship condition, and fails safely for an unknown NPC', () => {
    const base = createInitialGameState({ name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' });
    const c = buildRequirementContext({
      ...base,
      relationships: { baris: { trust: 15, friendship: 0, grudge: 0 } },
    });
    expect(evaluateRequirements({ relationship: { npc: 'baris', trust: { gte: 10 } } }, c)).toBe(true);
    expect(evaluateRequirements({ relationship: { npc: 'baris', trust: { gte: 20 } } }, c)).toBe(false);
    expect(evaluateRequirements({ relationship: { npc: 'unknown_npc', trust: { gte: 0 } } }, c)).toBe(false);
  });

  it('evaluates statistics and behaviorStats via stat', () => {
    const base = createInitialGameState({ name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' });
    const c = buildRequirementContext({
      ...base,
      statistics: { kahve_sayaci: 5 },
      behaviorStats: { 'junior:supportive': 3 },
    });
    expect(evaluateRequirements({ stat: 'statistics.kahve_sayaci', gte: 5 }, c)).toBe(true);
    expect(evaluateRequirements({ stat: 'behaviorStats.junior:supportive', gte: 2 }, c)).toBe(true);
  });

  it('evaluates all (AND)', () => {
    const c = ctx({ resources: { stress: 50, fatigue: 50, burnout: 0, health: 100, social: 50, money: 0 } });
    expect(evaluateRequirements({ all: [{ stat: 'resources.stress', gte: 40 }, { stat: 'resources.fatigue', gte: 40 }] }, c)).toBe(true);
    expect(evaluateRequirements({ all: [{ stat: 'resources.stress', gte: 40 }, { stat: 'resources.fatigue', gte: 60 }] }, c)).toBe(false);
  });

  it('evaluates any (OR)', () => {
    const c = ctx({ resources: { stress: 10, fatigue: 90, burnout: 0, health: 100, social: 50, money: 0 } });
    expect(evaluateRequirements({ any: [{ stat: 'resources.stress', gte: 40 }, { stat: 'resources.fatigue', gte: 40 }] }, c)).toBe(true);
    expect(evaluateRequirements({ any: [{ stat: 'resources.stress', gte: 40 }, { stat: 'resources.fatigue', gte: 95 }] }, c)).toBe(false);
  });

  it('evaluates nested any-within-all groups', () => {
    const c = ctx({ resources: { stress: 10, fatigue: 90, burnout: 0, health: 100, social: 50, money: 0 } });
    const node = {
      all: [
        { any: [{ stat: 'resources.stress', gte: 40 }, { stat: 'resources.fatigue', gte: 40 }] },
        { stat: 'resources.burnout', lte: 50 },
      ],
    };
    expect(evaluateRequirements(node, c)).toBe(true);
  });
});

describe('countLeaves', () => {
  it('counts a single leaf as 1', () => {
    expect(countLeaves({ flag: 'x', eq: true })).toBe(1);
  });

  it('sums leaves across all/any groups', () => {
    expect(countLeaves({ any: [{ flag: 'a', eq: true }, { flag: 'b', eq: true }] })).toBe(2);
    expect(countLeaves({ all: [{ flag: 'a', eq: true }, { any: [{ flag: 'b', eq: true }, { flag: 'c', eq: true }] }] })).toBe(3);
  });

  it('is 0 for undefined', () => {
    expect(countLeaves(undefined)).toBe(0);
  });
});
