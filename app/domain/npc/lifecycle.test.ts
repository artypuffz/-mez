import { describe, expect, it } from 'vitest';
import { tickNpcLifecycle } from './lifecycle';
import { generateInitialClinic } from './generation';
import { createScopedRng, createSeededRng } from '../rng/seededRng';
import { getResidencyProgram } from '../config/residencyPrograms';
import { advanceResidencyWeekWithEvents } from '../events/engine';
import { createEventRepository } from '../events/repository';
import { buildRequirementContext } from '../events/requirements';
import { createInitialGameState } from '../state/createInitialGameState';
import { beginTus } from '../state/transitions';
import { selectResidencyProgram, proceedToPreference } from '../state/tusTransitions';
import type { NpcLifecycleConfig } from '../config/npcLifecycle';
import { DEFAULT_NPC_LIFECYCLE_CONFIG } from '../config/npcLifecycle';

const program = getResidencyProgram('baskent_ic');

// Every roll guaranteed to succeed — isolates the transition LOGIC from
// the tiny real-world monthly probabilities (that's what the headless
// simulation and the full-engine integration test below are for).
const FORCED_CONFIG: NpcLifecycleConfig = {
  ...DEFAULT_NPC_LIFECYCLE_CONFIG,
  promotionChancePerMonthResidentToSpecialist: 1,
  promotionChancePerMonthSpecialistToFaculty: 1,
  promotionChancePerMonthFacultyToHead: 1,
  baseLeaveChancePerMonth: 0,
  burnoutLeaveChanceMultiplier: 0,
};

describe('tickNpcLifecycle', () => {
  it('promotes an eligible senior_resident to specialist and records the transition', () => {
    const { npcs, relationships } = generateInitialClinic(program, createSeededRng('lifecycle-promo'));
    const npcsById = Object.fromEntries(npcs.map((n) => [n.id, n]));
    const target = npcs.find((n) => n.role === 'senior_resident' && !n.templateId);
    expect(target).toBeDefined();

    const result = tickNpcLifecycle(npcsById, relationships, program, 200, createSeededRng('tick'), { config: FORCED_CONFIG });
    const transition = result.transitions.find((t) => t.npcId === target!.id);
    expect(transition?.type).toBe('became_specialist');
    expect(result.npcs[target!.id].role).toBe('specialist');
    expect(result.npcs[target!.id].career.stage).toBe('specialist');
  });

  it('never touches a templated NPC (e.g. baris) via the generic tick', () => {
    const { npcs, relationships } = generateInitialClinic(program, createSeededRng('lifecycle-template-skip'));
    const npcsById = Object.fromEntries(npcs.map((n) => [n.id, n]));
    const before = npcsById.baris;
    const result = tickNpcLifecycle(npcsById, relationships, program, 200, createSeededRng('tick'), { config: FORCED_CONFIG });
    expect(result.npcs.baris).toEqual(before);
    expect(result.transitions.some((t) => t.npcId === 'baris')).toBe(false);
  });

  it('a departed npc frees a role slot that replenishment refills back to the composition minimum', () => {
    const { npcs, relationships } = generateInitialClinic(program, createSeededRng('lifecycle-leave'));
    const npcsById = Object.fromEntries(npcs.map((n) => [n.id, n]));
    const leaveOnlyConfig: NpcLifecycleConfig = { ...FORCED_CONFIG, baseLeaveChancePerMonth: 1, burnoutLeaveChanceMultiplier: 0 };
    const result = tickNpcLifecycle(npcsById, relationships, program, 200, createSeededRng('tick'), { config: leaveOnlyConfig });

    const leftCount = result.transitions.filter((t) => t.type === 'left').length;
    const arrivedCount = result.transitions.filter((t) => t.type === 'arrived').length;
    expect(leftCount).toBeGreaterThan(0);
    // Every non-templated active NPC left, so replenishment tops every
    // replenishable role back up to its composition minimum.
    expect(arrivedCount).toBeGreaterThan(0);
    const stillActive = Object.values(result.npcs).filter((n) => n.active);
    expect(stillActive.length).toBeGreaterThan(0);
  });

  it('the clinic never goes fully empty even with a guaranteed-leave config', () => {
    const { npcs, relationships } = generateInitialClinic(program, createSeededRng('lifecycle-nonextinct'));
    let npcsById = Object.fromEntries(npcs.map((n) => [n.id, n]));
    let rel = relationships;
    const leaveOnlyConfig: NpcLifecycleConfig = { ...FORCED_CONFIG, baseLeaveChancePerMonth: 1, burnoutLeaveChanceMultiplier: 0 };
    for (let month = 0; month < 12; month++) {
      const result = tickNpcLifecycle(npcsById, rel, program, month * 4, createSeededRng(`tick-${month}`), { config: leaveOnlyConfig });
      npcsById = result.npcs;
      rel = result.relationships;
    }
    expect(Object.values(npcsById).some((n) => n.active)).toBe(true);
  });

  it('ensures at least one junior/peer resident exists once the player is kıdemli, for the mirror content to target', () => {
    // Compose a roster with zero junior/peer residents to force the
    // guarantee path (§14).
    const { npcs, relationships } = generateInitialClinic(program, createSeededRng('lifecycle-mirror-guarantee'));
    const npcsById = Object.fromEntries(
      npcs
        .filter((n) => n.role !== 'junior_resident' && n.role !== 'peer_resident')
        .map((n) => [n.id, n])
    );
    const filteredRelationships = Object.fromEntries(
      Object.entries(relationships).filter(([id]) => npcsById[id])
    );
    const noOpConfig: NpcLifecycleConfig = { ...FORCED_CONFIG, promotionChancePerMonthResidentToSpecialist: 0, promotionChancePerMonthSpecialistToFaculty: 0, promotionChancePerMonthFacultyToHead: 0, baseLeaveChancePerMonth: 0 };
    const result = tickNpcLifecycle(npcsById, filteredRelationships, program, 200, createSeededRng('tick'), {
      config: noOpConfig,
      ensureJuniorForSeniorPlayer: true,
    });
    const hasJuniorOrPeer = Object.values(result.npcs).some(
      (n) => n.active && (n.role === 'junior_resident' || n.role === 'peer_resident')
    );
    expect(hasJuniorOrPeer).toBe(true);
  });
});

describe('lifecycle + event engine integration (§29)', () => {
  it('a senior_resident promoted mid-run stays promoted, is queryable by a requirement, and survives a refresh', () => {
    const repo = createEventRepository([]);
    let found = false;

    for (let attempt = 0; attempt < 30 && !found; attempt++) {
      const seed = `lifecycle-integration-${attempt}`;
      const initial = createInitialGameState(
        { name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' },
        { seed }
      );
      let state = selectResidencyProgram(proceedToPreference(beginTus(initial)), program);
      const targetId = Object.values(state.npcs).find((n) => n.role === 'senior_resident' && !n.templateId)?.id;
      if (!targetId) continue;

      for (
        let week = 1;
        week <= 260 && state.career.phase === 'residency' && state.npcs[targetId]?.role === 'senior_resident';
        week++
      ) {
        const weekRng = createScopedRng(seed, `residency:week:${week}`);
        const eventsRng = createScopedRng(seed, `events:week:${week}`);
        state = advanceResidencyWeekWithEvents(state, weekRng, eventsRng, repo).state;
      }

      if (state.npcs[targetId]?.role === 'specialist') {
        found = true;

        // Transition recorded in state.
        expect(state.npcs[targetId].career.stage).toBe('specialist');

        // An event requirement can see the new stage via the generic
        // stat dot-path (§9).
        const ctx = buildRequirementContext(state);
        expect(ctx.npcs[targetId].role).toBe('specialist');

        // Refresh: a persisted-and-reloaded state (simulated via a JSON
        // round-trip, same as AsyncStorage) preserves the change.
        const reloaded = JSON.parse(JSON.stringify(state));
        expect(reloaded.npcs[targetId].role).toBe('specialist');
        expect(reloaded.npcs[targetId].career.stage).toBe('specialist');
      }
    }

    expect(found).toBe(true);
  });
});
