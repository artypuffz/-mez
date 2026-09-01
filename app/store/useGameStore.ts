import { create, type StoreApi, type UseBoundStore } from "zustand";

import type { GameState, ResolvedResourceDelta, TusPrepProfileId } from "../domain/state/types";
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
import type { WeekAdvanceResourceDelta, WeekAdvanceTransitions } from "../domain/residency/advanceResidencyWeek";
import { advanceResidencyWeekWithEvents, advanceSpecialistExamWeek, resolveEventChoice } from "../domain/events/engine";
import { getEventRepository } from "../domain/events/content";
import { buildDebugScenario, type DebugScenarioId } from "../domain/debug/debugScenarios";

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
  isResolvingEvent: boolean;
  // Ephemeral — not persisted, not part of GameState. Resets to null on
  // every fresh load; only reflects "what just happened" within this
  // session, per the design bible's week-summary mock.
  lastWeekSummary: WeekSummary | null;
  // Same idea, per resolved choice — visible resource deltas only, never
  // hidden relationship/flag/behaviorTag effects (§26/27).
  lastChoiceEffects: ResolvedResourceDelta | null;

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
  resolveActiveEventChoice: (eventId: string, choiceId: string) => Promise<void>;
  // Phase 10 §30 — dev/test-only deterministic state seeding. A no-op
  // under `__DEV__ === false` (a release/production build), so this is
  // never reachable outside a dev server or the E2E harness driving one.
  debugLoadScenario: (scenarioId: DebugScenarioId) => Promise<void>;
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
    isResolvingEvent: false,
    lastWeekSummary: null,
    lastChoiceEffects: null,

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
      // Double-submit guard (rapid double-tap before the first call's
      // persist lands) + the §20 rule: can't advance with an unresolved
      // event queue from the previous week still sitting there.
      const phase = gameState?.career.phase;
      if (!gameState || isAdvancingWeek || (phase !== "residency" && phase !== "specialist_exam")) return;
      if (gameState.weeklyEventQueue.length > 0) return;

      set({ isAdvancingWeek: true, lastChoiceEffects: null });
      try {
        if (phase === "specialist_exam") {
          // Phase 10 §1 — its own, much lighter week-advance path; no
          // WeekSummary card (no baseline resource tick to summarize).
          const result = advanceSpecialistExamWeek(gameState, getEventRepository());
          await repository.save(result.state);
          set({ gameState: result.state, lastWeekSummary: null });
          return;
        }

        const nextWeek = gameState.career.residencyWeek + 1;
        const weekRng = createScopedRng(gameState.meta.rngSeed, `residency:week:${nextWeek}`);
        const eventsRng = createScopedRng(gameState.meta.rngSeed, `events:week:${nextWeek}`);
        const result = advanceResidencyWeekWithEvents(gameState, weekRng, eventsRng, getEventRepository());
        await repository.save(result.state);
        set({
          gameState: result.state,
          lastWeekSummary: {
            week: nextWeek,
            transitions: result.weekAdvance.transitions,
            resourceDelta: result.weekAdvance.resourceDelta,
          },
        });
        if (__DEV__) {
          // Dev-only debug trace (§31) — never rendered in the UI.
          console.log("[events] week trace", nextWeek, result.trace);
        }
      } finally {
        set({ isAdvancingWeek: false });
      }
    },

    async resolveActiveEventChoice(eventId, choiceId) {
      const { gameState, isResolvingEvent } = get();
      if (!gameState || isResolvingEvent) return;
      if (!gameState.weeklyEventQueue.some((q) => q.eventId === eventId)) return;

      set({ isResolvingEvent: true });
      try {
        const event = getEventRepository().getEventById(eventId);
        if (!event) return;
        const rng = createScopedRng(
          gameState.meta.rngSeed,
          `events:choice:${gameState.career.residencyWeek}:${eventId}:${choiceId}`
        );
        const result = resolveEventChoice(gameState, event, choiceId, rng);
        await repository.save(result.state);
        set({ gameState: result.state, lastChoiceEffects: result.visibleEffects });
      } finally {
        set({ isResolvingEvent: false });
      }
    },

    async debugLoadScenario(scenarioId) {
      if (!__DEV__) return;
      const state = buildDebugScenario(scenarioId, getEventRepository());
      await persist(set, state);
      set({ hasSave: true, lastWeekSummary: null, lastChoiceEffects: null });
    },
  }));
}

export const useGameStore = createGameStore(createAsyncStorageSaveRepository());

// Phase 10 §29 — a dev/test-only, read-only bridge so the Playwright E2E
// harness (which only sees the rendered DOM otherwise) can assert on
// internal state that's deliberately never rendered as raw numbers (e.g.
// behaviorStats — see docs/event-design-bible.md). `__DEV__` is false in
// a release build and `window` doesn't exist on native, so this is a
// no-op there; on the web dev server it's the only thing exposed here,
// and it exposes a snapshot getter, never a setter — state mutation
// still only happens through the store's own actions.
if (__DEV__ && typeof window !== "undefined") {
  (window as unknown as { __COMEZ_DEBUG__?: unknown }).__COMEZ_DEBUG__ = {
    getGameState: () => useGameStore.getState().gameState,
  };
}
