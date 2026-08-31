import { describe, expect, it } from 'vitest';
import { resolveNpcSelector, resolveNpcSelectors } from './selector';
import { createSeededRng } from '../rng/seededRng';
import type { NpcState, RelationshipState } from '../state/types';

function npc(id: string, role: NpcState['role'], active = true): NpcState {
  return {
    id,
    identity: { name: id },
    role,
    branchId: 'ic_hastaliklari',
    hospitalId: 'baskent_devlet',
    career: { stage: 'resident', joinedWeek: 0 },
    personality: { helpfulness: 50, ego: 50, hierarchyOrientation: 50, conflictTendency: 50, burnout: 50 },
    active,
  };
}

function rel(trust: number, grudge = 0): RelationshipState {
  return { trust, friendship: 0, grudge };
}

describe('resolveNpcSelector', () => {
  it('byId resolves an active npc, and returns null for an inactive one', () => {
    const npcs = { a: npc('a', 'nurse'), b: npc('b', 'nurse', false) };
    expect(resolveNpcSelector({ byId: 'a' }, npcs, {}, createSeededRng('s'))).toBe('a');
    expect(resolveNpcSelector({ byId: 'b' }, npcs, {}, createSeededRng('s'))).toBeNull();
    expect(resolveNpcSelector({ byId: 'missing' }, npcs, {}, createSeededRng('s'))).toBeNull();
  });

  it('randomActiveByRole is deterministic for a given rng state', () => {
    const npcs = { a: npc('a', 'nurse'), b: npc('b', 'nurse'), c: npc('c', 'nurse') };
    const first = resolveNpcSelector({ randomActiveByRole: 'nurse' }, npcs, {}, createSeededRng('pick-seed'));
    const second = resolveNpcSelector({ randomActiveByRole: 'nurse' }, npcs, {}, createSeededRng('pick-seed'));
    expect(first).toBe(second);
    expect(['a', 'b', 'c']).toContain(first);
  });

  it('highestTrustByRole picks the highest-trust active candidate of that role', () => {
    const npcs = { a: npc('a', 'faculty'), b: npc('b', 'faculty'), c: npc('c', 'nurse') };
    const relationships = { a: rel(10), b: rel(40), c: rel(90) };
    expect(resolveNpcSelector({ highestTrustByRole: 'faculty' }, npcs, relationships, createSeededRng('s'))).toBe('b');
  });

  it('highestGrudgeByRole picks the highest-grudge active candidate of that role', () => {
    const npcs = { a: npc('a', 'senior_resident'), b: npc('b', 'senior_resident') };
    const relationships = { a: rel(0, 5), b: rel(0, 40) };
    expect(resolveNpcSelector({ highestGrudgeByRole: 'senior_resident' }, npcs, relationships, createSeededRng('s'))).toBe('b');
  });

  it('lowestTrustByRole picks the lowest-trust active candidate of that role', () => {
    const npcs = { a: npc('a', 'peer_resident'), b: npc('b', 'peer_resident') };
    const relationships = { a: rel(30), b: rel(-10) };
    expect(resolveNpcSelector({ lowestTrustByRole: 'peer_resident' }, npcs, relationships, createSeededRng('s'))).toBe('b');
  });

  it('an inactive npc is never selected by a role-based selector', () => {
    const npcs = { a: npc('a', 'nurse', false) };
    expect(resolveNpcSelector({ randomActiveByRole: 'nurse' }, npcs, {}, createSeededRng('s'))).toBeNull();
    expect(resolveNpcSelector({ highestTrustByRole: 'nurse' }, npcs, { a: rel(99) }, createSeededRng('s'))).toBeNull();
  });

  it('no role match returns null rather than throwing', () => {
    const npcs = { a: npc('a', 'nurse') };
    expect(resolveNpcSelector({ randomActiveByRole: 'department_head' }, npcs, {}, createSeededRng('s'))).toBeNull();
  });
});

describe('resolveNpcSelectors (event-level, keyed)', () => {
  it('resolves every key once and freezes on the returned map — a second call with the same rng state matches', () => {
    const npcs = { a: npc('a', 'junior_resident'), b: npc('b', 'faculty') };
    const selectors = { primary: { randomActiveByRole: 'junior_resident' as const }, mentor: { byId: 'b' } };
    const first = resolveNpcSelectors(selectors, npcs, {}, createSeededRng('freeze-seed'));
    expect(first).toEqual({ primary: 'a', mentor: 'b' });
  });

  it('drops a key whose selector resolved to nothing rather than binding a placeholder', () => {
    const npcs = { a: npc('a', 'nurse') };
    const selectors = { primary: { randomActiveByRole: 'department_head' as const } };
    expect(resolveNpcSelectors(selectors, npcs, {}, createSeededRng('s'))).toEqual({});
  });

  it('returns an empty map when the event has no npcSelectors', () => {
    expect(resolveNpcSelectors(undefined, {}, {}, createSeededRng('s'))).toEqual({});
  });
});
