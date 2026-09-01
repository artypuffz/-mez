import type { MonthlyEconomyBreakdown, OnCallSchedule, SeniorityStage, BackgroundId } from "../state/types";
import type { CityDefinition } from "../config/cities";
import { ON_CALL_PAY_CONFIG, SALARY_CONFIG } from "../config/onCallEconomyConfig";
import { computeMonthlyExpenses } from "./expenses";

export interface ComputeMonthlyEconomyInput {
  monthKey: string;
  seniorityStage: SeniorityStage;
  onCallSchedule: OnCallSchedule | null;
  city: CityDefinition;
  background: BackgroundId;
}

// §12/§13/§14 — salary + on-call pay against rent/food/transport/
// utilities/other. Pure: same inputs -> same breakdown, every time (the
// idempotency guard against double-applying it lives in the caller, see
// engine.ts's economy.lastProcessedMonthKey check).
export function computeMonthlyEconomy(input: ComputeMonthlyEconomyInput): MonthlyEconomyBreakdown {
  const { monthKey, seniorityStage, onCallSchedule, city, background } = input;

  const salary = SALARY_CONFIG.baseSalary + SALARY_CONFIG.seniorityModifier[seniorityStage];
  const totalShifts = onCallSchedule?.player.totalShifts ?? 0;
  const weekendShifts = onCallSchedule?.player.weekendShifts ?? 0;
  const onCallPay = totalShifts * ON_CALL_PAY_CONFIG.payPerShift + weekendShifts * ON_CALL_PAY_CONFIG.weekendBonusPerShift;

  const expenses = computeMonthlyExpenses(city, background);
  const income = { salary, onCallPay, other: 0 };
  const net =
    income.salary + income.onCallPay + income.other - (expenses.rent + expenses.food + expenses.transport + expenses.utilities + expenses.fixedOther);

  return { monthKey, income, expenses, net };
}
