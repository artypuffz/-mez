import { describe, expect, it } from 'vitest';
import { getEventRepository } from './content';
import { resolveText } from './variants';
import { buildRequirementContext } from './requirements';
import { createInitialGameState } from '../state/createInitialGameState';
import type { GameState } from '../state/types';

const repo = getEventRepository();

function baseState(): GameState {
  return createInitialGameState({ name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' });
}

describe('descriptionVariants on real content (chain_baris_03_gerilim)', () => {
  const event = repo.getEventById('chain_baris_03_gerilim')!;

  it('exists and carries a variant', () => {
    expect(event).toBeDefined();
    expect(event.descriptionVariants?.length).toBeGreaterThan(0);
  });

  it('uses the base description at neutral/low grudge', () => {
    const ctx = buildRequirementContext(baseState());
    const text = resolveText(event.description, event.descriptionVariants, ctx);
    expect(text).toBe(event.description);
  });

  it('switches to the high-grudge variant once grudge crosses its threshold', () => {
    const state: GameState = {
      ...baseState(),
      relationships: { baris: { trust: 0, friendship: 0, grudge: 30 } },
    };
    const ctx = buildRequirementContext(state);
    const text = resolveText(event.description, event.descriptionVariants, ctx);
    expect(text).not.toBe(event.description);
    expect(text).toBe(event.descriptionVariants![0].text);
  });

  it('resolves deterministically for the same relationship state', () => {
    const state: GameState = {
      ...baseState(),
      relationships: { baris: { trust: 0, friendship: 0, grudge: 30 } },
    };
    const ctx = buildRequirementContext(state);
    const a = resolveText(event.description, event.descriptionVariants, ctx);
    const b = resolveText(event.description, event.descriptionVariants, ctx);
    expect(a).toBe(b);
  });
});
