import type { GameState, NpcTransition, QueuedEventInstance, ResolvedResourceDelta } from "../state/types";
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
import { computeMonthlyEconomy } from "../economy/monthlyEconomy";
import { buildRequirementContext } from "./requirements";
import { getVisibleChoices } from "./choices";
import { resolveText } from "./variants";
import {
  applyBehaviorTags,
  applyFlags,
  applyNpcTransitionEffects,
  applyRelationshipEffects,
  applyResourceDelta,
  applyStatistics,
  resolveEffectMap,
} from "./effects";
import { isOnCooldown, recordTrigger } from "./cooldown";
import { selectPoolEvents, type PoolSelectionTrace } from "./selection";
import { applyDuePendingEffects, resolveDuePendingEvents, type ScheduledResolutionTrace } from "./scheduled";
import type { EventRepository } from "./repository";
import type { ChoiceDefinition, EventDefinition } from "./types";
import { DEFAULT_POOL_SELECTION_CONFIG, type PoolSelectionConfig } from "../config/eventSelection";

export interface WeekEventsTrace {
  scheduled: ScheduledResolutionTrace[];
  pool: PoolSelectionTrace;
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
        onCallProfile: branch.onCallProfile,
        seniorityStage: workingState.career.seniorityStage,
        activeResidents,
        targetResidents,
        staffingPressure: program.hiddenProfile.staffingPressure,
        previousActiveResidents: workingState.onCall.schedule?.clinicSummary.activeResidents,
        rng: onCallRng,
      });
      workingState = { ...workingState, onCall: { schedule } };
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
      });
      workingState = {
        ...workingState,
        resources: applyResourceDelta(workingState.resources, { money: breakdown.net }),
        economy: { lastProcessedMonthKey: monthKey, lastBreakdown: breakdown },
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

  const eventCooldowns = poolEvents.reduce(
    (acc, event) => recordTrigger(acc, event.id, currentWeek),
    afterScheduled.eventCooldowns
  );

  // NPC-selector binding happens exactly once, right here, before the
  // instance ever enters weeklyEventQueue — a refresh only ever re-reads
  // the persisted QueuedEventInstance, it never re-runs this (§16).
  const weeklyEventQueue: QueuedEventInstance[] = [
    ...resolvedEvents.map((event) => bindQueuedInstance(event, currentWeek, afterScheduled.npcs, afterScheduled.relationships, eventsRng)),
    ...poolEvents.map((event) => bindQueuedInstance(event, currentWeek, afterScheduled.npcs, afterScheduled.relationships, eventsRng)),
  ];

  const finalState: GameState = {
    ...afterScheduled,
    eventCooldowns,
    weeklyEventQueue,
  };

  return {
    weekAdvance,
    state: finalState,
    queuedEventIds: weeklyEventQueue.map((q) => q.eventId),
    trace: { scheduled: scheduledTrace, pool: poolTrace },
    npcTransitions,
  };
}

export interface ResolveEventChoiceResult {
  state: GameState;
  visibleEffects: ResolvedResourceDelta;
  npcTransitions: NpcTransition[];
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
  const { npcs, transitions: npcTransitions } = applyNpcTransitionEffects(state.npcs, choice.npcTransitions, boundNpcIds, currentWeek);
  const onCallSchedule = applyOnCallEffects(state.onCall.schedule, choice.onCallEffects, rng, boundNpcIds);
  const flags = applyFlags(state.flags, choice.flags);
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

  return {
    state: {
      ...state,
      resources,
      relationships,
      npcs,
      onCall: { schedule: onCallSchedule },
      flags,
      statistics,
      behaviorStats,
      pendingEffects: [...state.pendingEffects, ...newPendingEffects],
      pendingEvents: newPendingEvents,
      eventHistory,
      weeklyEventQueue,
    },
    visibleEffects: immediateDelta,
    npcTransitions,
  };
}

export { isOnCooldown };
