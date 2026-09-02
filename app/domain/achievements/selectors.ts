import type { GameState } from "../state/types";
import { buildRequirementContext, evaluateRequirements } from "../events/requirements";
import { ACHIEVEMENT_DEFINITIONS, type AchievementDefinition } from "./definitions";

export interface AchievementStatus {
  def: AchievementDefinition;
  unlocked: boolean;
}

// Gameplay Expansion Part B section 19 — never a scoring system (no
// points, no "X/12 complete" progress bar implying a target to optimize
// for), just a real/deadpan record of what happened, same restrained
// spirit as the game's other non-scoring systems (behaviorStats' flavor
// tags, the career report).
export function selectAchievements(state: GameState): AchievementStatus[] {
  const ctx = buildRequirementContext(state);
  return ACHIEVEMENT_DEFINITIONS.map((def) => ({
    def,
    unlocked: evaluateRequirements(def.requirements, ctx),
  }));
}
