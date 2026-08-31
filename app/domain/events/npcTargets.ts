// Shared by RelationshipCondition/RelationshipEffect/npcTransitions: a
// target is either a fixed authored id (`npc: "baris"`, works exactly as
// in Phase 5) or a key into the current QueuedEventInstance's
// boundNpcIds (`boundNpc: "primary"`, resolved once at queue time — see
// domain/npc/selector.ts). Exactly one of the two is expected to be set;
// content validation enforces that, this resolver just picks whichever is
// present.
export interface NpcTargetRef {
  npc?: string;
  boundNpc?: string;
}

export function resolveNpcTargetId(
  target: NpcTargetRef,
  boundNpcIds: Record<string, string>
): string | undefined {
  if (target.npc) return target.npc;
  if (target.boundNpc) return boundNpcIds[target.boundNpc];
  return undefined;
}
