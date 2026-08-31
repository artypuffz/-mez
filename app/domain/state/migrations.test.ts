import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './createInitialGameState';
import { migrateSaveData } from './migrations';

describe('migrateSaveData', () => {
  it('passes a current-version save through unchanged', () => {
    const state = createInitialGameState({
      name: 'Ada',
      age: 26,
      gender: 'kadın',
      hometown: 'İzmir',
      background: 'aile_yaninda',
    });
    const raw = JSON.parse(JSON.stringify(state));
    expect(migrateSaveData(raw)).toEqual(state);
  });

  it('throws for a save version with no registered migration path', () => {
    const raw = { meta: { saveVersion: 0 } };
    expect(() => migrateSaveData(raw)).toThrow();
  });

  it('migrates a v1 (Phase 2) save by adding a default tus slice', () => {
    const v1Save = {
      meta: { saveVersion: 1, rngSeed: 'seed', createdAt: '2026-01-01T00:00:00.000Z' },
      character: { name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' },
      career: { phase: 'tus', residencyWeek: 0, residencyYear: 0, seniorityStage: 'none' },
      resources: { stress: 20, fatigue: 15, burnout: 0, money: 12000 },
      relationships: {},
      flags: {},
      pendingEvents: [],
      activeChains: {},
      eventHistory: [],
      behaviorStats: {},
      statistics: {},
      status: 'active',
    };

    const migrated = migrateSaveData(v1Save);
    expect(migrated.meta.saveVersion).toBe(2);
    expect(migrated.tus).toEqual({ step: 'prep', examEventIds: [], examLog: [] });
    expect(migrated.character.name).toBe('Ada');
  });
});
