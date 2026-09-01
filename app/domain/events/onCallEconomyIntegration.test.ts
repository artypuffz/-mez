import { describe, expect, it } from 'vitest';
import { advanceResidencyWeekWithEvents } from './engine';
import { createEventRepository } from './repository';
import { buildRequirementContext } from './requirements';
import { createInitialGameState } from '../state/createInitialGameState';
import { beginTus } from '../state/transitions';
import { selectResidencyProgram, proceedToPreference } from '../state/tusTransitions';
import { getResidencyProgram } from '../config/residencyPrograms';
import { computeMonthlyEconomy } from '../economy/monthlyEconomy';
import { getCityDefinition } from '../config/cities';
import { createScopedRng } from '../rng/seededRng';
import type { GameState } from '../state/types';

const program = getResidencyProgram('baskent_ic');
const repo = createEventRepository([]);

function residencyState(seed: string): GameState {
  const initial = createInitialGameState(
    { name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'kendi_basina' },
    { seed }
  );
  return selectResidencyProgram(proceedToPreference(beginTus(initial)), program);
}

function advanceOneWeek(state: GameState, seed: string, week: number): GameState {
  const weekRng = createScopedRng(seed, `residency:week:${week}`);
  const eventsRng = createScopedRng(seed, `events:week:${week}`);
  return advanceResidencyWeekWithEvents(state, weekRng, eventsRng, repo).state;
}

describe('on-call + economy engine integration (§35)', () => {
  it('full cross-system flow: schedule generation, idempotent economy, staffing-driven change, save/reload', () => {
    const seed = 'oncall-economy-integration';
    let state = residencyState(seed);
    let week = 0;

    // 1-3: residency start -> first month's schedule + economy.
    while (!state.onCall.schedule && week < 10) {
      week += 1;
      state = advanceOneWeek(state, seed, week);
    }
    expect(state.onCall.schedule).not.toBeNull();
    const schedule1 = state.onCall.schedule!;
    expect(state.economy.lastProcessedMonthKey).toBe(schedule1.monthKey);
    const breakdown1 = state.economy.lastBreakdown!;
    expect(breakdown1.monthKey).toBe(schedule1.monthKey);

    // §33 — the schedule itself is not regenerated while still inside the
    // same month (only monthKey changing triggers a new one).
    const moneyAfterMonth1 = state.resources.money;
    state = advanceOneWeek(state, seed, week + 1);
    week += 1;
    expect(state.onCall.schedule).toEqual(schedule1);
    // Economy is idempotent within the month: advancing more weeks in the
    // SAME month must not reprocess income/expenses again.
    expect(state.economy.lastProcessedMonthKey).toBe(schedule1.monthKey);
    // Only the small weekly on-call pressure + baseline tick touch money
    // (money isn't touched by resource ticks at all) — so money should be
    // unchanged by economy re-processing specifically.
    expect(state.resources.money).toBe(moneyAfterMonth1);

    // 5: force a roster shortage BEFORE month 2 begins — deterministic,
    // rather than waiting on the probabilistic lifecycle tick.
    const residentIds = Object.values(state.npcs)
      .filter((n) => n.active && !n.templateId && (n.role === 'senior_resident' || n.role === 'peer_resident' || n.role === 'junior_resident'))
      .map((n) => n.id);
    const toDeactivate = residentIds.slice(0, Math.max(0, residentIds.length - 1));
    const depletedNpcs = { ...state.npcs };
    for (const id of toDeactivate) {
      depletedNpcs[id] = { ...depletedNpcs[id], active: false };
    }
    state = { ...state, npcs: depletedNpcs };

    // 6-7: advance into month 2 — a new schedule must generate, reading
    // the now-depleted roster.
    const safetyLimit = week + 10;
    while (state.onCall.schedule!.monthKey === schedule1.monthKey && week < safetyLimit) {
      week += 1;
      state = advanceOneWeek(state, seed, week);
    }
    const schedule2 = state.onCall.schedule!;
    expect(schedule2.monthKey).not.toBe(schedule1.monthKey);
    expect(schedule2.clinicSummary.staffingLoad).toBeGreaterThan(schedule1.clinicSummary.staffingLoad);

    // 9: month 2's economy breakdown must be recomputable purely from
    // schedule2 — proving on-call pay actually flowed into economy, not a
    // stale value from month 1.
    const breakdown2 = state.economy.lastBreakdown!;
    expect(breakdown2.monthKey).toBe(schedule2.monthKey);
    const expectedBreakdown2 = computeMonthlyEconomy({
      monthKey: schedule2.monthKey,
      seniorityStage: state.career.seniorityStage,
      onCallSchedule: schedule2,
      city: getCityDefinition(program.cityId),
      background: state.character.background,
    });
    expect(breakdown2).toEqual(expectedBreakdown2);

    // Event requirements can read the current on-call state (§21).
    const ctx = buildRequirementContext(state);
    expect(ctx.onCall.currentMonthTotalShifts).toBe(schedule2.player.totalShifts);
    expect(ctx.onCall.staffingLoad).toBe(schedule2.clinicSummary.staffingLoad);

    // 10: save/reload (JSON round-trip, same as AsyncStorage) preserves
    // both slices exactly.
    const reloaded: GameState = JSON.parse(JSON.stringify(state));
    expect(reloaded.onCall.schedule).toEqual(schedule2);
    expect(reloaded.economy).toEqual(state.economy);
  });
});
