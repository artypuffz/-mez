import type { BackgroundId } from "../state/types";
import type { CityDefinition } from "../config/cities";
import { BASE_MONTHLY_EXPENSES, CITY_COST_CONFIG } from "../config/onCallEconomyConfig";

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

// §15/§16 — city indices and background both feed the real formula now
// (they were previously unused/reserved). Only `aile_yaninda` gets a
// direct rent cut: that's the ONE background whose flavor text is
// specifically about housing. `ekonomik_rahat` already got its edge as a
// one-time starting money bonus at character creation (see
// domain/config/backgrounds.ts) — giving it reduced rent on top would be
// rewarding the same background twice for two different things.
export function computeMonthlyExpenses(city: CityDefinition, background: BackgroundId): MonthlyExpenses {
  const fullRent = scaleByIndex(CITY_COST_CONFIG.rentAtIndex50, city.rentIndex);
  const rent = background === "aile_yaninda" ? Math.round(fullRent * 0.1) : fullRent;

  const transport = scaleByIndex(CITY_COST_CONFIG.transportAtIndex50, city.transportPressure);
  const food = scaleByIndex(BASE_MONTHLY_EXPENSES.food, city.costIndex);
  const utilities = scaleByIndex(BASE_MONTHLY_EXPENSES.utilities, city.costIndex);
  const fixedOther = scaleByIndex(BASE_MONTHLY_EXPENSES.fixedOther, city.costIndex);

  return { rent, food, transport, utilities, fixedOther };
}
