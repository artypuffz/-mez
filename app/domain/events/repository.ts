import type { EventCategory, EventDefinition } from "./types";

export interface EventRepository {
  getAllEvents(): EventDefinition[];
  getEventById(id: string): EventDefinition | undefined;
  getPoolEvents(): EventDefinition[];
  getPoolEventsByCategory(category: EventCategory): EventDefinition[];
  getCheckpointCandidates(chainId: string, checkpoint: string): EventDefinition[];
}

function checkpointKey(chainId: string, checkpoint: string): string {
  return `${chainId}::${checkpoint}`;
}

// Indexes are built once at construction (§30) — every lookup after that
// is O(1) map access, no re-scanning the content array per choice/week.
// Events are sorted by id first, so array order (used as the final
// deterministic tiebreak in checkpoint/pool selection) never depends on
// JSON file load order.
export function createEventRepository(events: EventDefinition[]): EventRepository {
  const sorted = [...events].sort((a, b) => a.id.localeCompare(b.id));

  const byId = new Map<string, EventDefinition>();
  const byCategory = new Map<EventCategory, EventDefinition[]>();
  const byChainCheckpoint = new Map<string, EventDefinition[]>();
  const pool: EventDefinition[] = [];

  for (const event of sorted) {
    byId.set(event.id, event);

    const categoryList = byCategory.get(event.category) ?? [];
    categoryList.push(event);
    byCategory.set(event.category, categoryList);

    if (event.triggerMode === "pool") {
      pool.push(event);
    }

    // Only "scheduled" events are checkpoint candidates (§4.1) — a "pool"
    // event can carry chainId/chainCheckpoint too (e.g. a chain's stage1
    // entry point) purely for identification, but must never be picked
    // by checkpoint resolution.
    if (event.chainId && event.chainCheckpoint && event.triggerMode === "scheduled") {
      const key = checkpointKey(event.chainId, event.chainCheckpoint);
      const list = byChainCheckpoint.get(key) ?? [];
      list.push(event);
      byChainCheckpoint.set(key, list);
    }
  }

  return {
    getAllEvents: () => sorted,
    getEventById: (id) => byId.get(id),
    getPoolEvents: () => pool,
    getPoolEventsByCategory: (category) => (byCategory.get(category) ?? []).filter((e) => e.triggerMode === "pool"),
    getCheckpointCandidates: (chainId, checkpoint) => byChainCheckpoint.get(checkpointKey(chainId, checkpoint)) ?? [],
  };
}
