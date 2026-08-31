import { describe, expect, it } from 'vitest';
import { deriveRelationshipLabel } from './relationshipLabel';

describe('deriveRelationshipLabel', () => {
  it('labels a neutral, untouched relationship as Nötr', () => {
    expect(deriveRelationshipLabel({ trust: 0, friendship: 0, grudge: 0 })).toBe('Nötr');
  });

  it('labels heavy grudge as Gergin even with some trust', () => {
    expect(deriveRelationshipLabel({ trust: 10, friendship: 0, grudge: 60 })).toBe('Gergin');
  });

  it('labels strongly negative trust/friendship as Gergin', () => {
    expect(deriveRelationshipLabel({ trust: -60, friendship: -40, grudge: 0 })).toBe('Gergin');
  });

  it('labels mild negative as Mesafeli', () => {
    expect(deriveRelationshipLabel({ trust: -15, friendship: 0, grudge: 5 })).toBe('Mesafeli');
  });

  it('labels solid positive trust as Aranız iyi', () => {
    expect(deriveRelationshipLabel({ trust: 40, friendship: 10, grudge: 0 })).toBe('Aranız iyi');
  });

  it('labels high mutual friendship+trust as Yakın', () => {
    expect(deriveRelationshipLabel({ trust: 60, friendship: 70, grudge: 0 })).toBe('Yakın');
  });

  it('never exposes raw numbers — always one of the fixed label strings', () => {
    const labels = new Set(['Gergin', 'Mesafeli', 'Nötr', 'Aranız iyi', 'Yakın']);
    for (let trust = -100; trust <= 100; trust += 25) {
      for (let friendship = -100; friendship <= 100; friendship += 25) {
        for (let grudge = 0; grudge <= 100; grudge += 25) {
          expect(labels.has(deriveRelationshipLabel({ trust, friendship, grudge }))).toBe(true);
        }
      }
    }
  });
});
