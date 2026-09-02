import type { RelationshipHistoryDirection, RelationshipState } from "../state/types";

// §26 — never render trust/friendship/grudge as numbers; only a derived
// label. Grudge dominates when it's meaningfully present (a high-trust,
// high-grudge combination reads as "there's history here", not "neutral").
export type RelationshipLabel = "Gergin" | "Mesafeli" | "Nötr" | "Aranız iyi" | "Yakın";

function relationshipScore(relationship: RelationshipState): number {
  const { trust, friendship, grudge } = relationship;
  return trust * 0.5 + friendship * 0.6 - grudge * 0.8;
}

export function deriveRelationshipLabel(relationship: RelationshipState): RelationshipLabel {
  const { grudge } = relationship;
  const score = relationshipScore(relationship);

  if (grudge >= 40 && score < 10) return "Gergin";
  if (score <= -25) return "Gergin";
  if (score <= -5) return "Mesafeli";
  if (score < 15) return "Nötr";
  if (relationship.friendship >= 40 && score >= 35) return "Yakın";
  return "Aranız iyi";
}

// Gameplay Expansion Part B §7 — a normalized 0-100 PRESENTATION value
// only (a finer-grained bar underneath the coarse label above), derived
// consistently from the same underlying score deriveRelationshipLabel
// already uses. Never changes relationship semantics or is stored
// anywhere — always recomputed from the authoritative RelationshipState.
// The raw score's real range is asymmetric and wide (roughly -190..110);
// centering at score=0 -> 50 and halving keeps the label's own thresholds
// (Gergin at score<=-25 -> ~38, Nötr's upper bound at score<15 -> ~57)
// inside a legible middle band rather than everything collapsing to the
// extremes.
export function deriveRelationshipScore(relationship: RelationshipState): number {
  const score = relationshipScore(relationship);
  return Math.round(Math.min(100, Math.max(0, 50 + score * 0.5)));
}

// Gameplay Expansion Part B §6 — the SAME net-delta heuristic used to
// classify a relationship-history entry's direction (see
// recordRelationshipHistory in domain/events/effects.ts), extracted here
// so the immediate feedback banner and the persisted history can never
// disagree about whether an interaction read as positive/negative/neutral.
export function deriveRelationshipDirection(deltas: {
  trust?: number;
  friendship?: number;
  grudge?: number;
}): RelationshipHistoryDirection {
  const net = (deltas.trust ?? 0) + (deltas.friendship ?? 0) - (deltas.grudge ?? 0);
  if (net > 2) return "positive";
  if (net < -2) return "negative";
  return "neutral";
}
