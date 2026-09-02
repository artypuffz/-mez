import { CURRENT_SAVE_VERSION, type BackgroundId, type GameState, type Gender } from "./types";
import { generateRandomSeed, createScopedRng } from "../rng/seededRng";
import { DEFAULT_RESOURCES } from "../config/resources";
import { getBackgroundDefinition } from "../config/backgrounds";
import { randomizePlayerAvatar } from "../avatar/randomize";
import type { PlayerAvatar } from "../avatar/types";

export interface CharacterCreationInput {
  name: string;
  age: number;
  gender: Gender;
  hometown: string;
  background: BackgroundId;
  // Gameplay Expansion Part C section 25 — set by Character Creation's
  // Görünüş step. Optional so every existing caller (tests, debug
  // scenarios, headless sims) keeps compiling unchanged; omitting it
  // derives a deterministic default from this save's own seed below,
  // exactly the same "safe, reproducible, never Math.random()" rule the
  // rest of the avatar system follows.
  avatar?: PlayerAvatar;
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
  const avatar = input.avatar ?? randomizePlayerAvatar(createScopedRng(seed, "avatar:player:initial"), input.gender);

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
      avatar,
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
      health: clampResource(DEFAULT_RESOURCES.health),
      social: clampResource(DEFAULT_RESOURCES.social),
      money: DEFAULT_RESOURCES.money + (modifiers.money ?? 0),
    },
    resourcePressure: { highStressWeeks: 0, highFatigueWeeks: 0, combinedPressureWeeks: 0, lowPressureWeeks: 0 },
    financialPressure: { consecutiveNegativeMonths: 0, lowestBalance: DEFAULT_RESOURCES.money + (modifiers.money ?? 0) },
    crisisState: { lastCrisisWeek: null },
    relationships: {},
    relationshipHistory: {},
    npcs: {},
    flags: { ...backgroundDef.flags },
    pendingEvents: [],
    activeChains: {},
    eventHistory: [],
    behaviorStats: {},
    statistics: {},
    eventCooldowns: {},
    pendingEffects: [],
    weeklyEventQueue: [],
    onCall: { schedule: null },
    economy: { lastProcessedMonthKey: null, lastBreakdown: null },
    workload: null,
    schedule: null,
    freeTime: { totalHours: 0, usedHours: 0 },
    lifestyle: { foodTier: "normal" },
    ownership: { phone: "old", computer: "none", housing: "normal" },
    status: "active",
  };
}
