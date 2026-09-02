import { describe, expect, it } from 'vitest';
import { purchaseOwnershipUpgrade } from './purchaseOwnership';
import { createInitialGameState } from '../state/createInitialGameState';
import type { GameState } from '../state/types';

function baseState(overrides: Partial<GameState> = {}): GameState {
  const state = createInitialGameState(
    { name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'kendi_basina' },
    { seed: 'own-test' }
  );
  return { ...state, resources: { ...state.resources, money: 60000 }, freeTime: { totalHours: 20, usedHours: 0 }, ...overrides };
}

describe('purchaseOwnershipUpgrade', () => {
  it('upgrades housing from normal to cheap, deducting money and freeTime', () => {
    const state = baseState();
    const result = purchaseOwnershipUpgrade(state, 'housing', 'cheap');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.ownership.housing).toBe('cheap');
    expect(result.state.freeTime.usedHours).toBeGreaterThan(0);
  });

  it('upgrading to "good" housing costs more money than "cheap"', () => {
    const state = baseState();
    const cheap = purchaseOwnershipUpgrade(state, 'housing', 'cheap');
    const good = purchaseOwnershipUpgrade(state, 'housing', 'good');
    expect(cheap.ok && good.ok).toBe(true);
    if (!cheap.ok || !good.ok) return;
    const cheapSpent = state.resources.money - cheap.state.resources.money;
    const goodSpent = state.resources.money - good.state.resources.money;
    expect(goodSpent).toBeGreaterThan(cheapSpent);
  });

  it('rejects re-purchasing the tier already owned', () => {
    const result = purchaseOwnershipUpgrade(baseState(), 'housing', 'normal');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('already_owned');
  });

  it('rejects when money is insufficient', () => {
    const state = baseState({ resources: { ...baseState().resources, money: 100 } });
    const result = purchaseOwnershipUpgrade(state, 'housing', 'good');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('insufficient_money');
  });

  it('rejects when freeTime is insufficient', () => {
    const state = baseState({ freeTime: { totalHours: 1, usedHours: 0 } });
    const result = purchaseOwnershipUpgrade(state, 'housing', 'good');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('insufficient_time');
  });

  it('works independently for phone and computer categories', () => {
    const state = baseState();
    const phone = purchaseOwnershipUpgrade(state, 'phone', 'good');
    expect(phone.ok).toBe(true);
    if (!phone.ok) return;
    expect(phone.state.ownership.phone).toBe('good');
    expect(phone.state.ownership.computer).toBe(state.ownership.computer); // untouched

    const computer = purchaseOwnershipUpgrade(state, 'computer', 'basic');
    expect(computer.ok).toBe(true);
    if (!computer.ok) return;
    expect(computer.state.ownership.computer).toBe('basic');
  });

  it('is idempotent-safe: applying the result state again to buy the same tier is rejected, not double-charged', () => {
    const state = baseState();
    const first = purchaseOwnershipUpgrade(state, 'housing', 'good');
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = purchaseOwnershipUpgrade(first.state, 'housing', 'good');
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe('already_owned');
  });
});
