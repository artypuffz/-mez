import type { GameState } from "./types";

// The only phase transition Phase 2 needs: character creation is complete,
// move on to TUS. Later phases (tus -> preference -> residency -> ...)
// get their own transition functions when that gameplay actually exists.
export function beginTus(state: GameState): GameState {
  return {
    ...state,
    career: { ...state.career, phase: "tus" },
  };
}
