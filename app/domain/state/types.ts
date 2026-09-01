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

// Purely dyadic (player <-> this NPC) — never the NPC's own personality
// (that's NpcState.personality below). Phase 5 mixed the two into one
// object; Phase 6 splits them apart per the design decision in the
// Phase 6 report.
//
//   trust      -100..100  the NPC's professional confidence in the player
//   friendship -100..100  personal closeness, independent of professional trust
//   grudge        0..100  accumulated residue of past negative interactions —
//                         "negative grudge" has no sensible meaning, so
//                         unlike trust/friendship this is one-directional
export interface RelationshipState {
  trust: number;
  friendship: number;
  grudge: number;
}

// The relationship clamp standard (Phase 6 tech debt closure) — every
// place that mutates a RelationshipState field (effect application,
// procedural generation, passive decay) clamps through these same ranges,
// so the bound is defined exactly once rather than re-guessed per call site.
export const RELATIONSHIP_FIELD_RANGES: Record<keyof RelationshipState, [number, number]> = {
  trust: [-100, 100],
  friendship: [-100, 100],
  grudge: [0, 100],
};

export function clampRelationshipField(field: keyof RelationshipState, value: number): number {
  const [min, max] = RELATIONSHIP_FIELD_RANGES[field];
  return Math.min(max, Math.max(min, value));
}

export type NpcId = string;

export type NpcRole =
  | "department_head"
  | "faculty"
  | "specialist"
  | "senior_resident"
  | "peer_resident"
  | "junior_resident"
  | "nurse"
  | "secretary";

export type NpcCareerStage = "resident" | "specialist" | "faculty" | "department_head" | "left";

// The NPC's own traits — stable, not tied to any one player interaction.
// Never shown to the player as numbers (see the İlişkiler tab, which
// derives a label from RelationshipState instead).
export interface NpcPersonality {
  helpfulness: number;
  ego: number;
  hierarchyOrientation: number;
  conflictTendency: number;
  burnout: number;
}

export interface NpcState {
  id: NpcId;
  identity: { name: string; gender?: Gender };
  role: NpcRole;
  branchId: BranchId;
  hospitalId: HospitalId;
  career: {
    stage: NpcCareerStage;
    seniorityLevel?: number;
    joinedWeek: number;
    leftWeek?: number;
  };
  personality: NpcPersonality;
  active: boolean;
  // Set only for authored characters generated from a fixed template
  // (e.g. "baris") — lets content require a specific narrative NPC exist
  // without the engine ever special-casing a name (see domain/npc/templates.ts).
  templateId?: string;
}

export interface NpcTransition {
  npcId: NpcId;
  type: "became_specialist" | "became_faculty" | "became_department_head" | "left" | "arrived";
  week: number;
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

// A single queued-for-this-week event, with any NPC selectors already
// resolved and frozen (§16 of Phase 6) — a refresh mid-week must show the
// exact same NPC(s), never re-roll a selector like npcSelector:
// {randomActiveByRole:"junior_resident"}.
export interface QueuedEventInstance {
  instanceId: string;
  eventId: string;
  // selector key (e.g. "primary") -> resolved NpcId. Empty for events
  // with no npcSelectors (the vast majority, including all authored
  // fixed-id content like chain-baris.json).
  boundNpcIds: Record<string, NpcId>;
}

// Phase 7 — a single on-call assignment. Only the PLAYER's own shifts are
// ever generated as concrete assignments (§25/§37 of the Phase 7 spec — a
// player-centric schedule, not a full per-NPC simulation); `assignedNpcId`
// still allows "player" | a real NpcId so a future transfer/swap can move
// an assignment onto (or off of) an NPC without changing this shape.
export type OnCallAssignmentType = "weekday" | "weekend" | "holiday";
export type OnCallAssignmentSource = "generated" | "swap" | "extra";

export interface OnCallAssignment {
  id: string;
  date: string; // YYYY-MM-DD, within the schedule's monthKey
  type: OnCallAssignmentType;
  assignedNpcId: NpcId | "player";
  source: OnCallAssignmentSource;
}

export interface OnCallSchedule {
  monthKey: string; // YYYY-MM
  generatedAtWeek: number;
  player: {
    totalShifts: number;
    weekendShifts: number;
    // No real holiday calendar exists yet — always 0 this phase; the
    // field stays so a future holiday system doesn't need a shape change.
    holidayShifts: number;
    extraShifts: number;
  };
  clinicSummary: {
    activeResidents: number;
    staffingLoad: number; // 0..100
    // Undefined for the very first schedule of a residency (nothing to
    // compare against yet) — lets the monthly card's "roster/staffing
    // kötüleşti" line show ONLY when it's actually true (§8), without
    // storing a full schedule history just for this one comparison.
    previousActiveResidents?: number;
  };
  assignments: OnCallAssignment[];
}

export interface MonthlyEconomyBreakdown {
  monthKey: string;
  income: {
    salary: number;
    onCallPay: number;
    other: number;
  };
  expenses: {
    rent: number;
    food: number;
    transport: number;
    utilities: number;
    fixedOther: number;
  };
  net: number;
}

// Phase 9 — sustained-pressure tracking that drives burnout (§3 of the
// Phase 9 spec). Consecutive-week streaks, not instantaneous readings:
// burnout is meant to react to a pattern holding for a while, not to any
// single bad (or good) week. Reset to 0 the moment the underlying
// condition stops holding — these are streaks, not running totals.
export interface ResourcePressureState {
  highStressWeeks: number;
  highFatigueWeeks: number;
  combinedPressureWeeks: number;
  lowPressureWeeks: number;
}

// Phase 9 §20 — tracked independently of the current money snapshot so a
// financial crisis can react to "how long has this been bad", not just
// "is it bad right now this instant".
export interface FinancialPressureState {
  consecutiveNegativeMonths: number;
  lowestBalance: number;
}

// Phase 9 §30 — a single global cooldown across every crisis type/id, on
// top of (never instead of) each crisis EventDefinition's own
// once/cooldownWeeks. Keeps a resolved crisis from being immediately
// followed by another one the very next week, regardless of which
// resource is still elevated.
export interface CrisisEngineState {
  lastCrisisWeek: number | null;
}

// Phase 9 §23/§24 — every reason is a real, distinct career-ending
// outcome; "dismissed" exists in the type but Phase 9 ships no content
// that uses it (§23: never let RNG alone end a career for the player).
export type GameOverReason =
  | "resigned_burnout"
  | "resigned_career"
  | "financial_collapse"
  | "program_left"
  | "dismissed";

// Phase 9 §24/§25 — set exactly once, by resolveEventChoice applying a
// `careerEffects: [{type:"end_career", ...}]` DSL entry (see
// domain/events/types.ts). Never written by a bare resource-threshold
// check — a crisis only ever creates risk/eligibility, the player's own
// choice is what actually ends the career.
export interface GameOverState {
  reason: GameOverReason;
  week: number;
  triggeredByEventId?: string;
  selectedChoiceId?: string;
}

export const CURRENT_SAVE_VERSION = 7;

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

  // Phase 9 — see ResourcePressureState/FinancialPressureState/
  // CrisisEngineState above.
  resourcePressure: ResourcePressureState;
  financialPressure: FinancialPressureState;
  crisisState: CrisisEngineState;
  // Set once the career actually ends (see GameOverState above). Absent
  // for the entire rest of the game, including every other phase.
  gameOver?: GameOverState;

  relationships: Record<NpcId, RelationshipState>;

  npcs: Record<NpcId, NpcState>;

  flags: Record<string, boolean | number | string>;

  pendingEvents: PendingEvent[];

  activeChains: Record<string, ChainProgress>;

  eventHistory: EventLogEntry[];

  behaviorStats: Record<string, number>;

  statistics: Record<string, number>;

  // Pool-event cooldown tracking: eventId -> the week it last triggered.
  eventCooldowns: Record<string, number>;

  pendingEffects: PendingEffectEntry[];

  // Events generated for the CURRENT week, awaiting player resolution, in
  // display order. Must be empty before advanceWeek is allowed to run
  // again — see the store's guard. Persisted (not ephemeral) so an app
  // close mid-event doesn't lose it, reroll it, or re-bind its NPCs.
  weeklyEventQueue: QueuedEventInstance[];

  // Phase 7 — current month's on-call schedule. Regenerated only when
  // monthKey changes (§7/§9); a refresh/reload just re-reads this, never
  // rerolls it.
  onCall: {
    schedule: OnCallSchedule | null;
  };

  // Phase 7 — idempotent monthly income/expense processing (§20). A
  // month's salary/rent/on-call pay is applied to resources.money exactly
  // once, guarded by lastProcessedMonthKey; lastBreakdown is kept only
  // for display (the feed card, Profile summary) — it is not a ledger.
  economy: {
    lastProcessedMonthKey: string | null;
    lastBreakdown: MonthlyEconomyBreakdown | null;
  };

  status: "active" | "gameover" | "specialist";
}
