import { create, type StoreApi, type UseBoundStore } from "zustand";

import type { GameState, TusPrepProfileId } from "../domain/state/types";
import {
  createInitialGameState,
  type CharacterCreationInput,
} from "../domain/state/createInitialGameState";
import { beginTus } from "../domain/state/transitions";
import {
  startTusExam,
  recordTusExamChoice,
  generateTusResult,
  proceedToPreference,
  selectResidencyProgram,
} from "../domain/state/tusTransitions";
import { createScopedRng } from "../domain/rng/seededRng";
import type { ResidencyProgram } from "../domain/config/residencyPrograms";
import type { SaveRepository } from "../domain/persistence/SaveRepository";
import { createAsyncStorageSaveRepository } from "../persistence/asyncStorageSaveRepository";
import {
  advanceResidencyWeek,
  type WeekAdvanceResourceDelta,
  type WeekAdvanceTransitions,
} from "../domain/residency/advanceResidencyWeek";

export interface WeekSummary {
  week: number;
  transitions: WeekAdvanceTransitions;
  resourceDelta: WeekAdvanceResourceDelta;
}

export interface GameStore {
  gameState: GameState | null;
  status: "idle" | "loading" | "ready";
  hasSave: boolean;
  isAdvancingWeek: boolean;
  // Ephemeral — not persisted, not part of GameState. Resets to null on
  // every fresh load; only reflects "what just happened" within this
  // session, per the design bible's week-summary mock.
  lastWeekSummary: WeekSummary | null;

  loadGame: () => Promise<void>;
  createNewGame: (input: CharacterCreationInput) => Promise<void>;
  saveGame: () => Promise<void>;
  resetGame: () => Promise<void>;

  selectTusPrepProfile: (profileId: TusPrepProfileId) => Promise<void>;
  submitTusExamChoice: (eventId: string, choiceId: string) => Promise<void>;
  generateTusResultIfNeeded: () => Promise<void>;
  goToPreferenceList: () => Promise<void>;
  chooseResidencyProgram: (program: ResidencyProgram) => Promise<void>;
  advanceWeek: () => Promise<void>;
}

// The store's only job is orchestration (call domain functions, call the
// repository, hold the result for the UI) — it must never contain domain
// logic itself. Repository is injectable so tests don't need RN/AsyncStorage.
export function createGameStore(
  repository: SaveRepository
): UseBoundStore<StoreApi<GameStore>> {
  async function persist(set: (partial: Partial<GameStore>) => void, next: GameState) {
    await repository.save(next);
    set({ gameState: next });
  }

  return create<GameStore>((set, get) => ({
    gameState: null,
    status: "idle",
    hasSave: false,
    isAdvancingWeek: false,
    lastWeekSummary: null,

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

    async selectTusPrepProfile(profileId) {
      const { gameState } = get();
      if (!gameState) return;
      const rng = createScopedRng(gameState.meta.rngSeed, "tus:examselect");
      await persist(set, startTusExam(gameState, profileId, rng));
    },

    async submitTusExamChoice(eventId, choiceId) {
      const { gameState } = get();
      if (!gameState) return;
      await persist(set, recordTusExamChoice(gameState, eventId, choiceId));
    },

    async generateTusResultIfNeeded() {
      const { gameState } = get();
      if (!gameState || gameState.career.tusScore !== undefined) return;
      const rng = createScopedRng(gameState.meta.rngSeed, "tus:score");
      await persist(set, generateTusResult(gameState, rng));
    },

    async goToPreferenceList() {
      const { gameState } = get();
      if (!gameState) return;
      await persist(set, proceedToPreference(gameState));
    },

    async chooseResidencyProgram(program) {
      const { gameState } = get();
      if (!gameState) return;
      await persist(set, selectResidencyProgram(gameState, program));
    },

    async advanceWeek() {
      const { gameState, isAdvancingWeek } = get();
      // Double-submit guard: a refresh never re-triggers this (it's only
      // ever called from the button's onPress), but a rapid double-tap
      // before the first call's persist lands must not double-tick.
      if (!gameState || isAdvancingWeek || gameState.career.phase !== "residency") return;

      set({ isAdvancingWeek: true });
      try {
        const nextWeek = gameState.career.residencyWeek + 1;
        const rng = createScopedRng(gameState.meta.rngSeed, `residency:week:${nextWeek}`);
        const result = advanceResidencyWeek(gameState, rng);
        await repository.save(result.state);
        set({
          gameState: result.state,
          lastWeekSummary: { week: nextWeek, transitions: result.transitions, resourceDelta: result.resourceDelta },
        });
      } finally {
        set({ isAdvancingWeek: false });
      }
    },
  }));
}

export const useGameStore = createGameStore(createAsyncStorageSaveRepository());
