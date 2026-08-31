export type Gender = "kadın" | "erkek" | "belirtmek_istemiyorum";

export type BackgroundId =
  | "aile_yaninda"
  | "baska_sehirden"
  | "ekonomik_rahat"
  | "kendi_basina";

// Content ids — kept as plain string aliases since the real definitions
// live in domain/config/*.ts, not here.
export type CityId = string;
export type BranchId = string;
export type HospitalId = string;
export type ProgramId = string;

export type TusPrepProfileId =
  | "duzenli"
  | "internlukle"
  | "son_uc_ay"
  | "son_ay_panik"
  | "temelime_guveniyorum";

export type TusStep = "prep" | "exam" | "result";

export interface TusExamChoiceLogEntry {
  eventId: string;
  choiceId: string;
}

export interface TusState {
  step: TusStep;
  prepProfileId?: TusPrepProfileId;
  // The subset+order of exam-day events chosen for this playthrough —
  // fixed once at "prep -> exam" so a resumed session sees the same
  // events in the same order, not a freshly re-rolled set.
  examEventIds: string[];
  examLog: TusExamChoiceLogEntry[];
  selectedProgramId?: ProgramId;
}

export type CareerPhase =
  | "character_creation"
  | "tus"
  | "preference"
  | "residency"
  // Total residency length reached; "Haftayı Geç" stops working. Phase 9
  // replaces this with the real specialist-exam flow — kept as its own
  // phase rather than jumping straight to "specialist" so nothing has to
  // pretend a system exists before it does.
  | "residency_complete"
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
  resolvedTitle: string;
  category: string;
  chainId?: string;
  checkpoint?: string;
}

// Resolved (non-range) resource deltas — a choice's delayedEffects have
// any {min,max} ranges resolved to a concrete number at scheduling time
// (same rng pass as the choice's immediateEffects), not re-rolled when
// they're actually applied N weeks later.
export interface ResolvedResourceDelta {
  stress?: number;
  fatigue?: number;
  burnout?: number;
  money?: number;
}

export interface PendingEffectEntry {
  dueWeek: number;
  sourceEventId: string;
  sourceChoiceId: string;
  effects: ResolvedResourceDelta;
}

export const CURRENT_SAVE_VERSION = 4;

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

    // Set once, when selectResidencyProgram runs — YYYY-MM-DD, UTC,
    // date-only (see domain/residency/calendar.ts). Weeks are computed by
    // adding residencyWeek*7 days to this, never by tracking a running
    // month/day counter directly.
    residencyStartedAt?: string;

    residencyWeek: number;
    residencyYear: number;

    seniorityStage: SeniorityStage;
  };

  tus: TusState;

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

  // Pool-event cooldown tracking: eventId -> the week it last triggered.
  eventCooldowns: Record<string, number>;

  pendingEffects: PendingEffectEntry[];

  // Event ids generated for the CURRENT week, awaiting player resolution,
  // in display order. Must be empty before advanceWeek is allowed to run
  // again — see the store's guard. Persisted (not ephemeral) so an app
  // close mid-event doesn't lose or reroll it.
  weeklyEventQueue: string[];

  status: "active" | "gameover" | "specialist";
}
