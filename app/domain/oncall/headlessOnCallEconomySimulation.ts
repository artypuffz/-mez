import { advanceResidencyWeekWithEvents } from "../events/engine";
import { createEventRepository } from "../events/repository";
import { createInitialGameState, type CharacterCreationInput } from "../state/createInitialGameState";
import { beginTus } from "../state/transitions";
import { selectResidencyProgram, proceedToPreference } from "../state/tusTransitions";
import { getResidencyProgram } from "../config/residencyPrograms";
import { getBranchDefinition } from "../config/branches";
import { createScopedRng } from "../rng/seededRng";
import type { BackgroundId, GameState, SeniorityStage } from "../state/types";

// No event content fires here (§30's explicit "event kaynaklı ekstra
// harcamalar OLMADAN") — only the deterministic monthly on-call/economy
// processing ever touches money or the schedule, isolating exactly what
// this simulation is meant to sanity-check.
const emptyRepo = createEventRepository([]);

export interface HeadlessOnCallEconomyConfig {
  seedCount: number;
  programIds: string[];
  backgrounds: BackgroundId[];
}

interface MonthSample {
  branchId: string;
  seniorityStage: SeniorityStage;
  totalShifts: number;
  staffingLoad: number;
  activeResidents: number;
  onCallPay: number;
  net: number;
  monthIndex: number; // 0-based months since residency start, for year-1/end-of-residency cuts
}

export interface OnCallSimulationReport {
  byBranch: Record<string, { avgShifts: number; minShifts: number; maxShifts: number }>;
  bySeniority: Record<SeniorityStage, number>; // avg shifts, "none" excluded
  avgShiftsHighStaffingLoad: number; // staffingLoad >= 50
  avgShiftsLowStaffingLoad: number; // staffingLoad < 50
  monthsAboveGlobalMax: number;
  monthsWithZeroShifts: number;
  totalMonthsObserved: number;
}

export interface EconomySimulationReport {
  avgMonthlyNet: number;
  avgBalanceEndOfYear1: number;
  avgBalanceEndOfResidency: number;
  fractionRunsEverNegative: number;
  byBackground: Record<string, number>; // avg balance at end of residency
  byCity: Record<string, number>; // avg balance at end of residency
}

export interface CrossSystemSanityReport {
  // Pearson correlation across every recorded month-sample, POOLED across
  // branches/seniority stages. Reported for completeness, but branch
  // baseline and seniority modifier dominate the raw variance (a
  // Simpson's-paradox-style confound) — this number alone
  // underrepresents how strongly staffingLoad actually drives shifts.
  correlationStaffingLoadToShiftsPooled: number;
  // The honest answer to "is the shortage -> shift trade-off actually
  // observable" (§31): average of the within-(branch, seniority)
  // correlations, weighted by sample count, which controls for both
  // confounds. Computed separately since a raw pooled correlation across
  // very different baselines can mask a real effect.
  correlationStaffingLoadToShiftsControlled: number;
  correlationShiftsToOnCallPay: number;
  crashes: string[];
}

export interface HeadlessOnCallEconomyReport {
  onCall: OnCallSimulationReport;
  economy: EconomySimulationReport;
  crossSystem: CrossSystemSanityReport;
}

function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let cov = 0;
  let varX = 0;
  let varY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    cov += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }
  if (varX === 0 || varY === 0) return 0;
  return cov / Math.sqrt(varX * varY);
}

// Sample-count-weighted average of the staffingLoad->totalShifts
// correlation computed SEPARATELY within each (branch, seniority) group —
// controls for the two confounds that dominate the pooled figure.
function controlledStaffingLoadCorrelation(samples: MonthSample[]): number {
  const groups = new Map<string, MonthSample[]>();
  for (const s of samples) {
    const key = `${s.branchId}:${s.seniorityStage}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(s);
  }
  let weightedSum = 0;
  let totalWeight = 0;
  for (const group of groups.values()) {
    if (group.length < 10) continue; // too few samples for a meaningful correlation
    const r = pearsonCorrelation(group.map((s) => s.staffingLoad), group.map((s) => s.totalShifts));
    weightedSum += r * group.length;
    totalWeight += group.length;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

function buildResidencyState(seed: string, programId: string, background: BackgroundId): GameState {
  const input: CharacterCreationInput = { name: "Sim", age: 26, gender: "belirtmek_istemiyorum", hometown: "Ankara", background };
  const initial = createInitialGameState(input, { seed });
  const program = getResidencyProgram(programId);
  return selectResidencyProgram(proceedToPreference(beginTus(initial)), program);
}

export function runHeadlessOnCallEconomySimulation(config: HeadlessOnCallEconomyConfig): HeadlessOnCallEconomyReport {
  const monthSamples: MonthSample[] = [];
  const balanceAtYear1: number[] = [];
  const balanceAtEnd: number[] = [];
  const everNegativeFlags: boolean[] = [];
  const byBackgroundBalances: Record<string, number[]> = {};
  const byCityBalances: Record<string, number[]> = {};
  const crashes: string[] = [];

  for (let i = 0; i < config.seedCount; i++) {
    const seed = `oncall-econ-headless-${i}`;
    const programId = config.programIds[i % config.programIds.length];
    const background = config.backgrounds[i % config.backgrounds.length];

    try {
      let state = buildResidencyState(seed, programId, background);
      const program = getResidencyProgram(programId);
      const branch = getBranchDefinition(program.branchId);
      let everNegative = state.resources.money < 0;
      let lastMonthKey: string | null = null;
      let monthIndex = -1;
      let year1Balance: number | null = null;
      const totalWeeks = branch.residencyYears * 52;

      for (let week = 1; week <= totalWeeks; week++) {
        if (state.career.phase !== "residency") break;
        const weekRng = createScopedRng(seed, `residency:week:${week}`);
        const eventsRng = createScopedRng(seed, `events:week:${week}`);
        state = advanceResidencyWeekWithEvents(state, weekRng, eventsRng, emptyRepo).state;

        if (state.resources.money < 0) everNegative = true;

        const schedule = state.onCall.schedule;
        const breakdown = state.economy.lastBreakdown;
        if (schedule && breakdown && schedule.monthKey !== lastMonthKey) {
          lastMonthKey = schedule.monthKey;
          monthIndex += 1;
          monthSamples.push({
            branchId: program.branchId,
            seniorityStage: state.career.seniorityStage,
            totalShifts: schedule.player.totalShifts,
            staffingLoad: schedule.clinicSummary.staffingLoad,
            activeResidents: schedule.clinicSummary.activeResidents,
            onCallPay: breakdown.income.onCallPay,
            net: breakdown.net,
            monthIndex,
          });
          if (monthIndex === 11) year1Balance = state.resources.money;
        }
      }

      balanceAtEnd.push(state.resources.money);
      balanceAtYear1.push(year1Balance ?? state.resources.money);
      everNegativeFlags.push(everNegative);

      (byBackgroundBalances[background] ??= []).push(state.resources.money);
      (byCityBalances[program.cityId] ??= []).push(state.resources.money);
    } catch (err) {
      crashes.push(`seed=${seed} programId=${programId}: ${(err as Error).message}`);
    }
  }

  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  const byBranch: OnCallSimulationReport["byBranch"] = {};
  for (const branchId of new Set(monthSamples.map((s) => s.branchId))) {
    const shifts = monthSamples.filter((s) => s.branchId === branchId).map((s) => s.totalShifts);
    byBranch[branchId] = { avgShifts: avg(shifts), minShifts: Math.min(...shifts), maxShifts: Math.max(...shifts) };
  }

  const bySeniority = {} as Record<SeniorityStage, number>;
  for (const stage of ["comez", "orta", "kidemli"] as const) {
    bySeniority[stage] = avg(monthSamples.filter((s) => s.seniorityStage === stage).map((s) => s.totalShifts));
  }
  bySeniority.none = 0;

  const highLoad = monthSamples.filter((s) => s.staffingLoad >= 50).map((s) => s.totalShifts);
  const lowLoad = monthSamples.filter((s) => s.staffingLoad < 50).map((s) => s.totalShifts);

  const byBackground: Record<string, number> = {};
  for (const [k, v] of Object.entries(byBackgroundBalances)) byBackground[k] = avg(v);
  const byCity: Record<string, number> = {};
  for (const [k, v] of Object.entries(byCityBalances)) byCity[k] = avg(v);

  return {
    onCall: {
      byBranch,
      bySeniority,
      avgShiftsHighStaffingLoad: avg(highLoad),
      avgShiftsLowStaffingLoad: avg(lowLoad),
      monthsAboveGlobalMax: monthSamples.filter((s) => s.totalShifts > 12).length,
      monthsWithZeroShifts: monthSamples.filter((s) => s.totalShifts === 0).length,
      totalMonthsObserved: monthSamples.length,
    },
    economy: {
      avgMonthlyNet: avg(monthSamples.map((s) => s.net)),
      avgBalanceEndOfYear1: avg(balanceAtYear1),
      avgBalanceEndOfResidency: avg(balanceAtEnd),
      fractionRunsEverNegative: everNegativeFlags.length ? everNegativeFlags.filter(Boolean).length / everNegativeFlags.length : 0,
      byBackground,
      byCity,
    },
    crossSystem: {
      correlationStaffingLoadToShiftsPooled: pearsonCorrelation(monthSamples.map((s) => s.staffingLoad), monthSamples.map((s) => s.totalShifts)),
      correlationStaffingLoadToShiftsControlled: controlledStaffingLoadCorrelation(monthSamples),
      correlationShiftsToOnCallPay: pearsonCorrelation(monthSamples.map((s) => s.totalShifts), monthSamples.map((s) => s.onCallPay)),
      crashes,
    },
  };
}
