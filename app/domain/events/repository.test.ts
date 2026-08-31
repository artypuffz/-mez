import { describe, expect, it } from 'vitest';
import { createEventRepository } from './repository';
import type { EventDefinition } from './types';

const events: EventDefinition[] = [
  { id: 'z_pool', title: 'T', description: 'D', category: 'GENERAL', triggerMode: 'pool', choices: [{ id: 'a', text: 'A' }] },
  { id: 'a_pool', title: 'T', description: 'D', category: 'BRANCH', triggerMode: 'pool', choices: [{ id: 'a', text: 'A' }] },
  {
    id: 'stage1', title: 'T', description: 'D', category: 'GENERAL', triggerMode: 'pool',
    chainId: 'x', chainCheckpoint: 'stage1', choices: [{ id: 'a', text: 'A' }],
  },
  {
    id: 'stage2_a', title: 'T', description: 'D', category: 'GENERAL', triggerMode: 'scheduled',
    chainId: 'x', chainCheckpoint: 'stage2', choices: [{ id: 'a', text: 'A' }],
  },
  {
    id: 'stage2_b', title: 'T', description: 'D', category: 'GENERAL', triggerMode: 'scheduled',
    chainId: 'x', chainCheckpoint: 'stage2', isFallback: true, choices: [{ id: 'a', text: 'A' }],
  },
];

describe('createEventRepository', () => {
  const repo = createEventRepository(events);

  it('getAllEvents returns everything, sorted by id', () => {
    expect(repo.getAllEvents().map((e) => e.id)).toEqual(['a_pool', 'stage1', 'stage2_a', 'stage2_b', 'z_pool']);
  });

  it('getEventById finds an event', () => {
    expect(repo.getEventById('z_pool')?.id).toBe('z_pool');
    expect(repo.getEventById('missing')).toBeUndefined();
  });

  it('getPoolEvents only returns triggerMode:pool events', () => {
    const pool = repo.getPoolEvents();
    expect(pool.map((e) => e.id).sort()).toEqual(['a_pool', 'stage1', 'z_pool']);
  });

  it('getCheckpointCandidates only returns scheduled events for that chain+checkpoint (not the pool stage1 entry)', () => {
    const candidates = repo.getCheckpointCandidates('x', 'stage2');
    expect(candidates.map((c) => c.id).sort()).toEqual(['stage2_a', 'stage2_b']);
    expect(repo.getCheckpointCandidates('x', 'stage1')).toEqual([]);
  });

  it('getPoolEventsByCategory filters by category and triggerMode', () => {
    expect(repo.getPoolEventsByCategory('BRANCH').map((e) => e.id)).toEqual(['a_pool']);
  });
});
