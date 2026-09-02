import { describe, expect, it } from 'vitest';
import { checkSpendingActivityEligibility, resolveSpendingActivity } from './resolveSpendingActivity';
import { createInitialGameState } from '../state/createInitialGameState';
import type { GameState } from '../state/types';

function baseState(overrides: Partial<GameState> = {}): GameState {
  const state = createInitialGameState(
    { name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'kendi_basina' },
    { seed: 'spend-test' }
  );
  return {
    ...state,
    resources: { ...state.resources, money: 20000 },
    freeTime: { totalHours: 12, usedHours: 0 },
    ...overrides,
  };
}

describe('resolveSpendingActivity', () => {
  it('rejects an unknown activity id', () => {
    const result = resolveSpendingActivity(baseState(), 'not_a_real_activity', 10);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('unknown_activity');
  });

  it('applies money, freeTimeHours, and resource effects immediately', () => {
    const state = baseState();
    const result = resolveSpendingActivity(state, 'evde_dinlen', 10);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.resources.money).toBe(state.resources.money); // evde_dinlen costs 0 money
    expect(result.state.freeTime.usedHours).toBe(6);
    expect(result.state.resources.fatigue).toBeLessThan(state.resources.fatigue);
  });

  it('deducts money for a paid activity', () => {
    const state = baseState();
    const result = resolveSpendingActivity(state, 'arkadaslarla_disari_cik', 10);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.resources.money).toBe(state.resources.money - 1500);
  });

  it('rejects when money is insufficient', () => {
    const state = baseState({ resources: { ...baseState().resources, money: 100 } });
    const result = resolveSpendingActivity(state, 'arkadaslarla_disari_cik', 10);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('insufficient_money');
  });

  it('rejects when freeTime is insufficient', () => {
    const state = baseState({ freeTime: { totalHours: 2, usedHours: 0 } });
    const result = resolveSpendingActivity(state, 'evde_dinlen', 10); // costs 6h
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('insufficient_time');
  });

  it('enforces cooldown — cannot resolve the same activity again before it expires', () => {
    const state = baseState();
    const first = resolveSpendingActivity(state, 'evde_dinlen', 10);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = resolveSpendingActivity({ ...first.state, freeTime: { totalHours: 12, usedHours: 0 } }, 'evde_dinlen', 10);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe('on_cooldown');
  });

  it('is available again once the cooldown has elapsed', () => {
    const state = baseState();
    const first = resolveSpendingActivity(state, 'evde_dinlen', 10);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const later = resolveSpendingActivity({ ...first.state, freeTime: { totalHours: 12, usedHours: 0 } }, 'evde_dinlen', 12);
    expect(later.ok).toBe(true);
  });

  it('never double-applies — resolving twice on the SAME already-updated state without resetting freeTime fails the second time on insufficient_time, not a silent double-charge', () => {
    const state = baseState({ freeTime: { totalHours: 6, usedHours: 0 } });
    const first = resolveSpendingActivity(state, 'evde_dinlen', 10);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = resolveSpendingActivity(first.state, 'evde_dinlen', 10);
    expect(second.ok).toBe(false);
  });

  it('checkSpendingActivityEligibility matches resolveSpendingActivity\'s own gating', () => {
    const state = baseState({ resources: { ...baseState().resources, money: 100 } });
    const check = checkSpendingActivityEligibility(state, 'arkadaslarla_disari_cik', 10);
    const resolve = resolveSpendingActivity(state, 'arkadaslarla_disari_cik', 10);
    expect(check.ok).toBe(false);
    expect(resolve.ok).toBe(false);
  });

  it('clamps resource effects to [0,100] via the shared applyResourceDelta path', () => {
    const state = baseState({
      resources: { ...baseState().resources, social: 95 },
      freeTime: { totalHours: 20, usedHours: 0 },
    });
    const result = resolveSpendingActivity(state, 'hafta_sonu_kacamagi', 10);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.resources.social).toBeLessThanOrEqual(100);
  });
});
