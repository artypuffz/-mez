import type { NpcState, RelationshipHistoryDirection } from "../state/types";
import type { RelationshipEffect } from "../events/types";
import { resolveNpcTargetId } from "../events/npcTargets";
import { deriveRelationshipDirection } from "./relationshipLabel";

export interface RelationshipFeedbackEntry {
  npcId: string;
  direction: RelationshipHistoryDirection;
  text: string;
}

// Gameplay Expansion Part B §6 — the relationship domain pipeline was
// already correct (confirmed by the Part A audit); what was missing was
// ANY player-visible signal that a choice moved a relationship at all.
// This is deliberately generic (works for every choice with
// relationshipEffects, including the hundreds of events authored before
// this phase) rather than requiring content to opt in the way
// interactionSummary/history does (§8) — a restrained one-line banner,
// never arcade-style "+15 FRIENDSHIP" numbers.
export function deriveRelationshipFeedback(
  effects: RelationshipEffect[] | undefined,
  boundNpcIds: Record<string, string>,
  npcs: Record<string, NpcState>
): RelationshipFeedbackEntry[] {
  if (!effects || effects.length === 0) return [];
  const seen = new Set<string>();
  const entries: RelationshipFeedbackEntry[] = [];
  for (const effect of effects) {
    const { npc, boundNpc, ...deltas } = effect;
    const npcId = resolveNpcTargetId({ npc, boundNpc }, boundNpcIds);
    if (!npcId || seen.has(npcId)) continue;
    seen.add(npcId);
    const direction = deriveRelationshipDirection(deltas);
    if (direction === "neutral") continue;
    const name = npcs[npcId]?.identity.name ?? "Biri";
    const text = direction === "positive" ? `${name} ile ilişkin gelişti.` : `${name} ile aranız gerildi.`;
    entries.push({ npcId, direction, text });
  }
  return entries;
}
