import { describe, expect, it } from 'vitest';
import { deriveRelationshipDirection, deriveRelationshipLabel, deriveRelationshipScore } from './relationshipLabel';

describe('deriveRelationshipScore', () => {
  it('clamps to [0,100]', () => {
    expect(deriveRelationshipScore({ trust: 100, friendship: 100, grudge: 0 })).toBeLessThanOrEqual(100);
    expect(deriveRelationshipScore({ trust: -100, friendship: -100, grudge: 100 })).toBeGreaterThanOrEqual(0);
  });

  it('is 50 at a completely neutral relationship', () => {
    expect(deriveRelationshipScore({ trust: 0, friendship: 0, grudge: 0 })).toBe(50);
  });

  it('increases monotonically with trust/friendship and decreases with grudge', () => {
    const base = deriveRelationshipScore({ trust: 10, friendship: 10, grudge: 0 });
    const moreTrust = deriveRelationshipScore({ trust: 30, friendship: 10, grudge: 0 });
    const moreGrudge = deriveRelationshipScore({ trust: 10, friendship: 10, grudge: 30 });
    expect(moreTrust).toBeGreaterThan(base);
    expect(moreGrudge).toBeLessThan(base);
  });

  it('never disagrees in direction with deriveRelationshipLabel across a spread of relationships', () => {
    const cases = [
      { trust: 50, friendship: 60, grudge: 0 },
      { trust: -50, friendship: -20, grudge: 60 },
      { trust: 0, friendship: 0, grudge: 0 },
      { trust: 20, friendship: 5, grudge: 10 },
    ];
    for (const rel of cases) {
      const label = deriveRelationshipLabel(rel);
      const score = deriveRelationshipScore(rel);
      if (label === 'Gergin') expect(score).toBeLessThan(50);
      if (label === 'Yakın') expect(score).toBeGreaterThan(50);
    }
  });
});

describe('deriveRelationshipDirection', () => {
  it('classifies a clearly positive delta as positive', () => {
    expect(deriveRelationshipDirection({ trust: 10 })).toBe('positive');
  });

  it('classifies a clearly negative delta (grudge up) as negative', () => {
    expect(deriveRelationshipDirection({ grudge: 10 })).toBe('negative');
  });

  it('classifies a small/mixed delta as neutral', () => {
    expect(deriveRelationshipDirection({ trust: 1, grudge: 1 })).toBe('neutral');
    expect(deriveRelationshipDirection({})).toBe('neutral');
  });

  it('trust and friendship both count positively, grudge negatively, in the same net', () => {
    expect(deriveRelationshipDirection({ trust: 5, friendship: 5, grudge: 0 })).toBe('positive');
    expect(deriveRelationshipDirection({ trust: 0, friendship: 0, grudge: 20 })).toBe('negative');
  });
});
