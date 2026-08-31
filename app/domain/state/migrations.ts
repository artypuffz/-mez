import { CURRENT_SAVE_VERSION, type GameState } from "./types";

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
