import { describe, expect, it } from 'vitest';
import {
  applyBehaviorTags,
  applyFlags,
  applyRelationshipEffects,
  applyResourceDelta,
  applyStatistics,
  resolveEffectMap,
} from './effects';
import { createSeededRng } from '../rng/seededRng';

describe('resolveEffectMap', () => {
  it('passes fixed numbers through unchanged', () => {
    expect(resolveEffectMap({ stress: 5, money: -1200 }, createSeededRng('x'))).toEqual({ stress: 5, money: -1200 });
  });

  it('resolves a {min,max} range deterministically for the same rng seed', () => {
    const a = resolveEffectMap({ stress: { min: 3, max: 8 } }, createSeededRng('range-seed'));
    const b = resolveEffectMap({ stress: { min: 3, max: 8 } }, createSeededRng('range-seed'));
    expect(a).toEqual(b);
    expect(a.stress).toBeGreaterThanOrEqual(3);
    expect(a.stress).toBeLessThanOrEqual(8);
  });
});

describe('applyResourceDelta', () => {
  it('clamps stress/fatigue/burnout to [0,100]', () => {
    const result = applyResourceDelta({ stress: 95, fatigue: 5, burnout: 98, money: 1000 }, { stress: 20, fatigue: -20, burnout: 10 });
    expect(result.stress).toBe(100);
    expect(result.fatigue).toBe(0);
    expect(result.burnout).toBe(100);
  });

  it('never clamps money — it can go negative', () => {
    const result = applyResourceDelta({ stress: 0, fatigue: 0, burnout: 0, money: 500 }, { money: -2000 });
    expect(result.money).toBe(-1500);
  });
});

describe('applyRelationshipEffects', () => {
  it('creates a relationship record on first contact', () => {
    const result = applyRelationshipEffects({}, [{ npc: 'baris', trust: 10 }]);
    expect(result.baris).toMatchObject({ trust: 10, grudge: 0 });
  });

  it('accumulates deltas onto an existing record', () => {
    const result = applyRelationshipEffects(
      { baris: { trust: 5, friendship: 0, grudge: 2, mobbingTendency: 0, helpfulness: 0, ego: 0, burnoutNpc: 0 } },
      [{ npc: 'baris', trust: 10, grudge: -1 }]
    );
    expect(result.baris.trust).toBe(15);
    expect(result.baris.grudge).toBe(1);
  });

  it('clamps relationship fields to [-100, 100]', () => {
    const result = applyRelationshipEffects(
      { baris: { trust: 95, friendship: 0, grudge: 0, mobbingTendency: 0, helpfulness: 0, ego: -95, burnoutNpc: 0 } },
      [{ npc: 'baris', trust: 20, ego: -20 }]
    );
    expect(result.baris.trust).toBe(100);
    expect(result.baris.ego).toBe(-100);
  });

  it('is a no-op with no effects', () => {
    const relationships = { baris: { trust: 5, friendship: 0, grudge: 0, mobbingTendency: 0, helpfulness: 0, ego: 0, burnoutNpc: 0 } };
    expect(applyRelationshipEffects(relationships, undefined)).toBe(relationships);
  });
});

describe('applyFlags', () => {
  it('sets and clears flags', () => {
    const result = applyFlags({ old_flag: true }, { set: { new_flag: 'x' }, clear: ['old_flag'] });
    expect(result).toEqual({ new_flag: 'x' });
  });
});

describe('applyStatistics', () => {
  it('increments a counter, creating it if absent', () => {
    const result = applyStatistics({}, { increment: { kahve_sayaci: 1 } });
    expect(result.kahve_sayaci).toBe(1);
    const again = applyStatistics(result, { increment: { kahve_sayaci: 2 } });
    expect(again.kahve_sayaci).toBe(3);
  });
});

describe('applyBehaviorTags', () => {
  it('increments behaviorStats generically — the engine does not interpret the tag', () => {
    const result = applyBehaviorTags({}, ['junior:supportive', 'junior:supportive', 'hierarchy:protective']);
    expect(result['junior:supportive']).toBe(2);
    expect(result['hierarchy:protective']).toBe(1);
  });
});
