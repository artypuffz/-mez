import type { GameState } from "./types";
import type { TusPrepProfileId } from "./types";
import type { SeededRng } from "../rng/seededRng";
import { createScopedRng } from "../rng/seededRng";
import { getTusPrepProfile } from "../config/tusPrepProfiles";
import { TUS_EXAM_EVENT_DEFINITIONS } from "../config/tusExamEvents";
import { DEFAULT_TUS_SCORE_CONFIG } from "../config/tusScoreConfig";
import { pickTusExamEvents } from "../tus/pickTusExamEvents";
import { computeTusScore } from "../tus/computeTusScore";
import type { ResidencyProgram } from "../config/residencyPrograms";
import { deriveResidencyStartDate } from "../residency/calendar";
import { generateInitialClinic } from "../npc/generation";
import { resolveFinalHierarchyPressure } from "../residency/hospitalCulture";

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

// Procedural clinic generation is deterministic for (rngSeed, programId)
// — the same save re-picking the same program always produces the same
// roster (§4), scoped independently of every other rng draw in the game.
export function selectResidencyProgram(state: GameState, program: ResidencyProgram): GameState {
  const npcRng = createScopedRng(state.meta.rngSeed, `npc:initial:${program.id}`);
  const { npcs, relationships } = generateInitialClinic(program, npcRng, undefined, state.meta.rngSeed);
  const npcsById = Object.fromEntries(npcs.map((npc) => [npc.id, npc]));

  // Phase 11 — computed once here (deterministic per gameSeed+programId,
  // never rerolled on refresh) and persisted on career, so every later
  // reader (the event-weight modifier, the post-selection UI number) uses
  // the exact same value instead of recomputing it ad hoc.
  const hierarchyPressure = resolveFinalHierarchyPressure(state.meta.rngSeed, program);

  return {
    ...state,
    character: { ...state.character, currentCity: program.cityId },
    career: {
      ...state.career,
      branch: program.branchId,
      hospital: program.hospitalId,
      city: program.cityId,
      phase: "residency",
      residencyStartedAt: deriveResidencyStartDate(state.meta.createdAt),
      residencyWeek: 0,
      residencyYear: 1,
      seniorityStage: "comez",
      hierarchyPressure,
    },
    tus: { ...state.tus, selectedProgramId: program.id },
    npcs: npcsById,
    relationships,
  };
}
