import type { CareerPhase, GameState } from "./types";
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
