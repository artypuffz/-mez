import type { CareerPhase, GameState } from "./types";
import { getBackgroundDefinition } from "../config/backgrounds";

export function selectCareerPhase(state: GameState): CareerPhase {
  return state.career.phase;
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
