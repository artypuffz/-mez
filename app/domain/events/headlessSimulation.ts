import { advanceResidencyWeekWithEvents, resolveEventChoice } from "./engine";
import { getEventRepository } from "./content";
import { buildRequirementContext } from "./requirements";
import { getVisibleChoices } from "./choices";
import { createInitialGameState } from "../state/createInitialGameState";
import { beginTus } from "../state/transitions";
import { selectResidencyProgram, proceedToPreference } from "../state/tusTransitions";
import { getResidencyProgram } from "../config/residencyPrograms";
import { createScopedRng, type SeededRng } from "../rng/seededRng";
import type { ChoiceDefinition, EventDefinition } from "./types";
import type { GameState } from "../state/types";

export type ChoiceStrategy = "first" | "random" | "resource_preserving";

export interface HeadlessSimulationConfig {
  seedCount: number;
  weeksPerSeed: number;
  programIds: string[];
  // §42 — deterministic-but-varied choice selection, not an AI agent.
  // "first" (default) keeps Phase 5/6's original behavior (and this
  // module's own sanity-gate test) unchanged.
  choiceStrategy?: ChoiceStrategy;
}

export interface ChainCompletionStats {
  started: number;
  completed: number;
}

export interface SimulationReport {
  totalWeeksSimulated: number;
  totalEventsTriggered: number;
  quietWeeks: number;
  categoryDistribution: Record<string, number>;
  eventFrequency: Record<string, number>;
  neverTriggeredPoolEventIds: string[];
  cooldownViolations: string[];
  crashes: string[];
  // Phase 8 §41 additions below.
  runCount: number;
  avgEventsPerRun: number;
  branchDistribution: Record<string, number>;
  rareEventFraction: number;
  top20MostFrequent: [string, number][];
  neverTriggeredEligibleEventIds: string[];
  avgRepeatPerTriggeredEvent: number;
  maxRepeatCount: number;
  maxRepeatEventId: string | null;
  chainCompletion: Record<string, ChainCompletionStats>;
  behaviorTagTotals: Record<string, number>;
  // §43
  economyImpact: {
    fractionRunsEverNegative: number;
    avgEndOfResidencyBalance: number;
    avgEventSourcedSpending: number;
  };
  // §44
  resourceImpact: {
    avgFinalStress: number;
    avgFinalFatigue: number;
    avgFinalBurnout: number;
    fractionRunsHitSaturation: number;
  };
}

const SIM_BACKGROUNDS = ["aile_yaninda", "baska_sehirden", "ekonomik_rahat", "kendi_basina"] as const;

function buildResidencyState(seed: string, programId: string, seedIndex: number): GameState {
  // Cycling through all 4 backgrounds (not always "kendi_basina") is what
  // actually let content review find that background-gated events
  // (§18 — soc_003/004/006 etc.) were unreachable in the sim FOR THE
  // WRONG REASON: not a content bug, a fixed-background simulation blind
  // spot. Varying it here is what makes "never triggered" mean something.
  const background = SIM_BACKGROUNDS[seedIndex % SIM_BACKGROUNDS.length];
  const initial = createInitialGameState(
    { name: "Sim", age: 26, gender: "belirtmek_istemiyorum", hometown: "Ankara", background },
    { seed }
  );
  const program = getResidencyProgram(programId);
  return selectResidencyProgram(proceedToPreference(beginTus(initial)), program);
}

function rngs(seed: string, week: number) {
  return {
    weekRng: createScopedRng(seed, `residency:week:${week}`),
    eventsRng: createScopedRng(seed, `events:week:${week}`),
  };
}

function resourceCost(choice: ChoiceDefinition): number {
  const effects = choice.immediateEffects;
  if (!effects) return 0;
  const mid = (v: number | { min: number; max: number } | undefined) => {
    if (v === undefined) return 0;
    return typeof v === "number" ? v : (v.min + v.max) / 2;
  };
  // Higher = worse. money is inverted (losing money is a cost too, but
  // weighted lightly relative to stress/fatigue/burnout, matching how
  // this heuristic is meant to approximate "protect yourself first").
  return mid(effects.stress) + mid(effects.fatigue) + mid(effects.burnout) * 1.5 - mid(effects.money) / 2000;
}

function pickChoice(strategy: ChoiceStrategy, visible: ChoiceDefinition[], rng: SeededRng): ChoiceDefinition {
  if (strategy === "random") return rng.pick(visible);
  if (strategy === "resource_preserving") {
    return [...visible].sort((a, b) => resourceCost(a) - resourceCost(b) || a.id.localeCompare(b.id))[0];
  }
  return visible[0];
}

function stageNumber(checkpoint: string): number {
  const m = checkpoint.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

// Not final balancing (§35/§41) — a sanity pass to catch unreachable
// content, cooldown bugs, a choiceless/crashing event, chain dead-ends,
// or an obviously broken economy/resource curve as the content pool
// grows. Every queued event is resolved per `choiceStrategy` (§42).
export function runHeadlessSimulation(config: HeadlessSimulationConfig): SimulationReport {
  const repo = getEventRepository();
  const allPoolIds = new Set(repo.getPoolEvents().map((e) => e.id));
  const allEligibleIds = new Set(repo.getAllEvents().map((e) => e.id));
  const strategy = config.choiceStrategy ?? "first";

  // Precompute each chain's terminal (highest-numbered) checkpoint, once.
  const chainTerminalStage: Record<string, number> = {};
  for (const e of repo.getAllEvents()) {
    if (e.triggerMode === "scheduled" && e.chainId && e.chainCheckpoint) {
      const n = stageNumber(e.chainCheckpoint);
      chainTerminalStage[e.chainId] = Math.max(chainTerminalStage[e.chainId] ?? 0, n);
    }
  }

  const eventFrequency: Record<string, number> = {};
  const categoryDistribution: Record<string, number> = {};
  const branchDistribution: Record<string, number> = {};
  const cooldownViolations: string[] = [];
  const crashes: string[] = [];
  const chainCompletion: Record<string, ChainCompletionStats> = {};
  const behaviorTagTotals: Record<string, number> = {};

  let totalEventsTriggered = 0;
  let quietWeeks = 0;
  let totalWeeksSimulated = 0;
  let rareTriggered = 0;
  let runCount = 0;

  let negativeBalanceRuns = 0;
  let endBalanceSum = 0;
  let eventSourcedSpendingSum = 0;

  let finalStressSum = 0;
  let finalFatigueSum = 0;
  let finalBurnoutSum = 0;
  let saturationRuns = 0;

  for (let i = 0; i < config.seedCount; i++) {
    const seed = `headless-${i}`;
    const programId = config.programIds[i % config.programIds.length];
    const lastTriggeredWeek: Record<string, number> = {};
    const chainProgress: Record<string, number> = {};
    let everNegative = false;
    let hitSaturation = false;
    let eventSourcedSpending = 0;
    runCount++;

    try {
      let state = buildResidencyState(seed, programId, i);
      branchDistribution[state.career.branch ?? "?"] = (branchDistribution[state.career.branch ?? "?"] ?? 0) + 1;

      for (let week = 1; week <= config.weeksPerSeed; week++) {
        if (state.career.phase !== "residency") break;
        totalWeeksSimulated++;

        const { weekRng, eventsRng } = rngs(seed, week);
        const result = advanceResidencyWeekWithEvents(state, weekRng, eventsRng, repo);
        state = result.state;

        if (state.resources.money < 0) everNegative = true;
        if (state.resources.stress >= 100 || state.resources.fatigue >= 100 || state.resources.burnout >= 100) hitSaturation = true;

        if (result.queuedEventIds.length === 0) quietWeeks++;
        totalEventsTriggered += result.queuedEventIds.length;

        for (const id of result.queuedEventIds) {
          eventFrequency[id] = (eventFrequency[id] ?? 0) + 1;
          const event = repo.getEventById(id);
          if (event) {
            categoryDistribution[event.category] = (categoryDistribution[event.category] ?? 0) + 1;
            if (event.category === "RARE") rareTriggered++;
          }

          if (event?.triggerMode === "pool" && event.cooldownWeeks) {
            const last = lastTriggeredWeek[id];
            if (last !== undefined && week - last < event.cooldownWeeks) {
              cooldownViolations.push(`${id} retriggered at week ${week} (last ${last}, cooldownWeeks ${event.cooldownWeeks})`);
            }
            lastTriggeredWeek[id] = week;
          }
        }

        const resolveRng = createScopedRng(seed, `resolve-strategy:week:${week}`);
        for (const instance of [...state.weeklyEventQueue]) {
          const id = instance.eventId;
          const event = repo.getEventById(id);
          if (!event) {
            crashes.push(`seed=${seed} week=${week}: queued event "${id}" not found in repository`);
            continue;
          }
          const visible = getVisibleChoices(event, buildRequirementContext(state, instance.boundNpcIds));
          if (visible.length === 0) {
            crashes.push(`seed=${seed} week=${week}: event "${id}" had zero visible choices at resolution time`);
            continue;
          }
          const choice = pickChoice(strategy, visible, resolveRng);
          const resolved = resolveEventChoice(state, event, choice.id, createScopedRng(seed, `resolve:${id}:${week}`));
          state = resolved.state;
          if (resolved.visibleEffects.money) eventSourcedSpending += resolved.visibleEffects.money;

          if (event.chainId && event.chainCheckpoint) {
            const n = stageNumber(event.chainCheckpoint);
            chainProgress[event.chainId] = Math.max(chainProgress[event.chainId] ?? 0, n);
          }
        }
      }

      for (const [chainId, progress] of Object.entries(chainProgress)) {
        const stats = (chainCompletion[chainId] ??= { started: 0, completed: 0 });
        stats.started++;
        if (progress >= (chainTerminalStage[chainId] ?? Infinity)) stats.completed++;
      }
      for (const [tag, count] of Object.entries(state!.behaviorStats)) {
        behaviorTagTotals[tag] = (behaviorTagTotals[tag] ?? 0) + count;
      }

      if (everNegative) negativeBalanceRuns++;
      if (hitSaturation) saturationRuns++;
      endBalanceSum += state!.resources.money;
      finalStressSum += state!.resources.stress;
      finalFatigueSum += state!.resources.fatigue;
      finalBurnoutSum += state!.resources.burnout;
      eventSourcedSpendingSum += eventSourcedSpending;
    } catch (err) {
      crashes.push(`seed=${seed} programId=${programId}: ${(err as Error).message}`);
    }
  }

  const neverTriggeredPoolEventIds = [...allPoolIds].filter((id) => !(id in eventFrequency)).sort();
  const neverTriggeredEligibleEventIds = [...allEligibleIds].filter((id) => !(id in eventFrequency)).sort();

  const frequencyEntries = Object.entries(eventFrequency).sort((a, b) => b[1] - a[1]);
  const maxRepeatEntry = frequencyEntries[0] ?? null;
  const totalDistinctTriggered = frequencyEntries.length;

  return {
    totalWeeksSimulated,
    totalEventsTriggered,
    quietWeeks,
    categoryDistribution,
    eventFrequency,
    neverTriggeredPoolEventIds,
    cooldownViolations,
    crashes,
    runCount,
    avgEventsPerRun: runCount > 0 ? totalEventsTriggered / runCount : 0,
    branchDistribution,
    rareEventFraction: totalEventsTriggered > 0 ? rareTriggered / totalEventsTriggered : 0,
    top20MostFrequent: frequencyEntries.slice(0, 20),
    neverTriggeredEligibleEventIds,
    avgRepeatPerTriggeredEvent: totalDistinctTriggered > 0 ? totalEventsTriggered / totalDistinctTriggered : 0,
    maxRepeatCount: maxRepeatEntry?.[1] ?? 0,
    maxRepeatEventId: maxRepeatEntry?.[0] ?? null,
    chainCompletion,
    behaviorTagTotals,
    economyImpact: {
      fractionRunsEverNegative: runCount > 0 ? negativeBalanceRuns / runCount : 0,
      avgEndOfResidencyBalance: runCount > 0 ? endBalanceSum / runCount : 0,
      avgEventSourcedSpending: runCount > 0 ? eventSourcedSpendingSum / runCount : 0,
    },
    resourceImpact: {
      avgFinalStress: runCount > 0 ? finalStressSum / runCount : 0,
      avgFinalFatigue: runCount > 0 ? finalFatigueSum / runCount : 0,
      avgFinalBurnout: runCount > 0 ? finalBurnoutSum / runCount : 0,
      fractionRunsHitSaturation: runCount > 0 ? saturationRuns / runCount : 0,
    },
  };
}
