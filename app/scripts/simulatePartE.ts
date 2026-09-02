// npx tsx scripts/simulatePartE.ts
//
// Gameplay Expansion Part E §61/§62 — Part A's headless sim (and its own
// scripts/simulatePartA.ts extension) never exercised the Harcamalar
// spending system, since it's a menu action, not an event choice. This
// re-runs the balance simulation with THREE strategies:
//   1. random            — event choices random, no spending (Part A baseline)
//   2. resource_preserving — event choices resource-minimizing, no spending (Part A baseline)
//   3. active_recovery    — event choices resource-minimizing AND actively
//                           uses Harcamalar (rest/social activities when
//                           eligible + affordable, lifestyle/housing
//                           upgraded once money allows) every week
// to measure whether player agency over spending actually changes
// Health/Social/burnout outcomes, per §61. Reuses the exact real engine
// transition functions and the real spending domain (resolveSpendingActivity,
// purchaseOwnershipUpgrade, setLifestyleFoodTier) — never a shortcut
// formula standing in for them.
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
import { checkSpendingActivityEligibility, resolveSpendingActivity } from "../domain/spending/resolveSpendingActivity";
import { SPENDING_ACTIVITIES } from "../domain/config/spendingActivities";
import { purchaseOwnershipUpgrade } from "../domain/spending/purchaseOwnership";
import { setLifestyleFoodTier } from "../domain/spending/setLifestyle";
import type { GameState } from "../domain/state/types";
import type { ChoiceDefinition } from "../domain/events/types";

type Strategy = "random" | "resource_preserving" | "active_recovery";
const STRATEGIES: Strategy[] = ["random", "resource_preserving", "active_recovery"];
const SEEDS_PER_BRANCH = 6; // 26 branches * 6 * 3 strategies = 468 runs
const WEEKS_PER_SEED = 260;

// Same money threshold used for both tiers — comfortably above the
// on-call-derived income floor observed in the Part A economy report, so
// this never reads as "spend recklessly into debt", just "spend once
// there's real slack".
const COMFORTABLE_BALANCE_THRESHOLD = 20000;

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
function resourceCost(choice: ChoiceDefinition, moneyWeight: number): number {
  const effects = choice.immediateEffects;
  const base = effects ? mid(effects.stress) + mid(effects.fatigue) + mid(effects.burnout) * 1.5 - mid(effects.money) / moneyWeight : 0;
  return base - relationshipTerm(choice) * 0.3;
}
function pickChoice(strategy: Strategy, visible: ChoiceDefinition[], rng: SeededRng): ChoiceDefinition {
  if (strategy === "random") return rng.pick(visible);
  // resource_preserving and active_recovery share the same event-choice
  // heuristic — active_recovery's difference is entirely in USING
  // Harcamalar, not in a different event policy (§61 asks to isolate the
  // spending system's own effect, not conflate it with a different choice heuristic).
  return [...visible].sort((a, b) => resourceCost(a, 2000) - resourceCost(b, 2000) || a.id.localeCompare(b.id))[0];
}

// The "active recovery" playstyle itself — real domain calls, no shortcut
// formula. Runs once per week, after that week's events have resolved.
function applyActiveRecovery(state: GameState, currentWeek: number): GameState {
  let next = state;

  // Prioritize rest when fatigued, social when isolated, else whichever's
  // cheapest — never spends into a negative balance, and eligibility
  // (cooldowns, money, free time) is always rechecked via the real
  // resolver before each attempt.
  const priority = [...SPENDING_ACTIVITIES].sort((a, b) => {
    const scoreA = a.category === "rest" && next.resources.fatigue > 50 ? -2 : a.category === "social" && next.resources.social < 40 ? -1 : 0;
    const scoreB = b.category === "rest" && next.resources.fatigue > 50 ? -2 : b.category === "social" && next.resources.social < 40 ? -1 : 0;
    return scoreA - scoreB || a.cost.money - b.cost.money;
  });

  for (const activity of priority) {
    const eligibility = checkSpendingActivityEligibility(next, activity.id, currentWeek);
    if (!eligibility.ok) continue;
    const result = resolveSpendingActivity(next, activity.id, currentWeek);
    if (result.ok) next = result.state;
  }

  // Lifestyle: once there's real slack, eat better; never downgrades food
  // below "normal" (this is a RECOVERY playstyle, not an austerity one).
  if (next.resources.money > COMFORTABLE_BALANCE_THRESHOLD && next.lifestyle.foodTier !== "good") {
    next = setLifestyleFoodTier(next, "good");
  }

  // Housing: a one-time upgrade once comfortably affordable.
  if (next.resources.money > COMFORTABLE_BALANCE_THRESHOLD && next.ownership.housing !== "good") {
    const result = purchaseOwnershipUpgrade(next, "housing", "good");
    if (result.ok) next = result.state;
  }

  return next;
}

interface Accumulator {
  runs: number;
  finalHealthSum: number;
  finalSocialSum: number;
  finalStressSum: number;
  finalFatigueSum: number;
  finalBurnoutSum: number;
  healthZeroRuns: number;
  socialZeroRuns: number;
  gameOverRuns: number;
  endBalanceSum: number;
  negativeBalanceRuns: number;
  specialistRuns: number;
}
function newAcc(): Accumulator {
  return {
    runs: 0, finalHealthSum: 0, finalSocialSum: 0, finalStressSum: 0, finalFatigueSum: 0, finalBurnoutSum: 0,
    healthZeroRuns: 0, socialZeroRuns: 0, gameOverRuns: 0, endBalanceSum: 0, negativeBalanceRuns: 0, specialistRuns: 0,
  };
}

function main() {
  const repo = getEventRepository();
  const crashes: string[] = [];
  const perStrategy: Record<Strategy, Accumulator> = { random: newAcc(), resource_preserving: newAcc(), active_recovery: newAcc() };

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
    active_recovery: { low: newAcc(), medium: newAcc(), high: newAcc() },
  };

  for (const branch of BRANCH_DEFINITIONS) {
    const program = representativeProgramFor(branch.id);
    const tier = tierOf(branch.id);

    for (const strategy of STRATEGIES) {
      const acc = perStrategy[strategy];
      const tierAcc = perTier[strategy][tier];

      for (let i = 0; i < SEEDS_PER_BRANCH; i++) {
        const seed = `parte-${strategy}-${branch.id}-${i}`;
        try {
          let state = buildResidencyState(seed, program);
          let everNegative = false;

          for (let week = 1; week <= WEEKS_PER_SEED; week++) {
            if (state.career.phase !== "residency") break;
            const weekRng = createScopedRng(seed, `residency:week:${week}`);
            const eventsRng = createScopedRng(seed, `events:week:${week}`);
            const result = advanceResidencyWeekWithEvents(state, weekRng, eventsRng, repo);
            state = result.state;
            if (state.resources.money < 0) everNegative = true;

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

            if (strategy === "active_recovery") {
              state = applyActiveRecovery(state, week);
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
            if (state.resources.social <= 0) a.socialZeroRuns++;
            if (state.gameOver) a.gameOverRuns++;
            a.endBalanceSum += state.resources.money;
            if (everNegative) a.negativeBalanceRuns++;
            if (state.career.phase === "specialist") a.specialistRuns++;
          }
        } catch (err) {
          crashes.push(`strategy=${strategy} branch=${branch.id} seed=${seed}: ${(err as Error).message}`);
        }
      }
    }
  }

  console.log(`\n${"=".repeat(100)}`);
  console.log(`Part E rebalance simulation — ${STRATEGIES.reduce((s, strat) => s + perStrategy[strat].runs, 0)} total runs across ${BRANCH_DEFINITIONS.length} branches x ${STRATEGIES.length} strategies, ${WEEKS_PER_SEED} weeks each\n`);
  console.log(`Crashes: ${crashes.length}`);
  for (const c of crashes.slice(0, 20)) console.log(`  CRASH: ${c}`);

  console.log(`\n${"Strategy".padEnd(22)}${"Runs".padEnd(7)}${"Health".padEnd(9)}${"Social".padEnd(9)}${"Stress".padEnd(9)}${"Fatigue".padEnd(9)}${"Burnout".padEnd(9)}${"H=0%".padEnd(7)}${"S=0%".padEnd(7)}${"GameOver%".padEnd(11)}${"Specialist%".padEnd(12)}${"AvgBalance".padEnd(12)}Neg%`);
  for (const strategy of STRATEGIES) {
    const a = perStrategy[strategy];
    console.log(
      strategy.padEnd(22) +
        String(a.runs).padEnd(7) +
        (a.finalHealthSum / a.runs).toFixed(1).padEnd(9) +
        (a.finalSocialSum / a.runs).toFixed(1).padEnd(9) +
        (a.finalStressSum / a.runs).toFixed(1).padEnd(9) +
        (a.finalFatigueSum / a.runs).toFixed(1).padEnd(9) +
        (a.finalBurnoutSum / a.runs).toFixed(1).padEnd(9) +
        ((a.healthZeroRuns / a.runs) * 100).toFixed(1).padEnd(7) +
        ((a.socialZeroRuns / a.runs) * 100).toFixed(1).padEnd(7) +
        ((a.gameOverRuns / a.runs) * 100).toFixed(1).padEnd(11) +
        ((a.specialistRuns / a.runs) * 100).toFixed(1).padEnd(12) +
        (a.endBalanceSum / a.runs).toFixed(0).padEnd(12) +
        ((a.negativeBalanceRuns / a.runs) * 100).toFixed(1)
    );
  }

  console.log(`\nOn-call-load tier breakdown (Health / Social, random vs active_recovery):`);
  for (const t of ["low", "medium", "high"] as const) {
    const r = perTier.random[t];
    const ar = perTier.active_recovery[t];
    console.log(
      `  ${t.padEnd(8)} random: Health=${(r.finalHealthSum / r.runs).toFixed(1)} Social=${(r.finalSocialSum / r.runs).toFixed(1)}` +
        `   active_recovery: Health=${(ar.finalHealthSum / ar.runs).toFixed(1)} Social=${(ar.finalSocialSum / ar.runs).toFixed(1)}` +
        `   (n=${r.runs}/${ar.runs})`
    );
  }

  console.log(`\nSanity checks (§61/§62):`);
  const rpHealth = perStrategy.resource_preserving.finalHealthSum / perStrategy.resource_preserving.runs;
  const arHealth = perStrategy.active_recovery.finalHealthSum / perStrategy.active_recovery.runs;
  const arSocial = perStrategy.active_recovery.finalSocialSum / perStrategy.active_recovery.runs;
  const rpSocial = perStrategy.resource_preserving.finalSocialSum / perStrategy.resource_preserving.runs;
  console.log(`1. active_recovery ends with higher avg Health than resource_preserving alone (${arHealth.toFixed(1)} > ${rpHealth.toFixed(1)}): ${arHealth > rpHealth ? "PASS" : "FAIL"}`);
  console.log(`2. active_recovery ends with higher avg Social than resource_preserving alone (${arSocial.toFixed(1)} > ${rpSocial.toFixed(1)}): ${arSocial > rpSocial ? "PASS" : "FAIL"}`);
  const highTierHealthAR = perTier.active_recovery.high.finalHealthSum / perTier.active_recovery.high.runs;
  const universallyZero = highTierHealthAR < 2;
  console.log(`3. Even under active recovery, high-on-call-tier Health is NOT near-universally 0 (avg=${highTierHealthAR.toFixed(1)}): ${universallyZero ? "FAIL — would need conservative tuning per §62" : "PASS — no tuning needed"}`);

  console.log(`\nDone.`);
}

main();
