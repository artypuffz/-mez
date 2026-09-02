import type { FoodTier, GameState } from "../state/types";

// §8 — a standing choice, changed here and left in effect until changed
// again (read every month by computeMonthlyExpenses, every week by the
// lifestyle health modifier). No cost to change it — it's a preference,
// not a purchase.
export function setLifestyleFoodTier(state: GameState, foodTier: FoodTier): GameState {
  if (state.lifestyle.foodTier === foodTier) return state;
  return { ...state, lifestyle: { ...state.lifestyle, foodTier } };
}
