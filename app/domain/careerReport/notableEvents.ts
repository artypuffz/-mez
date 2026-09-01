import type { GameState } from "../state/types";

export interface NotableEvent {
  week: number;
  title: string;
  category: string;
}

// Phase 10 §15 — weighted-importance selection over eventHistory (the
// only source available; effect MAGNITUDES aren't stored per entry, so
// "large financial event" is approximated by category, not by re-deriving
// a resolved amount that was never persisted). "Chain ending" is detected
// structurally: the LAST eventHistory entry for a given chainId, since
// eventHistory is chronological and every chain's final checkpoint is
// simply whichever one happened last for that chainId.
function importanceWeight(entry: GameState["eventHistory"][number], isChainEnding: boolean): number {
  if (entry.category === "RARE") return 10;
  if (entry.category === "CRISIS") return 8;
  if (isChainEnding && entry.chainId) return 7;
  if (entry.category === "FINANCIAL") return 5;
  if (entry.category === "NPC") return 4;
  return 1;
}

export function selectNotableEvents(state: GameState, limit = 5): NotableEvent[] {
  const lastIndexByChain = new Map<string, number>();
  state.eventHistory.forEach((entry, i) => {
    if (entry.chainId) lastIndexByChain.set(entry.chainId, i);
  });

  const weighted = state.eventHistory.map((entry, i) => ({
    entry,
    weight: importanceWeight(entry, entry.chainId !== undefined && lastIndexByChain.get(entry.chainId) === i),
  }));

  return weighted
    .sort((a, b) => b.weight - a.weight || b.entry.week - a.entry.week)
    .slice(0, limit)
    .map(({ entry }) => ({ week: entry.week, title: entry.resolvedTitle, category: entry.category }));
}
