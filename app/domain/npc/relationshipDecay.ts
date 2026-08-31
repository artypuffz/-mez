import { clampRelationshipField, type NpcId, type RelationshipState } from "../state/types";

// §20 — monthly passive drift toward baseline. Authored flags (e.g.
// helped_baris_during_crisis) are never touched by this — they live in
// GameState.flags, a completely separate store, so they stay permanent
// regardless of how much the numeric relationship itself decays.
//
//   friendship drifts toward 0 fastest — personal closeness fades without
//     upkeep.
//   trust changes very slowly — professional confidence, once formed
//     (or broken), is sticky.
//   grudge decays slower still — it's meant to be "residue", not
//     something that quietly resolves itself in a season.
const FRIENDSHIP_DECAY_RATE = 0.05;
const TRUST_DECAY_RATE = 0.02;
const GRUDGE_DECAY_RATE = 0.015;

function decayStep(value: number, rate: number): number {
  if (value === 0) return 0;
  const magnitude = Math.min(Math.abs(value), Math.max(1, Math.round(Math.abs(value) * rate)));
  return value > 0 ? value - magnitude : value + magnitude;
}

export function decayRelationship(relationship: RelationshipState): RelationshipState {
  return {
    trust: clampRelationshipField("trust", decayStep(relationship.trust, TRUST_DECAY_RATE)),
    friendship: clampRelationshipField("friendship", decayStep(relationship.friendship, FRIENDSHIP_DECAY_RATE)),
    // grudge is one-directional (0..100) — decayStep already only ever
    // moves it toward 0 since it's never negative to begin with.
    grudge: clampRelationshipField("grudge", decayStep(relationship.grudge, GRUDGE_DECAY_RATE)),
  };
}

// Called once per month tick (monthChanged), same cadence as
// tickNpcLifecycle — not every week (§20 explicitly suggests monthly).
export function tickRelationshipDecay(
  relationships: Record<NpcId, RelationshipState>
): Record<NpcId, RelationshipState> {
  const next: Record<NpcId, RelationshipState> = {};
  for (const [npcId, rel] of Object.entries(relationships)) {
    next[npcId] = decayRelationship(rel);
  }
  return next;
}
