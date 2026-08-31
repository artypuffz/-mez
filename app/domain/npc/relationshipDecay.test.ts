import { describe, expect, it } from 'vitest';
import { decayRelationship, tickRelationshipDecay } from './relationshipDecay';

describe('decayRelationship', () => {
  it('friendship drifts toward 0 fastest, trust slowest, grudge slower still', () => {
    const rel = decayRelationship({ trust: 100, friendship: 100, grudge: 100 });
    const friendshipDrop = 100 - rel.friendship;
    const trustDrop = 100 - rel.trust;
    const grudgeDrop = 100 - rel.grudge;
    expect(friendshipDrop).toBeGreaterThan(trustDrop);
    expect(trustDrop).toBeGreaterThanOrEqual(grudgeDrop);
  });

  it('never overshoots past 0', () => {
    const rel = decayRelationship({ trust: 1, friendship: -1, grudge: 1 });
    expect(rel.trust).toBe(0);
    expect(rel.friendship).toBe(0);
    expect(rel.grudge).toBe(0);
  });

  it('stays at 0 once settled', () => {
    expect(decayRelationship({ trust: 0, friendship: 0, grudge: 0 })).toEqual({ trust: 0, friendship: 0, grudge: 0 });
  });

  it('a value eventually converges to exactly 0 over repeated ticks (never gets stuck)', () => {
    let rel = { trust: 3, friendship: 0, grudge: 0 };
    for (let i = 0; i < 200 && rel.trust !== 0; i++) rel = decayRelationship(rel);
    expect(rel.trust).toBe(0);
  });

  it('grudge never goes negative through decay', () => {
    let rel = { trust: 0, friendship: 0, grudge: 7 };
    for (let i = 0; i < 20; i++) rel = decayRelationship(rel);
    expect(rel.grudge).toBeGreaterThanOrEqual(0);
  });
});

describe('tickRelationshipDecay', () => {
  it('decays every relationship in the map independently', () => {
    const next = tickRelationshipDecay({
      a: { trust: 100, friendship: 100, grudge: 100 },
      b: { trust: -100, friendship: -100, grudge: 0 },
    });
    expect(next.a.trust).toBeLessThan(100);
    expect(next.b.trust).toBeGreaterThan(-100);
  });
});
