import type { GameState } from "./types";
import type { TusPrepProfileId } from "./types";
import type { SeededRng } from "../rng/seededRng";
import { getTusPrepProfile } from "../config/tusPrepProfiles";
import { TUS_EXAM_EVENT_DEFINITIONS } from "../config/tusExamEvents";
import { DEFAULT_TUS_SCORE_CONFIG } from "../config/tusScoreConfig";
import { pickTusExamEvents } from "../tus/pickTusExamEvents";
import { computeTusScore } from "../tus/computeTusScore";
import type { ResidencyProgram } from "../config/residencyPrograms";

// prep -> exam: picks and freezes this playthrough's exam-day event
// subset+order, so a resumed session sees exactly what it saw before.
export function startTusExam(state: GameState, profileId: TusPrepProfileId, rng: SeededRng): GameState {
  const examEvents = pickTusExamEvents(
    TUS_EXAM_EVENT_DEFINITIONS,
    DEFAULT_TUS_SCORE_CONFIG.examEventCount,
    rng
  );
  return {
    ...state,
    tus: {
      ...state.tus,
      prepProfileId: profileId,
      examEventIds: examEvents.map((e) => e.id),
      examLog: [],
      step: "exam",
    },
  };
}

// Appends one exam choice; flips to "result" once every picked event has
// an answer, so the exam-day screen can drive purely off examLog.length.
export function recordTusExamChoice(state: GameState, eventId: string, choiceId: string): GameState {
  const examLog = [...state.tus.examLog, { eventId, choiceId }];
  const done = examLog.length >= state.tus.examEventIds.length;
  return {
    ...state,
    tus: {
      ...state.tus,
      examLog,
      step: done ? "result" : state.tus.step,
    },
  };
}

// Computes the score exactly once — a state that already has a score is
// returned unchanged (this is the domain-level half of the "never reroll
// on refresh" guarantee; the store adds its own guard on top).
export function generateTusResult(state: GameState, rng: SeededRng): GameState {
  if (state.career.tusScore !== undefined) {
    return state;
  }
  if (!state.tus.prepProfileId) {
    throw new Error("Cannot generate a TUS result before a prep profile is selected");
  }
  const prepProfile = getTusPrepProfile(state.tus.prepProfileId);
  const { score } = computeTusScore(prepProfile, state.tus.examLog, rng);
  return {
    ...state,
    career: { ...state.career, tusScore: score },
  };
}

export function proceedToPreference(state: GameState): GameState {
  return { ...state, career: { ...state.career, phase: "preference" } };
}

export function selectResidencyProgram(state: GameState, program: ResidencyProgram): GameState {
  return {
    ...state,
    character: { ...state.character, currentCity: program.cityId },
    career: {
      ...state.career,
      branch: program.branchId,
      hospital: program.hospitalId,
      city: program.cityId,
      phase: "residency",
      residencyWeek: 0,
      residencyYear: 1,
      seniorityStage: "comez",
    },
    tus: { ...state.tus, selectedProgramId: program.id },
  };
}
