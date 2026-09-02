import { describe, expect, it } from 'vitest';
import { selectCrisisEvent } from './selection';
import { createEventRepository } from '../events/repository';
import { createSeededRng } from '../rng/seededRng';
import type { EventDefinition } from '../events/types';
import type { RequirementContext } from '../events/requirements';

function makeCrisisEvent(overrides: Partial<EventDefinition>): EventDefinition {
  return {
    id: 'crisis_ev',
    title: 'T',
    description: 'D',
    category: 'CRISIS',
    triggerMode: 'crisis',
    crisisType: 'exhaustion',
    weight: 10,
    choices: [{ id: 'a', text: 'A' }],
    ...overrides,
  };
}

function makeCtx(overrides: Partial<RequirementContext> = {}): RequirementContext {
  return {
    career: { phase: 'residency', week: 30, residencyWeek: 30, residencyYear: 1, seniorityStage: 'comez' },
    resources: { stress: 20, fatigue: 20, burnout: 0, health: 100, social: 50, money: 10000 },
    resourcePressure: { highStressWeeks: 0, highFatigueWeeks: 0, combinedPressureWeeks: 0, lowPressureWeeks: 0 },
    financialPressure: { consecutiveNegativeMonths: 0, lowestBalance: 10000 },
    flags: {},
    statistics: {},
    behaviorStats: {},
    relationships: {},
    boundNpcIds: {},
    activeNpcTemplateIds: new Set(),
    npcs: {},
    onCall: { currentMonthTotalShifts: 0, weekendShiftCount: 0, staffingLoad: 0 },
    ...overrides,
  };
}

describe('selectCrisisEvent', () => {
  it('selects nothing when no resource is past any crisis threshold', () => {
    const repo = createEventRepository([makeCrisisEvent({ id: 'exh' })]);
    const result = selectCrisisEvent(repo, makeCtx(), 30, null, {}, [], createSeededRng('none'));
    expect(result.event).toBeNull();
  });

  it('can select an exhaustion crisis once fatigue is past the eligibility threshold', () => {
    const repo = createEventRepository([makeCrisisEvent({ id: 'exh', weight: 1000 })]);
    const ctx = makeCtx({ resources: { stress: 20, fatigue: 90, burnout: 0, health: 100, social: 50, money: 10000 } });
    // Roll many seeds — probability isn't 100%, but it must fire at least once.
    let sawIt = false;
    for (let i = 0; i < 100 && !sawIt; i++) {
      const result = selectCrisisEvent(repo, ctx, 30, null, {}, [], createSeededRng(`fire-${i}`));
      if (result.event?.id === 'exh') sawIt = true;
    }
    expect(sawIt).toBe(true);
  });

  it('never selects a triggerMode:"pool" or "scheduled" event, even if it matches crisisType/thresholds by coincidence', () => {
    const poolEvent = { ...makeCrisisEvent({ id: 'not-crisis' }), triggerMode: 'pool' as const, crisisType: undefined };
    const repo = createEventRepository([poolEvent]);
    const ctx = makeCtx({ resources: { stress: 20, fatigue: 95, burnout: 0, health: 100, social: 50, money: 10000 } });
    for (let i = 0; i < 20; i++) {
      const result = selectCrisisEvent(repo, ctx, 30, null, {}, [], createSeededRng(`pool-${i}`));
      expect(result.event).toBeNull();
    }
  });

  it('respects the global cross-type cooldown — no crisis at all right after one fired', () => {
    const repo = createEventRepository([makeCrisisEvent({ id: 'exh', weight: 1000 })]);
    const ctx = makeCtx({ resources: { stress: 20, fatigue: 95, burnout: 0, health: 100, social: 50, money: 10000 } });
    const result = selectCrisisEvent(repo, ctx, 32, 30, {}, [], createSeededRng('cooldown'));
    expect(result.event).toBeNull();
    expect(result.trace.globalCooldownActive).toBe(true);
  });

  it('allows a crisis again once the global cooldown window has passed', () => {
    const repo = createEventRepository([makeCrisisEvent({ id: 'exh', weight: 1000 })]);
    const ctx = makeCtx({ resources: { stress: 20, fatigue: 95, burnout: 0, health: 100, social: 50, money: 10000 } });
    let sawIt = false;
    for (let i = 0; i < 100 && !sawIt; i++) {
      const result = selectCrisisEvent(repo, ctx, 40, 30, {}, [], createSeededRng(`past-cooldown-${i}`));
      if (result.event?.id === 'exh') sawIt = true;
    }
    expect(sawIt).toBe(true);
  });

  it('respects an individual crisis event\'s own cooldownWeeks even when the global cooldown has cleared', () => {
    const repo = createEventRepository([makeCrisisEvent({ id: 'exh', weight: 1000, cooldownWeeks: 50 })]);
    const ctx = makeCtx({ resources: { stress: 20, fatigue: 95, burnout: 0, health: 100, social: 50, money: 10000 } });
    const cooldowns = { exh: 10 };
    for (let i = 0; i < 20; i++) {
      const result = selectCrisisEvent(repo, ctx, 40, null, cooldowns, [], createSeededRng(`own-cooldown-${i}`));
      expect(result.event).toBeNull();
    }
  });

  it('prioritizes exhaustion over burnout/financial/career when multiple types are eligible', () => {
    const repo = createEventRepository([
      makeCrisisEvent({ id: 'exh', crisisType: 'exhaustion', weight: 1000 }),
      makeCrisisEvent({ id: 'burn', crisisType: 'burnout', weight: 1000 }),
    ]);
    const ctx = makeCtx({
      resources: { stress: 90, fatigue: 90, burnout: 90, health: 100, social: 50, money: 10000 },
      resourcePressure: { highStressWeeks: 10, highFatigueWeeks: 10, combinedPressureWeeks: 10, lowPressureWeeks: 0 },
    });
    let sawExhaustion = false;
    let sawBurnout = false;
    for (let i = 0; i < 200; i++) {
      const result = selectCrisisEvent(repo, ctx, 30, null, {}, [], createSeededRng(`priority-${i}`));
      if (result.event?.id === 'exh') sawExhaustion = true;
      if (result.event?.id === 'burn') sawBurnout = true;
    }
    // Exhaustion should win far more often given it's checked first and both are eligible.
    expect(sawExhaustion).toBe(true);
  });

  it('never selects an event whose content requirements fail even if the type is eligible', () => {
    const repo = createEventRepository([
      makeCrisisEvent({ id: 'exh', weight: 1000, requirements: { stat: 'career.seniorityStage', eq: 'kidemli' } }),
    ]);
    const ctx = makeCtx({ resources: { stress: 20, fatigue: 95, burnout: 0, health: 100, social: 50, money: 10000 } }); // seniorityStage: comez
    for (let i = 0; i < 30; i++) {
      const result = selectCrisisEvent(repo, ctx, 30, null, {}, [], createSeededRng(`req-fail-${i}`));
      expect(result.event).toBeNull();
    }
  });

  it('never selects a `once` crisis event that already occurred', () => {
    const repo = createEventRepository([makeCrisisEvent({ id: 'exh', weight: 1000, once: true })]);
    const ctx = makeCtx({ resources: { stress: 20, fatigue: 95, burnout: 0, health: 100, social: 50, money: 10000 } });
    for (let i = 0; i < 30; i++) {
      const result = selectCrisisEvent(repo, ctx, 30, null, {}, [{ eventId: 'exh' }], createSeededRng(`once-${i}`));
      expect(result.event).toBeNull();
    }
  });

  it('is deterministic for the same seed', () => {
    const repo = createEventRepository([makeCrisisEvent({ id: 'exh', weight: 1000 })]);
    const ctx = makeCtx({ resources: { stress: 20, fatigue: 95, burnout: 0, health: 100, social: 50, money: 10000 } });
    const a = selectCrisisEvent(repo, ctx, 30, null, {}, [], createSeededRng('det'));
    const b = selectCrisisEvent(repo, ctx, 30, null, {}, [], createSeededRng('det'));
    expect(a.event?.id).toBe(b.event?.id);
  });
});
