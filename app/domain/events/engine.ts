import type { GameState, ResolvedResourceDelta } from "../state/types";
import type { SeededRng } from "../rng/seededRng";
import { advanceResidencyWeek, type WeekAdvanceResult } from "../residency/advanceResidencyWeek";
import { buildRequirementContext } from "./requirements";
import { getVisibleChoices } from "./choices";
import { resolveText } from "./variants";
import {
  applyBehaviorTags,
  applyFlags,
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
}

// Composes on top of Phase 4's advanceResidencyWeek WITHOUT modifying it —
// that function's own tests and behavior stay exactly as they were.
// Order (per the Phase 5 spec): baseline tick + calendar/seniority
// (Phase 4, untouched) -> due pending effects -> due scheduled/checkpoint
// events -> pool events -> queued into weeklyEventQueue. Event CHOICE
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

  const { state: afterEffects } = applyDuePendingEffects(weekAdvance.state, currentWeek);
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
    poolConfig
  );

  const eventCooldowns = poolEvents.reduce(
    (acc, event) => recordTrigger(acc, event.id, currentWeek),
    afterScheduled.eventCooldowns
  );

  const queuedEventIds = [...resolvedEvents.map((e) => e.id), ...poolEvents.map((e) => e.id)];

  const finalState: GameState = {
    ...afterScheduled,
    eventCooldowns,
    weeklyEventQueue: queuedEventIds,
  };

  return {
    weekAdvance,
    state: finalState,
    queuedEventIds,
    trace: { scheduled: scheduledTrace, pool: poolTrace },
  };
}

export interface ResolveEventChoiceResult {
  state: GameState;
  visibleEffects: ResolvedResourceDelta;
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
  if (!state.weeklyEventQueue.includes(event.id)) {
    // Defense in depth against double-resolution (§21): even if this got
    // called twice for the same event — a UI bug, a race on a fast
    // double-tap — the second call has nothing to act on, rather than
    // silently re-applying effects.
    throw new Error(`Event "${event.id}" is not in the current weeklyEventQueue — already resolved or never queued`);
  }

  const ctx = buildRequirementContext(state);
  const choice = findVisibleChoice(event, choiceId, ctx);
  const currentWeek = state.career.residencyWeek;

  const immediateDelta = resolveEffectMap(choice.immediateEffects, rng);
  const resources = applyResourceDelta(state.resources, immediateDelta);
  const relationships = applyRelationshipEffects(state.relationships, choice.relationshipEffects);
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

  const weeklyEventQueue = state.weeklyEventQueue.filter((id) => id !== event.id);

  return {
    state: {
      ...state,
      resources,
      relationships,
      flags,
      statistics,
      behaviorStats,
      pendingEffects: [...state.pendingEffects, ...newPendingEffects],
      pendingEvents: newPendingEvents,
      eventHistory,
      weeklyEventQueue,
    },
    visibleEffects: immediateDelta,
  };
}

export { isOnCooldown };
