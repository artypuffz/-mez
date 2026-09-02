import type { GameState, NpcId } from "../state/types";
import { generateNpcAvatar } from "./npcAvatar";
import type { PlayerAvatar } from "./types";

// Thin selector wrapper (mirrors domain/npc/rosterSelectors.ts's own
// pattern) — screens never call generateNpcAvatar directly, they read
// this, so the "which seed scope" decision lives in exactly one place.
export function selectNpcAvatar(state: GameState, npcId: NpcId): PlayerAvatar | null {
  const npc = state.npcs[npcId];
  if (!npc) return null;
  return generateNpcAvatar(state.meta.rngSeed, npc);
}
