import type { GameState, ResolvedResourceDelta } from "../state/types";
import { applyResourceDelta } from "./effects";
import { buildRequirementContext, countLeaves, evaluateRequirements, type RequirementContext } from "./requirements";
import type { EventRepository } from "./repository";
import type { EventDefinition } from "./types";

export interface CheckpointResolution {
  event: EventDefinition;
  usedFallback: boolean;
}

function pickBestMatch(matching: EventDefinition[]): EventDefinition {
  return [...matching].sort((a, b) => {
    const priorityDiff = (b.priority ?? 0) - (a.priority ?? 0);
    if (priorityDiff !== 0) return priorityDiff;
    const specificityDiff = countLeaves(b.requirements) - countLeaves(a.requirements);
    if (specificityDiff !== 0) return specificityDiff;
    return a.id.localeCompare(b.id); // final deterministic tiebreak
  })[0];
}

// docs/event-schema.md §4.2 + Phase 5 §16, with one addition this engine
// needed to make deterministic: when a normal (non-fallback) candidate's
// requirements pass, it is ALWAYS preferred over the fallback even if the
// fallback's own requirements also happen to pass — the fallback only
// competes when nothing normal matched. This is what makes chain
// resolution genuinely dynamic (§17): a "gerilim"-flagged run can still
// land on the "dostluk" candidate at a later checkpoint if the player's
// interim actions pushed relationship.trust past that candidate's own
// threshold, because the normal-candidate race is decided purely by the
// CURRENT state, never by which flag was set at the chain's origin.
//
// Steps:
//  1. Split candidates into normal / fallback (>1 fallback is a content
//     bug — thrown here as a last-resort guard; validation.ts should
//     already have caught it before this ever runs).
//  2. Evaluate normal candidates' requirements against the current state.
//  3. Any match -> highest priority wins; tie -> most specific (more leaf
//     conditions) wins; tie -> lowest event id wins (deterministic).
//  4. No normal match -> the fallback is used unconditionally (its own
//     requirements, if any, are not re-checked — that's what makes it a
//     true last resort instead of just another normal candidate).
//  5. No match and no fallback -> null; the caller treats this as a
//     content bug (a checkpoint validation should have flagged), not a
//     crash.
export function resolveCheckpointCandidate(
  candidates: EventDefinition[],
  ctx: RequirementContext
): CheckpointResolution | null {
  const fallbacks = candidates.filter((c) => c.isFallback);
  if (fallbacks.length > 1) {
    const key = `${candidates[0]?.chainId}::${candidates[0]?.chainCheckpoint}`;
    throw new Error(
      `Checkpoint ${key} has ${fallbacks.length} fallback candidates (${fallbacks.map((f) => f.id).join(", ")}) — must have at most one`
    );
  }

  const normal = candidates.filter((c) => !c.isFallback);
  const matching = normal.filter((c) => evaluateRequirements(c.requirements, ctx));
  if (matching.length > 0) {
    return { event: pickBestMatch(matching), usedFallback: false };
  }

  if (fallbacks.length === 1) {
    return { event: fallbacks[0], usedFallback: true };
  }

  return null;
}

export interface ScheduledResolutionTrace {
  chainId: string;
  checkpoint: string;
  triggerWeek: number;
  candidateIds: string[];
  resolvedEventId?: string;
  usedFallback: boolean;
  noCandidateMatched: boolean;
}

export interface ResolveDuePendingEventsResult {
  state: GameState;
  resolvedEvents: EventDefinition[];
  traces: ScheduledResolutionTrace[];
}

// Resolving a checkpoint only decides WHICH event becomes active this
// week — it never applies that event's effects (those apply only once
// the player picks a choice), so a single RequirementContext snapshot for
// every pending event due this same week is correct: nothing resolved
// earlier in this pass can have changed relationship/flag state yet.
export function resolveDuePendingEvents(
  state: GameState,
  currentWeek: number,
  repository: EventRepository
): ResolveDuePendingEventsResult {
  const due = state.pendingEvents.filter((p) => p.triggerWeek <= currentWeek);
  const notDue = state.pendingEvents.filter((p) => p.triggerWeek > currentWeek);
  const ctx = buildRequirementContext(state);

  const resolvedEvents: EventDefinition[] = [];
  const traces: ScheduledResolutionTrace[] = [];
  const activeChains = { ...state.activeChains };

  for (const pending of due) {
    const candidates = repository.getCheckpointCandidates(pending.chainId, pending.checkpoint);
    const result = resolveCheckpointCandidate(candidates, ctx);

    traces.push({
      chainId: pending.chainId,
      checkpoint: pending.checkpoint,
      triggerWeek: pending.triggerWeek,
      candidateIds: candidates.map((c) => c.id),
      resolvedEventId: result?.event.id,
      usedFallback: result?.usedFallback ?? false,
      noCandidateMatched: result === null,
    });

    if (result) {
      resolvedEvents.push(result.event);
      activeChains[pending.chainId] = {
        chainId: pending.chainId,
        currentCheckpoint: pending.checkpoint,
        startedWeek: activeChains[pending.chainId]?.startedWeek ?? currentWeek,
      };
    }
    // result === null means no candidate AND no fallback exist for this
    // checkpoint — a content bug validation should catch before this ever
    // ships. Dropped rather than crashing the week; surfaced via the trace.
  }

  return {
    state: { ...state, pendingEvents: notDue, activeChains },
    resolvedEvents,
    traces,
  };
}

export interface ApplyDuePendingEffectsResult {
  state: GameState;
  appliedDeltas: ResolvedResourceDelta[];
}

export function applyDuePendingEffects(state: GameState, currentWeek: number): ApplyDuePendingEffectsResult {
  const due = state.pendingEffects.filter((p) => p.dueWeek <= currentWeek);
  const notDue = state.pendingEffects.filter((p) => p.dueWeek > currentWeek);

  let resources = state.resources;
  const appliedDeltas: ResolvedResourceDelta[] = [];
  for (const entry of due) {
    resources = applyResourceDelta(resources, entry.effects);
    appliedDeltas.push(entry.effects);
  }

  return { state: { ...state, resources, pendingEffects: notDue }, appliedDeltas };
}
