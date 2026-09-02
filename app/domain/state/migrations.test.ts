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

  // Phase 9 §46 — a crisis mid-resolution must round-trip through
  // save/load byte-for-byte: same queued instance, same bound NPC, same
  // gameOver-or-not. No reroll on "reload".
  it('round-trips a current-version save with a queued crisis instance and pending gameOver unchanged', () => {
    const base = createInitialGameState({
      name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda',
    });
    const state = {
      ...base,
      weeklyEventQueue: [{ instanceId: '30:crisis_burnout_01_yeter', eventId: 'crisis_burnout_01_yeter', boundNpcIds: { friend: 'npc_1' } }],
      resourcePressure: { highStressWeeks: 5, highFatigueWeeks: 3, combinedPressureWeeks: 3, lowPressureWeeks: 0 },
      financialPressure: { consecutiveNegativeMonths: 2, lowestBalance: -6000 },
      crisisState: { lastCrisisWeek: 28 },
    };
    const raw = JSON.parse(JSON.stringify(state));
    expect(migrateSaveData(raw)).toEqual(state);
  });

  it('round-trips a save that already ended in gameOver, without touching the reason', () => {
    const base = createInitialGameState({
      name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda',
    });
    const state = {
      ...base,
      career: { ...base.career, phase: 'gameover' as const },
      gameOver: { reason: 'financial_collapse' as const, week: 90, triggeredByEventId: 'crisis_financial_03_mali_karar', selectedChoiceId: 'isi_birak' },
    };
    const raw = JSON.parse(JSON.stringify(state));
    expect(migrateSaveData(raw)).toEqual(state);
  });

  it('throws for a save version with no registered migration path', () => {
    const raw = { meta: { saveVersion: 0 } };
    expect(() => migrateSaveData(raw)).toThrow();
  });

  // RC2 (RC-001 test matrix) — a saveVersion ABOVE current used to skip
  // the migration loop entirely (its guard is version < CURRENT) and
  // return the raw, unvalidated object as a "valid" GameState, deferring
  // the crash to whatever read it later instead of failing here where
  // the caller's try/catch (useGameStore.loadGame) can handle it.
  it('throws for a save version newer than the app supports', () => {
    const raw = { meta: { saveVersion: 999 } };
    expect(() => migrateSaveData(raw)).toThrow(/newer than this app supports/);
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
    expect(migrated.meta.saveVersion).toBe(11);
    expect(migrated.tus).toEqual({ step: 'prep', examEventIds: [], examLog: [] });
    expect(migrated.career.residencyStartedAt).toBeUndefined();
    expect(migrated.eventCooldowns).toEqual({});
    expect(migrated.pendingEffects).toEqual([]);
    expect(migrated.weeklyEventQueue).toEqual([]);
    expect(migrated.npcs).toEqual({});
    expect(migrated.onCall).toEqual({ schedule: null });
    expect(migrated.economy).toEqual({ lastProcessedMonthKey: null, lastBreakdown: null });
    expect(migrated.resourcePressure).toEqual({ highStressWeeks: 0, highFatigueWeeks: 0, combinedPressureWeeks: 0, lowPressureWeeks: 0 });
    expect(migrated.financialPressure).toEqual({ consecutiveNegativeMonths: 0, lowestBalance: 12000 });
    expect(migrated.crisisState).toEqual({ lastCrisisWeek: null });
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
    expect(migrated.meta.saveVersion).toBe(11);
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
    expect(migrated.meta.saveVersion).toBe(11);
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
    expect(migrated.meta.saveVersion).toBe(11);
    expect(migrated.onCall).toEqual({ schedule: null });
    expect(migrated.economy).toEqual({ lastProcessedMonthKey: null, lastBreakdown: null });
  });

  it('migrates a v6 (Phase 7) save to v7, adding resourcePressure/financialPressure/crisisState with lowestBalance backfilled from current money', () => {
    const v6Save = {
      meta: { saveVersion: 6, rngSeed: 'seed', createdAt: '2026-03-15T00:00:00.000Z' },
      character: { name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' },
      career: {
        phase: 'residency', branch: 'ic_hastaliklari', residencyStartedAt: '2026-09-01',
        residencyWeek: 5, residencyYear: 1, seniorityStage: 'comez',
      },
      tus: { step: 'result', examEventIds: [], examLog: [], selectedProgramId: 'baskent_ic' },
      resources: { stress: 40, fatigue: 30, burnout: 0, money: -3500 },
      relationships: {}, npcs: {}, flags: {}, pendingEvents: [], activeChains: {},
      eventHistory: [], behaviorStats: {}, statistics: {}, status: 'active',
      eventCooldowns: {}, pendingEffects: [], weeklyEventQueue: [],
      onCall: { schedule: null }, economy: { lastProcessedMonthKey: null, lastBreakdown: null },
    };
    const migrated = migrateSaveData(v6Save);
    expect(migrated.meta.saveVersion).toBe(11);
    expect(migrated.resourcePressure).toEqual({ highStressWeeks: 0, highFatigueWeeks: 0, combinedPressureWeeks: 0, lowPressureWeeks: 0 });
    expect(migrated.financialPressure).toEqual({ consecutiveNegativeMonths: 0, lowestBalance: -3500 });
    expect(migrated.crisisState).toEqual({ lastCrisisWeek: null });
    expect(migrated.gameOver).toBeUndefined();
  });

  it('migrates a v7 (Phase 9) save to v8 unchanged when not stuck on residency_complete', () => {
    const v7Save = {
      meta: { saveVersion: 7, rngSeed: 'seed', createdAt: '2026-03-15T00:00:00.000Z' },
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
      onCall: { schedule: null }, economy: { lastProcessedMonthKey: null, lastBreakdown: null },
      resourcePressure: { highStressWeeks: 0, highFatigueWeeks: 0, combinedPressureWeeks: 0, lowPressureWeeks: 0 },
      financialPressure: { consecutiveNegativeMonths: 0, lowestBalance: 12000 },
      crisisState: { lastCrisisWeek: null },
    };
    const migrated = migrateSaveData(v7Save);
    expect(migrated.meta.saveVersion).toBe(11);
    expect(migrated.career.phase).toBe('residency');
    expect(migrated.pendingEvents).toEqual([]);
  });

  it('bumps a v7 save stuck on the pre-Phase-10 "residency_complete" placeholder straight into specialist_exam, seeding its opening event', () => {
    const v7StuckSave = {
      meta: { saveVersion: 7, rngSeed: 'seed', createdAt: '2026-03-15T00:00:00.000Z' },
      character: { name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' },
      career: {
        phase: 'residency_complete', branch: 'ic_hastaliklari', residencyStartedAt: '2026-09-01',
        residencyWeek: 260, residencyYear: 5, seniorityStage: 'kidemli',
      },
      tus: { step: 'result', examEventIds: [], examLog: [], selectedProgramId: 'baskent_ic' },
      resources: { stress: 40, fatigue: 30, burnout: 0, money: 12000 },
      relationships: {}, npcs: {}, flags: {}, pendingEvents: [], activeChains: {},
      eventHistory: [], behaviorStats: {}, statistics: {}, status: 'active',
      eventCooldowns: {}, pendingEffects: [], weeklyEventQueue: [],
      onCall: { schedule: null }, economy: { lastProcessedMonthKey: null, lastBreakdown: null },
      resourcePressure: { highStressWeeks: 0, highFatigueWeeks: 0, combinedPressureWeeks: 0, lowPressureWeeks: 0 },
      financialPressure: { consecutiveNegativeMonths: 0, lowestBalance: 12000 },
      crisisState: { lastCrisisWeek: null },
    };
    const migrated = migrateSaveData(v7StuckSave);
    expect(migrated.meta.saveVersion).toBe(11);
    expect(migrated.career.phase).toBe('specialist_exam');
    expect(migrated.pendingEvents).toEqual([
      { chainId: 'specialist_exam', checkpoint: 'stage1', triggerWeek: 260, sourceEventId: 'residency_completed', sourceChoiceId: 'auto' },
    ]);
  });

  // Phase 11 — a v8 (RC2) save has no workload state and no persisted
  // career.hierarchyPressure. Both should backfill safely for a save
  // already mid-residency against an existing (still-fictional) program.
  it('migrates a v8 (RC2) save to v9: adds workload:null and backfills career.hierarchyPressure', () => {
    const v8Save = {
      meta: { saveVersion: 8, rngSeed: 'seed', createdAt: '2026-03-15T00:00:00.000Z' },
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
      onCall: { schedule: null }, economy: { lastProcessedMonthKey: null, lastBreakdown: null },
      resourcePressure: { highStressWeeks: 0, highFatigueWeeks: 0, combinedPressureWeeks: 0, lowPressureWeeks: 0 },
      financialPressure: { consecutiveNegativeMonths: 0, lowestBalance: 12000 },
      crisisState: { lastCrisisWeek: null },
    };
    const migrated = migrateSaveData(v8Save);
    expect(migrated.meta.saveVersion).toBe(11);
    expect(migrated.workload).toBeNull();
    expect(typeof migrated.career.hierarchyPressure).toBe('number');
    expect(migrated.career.hierarchyPressure).toBeGreaterThanOrEqual(0.5);
    expect(migrated.career.hierarchyPressure).toBeLessThanOrEqual(5);

    // Deterministic: migrating the identical raw save twice yields the
    // exact same backfilled hierarchyPressure (never rerolled).
    const migratedAgain = migrateSaveData(structuredClone(v8Save));
    expect(migratedAgain.career.hierarchyPressure).toBe(migrated.career.hierarchyPressure);
  });

  it('migrates a v8 save with no selectedProgramId (e.g. still in TUS) without crashing, leaving hierarchyPressure unset', () => {
    const v8PreResidency = {
      meta: { saveVersion: 8, rngSeed: 'seed', createdAt: '2026-03-15T00:00:00.000Z' },
      character: { name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' },
      career: { phase: 'preference', residencyWeek: 0, residencyYear: 1, seniorityStage: 'none' },
      tus: { step: 'result', examEventIds: [], examLog: [] },
      resources: { stress: 20, fatigue: 15, burnout: 0, money: 12000 },
      relationships: {}, npcs: {}, flags: {}, pendingEvents: [], activeChains: {},
      eventHistory: [], behaviorStats: {}, statistics: {}, status: 'active',
      eventCooldowns: {}, pendingEffects: [], weeklyEventQueue: [],
      onCall: { schedule: null }, economy: { lastProcessedMonthKey: null, lastBreakdown: null },
      resourcePressure: { highStressWeeks: 0, highFatigueWeeks: 0, combinedPressureWeeks: 0, lowPressureWeeks: 0 },
      financialPressure: { consecutiveNegativeMonths: 0, lowestBalance: 12000 },
      crisisState: { lastCrisisWeek: null },
    };
    const migrated = migrateSaveData(v8PreResidency);
    expect(migrated.meta.saveVersion).toBe(11);
    expect(migrated.workload).toBeNull();
    expect(migrated.career.hierarchyPressure).toBeUndefined();
  });

  // Gameplay Expansion Part A — a v9 (Phase 11) save has no health/social
  // resources, schedule, freeTime, or lifestyle/ownership. All must
  // backfill safely, and the economy-neutral tiers ("normal") must be
  // verified to actually be economy-neutral, not just present.
  it('migrates a v9 (Phase 11) save to v10: adds health/social, schedule:null, freeTime, and economy-neutral lifestyle/ownership defaults', () => {
    const v9Save = {
      meta: { saveVersion: 9, rngSeed: 'seed', createdAt: '2026-03-15T00:00:00.000Z' },
      character: { name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'kendi_basina' },
      career: {
        phase: 'residency', branch: 'ic_hastaliklari', residencyStartedAt: '2026-09-01',
        residencyWeek: 5, residencyYear: 1, seniorityStage: 'comez', hierarchyPressure: 3.7,
      },
      tus: { step: 'result', examEventIds: [], examLog: [], selectedProgramId: 'baskent_ic' },
      resources: { stress: 40, fatigue: 30, burnout: 5, money: 12000 },
      relationships: {}, npcs: {}, flags: {}, pendingEvents: [], activeChains: {},
      eventHistory: [], behaviorStats: {}, statistics: {}, status: 'active',
      eventCooldowns: {}, pendingEffects: [], weeklyEventQueue: [],
      onCall: { schedule: null }, economy: { lastProcessedMonthKey: null, lastBreakdown: null },
      resourcePressure: { highStressWeeks: 0, highFatigueWeeks: 0, combinedPressureWeeks: 0, lowPressureWeeks: 0 },
      financialPressure: { consecutiveNegativeMonths: 0, lowestBalance: 12000 },
      crisisState: { lastCrisisWeek: null },
      workload: null,
    };
    const migrated = migrateSaveData(v9Save);
    expect(migrated.meta.saveVersion).toBe(11);
    expect(migrated.resources.health).toBe(100);
    expect(migrated.resources.social).toBe(50);
    expect(migrated.resources.stress).toBe(40); // untouched existing resources
    expect(migrated.schedule).toBeNull();
    expect(migrated.freeTime).toEqual({ totalHours: 0, usedHours: 0 });
    expect(migrated.lifestyle).toEqual({ foodTier: 'normal' });
    expect(migrated.ownership).toEqual({ phone: 'old', computer: 'none', housing: 'normal' });
    // v10->v11 also ran as part of this same chain (target is 11) — a
    // real player-facing avatar object, not a placeholder/undefined.
    expect(migrated.character.avatar).toBeDefined();
    expect(typeof migrated.character.avatar.skinTone).toBe('string');
    expect(migrated.relationshipHistory).toEqual({});
  });

  // Gameplay Expansion Part B/C — a v10 save (Part A baseline) has no
  // character.avatar and no relationshipHistory. Isolates the v10->v11
  // step specifically (rather than relying on the v9 test above chaining
  // through it), and verifies the avatar backfill is DETERMINISTIC for a
  // given rngSeed — migrating the same v10 save twice must yield the
  // exact same avatar, never a fresh reroll each time.
  it('migrates a v10 (Part A) save to v11: adds a deterministic character.avatar and empty relationshipHistory', () => {
    const v10Save = {
      meta: { saveVersion: 10, rngSeed: 'avatar-migration-seed', createdAt: '2026-03-15T00:00:00.000Z' },
      character: { name: 'Mert', age: 27, gender: 'erkek', hometown: 'Ankara', background: 'kendi_basina' },
      career: {
        phase: 'residency', branch: 'genel_cerrahi', residencyStartedAt: '2026-09-01',
        residencyWeek: 10, residencyYear: 1, seniorityStage: 'comez', hierarchyPressure: 3.0,
      },
      tus: { step: 'result', examEventIds: [], examLog: [], selectedProgramId: 'baskent_ic' },
      resources: { stress: 20, fatigue: 20, burnout: 0, health: 100, social: 50, money: 12000 },
      relationships: {}, npcs: {}, flags: {}, pendingEvents: [], activeChains: {},
      eventHistory: [], behaviorStats: {}, statistics: {}, status: 'active',
      eventCooldowns: {}, pendingEffects: [], weeklyEventQueue: [],
      onCall: { schedule: null }, economy: { lastProcessedMonthKey: null, lastBreakdown: null },
      resourcePressure: { highStressWeeks: 0, highFatigueWeeks: 0, combinedPressureWeeks: 0, lowPressureWeeks: 0 },
      financialPressure: { consecutiveNegativeMonths: 0, lowestBalance: 12000 },
      crisisState: { lastCrisisWeek: null },
      workload: null,
      schedule: null, freeTime: { totalHours: 0, usedHours: 0 },
      lifestyle: { foodTier: 'normal' }, ownership: { phone: 'old', computer: 'none', housing: 'normal' },
    };
    const migratedA = migrateSaveData(structuredClone(v10Save));
    const migratedB = migrateSaveData(structuredClone(v10Save));
    expect(migratedA.meta.saveVersion).toBe(11);
    expect(migratedA.character.avatar).toBeDefined();
    expect(migratedA.relationshipHistory).toEqual({});
    // Deterministic: same rngSeed -> same backfilled avatar, every time.
    expect(migratedA.character.avatar).toEqual(migratedB.character.avatar);
  });

});
