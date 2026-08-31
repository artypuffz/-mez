import type { NpcId, NpcRole, NpcState, RelationshipState } from "../state/types";
import type { SeededRng } from "../rng/seededRng";

// §15 — minimum selector kinds. Authored content keeps using fixed ids
// directly (`npc: "baris"`); this is for procedural events that need to
// pick a *current* NPC rather than a name baked into the content file.
export type NpcSelector =
  | { byId: NpcId }
  | { randomActiveByRole: NpcRole }
  | { highestTrustByRole: NpcRole }
  | { highestGrudgeByRole: NpcRole }
  | { lowestTrustByRole: NpcRole };

function emptyRelationship(): RelationshipState {
  return { trust: 0, friendship: 0, grudge: 0 };
}

// Sorted by id first so ties (and rng.pick) resolve the same way
// regardless of object key iteration order — resolution is deterministic
// given the same npcs/relationships/rng state.
function activeByRole(npcs: Record<NpcId, NpcState>, role: NpcRole): NpcState[] {
  return Object.values(npcs)
    .filter((npc) => npc.active && npc.role === role)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function resolveNpcSelector(
  selector: NpcSelector,
  npcs: Record<NpcId, NpcState>,
  relationships: Record<NpcId, RelationshipState>,
  rng: SeededRng
): NpcId | null {
  if ("byId" in selector) {
    const npc = npcs[selector.byId];
    return npc && npc.active ? npc.id : null;
  }

  const relOf = (npc: NpcState) => relationships[npc.id] ?? emptyRelationship();

  if ("randomActiveByRole" in selector) {
    const candidates = activeByRole(npcs, selector.randomActiveByRole);
    return candidates.length === 0 ? null : rng.pick(candidates).id;
  }

  if ("highestTrustByRole" in selector) {
    const candidates = activeByRole(npcs, selector.highestTrustByRole);
    if (candidates.length === 0) return null;
    return candidates.reduce((best, n) => (relOf(n).trust > relOf(best).trust ? n : best)).id;
  }

  if ("highestGrudgeByRole" in selector) {
    const candidates = activeByRole(npcs, selector.highestGrudgeByRole);
    if (candidates.length === 0) return null;
    return candidates.reduce((best, n) => (relOf(n).grudge > relOf(best).grudge ? n : best)).id;
  }

  const candidates = activeByRole(npcs, selector.lowestTrustByRole);
  if (candidates.length === 0) return null;
  return candidates.reduce((best, n) => (relOf(n).trust < relOf(best).trust ? n : best)).id;
}

// Resolves every selector on an event's `npcSelectors` map (plus the
// event's `npc`/`requiredNpcTemplate` fixed target under key "primary",
// callers wire that in) exactly once, at queue time — never re-run after
// binding (§16).
export function resolveNpcSelectors(
  selectors: Record<string, NpcSelector> | undefined,
  npcs: Record<NpcId, NpcState>,
  relationships: Record<NpcId, RelationshipState>,
  rng: SeededRng
): Record<string, NpcId> {
  const bound: Record<string, NpcId> = {};
  if (!selectors) return bound;
  for (const key of Object.keys(selectors).sort()) {
    const resolved = resolveNpcSelector(selectors[key], npcs, relationships, rng);
    if (resolved) bound[key] = resolved;
  }
  return bound;
}
