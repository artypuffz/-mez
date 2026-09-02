import type { BackgroundId, FoodTier, HousingTier } from "../state/types";
import type { CityDefinition } from "../config/cities";
import { BASE_MONTHLY_EXPENSES, CITY_COST_CONFIG } from "../config/onCallEconomyConfig";
import { FOOD_TIER_CONFIG, HOUSING_TIER_CONFIG } from "../config/lifestyleConfig";

export interface MonthlyExpenses {
  rent: number;
  food: number;
  transport: number;
  utilities: number;
  fixedOther: number;
}

function scaleByIndex(base: number, index: number, reference = 50): number {
  return Math.round(base * (index / reference));
}

// §15/§16, extended by Gameplay Expansion Part A §8/§12/§27 — city
// indices and background feed the formula as before; lifestyle.foodTier
// and ownership.housing now ALSO feed it, as genuine player-controlled
// multipliers on top (see lifestyleConfig.ts for the trade-offs). The
// "normal" tier for both is EXACTLY multiplier 1 — an existing save that
// never touches lifestyle/ownership (or a migrated pre-Part-A save,
// backfilled to "normal") sees byte-identical expense numbers to before.
// Only `aile_yaninda` gets a direct rent cut on top of the housing tier:
// that's the ONE background whose flavor text is specifically about
// housing. `ekonomik_rahat` already got its edge as a one-time starting
// money bonus at character creation — giving it reduced rent too would be
// rewarding the same background twice for two different things.
export function computeMonthlyExpenses(
  city: CityDefinition,
  background: BackgroundId,
  foodTier: FoodTier = "normal",
  housingTier: HousingTier = "normal"
): MonthlyExpenses {
  const baseRent = scaleByIndex(CITY_COST_CONFIG.rentAtIndex50, city.rentIndex);
  const familyDiscounted = background === "aile_yaninda" ? Math.round(baseRent * 0.1) : baseRent;
  const rent = Math.round(familyDiscounted * HOUSING_TIER_CONFIG[housingTier].rentMultiplier);

  const transport = scaleByIndex(CITY_COST_CONFIG.transportAtIndex50, city.transportPressure);
  const food = Math.round(scaleByIndex(BASE_MONTHLY_EXPENSES.food, city.costIndex) * FOOD_TIER_CONFIG[foodTier].costMultiplier);
  const utilities = scaleByIndex(BASE_MONTHLY_EXPENSES.utilities, city.costIndex);
  const fixedOther = scaleByIndex(BASE_MONTHLY_EXPENSES.fixedOther, city.costIndex);

  return { rent, food, transport, utilities, fixedOther };
}
