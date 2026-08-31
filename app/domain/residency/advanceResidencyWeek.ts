import type { GameState, SeniorityStage } from "../state/types";
import type { SeededRng } from "../rng/seededRng";
import { getBranchDefinition } from "../config/branches";
import { getResidencyProgram } from "../config/residencyPrograms";
import { applyWeeklyBurnout, applyWeeklyFatigue, applyWeeklyStress } from "./weeklyResources";
import { getResidencyYear } from "./residencyYear";
import { getSeniorityStage } from "./seniority";
import { getResidencyCalendar } from "./calendar";

export interface WeekAdvanceTransitions {
  monthChanged?: { fromMonth: number; toMonth: number };
  yearChanged?: { fromYear: number; toYear: number };
  seniorityChanged?: { from: SeniorityStage; to: SeniorityStage };
  residencyCompleted?: boolean;
}

export interface WeekAdvanceResourceDelta {
  stress: number;
  fatigue: number;
  burnout: number;
}

export interface WeekAdvanceResult {
  state: GameState;
  transitions: WeekAdvanceTransitions;
  resourceDelta: WeekAdvanceResourceDelta;
}

// The orchestration point Phase 5+ (event engine, on-call, economy) will
// hang off of. For now it only runs this phase's systems: calendar,
// seniority, and passive stress/fatigue/burnout progression. Pure — takes
// a caller-scoped rng, never touches React/Zustand/storage, never mutates
// `state`. Callable in a plain loop (see the balance-check test) with no
// UI involved, which is exactly how it needs to work for Phase 5+'s
// eventual headless balancing script.
export function advanceResidencyWeek(state: GameState, rng: SeededRng): WeekAdvanceResult {
  if (state.career.phase !== "residency") {
    throw new Error(`advanceResidencyWeek called outside the residency phase (phase=${state.career.phase})`);
  }
  if (!state.career.branch || !state.career.residencyStartedAt || !state.tus.selectedProgramId) {
    throw new Error(
      "Residency state is missing branch/program/start date — selectResidencyProgram must run first"
    );
  }

  const branch = getBranchDefinition(state.career.branch);
  const program = getResidencyProgram(state.tus.selectedProgramId);
  const totalWeeks = branch.residencyYears * 52;

  const previousWeek = state.career.residencyWeek;
  const nextWeek = previousWeek + 1;

  // Deterministic order: fatigue -> stress -> burnout. Burnout reads
  // THIS week's already-ticked fatigue/stress (not last week's stale
  // values), so it reacts to the week it's being computed for.
  const nextFatigue = applyWeeklyFatigue(state.resources.fatigue, branch, program, rng);
  const nextStress = applyWeeklyStress(state.resources.stress, branch, program, rng);
  const nextBurnout = applyWeeklyBurnout({
    stress: nextStress,
    fatigue: nextFatigue,
    currentBurnout: state.resources.burnout,
  });

  const previousCalendar = getResidencyCalendar(state.career.residencyStartedAt, previousWeek);
  const nextCalendar = getResidencyCalendar(state.career.residencyStartedAt, nextWeek);

  const previousSeniority = state.career.seniorityStage;
  const nextSeniority = getSeniorityStage(nextWeek, totalWeeks);

  const completed = nextWeek >= totalWeeks;

  const nextState: GameState = {
    ...state,
    career: {
      ...state.career,
      residencyWeek: nextWeek,
      residencyYear: getResidencyYear(nextWeek),
      seniorityStage: nextSeniority,
      phase: completed ? "residency_complete" : state.career.phase,
    },
    resources: {
      ...state.resources,
      fatigue: nextFatigue,
      stress: nextStress,
      burnout: nextBurnout,
      // money is untouched this phase — Phase 7 ticks it.
    },
  };

  const transitions: WeekAdvanceTransitions = {};
  if (previousCalendar.month !== nextCalendar.month || previousCalendar.year !== nextCalendar.year) {
    transitions.monthChanged = { fromMonth: previousCalendar.month, toMonth: nextCalendar.month };
  }
  if (previousCalendar.year !== nextCalendar.year) {
    transitions.yearChanged = { fromYear: previousCalendar.year, toYear: nextCalendar.year };
  }
  if (previousSeniority !== nextSeniority) {
    transitions.seniorityChanged = { from: previousSeniority, to: nextSeniority };
  }
  if (completed) {
    transitions.residencyCompleted = true;
  }

  return {
    state: nextState,
    transitions,
    resourceDelta: {
      stress: nextStress - state.resources.stress,
      fatigue: nextFatigue - state.resources.fatigue,
      burnout: nextBurnout - state.resources.burnout,
    },
  };
}
