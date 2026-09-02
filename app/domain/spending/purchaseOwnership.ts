import type { ComputerTier, GameState, HousingTier, PhoneTier } from "../state/types";
import { COMPUTER_PURCHASE, HOUSING_PURCHASE, PHONE_PURCHASE } from "../config/lifestyleConfig";
import { canAffordFreeTime, spendFreeTimeHours } from "../residency/freeTime";

export type OwnershipCategory = "phone" | "computer" | "housing";

export type PurchaseOwnershipRejection = "already_owned" | "insufficient_money" | "insufficient_time";

export type PurchaseOwnershipResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: PurchaseOwnershipRejection };

const PURCHASE_TABLES = {
  phone: PHONE_PURCHASE,
  computer: COMPUTER_PURCHASE,
  housing: HOUSING_PURCHASE,
} as const;

// Gameplay Expansion Part A §12 — a real, persistent gameplay ownership
// model, not a UI label. housing is the one that feeds monthly rent
// directly (domain/economy/expenses.ts); phone/computer persist for
// future event-requirement use (§12's own explicit scoping: "bu fazda
// onlarca item üretme"). Immediate application, same shape as
// resolveSpendingActivity — a store-layer guard prevents double-submit.
export function purchaseOwnershipUpgrade(
  state: GameState,
  category: OwnershipCategory,
  tier: PhoneTier | ComputerTier | HousingTier
): PurchaseOwnershipResult {
  const currentTier = state.ownership[category];
  if (currentTier === tier) return { ok: false, reason: "already_owned" };

  const cost = (PURCHASE_TABLES[category] as Record<string, { money: number; freeTimeHours: number }>)[tier];
  if (state.resources.money < cost.money) return { ok: false, reason: "insufficient_money" };
  if (!canAffordFreeTime(state.freeTime, cost.freeTimeHours)) return { ok: false, reason: "insufficient_time" };

  return {
    ok: true,
    state: {
      ...state,
      resources: { ...state.resources, money: state.resources.money - cost.money },
      freeTime: spendFreeTimeHours(state.freeTime, cost.freeTimeHours),
      ownership: { ...state.ownership, [category]: tier },
    },
  };
}
