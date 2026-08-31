import { create, type StoreApi, type UseBoundStore } from "zustand";

import type { GameState } from "../domain/state/types";
import {
  createInitialGameState,
  type CharacterCreationInput,
} from "../domain/state/createInitialGameState";
import { beginTus } from "../domain/state/transitions";
import type { SaveRepository } from "../domain/persistence/SaveRepository";
import { createAsyncStorageSaveRepository } from "../persistence/asyncStorageSaveRepository";

export interface GameStore {
  gameState: GameState | null;
  status: "idle" | "loading" | "ready";
  hasSave: boolean;

  loadGame: () => Promise<void>;
  createNewGame: (input: CharacterCreationInput) => Promise<void>;
  saveGame: () => Promise<void>;
  resetGame: () => Promise<void>;
}

// The store's only job is orchestration (call domain functions, call the
// repository, hold the result for the UI) — it must never contain domain
// logic itself. Repository is injectable so tests don't need RN/AsyncStorage.
export function createGameStore(
  repository: SaveRepository
): UseBoundStore<StoreApi<GameStore>> {
  return create<GameStore>((set, get) => ({
    gameState: null,
    status: "idle",
    hasSave: false,

    async loadGame() {
      set({ status: "loading" });
      const loaded = await repository.load();
      set({ gameState: loaded, hasSave: loaded !== null, status: "ready" });
    },

    async createNewGame(input) {
      const created = createInitialGameState(input);
      const started = beginTus(created);
      await repository.save(started);
      set({ gameState: started, hasSave: true, status: "ready" });
    },

    async saveGame() {
      const { gameState } = get();
      if (!gameState) return;
      await repository.save(gameState);
    },

    async resetGame() {
      await repository.clear();
      set({ gameState: null, hasSave: false });
    },
  }));
}

export const useGameStore = createGameStore(createAsyncStorageSaveRepository());
