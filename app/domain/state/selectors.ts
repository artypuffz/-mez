import type { CareerPhase, GameOverReason, GameState } from "./types";
import { getBackgroundDefinition } from "../config/backgrounds";
import { getBranchDefinition } from "../config/branches";
import { getCityDefinition } from "../config/cities";
import { getHospitalDefinition } from "../config/hospitals";
import { RESIDENCY_PROGRAMS } from "../config/residencyPrograms";
import { filterAvailablePrograms } from "../tus/filterAvailablePrograms";

export function selectCareerPhase(state: GameState): CareerPhase {
  return state.career.phase;
}

export function selectAvailablePrograms(state: GameState) {
  if (state.career.tusScore === undefined) return [];
  return filterAvailablePrograms(RESIDENCY_PROGRAMS, state.career.tusScore);
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
}

export function selectCharacterSummary(state: GameState): CharacterSummary {
  return {
    name: state.character.name,
    age: state.character.age,
    hometown: state.character.hometown,
    backgroundLabel: getBackgroundDefinition(state.character.background).label,
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

function formatDuration(weeks: number): string {
  const years = Math.floor(weeks / 52);
  const remainderWeeks = weeks % 52;
  const months = Math.round(remainderWeeks / (52 / 12));
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} yıl`);
  if (months > 0 || years === 0) parts.push(`${months} ay`);
  return parts.join(' ');
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
