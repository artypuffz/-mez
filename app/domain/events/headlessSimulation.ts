import { advanceResidencyWeekWithEvents, advanceSpecialistExamWeek, resolveEventChoice } from "./engine";
import { computeCycleScore, resolveCycleEnding } from "../careerReport/behaviorProfile";
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

export type ChoiceStrategy = "first" | "random" | "resource_preserving" | "self_preserving_aggressive";

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
  // Phase 9 §40 — crisis/game-over matrix.
  gameOver: {
    rate: number;
    reasonCounts: Record<string, number>;
    avgWeek: number;
    branchRate: Record<string, { runs: number; gameOvers: number }>;
  };
  crisis: {
    totalTriggered: number;
    avgPerRun: number;
    recoveredCount: number;
    typeCounts: Record<string, number>;
  };
  // Phase 10 §27/§53 — full-career (through the specialist exam) matrix.
  specialist: {
    rate: number;
    avgCompletionWeek: number;
    branchRate: Record<string, { runs: number; specialists: number }>;
    examRetryRate: number;
    examFirstAttemptPassRate: number;
  };
  behaviorEnding: {
    brokeCycleRate: number;
    mixedRate: number;
    repeatedCycleRate: number;
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

function mid(v: number | { min: number; max: number } | undefined): number {
  if (v === undefined) return 0;
  return typeof v === "number" ? v : (v.min + v.max) / 2;
}

// §42's "resource_preserving" is resource-blind to careerEffects on
// purpose — it's a heuristic about not wanting to feel bad this week, not
// an agent reasoning about employment status, and its own (still
// meaningfully lower than random) game-over rate is part of what the
// Phase 9 headless matrix is validating (§41/§6). "self_preserving_aggressive"
// (§40, optional third strategy) is the one that also actively avoids
// ending the career — a genuinely different policy, not just a stricter
// version of the same one.
//
// Phase 10 §29 finding: without ANY relationship awareness, a purely
// stress/fatigue/burnout-minimizing heuristic systematically prefers
// self-serving choices over protective/supportive ones whenever the
// supportive option costs more THIS week (protecting a junior, taking
// blame — the content's own effects make care cost something) — this
// alone drove resource_preserving to ~85% "repeated_cycle" and
// self_preserving_aggressive to 100%, both degenerate per §29's own
// warning. A small relationship term (an agent that avoids burning
// bridges plausibly also avoids the future stress a bad relationship
// causes) is enough to stop the heuristic from reading as reflexively
// selfish, without turning it into a values-driven agent (§40 forbids
// an "AI agent" strategy) or touching the actual game content.
function relationshipTerm(choice: ChoiceDefinition): number {
  if (!choice.relationshipEffects || choice.relationshipEffects.length === 0) return 0;
  let total = 0;
  for (const effect of choice.relationshipEffects) {
    total += (effect.trust ?? 0) + (effect.friendship ?? 0) - (effect.grudge ?? 0);
  }
  return total;
}

function resourceCost(choice: ChoiceDefinition, moneyWeight: number, avoidCareerEnd: boolean): number {
  const effects = choice.immediateEffects;
  const base = effects
    ? mid(effects.stress) + mid(effects.fatigue) + mid(effects.burnout) * 1.5 - mid(effects.money) / moneyWeight
    : 0;
  const careerEndPenalty = avoidCareerEnd && choice.careerEffects?.some((e) => e.type === "end_career") ? 100000 : 0;
  return base - relationshipTerm(choice) * 0.3 + careerEndPenalty;
}

function pickChoice(strategy: ChoiceStrategy, visible: ChoiceDefinition[], rng: SeededRng): ChoiceDefinition {
  if (strategy === "random") return rng.pick(visible);
  if (strategy === "resource_preserving") {
    return [...visible].sort((a, b) => resourceCost(a, 2000, false) - resourceCost(b, 2000, false) || a.id.localeCompare(b.id))[0];
  }
  if (strategy === "self_preserving_aggressive") {
    // Weighs money 4x more heavily (protecting the paycheck matters, not
    // just the body) and never voluntarily ends the career.
    return [...visible].sort((a, b) => resourceCost(a, 500, true) - resourceCost(b, 500, true) || a.id.localeCompare(b.id))[0];
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

  let gameOverRuns = 0;
  let gameOverWeekSum = 0;
  const gameOverReasonCounts: Record<string, number> = {};
  const branchRate: Record<string, { runs: number; gameOvers: number }> = {};

  let crisisTotalTriggered = 0;
  let crisisRecoveredTotal = 0;
  const crisisTypeCounts: Record<string, number> = {};

  let specialistRuns = 0;
  let specialistWeekSum = 0;
  let examStartedRuns = 0;
  let examRetryRuns = 0;
  let examFirstAttemptPassRuns = 0;
  const specialistBranchRate: Record<string, { runs: number; specialists: number }> = {};

  let brokeCycleRuns = 0;
  let mixedCycleRuns = 0;
  let repeatedCycleRuns = 0;

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
      const branchKey = state.career.branch ?? "?";
      branchDistribution[branchKey] = (branchDistribution[branchKey] ?? 0) + 1;
      const branchStats = (branchRate[branchKey] ??= { runs: 0, gameOvers: 0 });
      branchStats.runs++;
      const specialistBranchStats = (specialistBranchRate[branchKey] ??= { runs: 0, specialists: 0 });
      specialistBranchStats.runs++;

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

      // Phase 10 §1/§27 — continue into the specialist_exam phase with
      // the exact same resolution logic (pickChoice + resolveEventChoice)
      // as the residency loop above, just driven by
      // advanceSpecialistExamWeek instead. Bounded safety window — this
      // chain is short by design (§49), so 40 steps is generous.
      let examSteps = 0;
      while (state.career.phase === "specialist_exam" && examSteps < 40) {
        examSteps++;
        const result = advanceSpecialistExamWeek(state, repo);
        state = result.state;

        const resolveRng = createScopedRng(seed, `resolve-strategy:exam:${examSteps}`);
        for (const instance of [...state.weeklyEventQueue]) {
          const id = instance.eventId;
          const event = repo.getEventById(id);
          if (!event) {
            crashes.push(`seed=${seed} exam-step=${examSteps}: queued event "${id}" not found in repository`);
            continue;
          }
          // Same bookkeeping the residency loop's queued-events block does
          // above — omitted here in the first pass, which made every
          // specialist_exam event after stage1 read as "never triggered"
          // despite specialist runs succeeding at their real rate.
          eventFrequency[id] = (eventFrequency[id] ?? 0) + 1;
          totalEventsTriggered++;
          categoryDistribution[event.category] = (categoryDistribution[event.category] ?? 0) + 1;
          if (event.category === "RARE") rareTriggered++;

          const visible = getVisibleChoices(event, buildRequirementContext(state, instance.boundNpcIds));
          if (visible.length === 0) {
            crashes.push(`seed=${seed} exam-step=${examSteps}: event "${id}" had zero visible choices at resolution time`);
            continue;
          }
          const choice = pickChoice(strategy, visible, resolveRng);
          const resolved = resolveEventChoice(state, event, choice.id, createScopedRng(seed, `resolve:exam:${id}:${examSteps}`));
          state = resolved.state;

          if (event.chainId && event.chainCheckpoint) {
            const n = stageNumber(event.chainCheckpoint);
            chainProgress[event.chainId] = Math.max(chainProgress[event.chainId] ?? 0, n);
          }
        }
      }
      if (state.career.phase === "specialist_exam") {
        crashes.push(`seed=${seed}: specialist_exam never resolved within the safety window`);
      }

      for (const [chainId, progress] of Object.entries(chainProgress)) {
        // specialist_exam has TWO valid terminal checkpoints (stage3 on a
        // first-attempt pass, stage5 only when a retry was needed) —
        // this generic "highest checkpoint number seen = terminal"
        // heuristic (every other chain in the game has exactly one
        // linear terminal) would misreport every first-attempt pass as
        // incomplete. The dedicated specialist/gameOver stats already
        // report this chain's real outcome accurately, so it's excluded
        // here rather than taught a second terminal-checkpoint concept
        // for one chain.
        if (chainId === "specialist_exam") continue;
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

      if (state!.gameOver) {
        gameOverRuns++;
        gameOverWeekSum += state!.gameOver.week;
        gameOverReasonCounts[state!.gameOver.reason] = (gameOverReasonCounts[state!.gameOver.reason] ?? 0) + 1;
        branchStats.gameOvers++;
      }
      crisisTotalTriggered += state!.statistics["crisis:total"] ?? 0;
      crisisRecoveredTotal += state!.statistics["crisis:recovered"] ?? 0;
      for (const type of ["exhaustion", "burnout", "financial", "career"]) {
        crisisTypeCounts[type] = (crisisTypeCounts[type] ?? 0) + (state!.statistics[`crisis:${type}`] ?? 0);
      }

      if (state!.career.phase === "specialist") {
        specialistRuns++;
        specialistWeekSum += state!.career.residencyWeek;
        specialistBranchStats.specialists++;
      }
      const examAttempts = state!.specialistExam?.attempt ?? 0;
      if (examAttempts > 0) {
        examStartedRuns++;
        if (examAttempts >= 2) examRetryRuns++;
        else if (state!.career.phase === "specialist") examFirstAttemptPassRuns++;
      }

      const cycleOutcome = resolveCycleEnding(computeCycleScore(state!.behaviorStats)).outcome;
      if (cycleOutcome === "broke_cycle") brokeCycleRuns++;
      else if (cycleOutcome === "repeated_cycle") repeatedCycleRuns++;
      else mixedCycleRuns++;
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
    gameOver: {
      rate: runCount > 0 ? gameOverRuns / runCount : 0,
      reasonCounts: gameOverReasonCounts,
      avgWeek: gameOverRuns > 0 ? gameOverWeekSum / gameOverRuns : 0,
      branchRate,
    },
    crisis: {
      totalTriggered: crisisTotalTriggered,
      avgPerRun: runCount > 0 ? crisisTotalTriggered / runCount : 0,
      recoveredCount: crisisRecoveredTotal,
      typeCounts: crisisTypeCounts,
    },
    specialist: {
      rate: runCount > 0 ? specialistRuns / runCount : 0,
      avgCompletionWeek: specialistRuns > 0 ? specialistWeekSum / specialistRuns : 0,
      branchRate: specialistBranchRate,
      examRetryRate: examStartedRuns > 0 ? examRetryRuns / examStartedRuns : 0,
      examFirstAttemptPassRate: examStartedRuns > 0 ? examFirstAttemptPassRuns / examStartedRuns : 0,
    },
    behaviorEnding: {
      brokeCycleRate: runCount > 0 ? brokeCycleRuns / runCount : 0,
      mixedRate: runCount > 0 ? mixedCycleRuns / runCount : 0,
      repeatedCycleRate: runCount > 0 ? repeatedCycleRuns / runCount : 0,
    },
  };
}
