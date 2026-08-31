import type { SaveRepository } from "./SaveRepository";
import type { GameState } from "../state/types";

// Test double — same contract the real AsyncStorage-backed repository
// implements, so store/repository logic is testable without RN.
export function createInMemorySaveRepository(): SaveRepository {
  let stored: GameState | null = null;
  return {
    async save(state) {
      stored = state;
    },
    async load() {
      return stored;
    },
    async clear() {
      stored = null;
    },
  };
}
