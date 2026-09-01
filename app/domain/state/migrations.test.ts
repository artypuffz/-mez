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

  it('migrates a v1 (Phase 2) save all the way to the current version', () => {
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
    expect(migrated.meta.saveVersion).toBe(6);
    expect(migrated.tus).toEqual({ step: 'prep', examEventIds: [], examLog: [] });
    expect(migrated.career.residencyStartedAt).toBeUndefined();
    expect(migrated.eventCooldowns).toEqual({});
    expect(migrated.pendingEffects).toEqual([]);
    expect(migrated.weeklyEventQueue).toEqual([]);
    expect(migrated.npcs).toEqual({});
    expect(migrated.onCall).toEqual({ schedule: null });
    expect(migrated.economy).toEqual({ lastProcessedMonthKey: null, lastBreakdown: null });
    expect(migrated.character.name).toBe('Ada');
  });

  it('backfills residencyStartedAt only for a v2 save already in residency', () => {
    const v2NotYetResidency = {
      meta: { saveVersion: 2, rngSeed: 'seed', createdAt: '2026-03-15T00:00:00.000Z' },
      character: { name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' },
      career: { phase: 'preference', residencyWeek: 0, residencyYear: 1, seniorityStage: 'none' },
      tus: { step: 'result', examEventIds: [], examLog: [] },
      resources: { stress: 20, fatigue: 15, burnout: 0, money: 12000 },
      relationships: {}, flags: {}, pendingEvents: [], activeChains: {},
      eventHistory: [], behaviorStats: {}, statistics: {}, status: 'active',
    };
    expect(migrateSaveData(v2NotYetResidency).career.residencyStartedAt).toBeUndefined();

    const v2InResidency = {
      ...v2NotYetResidency,
      career: { phase: 'residency', branch: 'ic_hastaliklari', residencyWeek: 5, residencyYear: 1, seniorityStage: 'comez' },
    };
    const migrated = migrateSaveData(v2InResidency);
    expect(migrated.career.residencyStartedAt).toBe('2026-09-01');
  });

  it('backfills empty event-engine bookkeeping for a v3 save', () => {
    const v3Save = {
      meta: { saveVersion: 3, rngSeed: 'seed', createdAt: '2026-03-15T00:00:00.000Z' },
      character: { name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' },
      career: {
        phase: 'residency', branch: 'ic_hastaliklari', residencyStartedAt: '2026-09-01',
        residencyWeek: 5, residencyYear: 1, seniorityStage: 'comez',
      },
      tus: { step: 'result', examEventIds: [], examLog: [] },
      resources: { stress: 40, fatigue: 30, burnout: 0, money: 12000 },
      relationships: {}, flags: {}, pendingEvents: [], activeChains: {},
      eventHistory: [], behaviorStats: {}, statistics: {}, status: 'active',
    };
    const migrated = migrateSaveData(v3Save);
    expect(migrated.meta.saveVersion).toBe(6);
    expect(migrated.eventCooldowns).toEqual({});
    expect(migrated.pendingEffects).toEqual([]);
    expect(migrated.weeklyEventQueue).toEqual([]);
    expect(migrated.npcs).toEqual({});
    expect(migrated.resources.stress).toBe(40);
  });

  it('migrates a v4 (Phase 5) save to v5: narrows relationships, adds npcs, converts the string queue to instances', () => {
    const v4Save = {
      meta: { saveVersion: 4, rngSeed: 'seed', createdAt: '2026-03-15T00:00:00.000Z' },
      character: { name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' },
      career: {
        phase: 'residency', branch: 'ic_hastaliklari', residencyStartedAt: '2026-09-01',
        residencyWeek: 5, residencyYear: 1, seniorityStage: 'comez',
      },
      tus: { step: 'result', examEventIds: [], examLog: [] },
      resources: { stress: 40, fatigue: 30, burnout: 0, money: 12000 },
      relationships: {
        baris: { trust: 5, friendship: 2, grudge: 1, mobbingTendency: 0, helpfulness: 3, ego: -1, burnoutNpc: 0 },
      },
      flags: {}, pendingEvents: [], activeChains: {},
      eventHistory: [], behaviorStats: {}, statistics: {}, status: 'active',
      eventCooldowns: { some_event: 3 },
      pendingEffects: [],
      weeklyEventQueue: ['some_queued_event'],
    };
    const migrated = migrateSaveData(v4Save);
    expect(migrated.meta.saveVersion).toBe(6);
    expect(migrated.relationships.baris).toEqual({ trust: 5, friendship: 2, grudge: 1 });
    expect(migrated.npcs).toEqual({});
    expect(migrated.weeklyEventQueue).toEqual([
      { instanceId: 'some_queued_event', eventId: 'some_queued_event', boundNpcIds: {} },
    ]);
    expect(migrated.eventCooldowns).toEqual({ some_event: 3 });
  });

  it('backfills a full NPC roster for a v4 save already mid-residency with a selected program', () => {
    const v4Save = {
      meta: { saveVersion: 4, rngSeed: 'backfill-seed', createdAt: '2026-03-15T00:00:00.000Z' },
      character: { name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' },
      career: {
        phase: 'residency', branch: 'ic_hastaliklari', residencyStartedAt: '2026-09-01',
        residencyWeek: 5, residencyYear: 1, seniorityStage: 'comez',
      },
      tus: { step: 'result', examEventIds: [], examLog: [], selectedProgramId: 'baskent_ic' },
      resources: { stress: 40, fatigue: 30, burnout: 0, money: 12000 },
      relationships: { baris: { trust: 20, friendship: 5, grudge: 0 } },
      flags: {}, pendingEvents: [], activeChains: {},
      eventHistory: [], behaviorStats: {}, statistics: {}, status: 'active',
      eventCooldowns: {}, pendingEffects: [], weeklyEventQueue: [],
    };
    const migrated = migrateSaveData(v4Save);
    expect(Object.keys(migrated.npcs).length).toBeGreaterThan(0);
    expect(migrated.npcs.baris).toBeDefined();
    expect(migrated.npcs.baris.templateId).toBe('baris');
    // The player's already-built relationship with baris survives the
    // backfill instead of being overwritten by a fresh generated value.
    expect(migrated.relationships.baris).toEqual({ trust: 20, friendship: 5, grudge: 0 });
    // Some other, non-templated NPC also got backfilled with its own
    // freshly generated relationship record.
    const otherNpcId = Object.keys(migrated.npcs).find((id) => id !== 'baris');
    expect(otherNpcId).toBeDefined();
    expect(migrated.relationships[otherNpcId!]).toBeDefined();
  });

  it('migrates a v5 (Phase 6) save to v6 with an empty onCall/economy slice (safe — both regenerate on the next monthChanged tick)', () => {
    const v5Save = {
      meta: { saveVersion: 5, rngSeed: 'seed', createdAt: '2026-03-15T00:00:00.000Z' },
      character: { name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' },
      career: {
        phase: 'residency', branch: 'ic_hastaliklari', residencyStartedAt: '2026-09-01',
        residencyWeek: 5, residencyYear: 1, seniorityStage: 'comez',
      },
      tus: { step: 'result', examEventIds: [], examLog: [], selectedProgramId: 'baskent_ic' },
      resources: { stress: 40, fatigue: 30, burnout: 0, money: 12000 },
      relationships: {}, npcs: {}, flags: {}, pendingEvents: [], activeChains: {},
      eventHistory: [], behaviorStats: {}, statistics: {}, status: 'active',
      eventCooldowns: {}, pendingEffects: [], weeklyEventQueue: [],
    };
    const migrated = migrateSaveData(v5Save);
    expect(migrated.meta.saveVersion).toBe(6);
    expect(migrated.onCall).toEqual({ schedule: null });
    expect(migrated.economy).toEqual({ lastProcessedMonthKey: null, lastBreakdown: null });
  });
});
