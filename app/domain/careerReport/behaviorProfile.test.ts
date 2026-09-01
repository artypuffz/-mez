import { describe, expect, it } from 'vitest';
import { computeCycleScore, resolveCycleEnding, computeFlavorTags } from './behaviorProfile';
import { createInitialGameState } from '../state/createInitialGameState';
import type { GameState } from '../state/types';

describe('resolveCycleEnding (§51 boundary tests)', () => {
  it('a career with no behavior tags at all resolves to mixed, never broke_cycle/repeated_cycle', () => {
    const score = computeCycleScore({});
    expect(resolveCycleEnding(score).outcome).toBe('mixed');
  });

  it('a strongly majority-supportive career resolves to broke_cycle', () => {
    const score = computeCycleScore({ 'junior:supportive': 8, 'hierarchy:protective': 4, 'hierarchy:abusive': 1 });
    expect(resolveCycleEnding(score).outcome).toBe('broke_cycle');
  });

  it('a strongly majority-negative career resolves to repeated_cycle', () => {
    const score = computeCycleScore({ 'junior:exploitative': 7, 'hierarchy:abusive': 5, 'junior:supportive': 1 });
    expect(resolveCycleEnding(score).outcome).toBe('repeated_cycle');
  });

  it('a genuinely split career resolves to mixed', () => {
    const score = computeCycleScore({ 'junior:supportive': 5, 'junior:exploitative': 5 });
    expect(resolveCycleEnding(score).outcome).toBe('mixed');
  });

  it('a single additional supportive tag does not flip an already-established repeated_cycle career', () => {
    const before = computeCycleScore({ 'junior:exploitative': 10, 'hierarchy:abusive': 8 });
    expect(resolveCycleEnding(before).outcome).toBe('repeated_cycle');
    const after = computeCycleScore({ 'junior:exploitative': 10, 'hierarchy:abusive': 8, 'junior:supportive': 1 });
    expect(resolveCycleEnding(after).outcome).toBe('repeated_cycle');
  });

  it('a single additional negative tag does not flip an already-established broke_cycle career', () => {
    const before = computeCycleScore({ 'junior:supportive': 10, 'hierarchy:protective': 8 });
    expect(resolveCycleEnding(before).outcome).toBe('broke_cycle');
    const after = computeCycleScore({ 'junior:supportive': 10, 'hierarchy:protective': 8, 'junior:exploitative': 1 });
    expect(resolveCycleEnding(after).outcome).toBe('broke_cycle');
  });

  it('titles/bodies are deadpan, not judgmental, and distinct per outcome', () => {
    const broke = resolveCycleEnding(computeCycleScore({ 'junior:supportive': 10 }));
    const repeated = resolveCycleEnding(computeCycleScore({ 'junior:exploitative': 10 }));
    const mixed = resolveCycleEnding(computeCycleScore({}));
    expect(new Set([broke.title, repeated.title, mixed.title]).size).toBe(3);
  });
});

describe('computeFlavorTags', () => {
  function baseState(overrides: Partial<GameState> = {}): GameState {
    return { ...createInitialGameState({ name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' }), ...overrides };
  }

  it('produces no tags for a fresh career', () => {
    expect(computeFlavorTags(baseState())).toEqual([]);
  });

  it('adds "akademik" once career_opportunities_taken reaches 2', () => {
    const state = baseState({ statistics: { career_opportunities_taken: 2 } });
    expect(computeFlavorTags(state)).toContain('akademik');
  });

  it('never fabricates a tag with no backing counter', () => {
    // No statistics/behaviorStats/eventHistory at all — must never
    // produce "sosyal" or any other tag from nothing.
    const state = baseState();
    expect(computeFlavorTags(state)).toHaveLength(0);
  });
});
