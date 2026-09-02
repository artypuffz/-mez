import { RELATIONSHIP_HISTORY_CAP, type GameState, type NpcTransition, type QueuedEventInstance, type ResolvedResourceDelta } from "../state/types";
import type { SeededRng } from "../rng/seededRng";
import { createScopedRng } from "../rng/seededRng";
import { advanceResidencyWeek, type WeekAdvanceResult } from "../residency/advanceResidencyWeek";
import { getResidencyCalendar } from "../residency/calendar";
import { getResidencyProgram } from "../config/residencyPrograms";
import { getBranchDefinition } from "../config/branches";
import { getCityDefinition } from "../config/cities";
import { DEFAULT_CLINIC_COMPOSITION } from "../config/clinicComposition";
import { tickNpcLifecycle } from "../npc/lifecycle";
import { tickRelationshipDecay } from "../npc/relationshipDecay";
import { resolveNpcSelectors } from "../npc/selector";
import { generateOnCallSchedule } from "../oncall/generateSchedule";
import { computeOnCallPressureModifier } from "../oncall/pressure";
import { applyOnCallEffects } from "../oncall/applyEffects";
import { applyOvertimeHours, computeWeeklyWorkload, workingHoursPressureBand } from "../residency/workingHours";
import { resolveEffectiveOnCallProfile } from "../oncall/effectiveProfile";
import { computeMonthlyEconomy } from "../economy/monthlyEconomy";
import { generateWeeklySchedule } from "../residency/schedule";
import { startNewWeekFreeTime } from "../residency/freeTime";
import { applyWeeklyHealth, applyWeeklySocial } from "../residency/wellbeing";
import { computeLifestyleHealthModifier } from "../config/lifestyleConfig";
import { buildRequirementContext } from "./requirements";
import { getVisibleChoices } from "./choices";
import { resolveText } from "./variants";
import {
  applyBehaviorTags,
  applyCareerEffects,
  applyFlags,
  applyNpcTransitionEffects,
  applyRelationshipEffects,
  applyResourceDelta,
  applySpecialistExamAttempt,
  applyStatistics,
  recordRelationshipHistory,
  resolveEffectMap,
} from "./effects";
import { isOnCooldown, recordTrigger } from "./cooldown";
import { selectPoolEvents, type PoolSelectionTrace } from "./selection";
import { applyDuePendingEffects, resolveDuePendingEvents, type ScheduledResolutionTrace } from "./scheduled";
import { selectCrisisEvent, type CrisisSelectionTrace } from "../crisis/selection";
import { deriveRelationshipFeedback, type RelationshipFeedbackEntry } from "../npc/relationshipFeedback";
import type { EventRepository } from "./repository";
import type { ChoiceDefinition, EventDefinition } from "./types";
import { DEFAULT_POOL_SELECTION_CONFIG, type PoolSelectionConfig } from "../config/eventSelection";

export interface WeekEventsTrace {
  scheduled: ScheduledResolutionTrace[];
  pool: PoolSelectionTrace;
  crisis: CrisisSelectionTrace;
}

export interface WeeklyEventResolution {
  weekAdvance: WeekAdvanceResult;
  state: GameState;
  queuedEventIds: string[];
  trace: WeekEventsTrace;
  // Generic monthly lifecycle transitions from this tick (empty on a week
  // that isn't a month boundary) — a trigger/context the event engine can
  // query later (Phase 8), not consumed by any event content this phase
  // (§12). The Barış Hattı's own authored transition is separate — see
  // resolveEventChoice's npcTransitions below.
  npcTransitions: NpcTransition[];
}

function bindQueuedInstance(
  event: EventDefinition,
  currentWeek: number,
  npcs: GameState["npcs"],
  relationships: GameState["relationships"],
  rng: SeededRng
): QueuedEventInstance {
  const boundNpcIds = resolveNpcSelectors(event.npcSelectors, npcs, relationships, rng);
  return { instanceId: `${currentWeek}:${event.id}`, eventId: event.id, boundNpcIds };
}

// Composes on top of Phase 4's advanceResidencyWeek WITHOUT modifying it —
// that function's own tests and behavior stay exactly as they were.
// Order (per the Phase 5 spec, extended in Phase 6): baseline tick +
// calendar/seniority (Phase 4, untouched) -> monthly NPC lifecycle +
// relationship decay (only on a monthChanged transition, §11/§20) -> due
// pending effects -> due scheduled/checkpoint events -> pool events ->
// NPC-selector binding -> queued into weeklyEventQueue. Event CHOICE
// effects are never applied here — only resolveEventChoice (below) does
// that, once the player actually picks something.
export function advanceResidencyWeekWithEvents(
  state: GameState,
  weekRng: SeededRng,
  eventsRng: SeededRng,
  repository: EventRepository,
  poolConfig: PoolSelectionConfig = DEFAULT_POOL_SELECTION_CONFIG
): WeeklyEventResolution {
  const weekAdvance = advanceResidencyWeek(state, weekRng);
  const currentWeek = weekAdvance.state.career.residencyWeek;

  let workingState = weekAdvance.state;
  let npcTransitions: NpcTransition[] = [];

  if (weekAdvance.transitions.monthChanged) {
    const programId = workingState.tus.selectedProgramId;
    if (!programId) {
      throw new Error("Residency state is missing selectedProgramId during a monthChanged NPC lifecycle tick");
    }
    const program = getResidencyProgram(programId);

    // 1. NPC lifecycle/replenishment first (your ordering) — so a
    // departure this same month already shows up in the staffing load
    // the on-call schedule below is generated from.
    const lifecycleRng = createScopedRng(state.meta.rngSeed, `npc:lifecycle:${currentWeek}`);
    const lifecycle = tickNpcLifecycle(workingState.npcs, workingState.relationships, program, currentWeek, lifecycleRng, {
      ensureJuniorForSeniorPlayer: workingState.career.seniorityStage === "kidemli",
      gameSeed: state.meta.rngSeed,
    });
    npcTransitions = lifecycle.transitions;
    workingState = {
      ...workingState,
      npcs: lifecycle.npcs,
      relationships: tickRelationshipDecay(lifecycle.relationships),
    };

    // 2/3. Staffing load off the just-updated roster, then the new
    // month's on-call schedule — guarded by monthKey so a re-entrant call
    // (there isn't one today, but §7/§9 ask for the guard regardless)
    // never rerolls an already-generated month.
    const calendarPoint = getResidencyCalendar(workingState.career.residencyStartedAt!, currentWeek);
    const monthKey = `${calendarPoint.year}-${String(calendarPoint.month).padStart(2, "0")}`;

    if (workingState.onCall.schedule?.monthKey !== monthKey) {
      const branch = getBranchDefinition(workingState.career.branch!);
      const activeResidents =
        Object.values(workingState.npcs).filter(
          (n) => n.active && (n.role === "senior_resident" || n.role === "peer_resident" || n.role === "junior_resident")
        ).length + 1; // +1 for the player, who is also a resident carrying shifts
      const targetResidents =
        DEFAULT_CLINIC_COMPOSITION.senior_resident.max +
        DEFAULT_CLINIC_COMPOSITION.peer_resident.max +
        DEFAULT_CLINIC_COMPOSITION.junior_resident.max;

      const onCallRng = createScopedRng(state.meta.rngSeed, `oncall:${monthKey}`);
      const schedule = generateOnCallSchedule({
        monthKey,
        generatedAtWeek: currentWeek,
        onCallProfile: resolveEffectiveOnCallProfile(branch, program),
        seniorityStage: workingState.career.seniorityStage,
        activeResidents,
        targetResidents,
        staffingPressure: program.hiddenProfile.staffingPressure,
        previousActiveResidents: workingState.onCall.schedule?.clinicSummary.activeResidents,
        rng: onCallRng,
      });
      // Phase 10 §8 — the only place a lifetime on-call total is ever
      // accumulated (the schedule itself only ever holds ONE month at a
      // time, per Phase 7's player-centric model). Same generic
      // statistics mechanism every other counter in the game already
      // uses, not a bespoke field — the Career Report reads it back the
      // same way it reads crisis:total or career_opportunities_taken.
      workingState = {
        ...workingState,
        onCall: { schedule },
        statistics: applyStatistics(workingState.statistics, {
          increment: {
            oncall_lifetime_shifts: schedule.player.totalShifts,
            oncall_lifetime_weekend_shifts: schedule.player.weekendShifts,
            oncall_lifetime_extra_shifts: schedule.player.extraShifts,
          },
        }),
      };
    }

    // 5. Monthly economy, idempotent via lastProcessedMonthKey — applied
    // once the schedule for this month exists, since on-call pay depends
    // on it.
    if (workingState.economy.lastProcessedMonthKey !== monthKey) {
      const city = getCityDefinition(program.cityId);
      const breakdown = computeMonthlyEconomy({
        monthKey,
        seniorityStage: workingState.career.seniorityStage,
        onCallSchedule: workingState.onCall.schedule,
        city,
        background: workingState.character.background,
        foodTier: workingState.lifestyle.foodTier,
        housingTier: workingState.ownership.housing,
      });
      const nextMoney = workingState.resources.money + breakdown.net;
      workingState = {
        ...workingState,
        resources: applyResourceDelta(workingState.resources, { money: breakdown.net }),
        economy: { lastProcessedMonthKey: monthKey, lastBreakdown: breakdown },
        // §20 — tracked off the ACTUAL post-breakdown balance, once per
        // month (money only moves monthly, same cadence as this block),
        // never off a mid-month event-driven money change.
        financialPressure: {
          consecutiveNegativeMonths: nextMoney < 0 ? workingState.financialPressure.consecutiveNegativeMonths + 1 : 0,
          lowestBalance: Math.min(workingState.financialPressure.lowestBalance, nextMoney),
        },
      };
    }
  }

  // §11 — every week (not just the month boundary), a small extra
  // fatigue/stress nudge from the CURRENT month's on-call schedule, on
  // top of Phase 4's already-computed baseline tick.
  workingState = {
    ...workingState,
    resources: applyResourceDelta(workingState.resources, computeOnCallPressureModifier(workingState.onCall.schedule)),
  };

  // Phase 11 §15-18 — the new working-hours system's own weekly tick,
  // same cadence as the on-call nudge above but a SEPARATE pressure
  // source (reads only branch/program workingHours axis + this week's
  // overtime, never the on-call schedule — see workingHoursPressureBand's
  // doc comment for why that avoids double-counting on-call). Runs for
  // every residency week (the phase check at the top of this function
  // already guarantees career.branch/selectedProgramId are set).
  {
    const workloadBranch = getBranchDefinition(workingState.career.branch!);
    const workloadProgram = getResidencyProgram(workingState.tus.selectedProgramId!);
    const workloadRng = createScopedRng(state.meta.rngSeed, `workload:${currentWeek}`);
    const nextWorkload = computeWeeklyWorkload(workloadBranch, workloadProgram, workingState.workload, workloadRng);
    const pressure = workingHoursPressureBand(nextWorkload.currentWeekHours);
    workingState = {
      ...workingState,
      workload: nextWorkload,
      resources: applyResourceDelta(workingState.resources, pressure),
    };

    // Gameplay Expansion Part A §1/§3/§4 — schedule/freeTime/health/social
    // all run in this SAME block, right after workload, since all three
    // read the workload/resourcePressure values just computed above (and,
    // for schedule, the current month's real on-call assignments) rather
    // than inventing their own inputs.
    //
    // Known limitation: a residency week that spans a calendar-month
    // boundary only has access to ONE month's onCall.schedule.assignments
    // (Phase 7's month-at-a-time design) — a nöbet actually scheduled for
    // next month, on a day that still falls inside THIS display week,
    // won't show up as a "nobet" slot yet. Display-only; the underlying
    // on-call resource pressure itself is unaffected.
    const weekStart = getResidencyCalendar(workingState.career.residencyStartedAt!, currentWeek).date;
    const scheduleRng = createScopedRng(state.meta.rngSeed, `schedule:${currentWeek}`);
    const schedule = generateWeeklySchedule(
      workloadBranch,
      nextWorkload,
      workingState.onCall.schedule?.assignments ?? [],
      weekStart,
      currentWeek,
      scheduleRng
    );
    const freeTime = startNewWeekFreeTime(nextWorkload);
    const lifestyleHealthModifier = computeLifestyleHealthModifier(workingState.lifestyle.foodTier, workingState.ownership.housing);
    const nextHealth = applyWeeklyHealth(workingState.resources.health, {
      resourcePressure: workingState.resourcePressure,
      burnout: workingState.resources.burnout,
      workload: nextWorkload,
      lifestyleHealthModifier,
    });
    const nextSocial = applyWeeklySocial(workingState.resources.social, {
      workload: nextWorkload,
      freeTimeHoursThisWeek: freeTime.totalHours,
    });
    workingState = {
      ...workingState,
      schedule,
      freeTime,
      resources: { ...workingState.resources, health: nextHealth, social: nextSocial },
    };
  }

  // §1/§3 — collapses the one-tick "residency_complete" transitional
  // value (still what Phase 4's advanceResidencyWeek itself sets) into
  // the real "specialist_exam" phase, seeding its opening chain event the
  // same week — reuses the exact pendingEvents/scheduled machinery every
  // other chain uses, no new mechanism.
  if (weekAdvance.transitions.residencyCompleted) {
    workingState = {
      ...workingState,
      career: { ...workingState.career, phase: "specialist_exam" },
      pendingEvents: [
        ...workingState.pendingEvents,
        { chainId: "specialist_exam", checkpoint: "stage1", triggerWeek: currentWeek, sourceEventId: "residency_completed", sourceChoiceId: "auto" },
      ],
    };
  }

  const { state: afterEffects } = applyDuePendingEffects(workingState, currentWeek);
  const { state: afterScheduled, resolvedEvents, traces: scheduledTrace } = resolveDuePendingEvents(
    afterEffects,
    currentWeek,
    repository
  );

  // Scheduled/chain events are never dropped for a full queue (§18) — the
  // weekly cap only limits how many ADDITIONAL pool events fill in beside
  // them; an overdue chain event can push the week's total past the cap.
  const poolBudget = Math.max(0, poolConfig.maxEventsPerWeek - resolvedEvents.length);
  const ctx = buildRequirementContext(afterScheduled);
  const { selectedEvents: poolEvents, trace: poolTrace } = selectPoolEvents(
    repository,
    ctx,
    currentWeek,
    afterScheduled.eventCooldowns,
    poolBudget,
    eventsRng,
    poolConfig,
    afterScheduled.eventHistory
  );

  // §11 — crisis selection is a THIRD, separate resolver: it never draws
  // from poolEvents's weighted budget, and picks at most one event. Uses
  // the SAME ctx/cooldowns/eventHistory pool events used, so a crisis
  // event's own `once`/`cooldownWeeks` are respected identically to any
  // other content — the global cross-type cooldown (§30) is the only part
  // that's crisis-specific.
  const { event: crisisEvent, trace: crisisTrace } = selectCrisisEvent(
    repository,
    ctx,
    currentWeek,
    afterScheduled.crisisState.lastCrisisWeek,
    afterScheduled.eventCooldowns,
    afterScheduled.eventHistory,
    eventsRng
  );

  const eventCooldowns = [...poolEvents, ...(crisisEvent ? [crisisEvent] : [])].reduce(
    (acc, event) => recordTrigger(acc, event.id, currentWeek),
    afterScheduled.eventCooldowns
  );

  // NPC-selector binding happens exactly once, right here, before the
  // instance ever enters weeklyEventQueue — a refresh only ever re-reads
  // the persisted QueuedEventInstance, it never re-runs this (§16).
  const weeklyEventQueue: QueuedEventInstance[] = [
    ...resolvedEvents.map((event) => bindQueuedInstance(event, currentWeek, afterScheduled.npcs, afterScheduled.relationships, eventsRng)),
    ...poolEvents.map((event) => bindQueuedInstance(event, currentWeek, afterScheduled.npcs, afterScheduled.relationships, eventsRng)),
    ...(crisisEvent ? [bindQueuedInstance(crisisEvent, currentWeek, afterScheduled.npcs, afterScheduled.relationships, eventsRng)] : []),
  ];

  const finalState: GameState = {
    ...afterScheduled,
    eventCooldowns,
    weeklyEventQueue,
    crisisState: crisisEvent ? { lastCrisisWeek: currentWeek } : afterScheduled.crisisState,
  };

  return {
    weekAdvance,
    state: finalState,
    queuedEventIds: weeklyEventQueue.map((q) => q.eventId),
    trace: { scheduled: scheduledTrace, pool: poolTrace, crisis: crisisTrace },
    npcTransitions,
  };
}

export interface SpecialistExamWeekResult {
  state: GameState;
  queuedEventIds: string[];
}

// Phase 10 §1 — the specialist_exam phase's OWN week-advance path,
// deliberately NOT advanceResidencyWeekWithEvents: no baseline resource
// tick, no on-call, no economy, no NPC lifecycle, no pool/crisis
// selection — residency is over, none of that applies anymore. Only due
// pendingEffects/pendingEvents resolve, via the exact same generic
// machinery every chain already uses. The week counter itself keeps
// incrementing (residencyWeek "N+1" reads fine as "week N+1 of the
// character's life", not a residency week specifically).
export function advanceSpecialistExamWeek(state: GameState, repository: EventRepository): SpecialistExamWeekResult {
  if (state.career.phase !== "specialist_exam") {
    throw new Error(`advanceSpecialistExamWeek called outside the specialist_exam phase (phase=${state.career.phase})`);
  }
  const currentWeek = state.career.residencyWeek + 1;
  const advanced: GameState = { ...state, career: { ...state.career, residencyWeek: currentWeek } };

  const { state: afterEffects } = applyDuePendingEffects(advanced, currentWeek);
  const { state: afterScheduled, resolvedEvents } = resolveDuePendingEvents(afterEffects, currentWeek, repository);

  const weeklyEventQueue: QueuedEventInstance[] = resolvedEvents.map((event) =>
    bindQueuedInstance(event, currentWeek, afterScheduled.npcs, afterScheduled.relationships, createScopedRng(state.meta.rngSeed, `specialist-exam:bind:${currentWeek}`))
  );

  const finalState: GameState = { ...afterScheduled, weeklyEventQueue };
  return { state: finalState, queuedEventIds: weeklyEventQueue.map((q) => q.eventId) };
}

export interface ResolveEventChoiceResult {
  state: GameState;
  visibleEffects: ResolvedResourceDelta;
  npcTransitions: NpcTransition[];
  // Gameplay Expansion Part B §6 — ephemeral, like visibleEffects; never
  // persisted (the store just clears it on the next action, same pattern
  // as lastChoiceEffects).
  relationshipFeedback: RelationshipFeedbackEntry[];
}

function findVisibleChoice(event: EventDefinition, choiceId: string, ctx: ReturnType<typeof buildRequirementContext>): ChoiceDefinition {
  const choice = getVisibleChoices(event, ctx).find((c) => c.id === choiceId);
  if (!choice) {
    throw new Error(`Choice "${choiceId}" on event "${event.id}" is not visible/valid for the current state`);
  }
  return choice;
}

// The only place a choice's effects are ever applied — called exactly
// once per (event, choice) the player actually picks. Removes the event
// from weeklyEventQueue and logs it to eventHistory so it can never be
// resolved twice (the store's persistence guard relies on this).
export function resolveEventChoice(
  state: GameState,
  event: EventDefinition,
  choiceId: string,
  rng: SeededRng
): ResolveEventChoiceResult {
  const queuedInstance = state.weeklyEventQueue.find((q) => q.eventId === event.id);
  if (!queuedInstance) {
    // Defense in depth against double-resolution (§21): even if this got
    // called twice for the same event — a UI bug, a race on a fast
    // double-tap — the second call has nothing to act on, rather than
    // silently re-applying effects.
    throw new Error(`Event "${event.id}" is not in the current weeklyEventQueue — already resolved or never queued`);
  }
  const boundNpcIds = queuedInstance.boundNpcIds;

  const ctx = buildRequirementContext(state, boundNpcIds);
  const choice = findVisibleChoice(event, choiceId, ctx);
  const currentWeek = state.career.residencyWeek;

  const immediateDelta = resolveEffectMap(choice.immediateEffects, rng);
  const resources = applyResourceDelta(state.resources, immediateDelta);
  const relationships = applyRelationshipEffects(state.relationships, choice.relationshipEffects, boundNpcIds);
  const relationshipHistory = recordRelationshipHistory(
    state.relationshipHistory,
    choice.relationshipEffects,
    boundNpcIds,
    currentWeek,
    choice.interactionSummary,
    RELATIONSHIP_HISTORY_CAP
  );
  const { npcs, transitions: npcTransitions } = applyNpcTransitionEffects(state.npcs, choice.npcTransitions, boundNpcIds, currentWeek);
  const onCallSchedule = applyOnCallEffects(state.onCall.schedule, choice.onCallEffects, rng, boundNpcIds);
  const workload = (choice.workloadEffects ?? []).reduce(
    (acc, effect) => (effect.type === "add_overtime_hours" ? applyOvertimeHours(acc, effect.hours) : acc),
    state.workload
  );

  // §4 — deterministic given state + this exact seed scope, independent
  // of whatever scope the caller passed `rng` under, so a refresh can
  // never reroll an already-resolved attempt.
  const examAttemptScope = `specialist-exam:attempt:${(state.specialistExam?.attempt ?? 0) + 1}`;
  const examAttemptRng = createScopedRng(state.meta.rngSeed, examAttemptScope);
  const examAttempt = applySpecialistExamAttempt(choice.specialistExamEffects, state, examAttemptRng);

  const flags = examAttempt
    ? applyFlags(applyFlags(state.flags, { set: { specialist_exam_result: examAttempt.resultFlag } }), choice.flags)
    : applyFlags(state.flags, choice.flags);
  const statistics = applyStatistics(state.statistics, choice.statistics);
  const behaviorStats = applyBehaviorTags(state.behaviorStats, choice.behaviorTags);

  const newPendingEffects = (choice.delayedEffects ?? []).map((entry) => ({
    dueWeek: currentWeek + entry.delayWeeks,
    sourceEventId: event.id,
    sourceChoiceId: choice.id,
    effects: resolveEffectMap(entry.effects, rng),
  }));

  const newPendingEvents = choice.followUpEvent
    ? [
        ...state.pendingEvents,
        {
          chainId: choice.followUpEvent.chainId,
          checkpoint: choice.followUpEvent.checkpoint,
          triggerWeek: currentWeek + choice.followUpEvent.delayWeeks,
          sourceEventId: event.id,
          sourceChoiceId: choice.id,
        },
      ]
    : state.pendingEvents;

  // Uses the same ctx the player's screen resolved the title from (built
  // before this choice's own effects apply) — history records what was
  // actually shown, not the base title.
  const resolvedTitle = resolveText(event.title, event.titleVariants, ctx);
  const eventHistory = [
    ...state.eventHistory,
    {
      week: currentWeek,
      eventId: event.id,
      choiceId: choice.id,
      resolvedTitle,
      category: event.category,
      chainId: event.chainId,
      checkpoint: event.chainCheckpoint,
    },
  ];

  const weeklyEventQueue = state.weeklyEventQueue.filter((q) => q.eventId !== event.id);

  // §25/§51, extended §6 — always last: every other effect on this choice
  // already landed above. Never derived from a resource threshold, only
  // from an explicit authored careerEffects entry on the choice picked.
  const careerResult = applyCareerEffects(choice.careerEffects, currentWeek, event.id, choice.id);
  const gameOver = careerResult.gameOver ?? state.gameOver;
  const becameSpecialist = careerResult.becameSpecialist && state.career.phase !== "specialist";
  const nextPhase = gameOver && !state.gameOver
    ? "gameover"
    : becameSpecialist
      ? "specialist"
      : state.career.phase;

  return {
    state: {
      ...state,
      resources,
      relationships,
      relationshipHistory,
      npcs,
      onCall: { schedule: onCallSchedule },
      workload,
      flags,
      statistics,
      behaviorStats,
      pendingEffects: [...state.pendingEffects, ...newPendingEffects],
      pendingEvents: newPendingEvents,
      eventHistory,
      weeklyEventQueue,
      gameOver,
      specialistExam: examAttempt?.specialistExam ?? state.specialistExam,
      status: becameSpecialist ? "specialist" : state.status,
      career: nextPhase !== state.career.phase ? { ...state.career, phase: nextPhase } : state.career,
    },
    visibleEffects: immediateDelta,
    npcTransitions,
    relationshipFeedback: deriveRelationshipFeedback(choice.relationshipEffects, boundNpcIds, npcs),
  };
}

export { isOnCooldown };
