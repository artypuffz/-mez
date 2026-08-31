import type { RelationshipState } from "../state/types";

// §26 — never render trust/friendship/grudge as numbers; only a derived
// label. Grudge dominates when it's meaningfully present (a high-trust,
// high-grudge combination reads as "there's history here", not "neutral").
export type RelationshipLabel = "Gergin" | "Mesafeli" | "Nötr" | "Aranız iyi" | "Yakın";

export function deriveRelationshipLabel(relationship: RelationshipState): RelationshipLabel {
  const { trust, friendship, grudge } = relationship;
  const score = trust * 0.5 + friendship * 0.6 - grudge * 0.8;

  if (grudge >= 40 && score < 10) return "Gergin";
  if (score <= -25) return "Gergin";
  if (score <= -5) return "Mesafeli";
  if (score < 15) return "Nötr";
  if (friendship >= 40 && score >= 35) return "Yakın";
  return "Aranız iyi";
}
