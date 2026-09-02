// npm run simulate:part-a (add to package.json if desired) — or:
// npx tsx scripts/simulatePartA.ts
//
// Gameplay Expansion Part A §7 — headless validation for the burnout fix,
// Health/Social progression, weekly schedule/free-time, and the economy
// rebalance. Deliberately a separate script from simulatePhase11Branches.ts
// (which validates the branch/hospital-culture axes) and headlessSimulation.ts
// (which validates event-content balance) — this one is specifically about
// the five NEW Part A systems, reusing the exact same real engine transition
// functions and the same 3-strategy pickChoice/resourceCost/relationshipTerm
// heuristics already validated in Phase 9/10.
import { advanceResidencyWeekWithEvents, advanceSpecialistExamWeek, resolveEventChoice } from "../domain/events/engine";
import { getEventRepository } from "../domain/events/content";
import { getVisibleChoices } from "../domain/events/choices";
import { buildRequirementContext } from "../domain/events/requirements";
import { createInitialGameState } from "../domain/state/createInitialGameState";
import { beginTus } from "../domain/state/transitions";
import { selectResidencyProgram, proceedToPreference } from "../domain/state/tusTransitions";
import { BRANCH_DEFINITIONS } from "../domain/config/branches";
import { RESIDENCY_PROGRAMS, type ResidencyProgram } from "../domain/config/residencyPrograms";
import { createScopedRng, type SeededRng } from "../domain/rng/seededRng";
import type { GameState } from "../domain/state/types";
import type { ChoiceDefinition } from "../domain/events/types";

type Strategy = "random" | "resource_preserving" | "self_preserving_aggressive";
const STRATEGIES: Strategy[] = ["random", "resource_preserving", "self_preserving_aggressive"];
const SEEDS_PER_BRANCH = 8; // 26 branches * 8 * 3 strategies = 624 total runs
const WEEKS_PER_SEED = 260; // full 5-year horizon

function representativeProgramFor(branchId: string): ResidencyProgram {
  const candidates = RESIDENCY_PROGRAMS.filter((p) => p.branchId === branchId);
  const fictional = candidates.find((p) => p.sourceType !== "real");
  return fictional ?? candidates.sort((a, b) => a.id.localeCompare(b.id))[0];
}

function buildResidencyState(seed: string, program: ResidencyProgram): GameState {
  const initial = createInitialGameState(
    { name: "Sim", age: 26, gender: "belirtmek_istemiyorum", hometown: "Ankara", background: "kendi_basina" },
    { seed }
  );
  return selectResidencyProgram(proceedToPreference(beginTus(initial)), program);
}

// Same heuristics as domain/events/headlessSimulation.ts, duplicated here
// (not imported) so this script stays a standalone, removable validation
// tool exactly like simulatePhase11Branches.ts already is.
function mid(v: number | { min: number; max: number } | undefined): number {
  if (v === undefined) return 0;
  return typeof v === "number" ? v : (v.min + v.max) / 2;
}
function relationshipTerm(choice: ChoiceDefinition): number {
  if (!choice.relationshipEffects || choice.relationshipEffects.length === 0) return 0;
  let total = 0;
  for (const effect of choice.relationshipEffects) total += (effect.trust ?? 0) + (effect.friendship ?? 0) - (effect.grudge ?? 0);
  return total;
}
function resourceCost(choice: ChoiceDefinition, moneyWeight: number, avoidCareerEnd: boolean): number {
  const effects = choice.immediateEffects;
  const base = effects ? mid(effects.stress) + mid(effects.fatigue) + mid(effects.burnout) * 1.5 - mid(effects.money) / moneyWeight : 0;
  const careerEndPenalty = avoidCareerEnd && choice.careerEffects?.some((e) => e.type === "end_career") ? 100000 : 0;
  return base - relationshipTerm(choice) * 0.3 + careerEndPenalty;
}
function pickChoice(strategy: Strategy, visible: ChoiceDefinition[], rng: SeededRng): ChoiceDefinition {
  if (strategy === "random") return rng.pick(visible);
  if (strategy === "resource_preserving") {
    return [...visible].sort((a, b) => resourceCost(a, 2000, false) - resourceCost(b, 2000, false) || a.id.localeCompare(b.id))[0];
  }
  return [...visible].sort((a, b) => resourceCost(a, 500, true) - resourceCost(b, 500, true) || a.id.localeCompare(b.id))[0];
}

interface Accumulator {
  runs: number;
  finalHealthSum: number;
  finalSocialSum: number;
  finalStressSum: number;
  finalFatigueSum: number;
  finalBurnoutSum: number;
  healthZeroRuns: number;
  healthHundredRuns: number;
  socialZeroRuns: number;
  socialHundredRuns: number;
  freeTimeSamples: number;
  freeTimeSum: number;
  freeTimeUsedSum: number;
  weeklyHoursSamples: number;
  weeklyHoursSum: number;
  scheduleBosDaysSum: number;
  scheduleWeeksSampled: number;
  gameOverRuns: number;
  monthsSampled: number;
  incomeSum: number;
  expenseSum: number;
  netSum: number;
  spendingActivitySum: number; // statistics["spending:total"] at end of run
  endBalanceSum: number;
  negativeBalanceRuns: number;
  specialistRuns: number;
}

function newAcc(): Accumulator {
  return {
    runs: 0,
    finalHealthSum: 0,
    finalSocialSum: 0,
    finalStressSum: 0,
    finalFatigueSum: 0,
    finalBurnoutSum: 0,
    healthZeroRuns: 0,
    healthHundredRuns: 0,
    socialZeroRuns: 0,
    socialHundredRuns: 0,
    freeTimeSamples: 0,
    freeTimeSum: 0,
    freeTimeUsedSum: 0,
    weeklyHoursSamples: 0,
    weeklyHoursSum: 0,
    scheduleBosDaysSum: 0,
    scheduleWeeksSampled: 0,
    gameOverRuns: 0,
    monthsSampled: 0,
    incomeSum: 0,
    expenseSum: 0,
    netSum: 0,
    spendingActivitySum: 0,
    endBalanceSum: 0,
    negativeBalanceRuns: 0,
    specialistRuns: 0,
  };
}

function main() {
  const repo = getEventRepository();
  const crashes: string[] = [];
  const perStrategy: Record<Strategy, Accumulator> = {
    random: newAcc(),
    resource_preserving: newAcc(),
    self_preserving_aggressive: newAcc(),
  };
  // §46-style branch-tier breakdown: low/medium/high on-call load.
  const sortedByOnCall = [...BRANCH_DEFINITIONS].sort((a, b) => a.difficultyBaseline.onCallLoad - b.difficultyBaseline.onCallLoad);
  const tierOf = (branchId: string): "low" | "medium" | "high" => {
    const idx = sortedByOnCall.findIndex((b) => b.id === branchId);
    const third = Math.floor(sortedByOnCall.length / 3);
    if (idx < third) return "low";
    if (idx < third * 2) return "medium";
    return "high";
  };
  const perTier: Record<Strategy, Record<"low" | "medium" | "high", Accumulator>> = {
    random: { low: newAcc(), medium: newAcc(), high: newAcc() },
    resource_preserving: { low: newAcc(), medium: newAcc(), high: newAcc() },
    self_preserving_aggressive: { low: newAcc(), medium: newAcc(), high: newAcc() },
  };
  let burnoutStreakLeakSampled = false;
  let burnoutReachedNonzero = false;
  let burnoutSampleTrace: number[] = [];

  for (const branch of BRANCH_DEFINITIONS) {
    const program = representativeProgramFor(branch.id);
    const tier = tierOf(branch.id);

    for (const strategy of STRATEGIES) {
      const acc = perStrategy[strategy];
      const tierAcc = perTier[strategy][tier];

      for (let i = 0; i < SEEDS_PER_BRANCH; i++) {
        const seed = `parta-${strategy}-${branch.id}-${i}`;
        try {
          let state = buildResidencyState(seed, program);
          let lastSeenMonthKey: string | null = null;
          let everNegative = false;

          for (let week = 1; week <= WEEKS_PER_SEED; week++) {
            if (state.career.phase !== "residency") break;
            const weekRng = createScopedRng(seed, `residency:week:${week}`);
            const eventsRng = createScopedRng(seed, `events:week:${week}`);
            const result = advanceResidencyWeekWithEvents(state, weekRng, eventsRng, repo);
            state = result.state;
            if (state.resources.money < 0) everNegative = true;

            if (state.economy.lastBreakdown && state.economy.lastProcessedMonthKey !== lastSeenMonthKey) {
              lastSeenMonthKey = state.economy.lastProcessedMonthKey;
              acc.monthsSampled++;
              acc.incomeSum += state.economy.lastBreakdown.income.salary + state.economy.lastBreakdown.income.onCallPay + state.economy.lastBreakdown.income.other;
              const e = state.economy.lastBreakdown.expenses;
              acc.expenseSum += e.rent + e.food + e.transport + e.utilities + e.fixedOther;
              acc.netSum += state.economy.lastBreakdown.net;
            }
            if (state.workload) {
              acc.weeklyHoursSum += state.workload.currentWeekHours;
              acc.weeklyHoursSamples++;
            }
            if (state.freeTime) {
              acc.freeTimeSum += state.freeTime.totalHours;
              acc.freeTimeUsedSum += state.freeTime.usedHours;
              acc.freeTimeSamples++;
            }
            if (state.schedule) {
              acc.scheduleWeeksSampled++;
              acc.scheduleBosDaysSum += state.schedule.days.filter((d) => d.slots.some((s) => s.activity === "bos" && s.endHour - s.startHour >= 20)).length;
            }
            if (branch.id === "genel_cerrahi" && strategy === "random" && i === 0 && week <= 52 && week % 4 === 0) {
              burnoutSampleTrace.push(state.resources.burnout);
            }

            const resolveRng = createScopedRng(seed, `resolve-strategy:week:${week}`);
            for (const instance of [...state.weeklyEventQueue]) {
              const event = repo.getEventById(instance.eventId);
              if (!event) continue;
              const visible = getVisibleChoices(event, buildRequirementContext(state, instance.boundNpcIds));
              if (visible.length === 0) continue;
              const choice = pickChoice(strategy, visible, resolveRng);
              const resolved = resolveEventChoice(state, event, choice.id, createScopedRng(seed, `resolve:${instance.eventId}:${week}`));
              state = resolved.state;
            }
          }

          let examSteps = 0;
          while (state.career.phase === "specialist_exam" && examSteps < 40) {
            examSteps++;
            const result = advanceSpecialistExamWeek(state, repo);
            state = result.state;
            const resolveRng = createScopedRng(seed, `resolve-strategy:exam:${examSteps}`);
            for (const instance of [...state.weeklyEventQueue]) {
              const event = repo.getEventById(instance.eventId);
              if (!event) continue;
              const visible = getVisibleChoices(event, buildRequirementContext(state, instance.boundNpcIds));
              if (visible.length === 0) continue;
              const choice = pickChoice(strategy, visible, resolveRng);
              const resolved = resolveEventChoice(state, event, choice.id, createScopedRng(seed, `resolve:exam:${instance.eventId}:${examSteps}`));
              state = resolved.state;
            }
          }

          for (const a of [acc, tierAcc]) {
            a.runs++;
            a.finalHealthSum += state.resources.health;
            a.finalSocialSum += state.resources.social;
            a.finalStressSum += state.resources.stress;
            a.finalFatigueSum += state.resources.fatigue;
            a.finalBurnoutSum += state.resources.burnout;
            if (state.resources.health <= 0) a.healthZeroRuns++;
            if (state.resources.health >= 100) a.healthHundredRuns++;
            if (state.resources.social <= 0) a.socialZeroRuns++;
            if (state.resources.social >= 100) a.socialHundredRuns++;
            if (state.gameOver) a.gameOverRuns++;
            a.spendingActivitySum += state.statistics["spending:total"] ?? 0;
            a.endBalanceSum += state.resources.money;
            if (everNegative) a.negativeBalanceRuns++;
            if (state.career.phase === "specialist") a.specialistRuns++;
          }
          // tierAcc doesn't carry its own month/hours/freeTime/schedule accumulation
          // above (only accumulated onto `acc`) -- mirror it here too.
          tierAcc.monthsSampled = acc.monthsSampled;

          if (state.resources.burnout > 0) burnoutReachedNonzero = true;
          burnoutStreakLeakSampled = true;
        } catch (err) {
          crashes.push(`strategy=${strategy} branch=${branch.id} seed=${seed}: ${(err as Error).message}`);
        }
      }
    }
  }

  console.log(`\n${"=".repeat(100)}`);
  console.log(`Part A headless simulation — ${STRATEGIES.reduce((s, strat) => s + perStrategy[strat].runs, 0)} total runs across ${BRANCH_DEFINITIONS.length} branches x ${STRATEGIES.length} strategies, ${WEEKS_PER_SEED} weeks each\n`);
  console.log(`Crashes: ${crashes.length}`);
  for (const c of crashes.slice(0, 20)) console.log(`  CRASH: ${c}`);

  console.log(`\nBurnout sanity: reached above 0 at least once across all runs -> ${burnoutReachedNonzero ? "PASS" : "FAIL"}`);
  console.log(`Genel Cerrahi / random / seed 0 burnout trace (every 4 weeks, first year): ${burnoutSampleTrace.join(", ")}`);

  console.log(`\n${"Strategy".padEnd(28)}${"Runs".padEnd(7)}${"Health".padEnd(9)}${"Social".padEnd(9)}${"Stress".padEnd(9)}${"Fatigue".padEnd(9)}${"Burnout".padEnd(9)}${"H=0%".padEnd(7)}${"H=100%".padEnd(8)}${"S=0%".padEnd(7)}${"S=100%".padEnd(8)}${"GameOver%".padEnd(11)}${"Specialist%"}`);
  for (const strategy of STRATEGIES) {
    const a = perStrategy[strategy];
    console.log(
      strategy.padEnd(28) +
        String(a.runs).padEnd(7) +
        (a.finalHealthSum / a.runs).toFixed(1).padEnd(9) +
        (a.finalSocialSum / a.runs).toFixed(1).padEnd(9) +
        (a.finalStressSum / a.runs).toFixed(1).padEnd(9) +
        (a.finalFatigueSum / a.runs).toFixed(1).padEnd(9) +
        (a.finalBurnoutSum / a.runs).toFixed(1).padEnd(9) +
        ((a.healthZeroRuns / a.runs) * 100).toFixed(1).padEnd(7) +
        ((a.healthHundredRuns / a.runs) * 100).toFixed(1).padEnd(8) +
        ((a.socialZeroRuns / a.runs) * 100).toFixed(1).padEnd(7) +
        ((a.socialHundredRuns / a.runs) * 100).toFixed(1).padEnd(8) +
        ((a.gameOverRuns / a.runs) * 100).toFixed(1).padEnd(11) +
        ((a.specialistRuns / a.runs) * 100).toFixed(1)
    );
  }

  console.log(`\nSchedule / Free Time / Economy (per strategy):`);
  for (const strategy of STRATEGIES) {
    const a = perStrategy[strategy];
    const avgHours = a.weeklyHoursSum / a.weeklyHoursSamples;
    const avgFreeTime = a.freeTimeSum / a.freeTimeSamples;
    const avgFreeTimeUsed = a.freeTimeUsedSum / a.freeTimeSamples;
    const avgBosDays = a.scheduleBosDaysSum / a.scheduleWeeksSampled;
    const avgIncome = a.incomeSum / a.monthsSampled;
    const avgExpense = a.expenseSum / a.monthsSampled;
    const avgNet = a.netSum / a.monthsSampled;
    console.log(`  ${strategy}:`);
    console.log(`    avg weekly work hours=${avgHours.toFixed(1)}  avg freeTime.totalHours=${avgFreeTime.toFixed(1)}  avg freeTime used=${avgFreeTimeUsed.toFixed(1)} (${((avgFreeTimeUsed / avgFreeTime) * 100).toFixed(0)}%)  avg full-rest("bos") days/week=${avgBosDays.toFixed(2)}`);
    console.log(`    avg monthly income=${avgIncome.toFixed(0)}  avg monthly expense=${avgExpense.toFixed(0)}  avg monthly net=${avgNet.toFixed(0)}`);
    console.log(`    avg end-of-run balance=${(a.endBalanceSum / a.runs).toFixed(0)}  fraction runs ever negative=${((a.negativeBalanceRuns / a.runs) * 100).toFixed(1)}%  avg spending activities resolved (count)=${(a.spendingActivitySum / a.runs).toFixed(1)}`);
  }

  console.log(`\nOn-call-load tier breakdown (random strategy):`);
  for (const t of ["low", "medium", "high"] as const) {
    const a = perTier.random[t];
    console.log(
      `  ${t.padEnd(8)} runs=${a.runs}  avgHealth=${(a.finalHealthSum / a.runs).toFixed(1)}  avgSocial=${(a.finalSocialSum / a.runs).toFixed(1)}  avgBurnout=${(a.finalBurnoutSum / a.runs).toFixed(1)}  gameOver%=${((a.gameOverRuns / a.runs) * 100).toFixed(1)}  avgEndBalance=${(a.endBalanceSum / a.runs).toFixed(0)}`
    );
  }

  console.log(`\nSanity checks:`);
  console.log(`1. Burnout is capable of reaching a positive streak-driven value (not permanently stuck at a fixed low ceiling): ${burnoutReachedNonzero ? "PASS" : "FAIL"}`);
  const rpBurnout = perStrategy.resource_preserving.finalBurnoutSum / perStrategy.resource_preserving.runs;
  const randBurnout = perStrategy.random.finalBurnoutSum / perStrategy.random.runs;
  console.log(`2. resource_preserving strategy ends with lower avg burnout than random (${rpBurnout.toFixed(1)} < ${randBurnout.toFixed(1)}): ${rpBurnout < randBurnout ? "PASS" : "FAIL"}`);
  const highTierBurnout = perTier.random.high.finalBurnoutSum / perTier.random.high.runs;
  const lowTierBurnout = perTier.random.low.finalBurnoutSum / perTier.random.low.runs;
  console.log(`3. High on-call-load branches end with higher avg burnout than low on-call-load branches (${highTierBurnout.toFixed(1)} > ${lowTierBurnout.toFixed(1)}): ${highTierBurnout > lowTierBurnout ? "PASS" : "FAIL"}`);
  console.log(`\nDone.`);
}

main();
