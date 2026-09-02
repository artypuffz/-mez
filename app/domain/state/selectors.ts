import type { CareerPhase, GameOverReason, GameState } from "./types";
import { getBackgroundDefinition } from "../config/backgrounds";
import { getBranchDefinition } from "../config/branches";
import { getCityDefinition } from "../config/cities";
import { getHospitalDefinition } from "../config/hospitals";
import { PRODUCTION_PROGRAMS } from "../config/residencyPrograms";
import { filterAvailablePrograms } from "../tus/filterAvailablePrograms";

export function selectCareerPhase(state: GameState): CareerPhase {
  return state.career.phase;
}

// Android Device QA Hotfix 1, Issue 3 — new-game TUS discovery must read
// ONLY the real-program pool. RESIDENCY_PROGRAMS (real + legacy fictional)
// stays reserved for by-id lookup of programs an existing save already
// committed to (see getResidencyProgram in residencyPrograms.ts) — it must
// never be the source for a fresh preference list.
export function selectAvailablePrograms(state: GameState) {
  if (state.career.tusScore === undefined) return [];
  return filterAvailablePrograms(PRODUCTION_PROGRAMS, state.career.tusScore);
}

export interface ResidencySummary {
  branchName: string;
  hospitalName: string;
  cityName: string;
  residencyWeek: number;
  residencyYear: number;
}

export function selectResidencySummary(state: GameState): ResidencySummary | null {
  const { branch, hospital, city } = state.career;
  if (!branch || !hospital || !city) return null;
  return {
    branchName: getBranchDefinition(branch).name,
    hospitalName: getHospitalDefinition(hospital).name,
    cityName: getCityDefinition(city).name,
    residencyWeek: state.career.residencyWeek,
    residencyYear: state.career.residencyYear,
  };
}

export interface CharacterSummary {
  name: string;
  age: number;
  hometown: string;
  backgroundLabel: string;
  avatar: GameState["character"]["avatar"];
}

export function selectCharacterSummary(state: GameState): CharacterSummary {
  return {
    name: state.character.name,
    age: state.character.age,
    hometown: state.character.hometown,
    backgroundLabel: getBackgroundDefinition(state.character.background).label,
    avatar: state.character.avatar,
  };
}

// Phase 9 §35 — "5-8 temel stat yeterli", not a full career report (that's
// a later phase). Every field here is something the engine actually
// tracks already — no invented lifetime counters (e.g. no "toplam nöbet"
// since only the CURRENT month's on-call schedule is ever kept).
export interface GameOverSummary {
  reason: GameOverReason;
  branchName?: string;
  durationLabel: string;
  weeksCompleted: number;
  stats: {
    lowestBalance: number;
    crisisCount: number;
    crisisRecoveredCount: number;
    mobbingEventCount: number;
    juniorSupportCount: number;
  };
}

export function formatDuration(weeks: number): string {
  const years = Math.floor(weeks / 52);
  const remainderWeeks = weeks % 52;
  const months = Math.round(remainderWeeks / (52 / 12));
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} yıl`);
  if (months > 0 || years === 0) parts.push(`${months} ay`);
  return parts.join(' ');
}

// Gameplay Expansion Part B section 18 — Kariyer İstatistikleri, entirely
// from counters the engine already tracks (oncall_lifetime_* has existed
// since Phase 10 §8; the rest mirrors selectGameOverSummary's own fields).
// Never a scoring screen — no total/ranking, just what happened. No stat
// here is derived by counting arbitrary event ids; each one traces back to
// a real accumulating counter or a small, fixed, documented category list.
const JUNIOR_SUPPORT_TAGS = ['junior:supportive', 'junior:protected', 'junior:defended'];

export interface CareerStatistics {
  residencyWeek: number;
  residencyYear: number;
  seniorityStage: string;
  totalOnCallShifts: number;
  weekendOnCallShifts: number;
  extraOnCallShifts: number;
  crisisCount: number;
  crisisRecoveredCount: number;
  eventsResolved: number;
  mobbingEventCount: number;
  spendingActivityCount: number;
  juniorSupportCount: number;
  lowestBalanceEver: number;
}

// Gameplay Expansion Part B §15/§17 — "Asistanlık İlerlemesi": real
// residency-week-based progress toward finishing the branch's own
// residencyYears, deliberately NOT an XP system (no points, no arbitrary
// "next level" curve — the denominator is the branch's actual real-world
// duration).
export interface ResidencyProgressSummary {
  weeksCompleted: number;
  totalWeeks: number;
  ratio: number;
}

export function selectResidencyProgress(state: GameState): ResidencyProgressSummary | null {
  if (!state.career.branch) return null;
  const branch = getBranchDefinition(state.career.branch);
  const totalWeeks = branch.residencyYears * 52;
  const weeksCompleted = Math.min(state.career.residencyWeek, totalWeeks);
  return { weeksCompleted, totalWeeks, ratio: totalWeeks > 0 ? weeksCompleted / totalWeeks : 0 };
}

export function selectCareerStatistics(state: GameState): CareerStatistics {
  return {
    residencyWeek: state.career.residencyWeek,
    residencyYear: state.career.residencyYear,
    seniorityStage: state.career.seniorityStage,
    totalOnCallShifts: state.statistics['oncall_lifetime_shifts'] ?? 0,
    weekendOnCallShifts: state.statistics['oncall_lifetime_weekend_shifts'] ?? 0,
    extraOnCallShifts: state.statistics['oncall_lifetime_extra_shifts'] ?? 0,
    crisisCount: state.statistics['crisis:total'] ?? 0,
    crisisRecoveredCount: state.statistics['crisis:recovered'] ?? 0,
    eventsResolved: state.eventHistory.length,
    mobbingEventCount: state.eventHistory.filter((e) => e.category === 'MOBBING').length,
    spendingActivityCount: state.statistics['spending:total'] ?? 0,
    juniorSupportCount: JUNIOR_SUPPORT_TAGS.reduce((sum, tag) => sum + (state.behaviorStats[tag] ?? 0), 0),
    lowestBalanceEver: state.financialPressure.lowestBalance,
  };
}

// Gameplay Expansion Part B §16 — ONLY ever surfaces already-committed
// state (an existing PendingEvent, scheduled exactly like every other
// followUpEvent/chain checkpoint the engine already tracks), NEVER a
// prediction of what pool/random content might trigger. Deliberately
// generic (no title/category) — the engine's own pendingEvents entries
// carry no player-facing text, and inventing one here would risk
// spoiling a chain's actual content.
export function selectUpcomingHint(state: GameState): string | null {
  if (state.pendingEvents.length === 0) return null;
  const nearest = state.pendingEvents.reduce((min, e) => Math.min(min, e.triggerWeek), Infinity);
  const weeksAway = nearest - state.career.residencyWeek;
  if (weeksAway <= 0) return 'Bu hafta beklenen bir gelişme var.';
  if (weeksAway === 1) return 'Önümüzdeki hafta beklenen bir gelişme var.';
  return `${weeksAway} hafta içinde beklenen bir gelişme var.`;
}

export function selectGameOverSummary(state: GameState): GameOverSummary | null {
  if (!state.gameOver) return null;
  const branch = state.career.branch;
  const juniorTags = ['junior:supportive', 'junior:protected', 'junior:defended'];
  return {
    reason: state.gameOver.reason,
    branchName: branch ? getBranchDefinition(branch).name : undefined,
    durationLabel: formatDuration(state.gameOver.week),
    weeksCompleted: state.gameOver.week,
    stats: {
      lowestBalance: state.financialPressure.lowestBalance,
      crisisCount: state.statistics['crisis:total'] ?? 0,
      crisisRecoveredCount: state.statistics['crisis:recovered'] ?? 0,
      mobbingEventCount: state.eventHistory.filter((e) => e.category === 'MOBBING').length,
      juniorSupportCount: juniorTags.reduce((sum, tag) => sum + (state.behaviorStats[tag] ?? 0), 0),
    },
  };
}
