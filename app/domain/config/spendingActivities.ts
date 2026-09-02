import type { RelationshipField, RequirementNode } from "../events/types";
import type { ResolvedResourceDelta } from "../state/types";

// Gameplay Expansion Part A §5/§9/§10/§11 — a small, genuinely
// extensible spending-activity DSL. Reuses the EXISTING generic
// RequirementNode DSL (domain/events/types.ts) for eligibility rather
// than inventing a second requirement language, and the existing
// ResolvedResourceDelta shape for effects. "Küçük fakat genişletilebilir"
// — a handful of real activities, not dozens, proving the system rather
// than exhausting the content space (that's later work).
export type SpendingCategory = "social" | "rest";

export type SpendingRelationshipEffect = {
  npc: string;
} & Partial<Record<RelationshipField, number>>;

export interface SpendingActivityDefinition {
  id: string;
  category: SpendingCategory;
  label: string;
  cost: { money: number; freeTimeHours: number };
  cooldownWeeks?: number;
  requirements?: RequirementNode;
  effects: ResolvedResourceDelta;
  relationshipEffects?: SpendingRelationshipEffect[];
}

// §9/§10 — real trade-offs, never a flat "stress -20" button: every
// activity costs BOTH money and freeTimeHours, and every activity's
// benefit comes with some cost dimension (money, time, or a smaller
// benefit than a pricier alternative).
export const SPENDING_ACTIVITIES: SpendingActivityDefinition[] = [
  {
    id: "arkadaslarla_disari_cik",
    category: "social",
    label: "Arkadaşlarla Dışarı Çık",
    cost: { money: 1500, freeTimeHours: 4 },
    cooldownWeeks: 1,
    effects: { social: 8, stress: -3 },
  },
  {
    id: "evde_dinlen",
    category: "rest",
    label: "Evde Dinlen",
    cost: { money: 0, freeTimeHours: 6 },
    cooldownWeeks: 1,
    effects: { fatigue: -8, stress: -2, health: 1 },
  },
  {
    id: "spor_yap",
    category: "rest",
    label: "Spor Yap",
    cost: { money: 800, freeTimeHours: 3 },
    cooldownWeeks: 1,
    effects: { health: 3, stress: -4, fatigue: 2 },
  },
  {
    id: "hafta_sonu_kacamagi",
    category: "rest",
    // §10 — a "stronger" activity: more time, more money, a real cooldown
    // (can't be spammed every week), but a bigger combined payoff than
    // any single cheap activity.
    label: "Hafta Sonu Kaçamağı",
    cost: { money: 6000, freeTimeHours: 16 },
    cooldownWeeks: 4,
    effects: { fatigue: -15, stress: -12, health: 4, social: 5 },
  },
  {
    id: "aile_ziyareti",
    category: "social",
    label: "Aile Ziyareti",
    cost: { money: 1000, freeTimeHours: 8 },
    cooldownWeeks: 3,
    effects: { social: 10, stress: -5 },
  },
];

export function getSpendingActivity(id: string): SpendingActivityDefinition | undefined {
  return SPENDING_ACTIVITIES.find((a) => a.id === id);
}
