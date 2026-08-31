import type { GameState } from "../state/types";

// Pure contract — no storage technology named here. app/persistence/
// provides the real (AsyncStorage) implementation; tests use the
// in-memory one in this same folder.
export interface SaveRepository {
  save(state: GameState): Promise<void>;
  load(): Promise<GameState | null>;
  clear(): Promise<void>;
}
