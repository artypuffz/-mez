import type { ComputerTier, FoodTier, HousingTier, PhoneTier } from "../state/types";

// Gameplay Expansion Part A §8/§12/§27 — lifestyle (food) and ownership
// (housing/phone/computer) tiers. Every tier is a genuine trade-off, never
// a strictly-dominant or strictly-punishing choice on its own (§8's
// explicit rule against making "ekonomik" simply bad) — economical food
// is cheaper AND has a small health cost; good food costs more AND helps
// health a little. Same shape for housing, which is also the SPECIFIC,
// intentional lever addressing the audited expensive-city + low-on-call
// structural deficit (see the Part A report's economy section) — a
// player who actively chooses "cheap" housing can close a deficit no
// amount of on-call load was ever supposed to fix; a player who does
// nothing keeps the exact pre-Part-A "normal" rent formula unchanged.
export interface FoodTierEffect {
  costMultiplier: number;
  healthModifier: number; // weekly passive contribution, see domain/residency/wellbeing.ts
}

export const FOOD_TIER_CONFIG: Record<FoodTier, FoodTierEffect> = {
  economical: { costMultiplier: 0.6, healthModifier: -1 },
  normal: { costMultiplier: 1.0, healthModifier: 0 },
  good: { costMultiplier: 1.4, healthModifier: 1 },
};

export interface HousingTierEffect {
  rentMultiplier: number;
  healthModifier: number;
}

// "normal" is EXACTLY the pre-Part-A rent formula (rentMultiplier: 1) —
// a save that never touches this system sees no economy change at all.
export const HOUSING_TIER_CONFIG: Record<HousingTier, HousingTierEffect> = {
  cheap: { rentMultiplier: 0.6, healthModifier: -1 },
  normal: { rentMultiplier: 1.0, healthModifier: 0 },
  good: { rentMultiplier: 1.4, healthModifier: 1 },
};

// One-time cost to move into/buy a tier, and the freeTimeHours it costs
// to handle (moving, setting up, going to the store). Purchasing the tier
// you already own is not offered by the resolver (see spending.ts).
export const HOUSING_PURCHASE: Record<HousingTier, { money: number; freeTimeHours: number }> = {
  cheap: { money: 0, freeTimeHours: 4 },
  normal: { money: 15000, freeTimeHours: 6 },
  good: { money: 45000, freeTimeHours: 8 },
};

export const PHONE_PURCHASE: Record<PhoneTier, { money: number; freeTimeHours: number }> = {
  old: { money: 0, freeTimeHours: 1 },
  normal: { money: 8000, freeTimeHours: 2 },
  good: { money: 20000, freeTimeHours: 2 },
};

export const COMPUTER_PURCHASE: Record<ComputerTier, { money: number; freeTimeHours: number }> = {
  none: { money: 0, freeTimeHours: 0 },
  basic: { money: 12000, freeTimeHours: 2 },
  good: { money: 30000, freeTimeHours: 3 },
};

export function computeLifestyleHealthModifier(foodTier: FoodTier, housingTier: HousingTier): number {
  return FOOD_TIER_CONFIG[foodTier].healthModifier + HOUSING_TIER_CONFIG[housingTier].healthModifier;
}
