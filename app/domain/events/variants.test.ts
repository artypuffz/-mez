import { describe, expect, it } from 'vitest';
import { resolveText } from './variants';
import { buildRequirementContext } from './requirements';
import { createInitialGameState } from '../state/createInitialGameState';

function ctxWithRelationship(trust: number, grudge: number) {
  const base = createInitialGameState({ name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' });
  return buildRequirementContext({
    ...base,
    relationships: { baris: { trust, grudge, friendship: 0, mobbingTendency: 0, helpfulness: 0, ego: 0, burnoutNpc: 0 } },
  });
}

const variants = [
  { requirements: { relationship: { npc: 'baris', trust: { gte: 20 } } }, text: 'YUKSEK GUVEN' },
  { requirements: { relationship: { npc: 'baris', grudge: { gte: 20 } } }, text: 'YUKSEK KIN' },
];

describe('resolveText', () => {
  it('returns the base text when there are no variants', () => {
    expect(resolveText('base', undefined, ctxWithRelationship(0, 0))).toBe('base');
  });

  it('returns the base text when no variant matches', () => {
    expect(resolveText('base', variants, ctxWithRelationship(5, 5))).toBe('base');
  });

  it('picks the first matching variant, top to bottom', () => {
    expect(resolveText('base', variants, ctxWithRelationship(25, 0))).toBe('YUKSEK GUVEN');
    expect(resolveText('base', variants, ctxWithRelationship(0, 25))).toBe('YUKSEK KIN');
  });

  it('resolves deterministically for the same context', () => {
    const c = ctxWithRelationship(25, 0);
    expect(resolveText('base', variants, c)).toBe(resolveText('base', variants, c));
  });
});
