// Phase 10 §30 — dev/test-only deterministic state seeding. Never
// reachable in a production build: this module is pure domain code (no
// __DEV__ check here on purpose, so it stays unit-testable), but its only
// call sites — useGameStore.debugLoadScenario and the dev-only menu that
// invokes it — are gated behind `__DEV__` at the app layer (see
// store/useGameStore.ts and screens/MainMenuScreen.tsx). A release/
// production RN bundle has `__DEV__ === false`, so those call sites never
// run and this module is simply unreferenced from any reachable path.
//
// Each scenario builds a REAL residency-phase state via the same domain
// transition functions the actual game uses (createInitialGameState ->
// beginTus -> proceedToPreference -> selectResidencyProgram), so the NPC
// roster, relationships, and calendar stay internally consistent — then
// applies the minimum direct field overrides needed to land the state at
// the deep point a scenario is named for, skipping the (possibly hours
// of simulated play) it would otherwise take to reach there by chance.
// Where a scenario is meant to test a real engine TRANSITION (e.g.
// residency_complete), it seeds the state one week BEFORE that
// transition and lets the real engine drive it, rather than faking the
// post-transition shape by hand.
import type { EventRepository } from "../events/repository";
import type { GameState, QueuedEventInstance } from "../state/types";
import { createInitialGameState } from "../state/createInitialGameState";
import { beginTus } from "../state/transitions";
import { proceedToPreference, selectResidencyProgram } from "../state/tusTransitions";
import { getResidencyProgram } from "../config/residencyPrograms";
import { getBranchDefinition } from "../config/branches";
import { getResidencyYear } from "../residency/residencyYear";
import { getSeniorityStage } from "../residency/seniority";

export type DebugScenarioId =
  | "high_burnout"
  | "financial_crisis"
  | "residency_complete"
  | "specialist_exam"
  | "gameover_burnout"
  | "senior_power_reversal"
  | "baris_chain_midpoint";

export const DEBUG_SCENARIO_IDS: DebugScenarioId[] = [
  "high_burnout",
  "financial_crisis",
  "residency_complete",
  "specialist_exam",
  "gameover_burnout",
  "senior_power_reversal",
  "baris_chain_midpoint",
];

export const DEBUG_SCENARIO_LABELS: Record<DebugScenarioId, string> = {
  high_burnout: "Yüksek Burnout → Kriz Kartı",
  financial_crisis: "Mali Kriz",
  residency_complete: "Asistanlık Bitimine 1 Hafta",
  specialist_exam: "Uzmanlık Sınavı (2. aşama)",
  gameover_burnout: "Game Over — İstifa (Burnout)",
  senior_power_reversal: "Kıdemli — Junior'a Yük Aktarma Anı",
  baris_chain_midpoint: "Barış Zinciri — Dostluk Yolu, Checkpoint 2",
};

function queueEvent(week: number, eventId: string, boundNpcIds: Record<string, string> = {}): QueuedEventInstance {
  return { instanceId: `${week}:${eventId}`, eventId, boundNpcIds };
}

function assertEventExists(repository: EventRepository, eventId: string): void {
  if (!repository.getEventById(eventId)) {
    throw new Error(`Debug scenario references unknown event id: ${eventId}`);
  }
}

const FIXED_CREATED_AT = "2024-01-01T00:00:00.000Z";

function baseResidencyState(scenarioId: string, programId: string, week: number): GameState {
  let state = createInitialGameState(
    { name: "Test Asistan", age: 26, gender: "belirtmek_istemiyorum", hometown: "Ankara", background: "kendi_basina" },
    { seed: `debug:${scenarioId}`, now: () => FIXED_CREATED_AT }
  );
  state = beginTus(state);
  state = { ...state, career: { ...state.career, tusScore: 220 } };
  state = proceedToPreference(state);
  const program = getResidencyProgram(programId);
  state = selectResidencyProgram(state, program);

  const branch = getBranchDefinition(program.branchId);
  const totalWeeks = branch.residencyYears * 52;
  const clampedWeek = Math.max(1, Math.min(week, totalWeeks - 1));
  return {
    ...state,
    career: {
      ...state.career,
      residencyWeek: clampedWeek,
      residencyYear: getResidencyYear(clampedWeek),
      seniorityStage: getSeniorityStage(clampedWeek, totalWeeks),
    },
  };
}

export function buildDebugScenario(scenarioId: DebugScenarioId, repository: EventRepository): GameState {
  switch (scenarioId) {
    case "high_burnout": {
      const week = 90;
      const state = baseResidencyState(scenarioId, "baskent_ic", week);
      assertEventExists(repository, "crisis_burnout_01_yeter");
      return {
        ...state,
        resources: { ...state.resources, stress: 88, fatigue: 82, burnout: 74 },
        resourcePressure: { highStressWeeks: 5, highFatigueWeeks: 4, combinedPressureWeeks: 4, lowPressureWeeks: 0 },
        weeklyEventQueue: [queueEvent(week, "crisis_burnout_01_yeter")],
      };
    }

    case "financial_crisis": {
      const week = 60;
      const state = baseResidencyState(scenarioId, "baskent_ic", week);
      assertEventExists(repository, "crisis_financial_01_hesap_sifirin_altinda");
      return {
        ...state,
        resources: { ...state.resources, money: -8000 },
        financialPressure: { consecutiveNegativeMonths: 3, lowestBalance: -12000 },
        weeklyEventQueue: [queueEvent(week, "crisis_financial_01_hesap_sifirin_altinda")],
      };
    }

    case "residency_complete": {
      // One week before completion — the E2E harness triggers a normal
      // "HAFTAYI GEÇ" tap from here, exercising the real
      // residencyCompleted -> specialist_exam collapse in
      // advanceResidencyWeekWithEvents rather than faking its result.
      const program = getResidencyProgram("baskent_ic");
      const branch = getBranchDefinition(program.branchId);
      const totalWeeks = branch.residencyYears * 52;
      return baseResidencyState(scenarioId, "baskent_ic", totalWeeks - 1);
    }

    case "specialist_exam": {
      const program = getResidencyProgram("baskent_ic");
      const branch = getBranchDefinition(program.branchId);
      const totalWeeks = branch.residencyYears * 52;
      const state = baseResidencyState(scenarioId, "baskent_ic", totalWeeks);
      assertEventExists(repository, "specialist_exam_02_sinav_gunu");
      return {
        ...state,
        career: { ...state.career, phase: "specialist_exam" },
        specialistExam: { attempt: 0 },
        statistics: { ...state.statistics, specialist_exam_prep_points: 20 },
        weeklyEventQueue: [queueEvent(totalWeeks, "specialist_exam_02_sinav_gunu")],
      };
    }

    case "gameover_burnout": {
      const week = 140;
      const state = baseResidencyState(scenarioId, "baskent_ic", week);
      return {
        ...state,
        career: { ...state.career, phase: "gameover" },
        status: "gameover",
        resources: { ...state.resources, stress: 95, fatigue: 90, burnout: 88 },
        gameOver: {
          reason: "resigned_burnout",
          week,
          triggeredByEventId: "crisis_burnout_04_karar",
          selectedChoiceId: "istifa_et",
        },
      };
    }

    case "senior_power_reversal": {
      const week = 180;
      const state = baseResidencyState(scenarioId, "baskent_ic", week);
      assertEventExists(repository, "pr_007_angaryayi_asagi_aktar");
      const junior = Object.values(state.npcs).find((npc) => npc.role === "junior_resident" && npc.active);
      const boundNpcId = junior?.id ?? Object.values(state.npcs)[0]?.id;
      if (!boundNpcId) {
        throw new Error("senior_power_reversal debug scenario requires at least one generated NPC");
      }
      return {
        ...state,
        weeklyEventQueue: [queueEvent(week, "pr_007_angaryayi_asagi_aktar", { primary: boundNpcId })],
      };
    }

    case "baris_chain_midpoint": {
      const week = 20;
      const state = baseResidencyState(scenarioId, "baskent_ic", week);
      assertEventExists(repository, "chain_baris_02_dostluk");
      return {
        ...state,
        relationships: { ...state.relationships, baris: { trust: 15, friendship: 5, grudge: 0 } },
        flags: { ...state.flags, chain_baris_path: "dostluk" },
        activeChains: { ...state.activeChains, baris: { chainId: "baris", currentCheckpoint: "stage1", startedWeek: 8 } },
        weeklyEventQueue: [queueEvent(week, "chain_baris_02_dostluk")],
      };
    }
  }
}
