// npm run simulate:phase11-branches
// Phase 11 §40/§41/§42 — a per-branch headless simulation across all 26
// branches (>=500 total runs), reporting the metrics the spec asks for
// and running its automated sanity checks. Deliberately a SEPARATE script
// from headlessSimulation.ts/simulateEvents.ts (Phase 8/9/10's existing,
// well-tested content-balance sim) rather than a rewrite of it — this one
// is specifically about validating the NEW Phase 11 systems (working
// hours, on-call-by-branch, hierarchy-event weighting), using the exact
// same real engine transition functions.
import { advanceResidencyWeekWithEvents, advanceSpecialistExamWeek } from "../domain/events/engine";
import { getEventRepository } from "../domain/events/content";
import { getVisibleChoices } from "../domain/events/choices";
import { buildRequirementContext } from "../domain/events/requirements";
import { resolveEventChoice } from "../domain/events/engine";
import { createInitialGameState } from "../domain/state/createInitialGameState";
import { beginTus } from "../domain/state/transitions";
import { selectResidencyProgram, proceedToPreference } from "../domain/state/tusTransitions";
import { BRANCH_DEFINITIONS, getBranchDefinition, getBranchOverallDifficulty } from "../domain/config/branches";
import { RESIDENCY_PROGRAMS, type ResidencyProgram } from "../domain/config/residencyPrograms";
import { createScopedRng } from "../domain/rng/seededRng";
import type { GameState } from "../domain/state/types";
import type { ChoiceDefinition } from "../domain/events/types";

const HIERARCHY_SENSITIVE_CATEGORIES = new Set(["MOBBING", "NPC", "CAREER"]);
const SEEDS_PER_BRANCH = 20; // 26 branches * 20 = 520 total runs, >= 500 (§40)
const WEEKS_PER_SEED = 260; // full 5-year horizon, matches the existing sim's convention

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

// §33/§34/§41 — Phase 10's own validated balance figures (e.g. Genel
// Cerrahi's ~46% game-over) were measured with the RANDOM choice
// strategy, not "first" — "first" always takes whichever choice content
// happens to list first, which the reference check below shows is already
// close to a guaranteed-win heuristic even on the pre-Phase-11 game
// (~92.5% specialist rate on the untouched fictional programs). Random is
// the correct, comparable strategy for a "does difficulty still feel
// different, does choice still matter" check.
function pickChoice(visible: ChoiceDefinition[], rng: ReturnType<typeof createScopedRng>): ChoiceDefinition {
  return rng.pick(visible);
}

interface BranchAccumulator {
  branchId: string;
  branchName: string;
  overallDifficulty: number;
  runs: number;
  totalShiftsMonths: number;
  totalShifts: number;
  totalWeeklyHoursSamples: number;
  totalWeeklyHours: number;
  finalStressSum: number;
  finalFatigueSum: number;
  finalBurnoutSum: number;
  hierarchySensitiveEventCount: number;
  totalEventCount: number;
  crisisTotal: number;
  gameOverRuns: number;
  specialistRuns: number;
  hierarchyPressureSum: number;
}

function newAccumulator(branch: (typeof BRANCH_DEFINITIONS)[number]): BranchAccumulator {
  return {
    branchId: branch.id,
    branchName: branch.name,
    overallDifficulty: getBranchOverallDifficulty(branch),
    runs: 0,
    totalShiftsMonths: 0,
    totalShifts: 0,
    totalWeeklyHoursSamples: 0,
    totalWeeklyHours: 0,
    finalStressSum: 0,
    finalFatigueSum: 0,
    finalBurnoutSum: 0,
    hierarchySensitiveEventCount: 0,
    totalEventCount: 0,
    crisisTotal: 0,
    gameOverRuns: 0,
    specialistRuns: 0,
    hierarchyPressureSum: 0,
  };
}

function main() {
  const repo = getEventRepository();
  const results: BranchAccumulator[] = [];
  const crashes: string[] = [];

  for (const branch of BRANCH_DEFINITIONS) {
    const acc = newAccumulator(branch);
    const program = representativeProgramFor(branch.id);
    let lastSeenMonthKey: string | null = null;

    for (let i = 0; i < SEEDS_PER_BRANCH; i++) {
      const seed = `p11-${branch.id}-${i}`;
      try {
        let state = buildResidencyState(seed, program);
        acc.hierarchyPressureSum += state.career.hierarchyPressure ?? 0;
        lastSeenMonthKey = null;

        for (let week = 1; week <= WEEKS_PER_SEED; week++) {
          if (state.career.phase !== "residency") break;
          const weekRng = createScopedRng(seed, `residency:week:${week}`);
          const eventsRng = createScopedRng(seed, `events:week:${week}`);
          const result = advanceResidencyWeekWithEvents(state, weekRng, eventsRng, repo);
          state = result.state;

          if (state.onCall.schedule && state.onCall.schedule.monthKey !== lastSeenMonthKey) {
            lastSeenMonthKey = state.onCall.schedule.monthKey;
            acc.totalShiftsMonths++;
            acc.totalShifts += state.onCall.schedule.player.totalShifts;
          }
          if (state.workload) {
            acc.totalWeeklyHoursSamples++;
            acc.totalWeeklyHours += state.workload.currentWeekHours;
          }

          for (const id of result.queuedEventIds) {
            const event = repo.getEventById(id);
            if (!event) continue;
            acc.totalEventCount++;
            if (HIERARCHY_SENSITIVE_CATEGORIES.has(event.category)) acc.hierarchySensitiveEventCount++;
          }

          const resolveRng = createScopedRng(seed, `resolve:week:${week}`);
          for (const instance of [...state.weeklyEventQueue]) {
            const event = repo.getEventById(instance.eventId);
            if (!event) continue;
            const visible = getVisibleChoices(event, buildRequirementContext(state, instance.boundNpcIds));
            if (visible.length === 0) continue;
            const choice = pickChoice(visible, resolveRng);
            const resolved = resolveEventChoice(state, event, choice.id, resolveRng);
            state = resolved.state;
          }
        }

        // Phase 10's specialist_exam phase has its own separate
        // week-advance path (see engine.ts) — without continuing it here,
        // every run that reaches residency completion would stay stuck on
        // "specialist_exam" forever and never register as either a
        // specialist or (on a failed final attempt) a gameover, which
        // would silently zero out both stats for every branch. Bounded
        // safety window mirrors headlessSimulation.ts's own.
        let examSteps = 0;
        while (state.career.phase === "specialist_exam" && examSteps < 40) {
          examSteps++;
          const result = advanceSpecialistExamWeek(state, repo);
          state = result.state;
          const resolveRng = createScopedRng(seed, `resolve:exam:${examSteps}`);
          for (const instance of [...state.weeklyEventQueue]) {
            const event = repo.getEventById(instance.eventId);
            if (!event) continue;
            const visible = getVisibleChoices(event, buildRequirementContext(state, instance.boundNpcIds));
            if (visible.length === 0) continue;
            const choice = pickChoice(visible, resolveRng);
            const resolved = resolveEventChoice(state, event, choice.id, resolveRng);
            state = resolved.state;
          }
        }

        acc.runs++;
        acc.finalStressSum += state.resources.stress;
        acc.finalFatigueSum += state.resources.fatigue;
        acc.finalBurnoutSum += state.resources.burnout;
        acc.crisisTotal += state.statistics["crisis:total"] ?? 0;
        if (state.gameOver) acc.gameOverRuns++;
        if (state.career.phase === "specialist") acc.specialistRuns++;
      } catch (err) {
        crashes.push(`branch=${branch.id} seed=${seed}: ${(err as Error).message}`);
      }
    }
    results.push(acc);
  }

  console.log(`\n${"=".repeat(100)}`);
  console.log(`Phase 11 branch simulation — ${results.reduce((s, r) => s + r.runs, 0)} total runs across ${results.length} branches, ${WEEKS_PER_SEED} weeks each\n`);
  console.log(`Crashes: ${crashes.length}`);
  for (const c of crashes.slice(0, 20)) console.log(`  CRASH: ${c}`);

  const rows = [...results].sort((a, b) => b.overallDifficulty - a.overallDifficulty);
  console.log(
    "\nBranch".padEnd(42) +
      "Overall".padEnd(9) +
      "AvgShifts/mo".padEnd(14) +
      "AvgWkHrs".padEnd(10) +
      "Stress".padEnd(8) +
      "Fatigue".padEnd(9) +
      "Burnout".padEnd(9) +
      "Crisis/run".padEnd(11) +
      "HierEvt%".padEnd(9) +
      "GameOver%".padEnd(10) +
      "Specialist%"
  );
  for (const r of rows) {
    const avgShifts = r.totalShiftsMonths > 0 ? r.totalShifts / r.totalShiftsMonths : 0;
    const avgHours = r.totalWeeklyHoursSamples > 0 ? r.totalWeeklyHours / r.totalWeeklyHoursSamples : 0;
    const hierEvtPct = r.totalEventCount > 0 ? (r.hierarchySensitiveEventCount / r.totalEventCount) * 100 : 0;
    console.log(
      `${r.branchName} (${r.branchId})`.padEnd(42) +
        r.overallDifficulty.toFixed(2).padEnd(9) +
        avgShifts.toFixed(1).padEnd(14) +
        avgHours.toFixed(1).padEnd(10) +
        (r.finalStressSum / r.runs).toFixed(1).padEnd(8) +
        (r.finalFatigueSum / r.runs).toFixed(1).padEnd(9) +
        (r.finalBurnoutSum / r.runs).toFixed(1).padEnd(9) +
        (r.crisisTotal / r.runs).toFixed(2).padEnd(11) +
        hierEvtPct.toFixed(1).padEnd(9) +
        ((r.gameOverRuns / r.runs) * 100).toFixed(1).padEnd(10) +
        ((r.specialistRuns / r.runs) * 100).toFixed(1)
    );
  }

  // §41 sanity checks
  console.log(`\n${"=".repeat(100)}\nSanity checks (§41):`);
  const byOnCall = [...results].sort((a, b) => getBranchDefinition(a.branchId).difficultyBaseline.onCallLoad - getBranchDefinition(b.branchId).difficultyBaseline.onCallLoad);
  const lowestOnCall = byOnCall[0];
  const highestOnCall = byOnCall[byOnCall.length - 1];
  const lowestAvgShifts = lowestOnCall.totalShifts / lowestOnCall.totalShiftsMonths;
  const highestAvgShifts = highestOnCall.totalShifts / highestOnCall.totalShiftsMonths;
  console.log(
    `1. onCallLoad direction: ${highestOnCall.branchName} (${highestOnCall.overallDifficulty.toFixed(2)}) avg ${highestAvgShifts.toFixed(1)} shifts/mo ` +
      `> ${lowestOnCall.branchName} avg ${lowestAvgShifts.toFixed(1)} shifts/mo -> ${highestAvgShifts > lowestAvgShifts ? "PASS" : "FAIL"}`
  );

  const byWorkingHours = [...results].sort((a, b) => getBranchDefinition(a.branchId).difficultyBaseline.workingHours - getBranchDefinition(b.branchId).difficultyBaseline.workingHours);
  const lowestWH = byWorkingHours[0];
  const highestWH = byWorkingHours[byWorkingHours.length - 1];
  const lowestAvgHrs = lowestWH.totalWeeklyHours / lowestWH.totalWeeklyHoursSamples;
  const highestAvgHrs = highestWH.totalWeeklyHours / highestWH.totalWeeklyHoursSamples;
  console.log(
    `2. workingHours direction: ${highestWH.branchName} avg ${highestAvgHrs.toFixed(1)}h/week > ${lowestWH.branchName} avg ${lowestAvgHrs.toFixed(1)}h/week -> ` +
      `${highestAvgHrs > lowestAvgHrs ? "PASS" : "FAIL"}`
  );

  const byHierarchy = [...results].sort((a, b) => getBranchDefinition(a.branchId).difficultyBaseline.hierarchyPressure - getBranchDefinition(b.branchId).difficultyBaseline.hierarchyPressure);
  const lowestH = byHierarchy[0];
  const highestH = byHierarchy[byHierarchy.length - 1];
  const lowestHPct = (lowestH.hierarchySensitiveEventCount / lowestH.totalEventCount) * 100;
  const highestHPct = (highestH.hierarchySensitiveEventCount / highestH.totalEventCount) * 100;
  console.log(
    `3. hierarchyPressure direction: ${highestH.branchName} ${highestHPct.toFixed(1)}% hierarchy-sensitive events > ${lowestH.branchName} ${lowestHPct.toFixed(1)}% -> ` +
      `${highestHPct > lowestHPct ? "PASS" : "FAIL"}`
  );

  const genelCerrahi = results.find((r) => r.branchId === "genel_cerrahi")!;
  const genelCerrahiRate = (genelCerrahi.gameOverRuns / genelCerrahi.runs) * 100;
  console.log(
    `4. Genel Cerrahi Game Over rate (random strategy, same methodology Phase 10's ~46% figure used) stays in the same ballpark, not completely broken: ${genelCerrahiRate.toFixed(1)}%`
  );

  const noAutoLoss = results.every((r) => r.gameOverRuns / r.runs < 0.95);
  const noAutoWin = results.every((r) => r.specialistRuns / r.runs < 0.98 || r.runs === 0);
  console.log(`5. No branch is an automatic Game Over machine (<95% for all): ${noAutoLoss ? "PASS" : "FAIL"}`);
  console.log(`6. No branch is an automatic specialist machine (<98% for all): ${noAutoWin ? "PASS" : "FAIL"}`);

  console.log(`\nDone.`);
}

main();
