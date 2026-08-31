export type Gender = "kadın" | "erkek" | "belirtmek_istemiyorum";

export type BackgroundId =
  | "aile_yaninda"
  | "baska_sehirden"
  | "ekonomik_rahat"
  | "kendi_basina";

// Placeholder id types — real city/branch/hospital content lands in later
// phases (preference system, branch/hospital data). Kept as branded-ish
// string aliases now so the GameState shape doesn't need to change then.
export type CityId = string;
export type BranchId = string;
export type HospitalId = string;

export type CareerPhase =
  | "character_creation"
  | "tus"
  | "preference"
  | "residency"
  | "gameover"
  | "specialist";

export type SeniorityStage = "none" | "comez" | "orta" | "kidemli";

// Shape matches the hidden NPC relationship fields described in
// docs/event-schema.md §6 (behaviorTags / relationship requirements).
export interface RelationshipState {
  trust: number;
  friendship: number;
  grudge: number;
  mobbingTendency: number;
  helpfulness: number;
  ego: number;
  burnoutNpc: number;
}

// A followUpEvent waiting to resolve at a chainId+checkpoint (see
// docs/event-schema.md §4.2). Nothing populates this queue yet — the
// event engine (Phase 5) is what schedules and resolves these.
export interface PendingEvent {
  chainId: string;
  checkpoint: string;
  triggerWeek: number;
  sourceEventId: string;
  sourceChoiceId: string;
}

export interface ChainProgress {
  chainId: string;
  currentCheckpoint: string;
  startedWeek: number;
}

export interface EventLogEntry {
  week: number;
  eventId: string;
  choiceId: string;
}

export const CURRENT_SAVE_VERSION = 1;

export interface GameState {
  meta: {
    saveVersion: number;
    rngSeed: string;
    createdAt: string;
  };

  character: {
    name: string;
    age: number;
    gender: Gender;
    hometown: string;
    currentCity?: CityId;
    background: BackgroundId;
  };

  career: {
    phase: CareerPhase;

    branch?: BranchId;
    hospital?: HospitalId;
    city?: CityId;

    tusScore?: number;

    residencyWeek: number;
    residencyYear: number;

    seniorityStage: SeniorityStage;
  };

  resources: {
    stress: number;
    fatigue: number;
    burnout: number;
    money: number;
  };

  relationships: Record<string, RelationshipState>;

  flags: Record<string, boolean | number | string>;

  pendingEvents: PendingEvent[];

  activeChains: Record<string, ChainProgress>;

  eventHistory: EventLogEntry[];

  behaviorStats: Record<string, number>;

  statistics: Record<string, number>;

  status: "active" | "gameover" | "specialist";
}
