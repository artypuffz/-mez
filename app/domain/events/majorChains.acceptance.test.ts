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

// §40 — Phase 8's 3 new major authored chains (Sekreter/Hoca/Deniz), each
// run through the real engine + real content, same pattern as Phase 5's
// Barış Hattı acceptance test.
const repo = getEventRepository();
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

function resolveQueuedEvent(state: GameState, eventId: string, choiceId: string, seed: string): GameState {
  const event = repo.getEventById(eventId);
  if (!event) throw new Error(`Fixture error: event ${eventId} not found in the real repository`);
  const queued: GameState = { ...state, weeklyEventQueue: [{ instanceId: eventId, eventId, boundNpcIds: {} }] };
  return resolveEventChoice(queued, event, choiceId, createScopedRng(seed, `resolve:${eventId}`)).state;
}

function queueIds(state: GameState): string[] {
  return state.weeklyEventQueue.map((q) => q.eventId);
}

describe('Sekreter Hattı — çift yol + dinamik geçiş', () => {
  it('patient path (flag-guaranteed) reaches the "yardım" candidate at stage2', () => {
    const seed = 'sekreter-patient';
    let state = chainTestState(seed);
    state = resolveQueuedEvent(state, 'chain_sekreter_01_pencere', 'nazik_bekle', seed);
    expect(state.flags.sekreter_path).toBe('patient');

    state = fastForwardUntilQueued(state, seed);
    expect(queueIds(state)).toEqual(['chain_sekreter_02_yardim']);
  });

  it('dynamic branching: a pushy-origin run can still resolve stage3 to "bulundu" once trust recovers (state-driven, not origin-flag-driven)', () => {
    const seed = 'sekreter-recovery';
    let state = chainTestState(seed);
    state = resolveQueuedEvent(state, 'chain_sekreter_01_pencere', 'one_gec', seed);
    expect(state.flags.sekreter_path).toBe('pushy');

    state = fastForwardUntilQueued(state, seed);
    // Whichever stage2 candidate won, resolve it generically to keep the
    // chain moving toward stage3.
    const stage2Id = queueIds(state)[0];
    const stage2Choice = stage2Id === 'chain_sekreter_02_yardim' ? 'normal_karsila' : 'devam';
    state = resolveQueuedEvent(state, stage2Id, stage2Choice, seed);

    // Interim recovery: force trust well past stage3's threshold — proves
    // stage3 reads LIVE relationship state, not the stage1 origin flag.
    state = {
      ...state,
      relationships: { ...state.relationships, zeynep_sekreter: { ...state.relationships.zeynep_sekreter, trust: 20 } },
    };

    state = fastForwardUntilQueued(state, seed);
    expect(queueIds(state)).toEqual(['chain_sekreter_03_bulundu']);
  });
});

describe('Hoca Hattı — akademik fırsat', () => {
  it('joining the project and keeping high trust reaches the "referans" (credited) branch', () => {
    const seed = 'hoca-joined';
    let state = chainTestState(seed);
    state = resolveQueuedEvent(state, 'chain_hoca_01_teklif', 'kabul_et', seed);
    expect(state.flags.hoca_path).toBe('joined');

    state = fastForwardUntilQueued(state, seed);
    expect(queueIds(state)).toEqual(['chain_hoca_02_yuk']);
    state = resolveQueuedEvent(state, 'chain_hoca_02_yuk', 'fazla_mesai', seed);

    // Force trust above stage3's threshold to deterministically land on
    // the credited candidate regardless of the exact seeded deltas above.
    state = { ...state, relationships: { ...state.relationships, hoca_erhan: { ...state.relationships.hoca_erhan, trust: 20 } } };

    state = fastForwardUntilQueued(state, seed);
    expect(queueIds(state)).toEqual(['chain_hoca_03_referans']);
    state = resolveQueuedEvent(state, 'chain_hoca_03_referans', 'kabul_et', seed);
    expect(state.flags.hoca_outcome).toBe('credited');
  });

  it('declining the project falls through to the "dışarıda" fallback branch', () => {
    const seed = 'hoca-declined';
    let state = chainTestState(seed);
    state = resolveQueuedEvent(state, 'chain_hoca_01_teklif', 'reddet', seed);
    expect(state.flags.hoca_path).toBe('declined');

    state = fastForwardUntilQueued(state, seed);
    expect(queueIds(state)).toEqual(['chain_hoca_02_disarida']);
  });
});

describe('Deniz Hattı — güç tersine dönüşü + Barış Hattı callback', () => {
  it('protecting Deniz and building trust reaches the "döngü kırıldı" ending, with a callback variant when the player repeated the cycle with Barış', () => {
    const seed = 'deniz-protected';
    let state = chainTestState(seed);
    state = resolveQueuedEvent(state, 'chain_deniz_01_yeni_geldi', 'yardim_et', seed);
    expect(state.flags.deniz_first_impression).toBe('supportive');

    state = fastForwardUntilQueued(state, seed);
    expect(queueIds(state)).toEqual(['chain_deniz_02_yuk_farkindaligi']);
    const before = state.onCall.schedule?.player.totalShifts;
    state = resolveQueuedEvent(state, 'chain_deniz_02_yuk_farkindaligi', 'nobetini_hafiflet', seed);
    expect(state.flags.deniz_path).toBe('protected');
    // onCallEffects actually fired (§13) — a real shift was added, IF a
    // schedule already existed by this point in the run.
    if (before !== undefined) {
      expect(state.onCall.schedule?.player.totalShifts).toBe(before + 1);
    }

    state = { ...state, relationships: { ...state.relationships, deniz_comez: { ...state.relationships.deniz_comez, trust: 20 } } };
    state = fastForwardUntilQueued(state, seed);
    expect(queueIds(state)).toEqual(['chain_deniz_03_guven']);
    state = resolveQueuedEvent(state, 'chain_deniz_03_guven', 'vakit_ayir', seed);
    expect(state.flags.deniz_outcome).toBe('trusted');

    state = fastForwardUntilQueued(state, seed);
    expect(queueIds(state)).toEqual(['chain_deniz_04_dongu_kirildi']);
  });

  it('a distant/ignored path falls through to the independence + silent-departure fallback endings', () => {
    const seed = 'deniz-distant';
    let state = chainTestState(seed);
    state = resolveQueuedEvent(state, 'chain_deniz_01_yeni_geldi', 'kendi_isine_bak', seed);
    expect(state.flags.deniz_first_impression).toBe('distant');

    state = fastForwardUntilQueued(state, seed);
    state = resolveQueuedEvent(state, 'chain_deniz_02_yuk_farkindaligi', 'sistem_boyle_isliyor', seed);
    expect(state.flags.deniz_path).toBe('ignored');
    expect(state.behaviorStats['junior:exploitative']).toBeGreaterThan(0);

    // Keep trust below stage3's threshold to land on the fallback.
    state = { ...state, relationships: { ...state.relationships, deniz_comez: { ...state.relationships.deniz_comez, trust: -5 } } };
    state = fastForwardUntilQueued(state, seed);
    expect(queueIds(state)).toEqual(['chain_deniz_03_mesafe']);
    state = resolveQueuedEvent(state, 'chain_deniz_03_mesafe', 'devam', seed);
    expect(state.flags.deniz_outcome).toBe('independent');

    state = fastForwardUntilQueued(state, seed);
    expect(queueIds(state)).toEqual(['chain_deniz_04_dongu_devam']);
  });
});
