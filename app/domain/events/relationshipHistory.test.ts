import { describe, expect, it } from 'vitest';
import { recordRelationshipHistory } from './effects';

describe('recordRelationshipHistory', () => {
  it('records nothing when no interactionSummary is given (existing content without one stays valid)', () => {
    const result = recordRelationshipHistory({}, [{ npc: 'baris', trust: 10 }], {}, 5, undefined, 8);
    expect(result).toEqual({});
  });

  it('records a new entry with week/summary/direction when a summary is given', () => {
    const result = recordRelationshipHistory({}, [{ npc: 'baris', trust: 10 }], {}, 5, 'Barış ile yardımlaştın.', 8);
    expect(result.baris).toEqual([{ week: 5, summary: 'Barış ile yardımlaştın.', direction: 'positive' }]);
  });

  it('never includes an eventId, choiceId, or raw number in the recorded summary text', () => {
    const result = recordRelationshipHistory({}, [{ npc: 'baris', grudge: 20 }], {}, 12, 'Barış ile geriliminiz arttı.', 8);
    expect(result.baris![0].summary).toBe('Barış ile geriliminiz arttı.');
    expect(Object.keys(result.baris![0])).toEqual(['week', 'summary', 'direction']);
  });

  it('prepends new entries — newest first', () => {
    const first = recordRelationshipHistory({}, [{ npc: 'baris', trust: 10 }], {}, 1, 'İlk etkileşim.', 8);
    const second = recordRelationshipHistory(first, [{ npc: 'baris', trust: 10 }], {}, 2, 'İkinci etkileşim.', 8);
    expect(second.baris!.map((e) => e.summary)).toEqual(['İkinci etkileşim.', 'İlk etkileşim.']);
  });

  it('caps history at the given limit, dropping the oldest entries', () => {
    let history: ReturnType<typeof recordRelationshipHistory> = {};
    for (let week = 1; week <= 10; week++) {
      history = recordRelationshipHistory(history, [{ npc: 'baris', trust: 5 }], {}, week, `Etkileşim ${week}.`, 8);
    }
    expect(history.baris).toHaveLength(8);
    expect(history.baris![0].summary).toBe('Etkileşim 10.');
    expect(history.baris![7].summary).toBe('Etkileşim 3.');
  });

  it('keeps separate histories per NPC', () => {
    const result = recordRelationshipHistory({}, [{ npc: 'baris', trust: 10 }, { npc: 'zeynep', grudge: 10 }], {}, 1, 'Ortak bir olay.', 8);
    expect(result.baris).toHaveLength(1);
    expect(result.zeynep).toHaveLength(1);
    expect(result.baris![0].direction).toBe('positive');
    expect(result.zeynep![0].direction).toBe('negative');
  });

  it('resolves boundNpc targets the same way applyRelationshipEffects does', () => {
    const result = recordRelationshipHistory({}, [{ boundNpc: 'primary', trust: 10 }], { primary: 'deniz' }, 1, 'Deniz ile bir şey oldu.', 8);
    expect(result.deniz).toHaveLength(1);
  });
});
