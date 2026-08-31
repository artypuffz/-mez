import { CURRENT_SAVE_VERSION, type BackgroundId, type GameState, type Gender } from "./types";
import { generateRandomSeed } from "../rng/seededRng";
import { DEFAULT_RESOURCES } from "../config/resources";
import { getBackgroundDefinition } from "../config/backgrounds";

export interface CharacterCreationInput {
  name: string;
  age: number;
  gender: Gender;
  hometown: string;
  background: BackgroundId;
}

export interface CreateInitialGameStateOptions {
  /** Overrides the generated RNG seed — tests/debug only. */
  seed?: string;
  /** Overrides the createdAt clock — tests only. */
  now?: () => string;
}

function clampResource(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function createInitialGameState(
  input: CharacterCreationInput,
  options: CreateInitialGameStateOptions = {}
): GameState {
  // Stored but unused until the event engine (Phase 5) starts consuming
  // it via createSeededRng — recording it now keeps a save replayable.
  const seed = options.seed ?? generateRandomSeed();
  const createdAt = (options.now ?? (() => new Date().toISOString()))();
  const backgroundDef = getBackgroundDefinition(input.background);
  const modifiers = backgroundDef.resourceModifiers;

  return {
    meta: {
      saveVersion: CURRENT_SAVE_VERSION,
      rngSeed: seed,
      createdAt,
    },
    character: {
      name: input.name.trim(),
      age: input.age,
      gender: input.gender,
      hometown: input.hometown.trim(),
      background: input.background,
    },
    career: {
      phase: "character_creation",
      residencyWeek: 0,
      residencyYear: 0,
      seniorityStage: "none",
    },
    tus: {
      step: "prep",
      examEventIds: [],
      examLog: [],
    },
    resources: {
      stress: clampResource(DEFAULT_RESOURCES.stress + (modifiers.stress ?? 0)),
      fatigue: clampResource(DEFAULT_RESOURCES.fatigue + (modifiers.fatigue ?? 0)),
      burnout: clampResource(DEFAULT_RESOURCES.burnout + (modifiers.burnout ?? 0)),
      money: DEFAULT_RESOURCES.money + (modifiers.money ?? 0),
    },
    relationships: {},
    flags: { ...backgroundDef.flags },
    pendingEvents: [],
    activeChains: {},
    eventHistory: [],
    behaviorStats: {},
    statistics: {},
    status: "active",
  };
}
