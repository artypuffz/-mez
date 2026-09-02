import type { PlayerAvatar } from "../avatar/types";

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
  // Set for exactly one engine tick (the week residencyCompleted fires)
  // and always immediately collapsed into "specialist_exam" in the same
  // call — see advanceResidencyWeekWithEvents. Never persisted, never
  // observed by the UI; kept in the union only because it's the value
  // advanceResidencyWeek (Phase 4, untouched) itself still sets.
  | "residency_complete"
  // Phase 10 — the short prep/attempt sequence between residency ending
  // and either "specialist" or a gameover ending. Its own weekly-advance
  // path (advanceSpecialistExamWeek) is intentionally NOT the residency
  // one — no baseline resource tick, no on-call, no economy; only due
  // pendingEvents/pendingEffects resolve, same generic machinery as
  // every other chain.
  | "specialist_exam"
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
//
// Gameplay Expansion Part A — health/social added alongside the original
// three. Per the design brief, health/social must NOT change from events
// ALONE (there's always a passive weekly driver too — see
// domain/residency/wellbeing.ts), but content/spending activities may
// still nudge them directly here, same as any other resource.
export interface ResolvedResourceDelta {
  stress?: number;
  fatigue?: number;
  burnout?: number;
  health?: number;
  social?: number;
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
  | "dismissed"
  // Phase 10 §5 — the second (final, MVP-capped) specialist exam attempt
  // failed. Deliberately not framed as worse than resigning — see
  // GameOverScreen's REASON_TEXT.
  | "specialist_exam_failed";

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

// Phase 10 §4 — "preparation" is deliberately NOT a field here; it's
// derived at attempt time from statistics.specialist_exam_prep_points
// (built up by ordinary choice.statistics.increment entries on the prep
// events), the same generic mechanism every other accumulating stat in
// the game already uses, rather than a second parallel counter to keep
// in sync.
export interface SpecialistExamState {
  attempt: number;
  result?: "passed" | "failed";
}

// Phase 11 §15 — the working-hours system's own minimal state, separate
// from (and never double-counting) the existing Phase 7 on-call schedule.
// currentWeekHours/regularHours/overtimeHours reset each weekly tick;
// recentAverageHours is a slow-moving average kept for display/analytics.
export interface WorkloadState {
  currentWeekHours: number;
  regularHours: number;
  overtimeHours: number;
  recentAverageHours: number;
}

// Gameplay Expansion Part A §1/§18 — a DISPLAY layer over the existing
// Phase 11 workload/on-call state, never a second source of truth for
// hours. See domain/residency/schedule.ts: total active-day hours here
// are budgeted from workload.regularHours, and every "nobet"/
// "nobet_ertesi" slot is placed directly from the current month's
// onCall.schedule.assignments — this module never invents its own hour
// total.
export type ScheduleActivity =
  | "vizit" | "servis" | "poliklinik" | "ameliyathane" | "egitim"
  | "nobet" | "nobet_ertesi" | "bos";

export interface ScheduleSlot {
  activity: ScheduleActivity;
  startHour: number; // 0-24 (24 = midnight rollover, e.g. nöbet 20-08 spans two days conceptually but is stored on its start day)
  endHour: number;
}

export interface ScheduleDay {
  // 0..6, the day's offset within THIS residency week — a residency week
  // is a simple 7-day block from career.residencyStartedAt (see
  // domain/residency/calendar.ts), never snapped to a real Monday. `date`
  // carries the real calendar date, so a UI can still derive the correct
  // real weekday label per day; it just won't always be Monday-first.
  dayIndex: number;
  date: string; // YYYY-MM-DD
  slots: ScheduleSlot[];
}

export interface WeeklySchedule {
  residencyWeek: number;
  days: ScheduleDay[]; // always 7 entries, dayIndex 0-6
}

// §3 — a hard hour-based resource, not a token/right system. usedHours is
// spent immediately by a resolved spending activity (§11); never negative,
// never exceeds totalHours.
export interface FreeTimeState {
  totalHours: number;
  usedHours: number;
}

export type FoodTier = "economical" | "normal" | "good";
export type PhoneTier = "old" | "normal" | "good";
export type ComputerTier = "none" | "basic" | "good";
export type HousingTier = "cheap" | "normal" | "good";

// §8 — a standing choice, not a weekly click. Changed via a store action,
// stays in effect until changed again, read by computeMonthlyExpenses.
export interface LifestyleState {
  foodTier: FoodTier;
}

// §12 — a small, explicitly non-cosmetic ownership model (distinct from
// any FUTURE cosmetic/avatar item ownership — see the Part A audit's
// scope note). housing feeds the monthly rent formula directly (the real
// economy lever, see docs/program-data-sources.md's sibling economy doc);
// phone/computer persist for future event-requirement use but carry no
// mechanical effect yet this phase.
export interface OwnershipState {
  phone: PhoneTier;
  computer: ComputerTier;
  housing: HousingTier;
}

export const CURRENT_SAVE_VERSION = 11;

// Gameplay Expansion Part B section 8 — a capped, newest-first,
// player-facing interaction record. `direction` drives icon/color only;
// `summary` is the ONLY narrative text ever shown — never an eventId,
// choiceId, or raw stat delta (see recordRelationshipHistory in
// domain/events/effects.ts for how entries get created and capped).
export type RelationshipHistoryDirection = "positive" | "negative" | "neutral";

export interface RelationshipHistoryEntry {
  week: number;
  summary: string;
  direction: RelationshipHistoryDirection;
}

export const RELATIONSHIP_HISTORY_CAP = 8;

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
    // Gameplay Expansion Part C section 24 — chosen once in Character
    // Creation's Görünüş step (or defaulted deterministically if skipped),
    // then persists unchanged for the rest of the career (section 28: a
    // refresh must never reroll it).
    avatar: PlayerAvatar;
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

    // Phase 11 §11/§12 — the FINAL hierarchy pressure for this career
    // (branch difficultyBaseline.hierarchyPressure + a seeded procedural
    // culture modifier), computed once in selectResidencyProgram and never
    // rerolled. 0.5-5.0 scale. Absent before a program is selected. See
    // domain/residency/hospitalCulture.ts.
    hierarchyPressure?: number;
  };

  tus: TusState;

  resources: {
    stress: number;
    fatigue: number;
    burnout: number;
    // Gameplay Expansion Part A §4 — 0-100 integer, like every other
    // resource here. health never triggers Game Over on its own (§4's
    // explicit rule) — it's display + future crisis-eligibility input
    // only. social is deliberately distinct from any single NPC's
    // RelationshipState (§4).
    health: number;
    social: number;
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

  // Phase 10 — present only once career.phase has reached
  // "specialist_exam" at least once; absent before that.
  specialistExam?: SpecialistExamState;

  relationships: Record<NpcId, RelationshipState>;

  // Gameplay Expansion Part B section 8 — capped (RELATIONSHIP_HISTORY_CAP
  // entries), newest-first per NPC. A player-facing record of what an
  // interaction FELT like, layered on top of (never replacing)
  // `relationships`' own numeric-but-hidden trust/friendship/grudge.
  relationshipHistory: Record<NpcId, RelationshipHistoryEntry[]>;

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

  // Phase 11 — see WorkloadState above. null before residency starts (or
  // for a migrated pre-Phase-11 save until its first weekly tick), same
  // pattern as onCall.schedule.
  workload: WorkloadState | null;

  // Gameplay Expansion Part A — see WeeklySchedule/FreeTimeState above.
  // schedule is regenerated every weekly tick (display only, derived from
  // workload/onCall — never a second hour authority); freeTime resets its
  // usedHours to 0 every week and is spent immediately by resolved
  // spending activities within that same week.
  schedule: WeeklySchedule | null;
  freeTime: FreeTimeState;
  lifestyle: LifestyleState;
  ownership: OwnershipState;

  status: "active" | "gameover" | "specialist";
}
