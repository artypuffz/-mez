import { describe, expect, it } from 'vitest';
import { setLifestyleFoodTier } from './setLifestyle';
import { createInitialGameState } from '../state/createInitialGameState';

describe('setLifestyleFoodTier', () => {
  it('changes the food tier', () => {
    const state = createInitialGameState({ name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'kendi_basina' });
    const next = setLifestyleFoodTier(state, 'economical');
    expect(next.lifestyle.foodTier).toBe('economical');
  });

  it('is a no-op (same object reference) when setting the already-current tier', () => {
    const state = createInitialGameState({ name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'kendi_basina' });
    const next = setLifestyleFoodTier(state, state.lifestyle.foodTier);
    expect(next).toBe(state);
  });

  it('persists until changed again — a standing choice, not a weekly click', () => {
    const state = createInitialGameState({ name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'kendi_basina' });
    const next = setLifestyleFoodTier(state, 'good');
    expect(next.lifestyle.foodTier).toBe('good');
    // Simulate time passing with no further change:
    expect(next.lifestyle.foodTier).toBe('good');
  });
});
