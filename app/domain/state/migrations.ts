import { CURRENT_SAVE_VERSION, type GameState } from "./types";
import { deriveResidencyStartDate } from "../residency/calendar";
import { generateInitialClinic } from "../npc/generation";
import { getResidencyProgram } from "../config/residencyPrograms";
import { createScopedRng } from "../rng/seededRng";

// Each entry migrates FROM its key version TO key+1. load() always runs
// data through this, so adding support for a future save version only
// ever means adding one entry here — never touching call sites.
type Migration = (state: Record<string, unknown>) => Record<string, unknown>;

const migrations: Record<number, Migration> = {
  // v1 (Phase 2) had no `tus` slice — Phase 3 added it.
  1: (state) => ({
    ...state,
    meta: { ...(state.meta as Record<string, unknown>), saveVersion: 2 },
    tus: { step: "prep", examEventIds: [], examLog: [] },
  }),
  // v2 (Phase 3) had no career.residencyStartedAt — Phase 4 added it.
  // Only backfilled for a save already in residency; earlier phases pick
  // it up naturally via selectResidencyProgram when they get there.
  2: (state) => {
    const meta = state.meta as Record<string, unknown>;
    const career = state.career as Record<string, unknown>;
    const needsStart = career.phase === "residency" && !career.residencyStartedAt;
    return {
      ...state,
      meta: { ...meta, saveVersion: 3 },
      career: needsStart
        ? { ...career, residencyStartedAt: deriveResidencyStartDate(meta.createdAt as string) }
        : career,
    };
  },
  // v3 (Phase 4) had no event-engine bookkeeping — Phase 5 added it.
  3: (state) => ({
    ...state,
    meta: { ...(state.meta as Record<string, unknown>), saveVersion: 4 },
    eventCooldowns: {},
    pendingEffects: [],
    weeklyEventQueue: [],
  }),
  // v4 (Phase 5) had no NPC roster, a flat relationship shape that mixed
  // NPC personality into the dyadic relationship record, and a
  // weeklyEventQueue of bare event ids — Phase 6 split personality out of
  // relationships and added NPC-bound queue instances.
  4: (state) => {
    const meta = state.meta as Record<string, unknown>;
    const career = state.career as Record<string, unknown>;
    const tus = state.tus as Record<string, unknown> | undefined;
    const relationships = (state.relationships ?? {}) as Record<string, Record<string, unknown>>;
    const migratedRelationships: Record<string, unknown> = {};
    for (const [npcId, rel] of Object.entries(relationships)) {
      migratedRelationships[npcId] = { trust: rel.trust ?? 0, friendship: rel.friendship ?? 0, grudge: rel.grudge ?? 0 };
    }

    const oldQueue = (state.weeklyEventQueue ?? []) as unknown[];
    const migratedQueue = oldQueue.map((entry) =>
      typeof entry === "string" ? { instanceId: entry, eventId: entry, boundNpcIds: {} } : entry
    );

    // A save already mid-residency has no NPC roster at all pre-Phase-6 —
    // backfill one the same deterministic way a fresh selectResidencyProgram
    // would (same rng scope, so it's not an arbitrary reroll), rather than
    // leaving the clinic permanently empty for every already-in-progress
    // save. Any relationship record the player already had under a real
    // roster id (chiefly "baris", whose id equals his templateId) overlays
    // the freshly generated one so existing progress isn't wiped; abstract
    // ids with no backing NpcState (e.g. "hoca_generic") are left as-is —
    // that pattern predates Phase 6 and still works unchanged.
    const programId = tus?.selectedProgramId as string | undefined;
    let npcs: Record<string, unknown> = {};
    let mergedRelationships = migratedRelationships;
    if (career.phase === "residency" && programId) {
      const program = getResidencyProgram(programId);
      const npcRng = createScopedRng(meta.rngSeed as string, `npc:initial:${program.id}`);
      const generated = generateInitialClinic(program, npcRng);
      npcs = Object.fromEntries(generated.npcs.map((npc) => [npc.id, npc]));
      mergedRelationships = { ...generated.relationships, ...migratedRelationships };
    }

    return {
      ...state,
      meta: { ...meta, saveVersion: 5 },
      relationships: mergedRelationships,
      npcs,
      weeklyEventQueue: migratedQueue,
    };
  },
};

export function migrateSaveData(raw: unknown): GameState {
  let state = raw as Record<string, unknown>;
  let version = ((state?.meta as Record<string, unknown> | undefined)?.saveVersion as number) ?? 0;

  while (version < CURRENT_SAVE_VERSION) {
    const migrate = migrations[version];
    if (!migrate) {
      throw new Error(
        `No migration registered to move a save from version ${version} to ${version + 1}`
      );
    }
    state = migrate(state);
    version = (state.meta as Record<string, unknown>).saveVersion as number;
  }

  return state as unknown as GameState;
}
