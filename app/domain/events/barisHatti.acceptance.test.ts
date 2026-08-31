import { describe, expect, it } from 'vitest';
import { advanceResidencyWeekWithEvents, resolveEventChoice } from './engine';
import { getEventRepository } from './content';
import { createInitialGameState } from '../state/createInitialGameState';
import { beginTus } from '../state/transitions';
import { selectResidencyProgram, proceedToPreference } from '../state/tusTransitions';
import { getResidencyProgram } from '../config/residencyPrograms';
import { createScopedRng } from '../rng/seededRng';
import type { GameState } from '../state/types';
import type { PoolSelectionConfig } from '../config/eventSelection';

// Real, shipped content — the same repository the app uses. This is the
// acceptance test the Phase 5 spec asked for: the Barış Hattı run end to
// end through the actual engine, not a fixture stand-in.
const repo = getEventRepository();

// Zero pool budget so only chain/scheduled events ever populate the queue
// while fast-forwarding between checkpoints — keeps this test about chain
// mechanics, not about whether random pool selection happens to draw
// something in a given window (that's selection.test.ts's job).
const noPoolNoise: PoolSelectionConfig = { minEventsPerWeek: 0, maxEventsPerWeek: 0, quietWeekProbability: 1, rareChancePerWeek: 0 };

function chainTestState(seed: string): GameState {
  const initial = createInitialGameState(
    { name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' },
    { seed }
  );
  const program = getResidencyProgram('baskent_ic');
  return selectResidencyProgram(proceedToPreference(beginTus(initial)), program);
}

function rngs(seed: string, week: number) {
  return {
    weekRng: createScopedRng(seed, `residency:week:${week}`),
    eventsRng: createScopedRng(seed, `events:week:${week}`),
  };
}

// Steps the game forward (no pool noise) until something lands in the
// queue — i.e. until a scheduled checkpoint comes due — or a safety cap
// is hit (a stuck chain would otherwise hang the test forever).
function fastForwardUntilQueued(state: GameState, seed: string): GameState {
  let current = state;
  let week = current.career.residencyWeek;
  const safetyLimit = week + 60;
  while (current.weeklyEventQueue.length === 0) {
    week += 1;
    if (week > safetyLimit) throw new Error('fastForwardUntilQueued: nothing became due within the safety window');
    const { weekRng, eventsRng } = rngs(seed, week);
    current = advanceResidencyWeekWithEvents(current, weekRng, eventsRng, repo, noPoolNoise).state;
  }
  return current;
}

// Simulates "this event was drawn" without needing pool-selection luck —
// resolveEventChoice requires the event to be in weeklyEventQueue (§21's
// no-double-resolve guard), so tests that want to resolve a specific
// event go through the same queue+resolve path the UI does.
function resolveQueuedEvent(state: GameState, eventId: string, choiceId: string, seed: string): GameState {
  const event = repo.getEventById(eventId);
  if (!event) throw new Error(`Fixture error: event ${eventId} not found in the real repository`);
  const queued: GameState = { ...state, weeklyEventQueue: [{ instanceId: eventId, eventId, boundNpcIds: {} }] };
  return resolveEventChoice(queued, event, choiceId, createScopedRng(seed, `resolve:${eventId}`)).state;
}

function queueIds(state: GameState): string[] {
  return state.weeklyEventQueue.map((q) => q.eventId);
}

describe('Barış Hattı — Path A (dostluk)', () => {
  it('runs stage1 through stage5 via the real engine, ending in broke_the_cycle', () => {
    const seed = 'baris-path-a';
    let state = chainTestState(seed);

    state = resolveQueuedEvent(state, 'chain_baris_01_ilk_gorev', 'nazik_sinir', seed);
    expect(state.flags.chain_baris_path).toBe('dostluk');
    expect(state.pendingEvents).toHaveLength(1);

    state = fastForwardUntilQueued(state, seed);
    expect(queueIds(state)).toEqual(['chain_baris_02_dostluk']);
    state = resolveQueuedEvent(state, 'chain_baris_02_dostluk', 'karsiliksiz_yardim', seed);

    state = fastForwardUntilQueued(state, seed);
    expect(queueIds(state)).toEqual(['chain_baris_03_dostluk']);
    state = resolveQueuedEvent(state, 'chain_baris_03_dostluk', 'tesekkur_et', seed);

    state = fastForwardUntilQueued(state, seed);
    expect(queueIds(state)).toEqual(['chain_baris_04_dostluk']);
    state = resolveQueuedEvent(state, 'chain_baris_04_dostluk', 'teklifi_kabul', seed);
    expect(state.career.seniorityStage).toBeDefined(); // Barış "uzman oldu" narrative beat — power balance shift is content, not a state field here

    state = fastForwardUntilQueued(state, seed);
    expect(queueIds(state)).toEqual(['chain_baris_05_dostluk']);
    state = resolveQueuedEvent(state, 'chain_baris_05_dostluk', 'evraklari_kendin_hallet', seed);

    expect(state.flags.chain_baris_cycle_outcome).toBe('broke_the_cycle');
    expect(state.behaviorStats['junior:supportive']).toBe(1);
    expect(state.behaviorStats['junior:protected']).toBe(1);
    expect(state.relationships.baris.trust).toBeGreaterThan(0);

    const chainEntries = state.eventHistory.filter((e) => e.chainId === 'baris');
    expect(chainEntries.map((e) => e.checkpoint)).toEqual(['stage1', 'stage2', 'stage3', 'stage4', 'stage5']);
  });
});

describe('Barış Hattı — Path B (gerilim)', () => {
  it('runs stage1 through stage5 via the real engine, ending in repeated_the_cycle', () => {
    const seed = 'baris-path-b';
    let state = chainTestState(seed);

    state = resolveQueuedEvent(state, 'chain_baris_01_ilk_gorev', 'reddet', seed);
    expect(state.flags.chain_baris_path).toBe('gerilim');
    expect(state.relationships.baris.grudge).toBe(10);

    state = fastForwardUntilQueued(state, seed);
    expect(queueIds(state)).toEqual(['chain_baris_02_gerilim']);
    // Some weeks elapsed in the fast-forward above, so passive monthly
    // decay (§20) may already have nudged grudge down from the exact 10
    // set right after stage1 — capture the live baseline right before
    // this choice rather than assuming it's still exactly 10.
    const grudgeBeforeGrubaYanit = state.relationships.baris.grudge;
    state = resolveQueuedEvent(state, 'chain_baris_02_gerilim', 'gruba_yanit', seed);
    expect(state.relationships.baris.grudge).toBe(grudgeBeforeGrubaYanit + 8);

    state = fastForwardUntilQueued(state, seed);
    expect(queueIds(state)).toEqual(['chain_baris_03_gerilim']);
    state = resolveQueuedEvent(state, 'chain_baris_03_gerilim', 'yuzeysel_yuzlestir', seed);

    state = fastForwardUntilQueued(state, seed);
    expect(queueIds(state)).toEqual(['chain_baris_04_gerilim']);
    state = resolveQueuedEvent(state, 'chain_baris_04_gerilim', 'itiraz_et', seed);
    expect(state.flags.chain_baris_itiraz_etti).toBe(true);

    state = fastForwardUntilQueued(state, seed);
    expect(queueIds(state)).toEqual(['chain_baris_05_gerilim']);
    state = resolveQueuedEvent(state, 'chain_baris_05_gerilim', 'ayni_seyi_yap', seed);

    expect(state.flags.chain_baris_cycle_outcome).toBe('repeated_the_cycle');
    expect(state.behaviorStats['junior:exploitative']).toBe(1);

    const chainEntries = state.eventHistory.filter((e) => e.chainId === 'baris');
    expect(chainEntries.map((e) => e.checkpoint)).toEqual(['stage1', 'stage2', 'stage3', 'stage4', 'stage5']);
  });
});

describe('Barış Hattı — Path C (recovery / dynamic branching)', () => {
  it('a gerilim-origin run can still resolve a later checkpoint to the dostluk candidate once trust recovers', () => {
    const seed = 'baris-path-c';
    let state = chainTestState(seed);

    // Start on the gerilim path — same as Path B so far.
    state = resolveQueuedEvent(state, 'chain_baris_01_ilk_gorev', 'reddet', seed);
    expect(state.flags.chain_baris_path).toBe('gerilim');

    state = fastForwardUntilQueued(state, seed);
    expect(queueIds(state)).toEqual(['chain_baris_02_gerilim']);
    state = resolveQueuedEvent(state, 'chain_baris_02_gerilim', 'sessiz_kal', seed);

    // Interim recovery: something off-chain rebuilt trust with Barış
    // faster than grudge could fade (the design bible's intended use case
    // for other, non-chain pool events targeting the same NPC — injected
    // directly here to isolate exactly what's being tested: checkpoint
    // resolution reading LIVE relationship state, not the origin flag).
    state = {
      ...state,
      relationships: { ...state.relationships, baris: { ...state.relationships.baris, trust: 25 } },
    };

    state = fastForwardUntilQueued(state, seed);
    // stage3_dostluk requires trust >= 20 (now true) OR flag==dostluk (still false).
    // stage3_gerilim (fallback) would otherwise have won via the origin flag.
    // The dostluk candidate wins here BECAUSE trust recovered — proving
    // resolution is state-driven, not locked to the stage1 flag (§17).
    expect(queueIds(state)).toEqual(['chain_baris_03_dostluk']);
  });
});
