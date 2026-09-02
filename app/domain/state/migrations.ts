import { CURRENT_SAVE_VERSION, type Gender, type GameState } from "./types";
import { deriveResidencyStartDate } from "../residency/calendar";
import { generateInitialClinic } from "../npc/generation";
import { getResidencyProgram } from "../config/residencyPrograms";
import { createScopedRng } from "../rng/seededRng";
import { resolveFinalHierarchyPressure } from "../residency/hospitalCulture";
import { DEFAULT_RESOURCES } from "../config/resources";
import { randomizePlayerAvatar } from "../avatar/randomize";

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
  // v5 (Phase 6) had no on-call/economy state — Phase 7 added both.
  // Unlike the Phase 6 NPC backfill, no retroactive generation is needed
  // here: an empty onCall/economy slice is completely safe because both
  // regenerate naturally on the save's very next monthChanged tick (the
  // same monthKey guard that makes them idempotent also makes "start
  // empty" a correct starting state, not a special case).
  5: (state) => ({
    ...state,
    meta: { ...(state.meta as Record<string, unknown>), saveVersion: 6 },
    onCall: { schedule: null },
    economy: { lastProcessedMonthKey: null, lastBreakdown: null },
  }),
  // v6 (Phase 7) had no sustained-pressure/financial-pressure/crisis
  // bookkeeping or gameOver slot — Phase 9 added all four. Streaks/
  // pressure start from zero rather than being reconstructed from
  // eventHistory (§48 only requires a save load safely, not that a
  // years-old save retroactively gets pressure history it never tracked);
  // lowestBalance backfills from the save's CURRENT money so it reads as
  // "the lowest seen so far" rather than an impossible 0.
  6: (state) => {
    const resources = state.resources as Record<string, unknown>;
    return {
      ...state,
      meta: { ...(state.meta as Record<string, unknown>), saveVersion: 7 },
      resourcePressure: { highStressWeeks: 0, highFatigueWeeks: 0, combinedPressureWeeks: 0, lowPressureWeeks: 0 },
      financialPressure: { consecutiveNegativeMonths: 0, lowestBalance: (resources?.money as number) ?? 0 },
      crisisState: { lastCrisisWeek: null },
    };
  },
  // v7 (Phase 9) had no specialist-exam bookkeeping — Phase 10 added it.
  // No new field needs a real default (specialistExam is optional, absent
  // until the exam actually starts). The one real case handled here: a
  // save that reached the pre-Phase-10 "residency_complete" placeholder
  // gets bumped straight to "specialist_exam" with its opening chain
  // event seeded, the same collapse advanceResidencyWeekWithEvents now
  // does for every NEW run — an old save must not get stuck on a phase
  // value the game no longer knows how to render.
  7: (state) => {
    const career = state.career as Record<string, unknown>;
    const wasResidencyComplete = career.phase === "residency_complete";
    const week = (career.residencyWeek as number) ?? 0;
    return {
      ...state,
      meta: { ...(state.meta as Record<string, unknown>), saveVersion: 8 },
      career: wasResidencyComplete ? { ...career, phase: "specialist_exam" } : career,
      pendingEvents: wasResidencyComplete
        ? [
            ...((state.pendingEvents as unknown[]) ?? []),
            { chainId: "specialist_exam", checkpoint: "stage1", triggerWeek: week, sourceEventId: "residency_completed", sourceChoiceId: "auto" },
          ]
        : (state.pendingEvents ?? []),
    };
  },
  // v8 (RC2) had no working-hours state and no persisted
  // career.hierarchyPressure — Phase 11 added both. workload always
  // starts null (same "safe to start empty, regenerates on the next
  // weekly tick" reasoning as v5's onCall/economy backfill above).
  // hierarchyPressure is backfilled ONLY for a save already mid-residency
  // with a resolvable program+branch, using the exact same deterministic
  // formula selectResidencyProgram now uses — a legacy save's existing
  // fictional program still has its own static hiddenProfile.mobbingRisk
  // (never absent for the 12 Phase 3 programs), so this backfill only
  // ever feeds the event-weight modifier, never the NPC-culture fallback
  // (that fallback only triggers for mobbingRisk-less REAL programs,
  // which cannot appear in a save older than Phase 11). A save with an
  // unresolvable/removed program id is left without hierarchyPressure
  // rather than thrown on — the event-weight modifier treats an absent
  // value as a no-op (multiplier 1), never a crash.
  8: (state) => {
    const meta = state.meta as Record<string, unknown>;
    const career = state.career as Record<string, unknown>;
    const tus = state.tus as Record<string, unknown> | undefined;
    const programId = tus?.selectedProgramId as string | undefined;
    let hierarchyPressure: number | undefined;
    if (career.phase === "residency" && programId) {
      try {
        hierarchyPressure = resolveFinalHierarchyPressure(meta.rngSeed as string, getResidencyProgram(programId));
      } catch {
        hierarchyPressure = undefined;
      }
    }
    return {
      ...state,
      meta: { ...meta, saveVersion: 9 },
      career: hierarchyPressure !== undefined ? { ...career, hierarchyPressure } : career,
      workload: null,
    };
  },
  // v9 (Phase 11) had no health/social resources, no schedule/freeTime,
  // and no lifestyle/ownership state — Gameplay Expansion Part A added
  // all four. Same "safe to start empty/neutral, regenerates or is read
  // fresh on the next weekly tick" reasoning as every prior migration
  // that added a derived-state slice (v5's onCall/economy, v9's
  // workload): health/social get a neutral (not punishing, not
  // rewarding) default matching DEFAULT_RESOURCES exactly, so an
  // existing character isn't retroactively given a life history it never
  // had; schedule starts null (regenerates the next tick, same as
  // workload); freeTime starts zeroed (recomputed the next tick);
  // lifestyle/ownership both start at "normal" — the ONE tier value that
  // is mathematically a no-op against the pre-Part-A expense formula (see
  // domain/economy/expenses.ts), so an existing save's monthly economy
  // numbers do not silently change out from under it just because this
  // migration ran.
  9: (state) => {
    const meta = state.meta as Record<string, unknown>;
    const resources = state.resources as Record<string, unknown>;
    return {
      ...state,
      meta: { ...meta, saveVersion: 10 },
      resources: { ...resources, health: DEFAULT_RESOURCES.health, social: DEFAULT_RESOURCES.social },
      schedule: null,
      freeTime: { totalHours: 0, usedHours: 0 },
      lifestyle: { foodTier: "normal" },
      ownership: { phone: "old", computer: "none", housing: "normal" },
    };
  },
  // v10 (Gameplay Expansion Part A) had no character.avatar and no
  // relationshipHistory — Part B/C added both. avatar is backfilled
  // DETERMINISTICALLY from this exact save's own rngSeed via the same
  // `avatar:player:initial` scope createInitialGameState uses for a
  // player who skips Character Creation's Görünüş step — so an existing
  // character gets *a* stable, reproducible look (not a fresh random one
  // on every load) rather than the fresh-game default appearing to
  // "reroll" on migration. NPC avatars need NO migration at all — they're
  // computed on demand from (rngSeed, npcId), never persisted, so a
  // migrated save's NPCs are already fully covered (see
  // domain/avatar/npcAvatar.ts). relationshipHistory starts empty per NPC
  // — same "safe to start empty, only ever grows forward" reasoning as
  // every other capped/derived collection in this file; it does NOT
  // retroactively reconstruct history from eventHistory (that would mix
  // old, summary-less content into a feature that only ever shows
  // authored interactionSummary text).
  10: (state) => {
    const meta = state.meta as Record<string, unknown>;
    const character = state.character as Record<string, unknown>;
    // Android Device QA Hotfix 1, Issue 1 — the backfilled avatar must
    // respect the character's already-stored gender, same as any other
    // automatic generation.
    const avatar = randomizePlayerAvatar(createScopedRng(meta.rngSeed as string, "avatar:player:initial"), character.gender as Gender);
    return {
      ...state,
      meta: { ...meta, saveVersion: 11 },
      character: { ...character, avatar },
      relationshipHistory: {},
    };
  },
};

export function migrateSaveData(raw: unknown): GameState {
  let state = raw as Record<string, unknown>;
  let version = ((state?.meta as Record<string, unknown> | undefined)?.saveVersion as number) ?? 0;

  // RC2 (RC-001 test matrix) — a saveVersion ABOVE current isn't a
  // migration case the `while` loop below ever runs for (its guard is
  // `version < CURRENT_SAVE_VERSION`), so it used to fall straight
  // through and return the raw, unvalidated object as-is — a save
  // written by a newer app version, or simply a corrupted saveVersion
  // number, would sail through here and only crash later, wherever it
  // first got read. Same "we can't load this" failure as an unmigratable
  // version below current; the caller's try/catch treats it identically.
  if (version > CURRENT_SAVE_VERSION) {
    throw new Error(`Save version ${version} is newer than this app supports (current: ${CURRENT_SAVE_VERSION})`);
  }

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
