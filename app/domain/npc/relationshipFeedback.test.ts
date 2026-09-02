import { describe, expect, it } from 'vitest';
import { deriveRelationshipFeedback } from './relationshipFeedback';
import type { NpcState } from '../state/types';

function npc(id: string, name: string): NpcState {
  return {
    id, identity: { name }, role: 'senior_resident', branchId: 'x', hospitalId: 'y',
    career: { stage: 'resident', joinedWeek: 0 }, personality: { helpfulness: 50, ego: 50, hierarchyOrientation: 50, conflictTendency: 50, burnout: 50 },
    active: true,
  };
}

describe('deriveRelationshipFeedback', () => {
  it('returns a restrained positive line for a clearly positive relationshipEffect, never a raw number', () => {
    const entries = deriveRelationshipFeedback([{ npc: 'zeynep', trust: 15 }], {}, { zeynep: npc('zeynep', 'Zeynep') });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ npcId: 'zeynep', direction: 'positive' });
    expect(entries[0].text).toBe('Zeynep ile ilişkin gelişti.');
    expect(entries[0].text).not.toMatch(/\d/);
  });

  it('returns a negative line for a clearly negative relationshipEffect', () => {
    const entries = deriveRelationshipFeedback([{ npc: 'erhan', grudge: 12 }], {}, { erhan: npc('erhan', 'Erhan') });
    expect(entries[0]).toMatchObject({ npcId: 'erhan', direction: 'negative' });
    expect(entries[0].text).toBe('Erhan ile aranız gerildi.');
  });

  it('produces no entry for a neutral/negligible effect', () => {
    expect(deriveRelationshipFeedback([{ npc: 'zeynep', trust: 1 }], {}, { zeynep: npc('zeynep', 'Zeynep') })).toEqual([]);
  });

  it('resolves boundNpc targets the same way relationship effects themselves do', () => {
    const entries = deriveRelationshipFeedback([{ boundNpc: 'primary', trust: 20 }], { primary: 'deniz' }, { deniz: npc('deniz', 'Deniz') });
    expect(entries[0].npcId).toBe('deniz');
  });

  it('never crashes and returns empty for no effects', () => {
    expect(deriveRelationshipFeedback(undefined, {}, {})).toEqual([]);
    expect(deriveRelationshipFeedback([], {}, {})).toEqual([]);
  });

  it('dedupes to one entry per NPC even if multiple effects target the same NPC', () => {
    const entries = deriveRelationshipFeedback(
      [{ npc: 'zeynep', trust: 10 }, { npc: 'zeynep', friendship: 5 }],
      {},
      { zeynep: npc('zeynep', 'Zeynep') }
    );
    expect(entries).toHaveLength(1);
  });
});
