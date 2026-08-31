import { advanceResidencyWeekWithEvents } from "../events/engine";
import { createEventRepository } from "../events/repository";
import { createInitialGameState } from "../state/createInitialGameState";
import { beginTus } from "../state/transitions";
import { selectResidencyProgram, proceedToPreference } from "../state/tusTransitions";
import { getResidencyProgram } from "../config/residencyPrograms";
import { createScopedRng } from "../rng/seededRng";
import type { GameState } from "../state/types";

export interface HeadlessNpcSimulationConfig {
  seedCount: number;
  weeksPerSeed: number;
  programIds: string[];
}

export interface HeadlessNpcSimulationReport {
  startingAverageNpcCount: number;
  activeNpcCountAfterRun: number[];
  averageActiveNpcCountAfterRun: number;
  becameSpecialistCount: number;
  leftCount: number;
  arrivedCount: number;
  everWentFullyEmpty: boolean;
  duplicateIdOrNameCases: string[];
  crashes: string[];
  // §33 — relationship sanity, gathered with zero player interaction
  // (this simulation never resolves a choice, so relationshipEffects
  // never fire; only passive decay + generation ever touch a relationship).
  relationshipExtremes: { atMaxTrustOrFriendship: number; atMaxGrudge: number };
  totalRelationshipsObserved: number;
}

// The event repository is intentionally EMPTY — no event content ever
// fires, so weeklyEventQueue stays empty and nothing ever resolves a
// choice. Only the monthly NPC lifecycle tick and passive relationship
// decay (both wired into advanceResidencyWeekWithEvents on monthChanged)
// ever touch npcs/relationships here — isolating exactly what §32/§33 ask
// to be sanity-checked, uncontaminated by which events happened to fire.
const emptyRepo = createEventRepository([]);

function buildResidencyState(seed: string, programId: string): GameState {
  const initial = createInitialGameState(
    { name: "Sim", age: 26, gender: "belirtmek_istemiyorum", hometown: "Ankara", background: "kendi_basina" },
    { seed }
  );
  const program = getResidencyProgram(programId);
  return selectResidencyProgram(proceedToPreference(beginTus(initial)), program);
}

export function runHeadlessNpcSimulation(config: HeadlessNpcSimulationConfig): HeadlessNpcSimulationReport {
  const activeNpcCountAfterRun: number[] = [];
  const startingCounts: number[] = [];
  let becameSpecialistCount = 0;
  let leftCount = 0;
  let arrivedCount = 0;
  let everWentFullyEmpty = false;
  const duplicateIdOrNameCases: string[] = [];
  const crashes: string[] = [];
  let atMaxTrustOrFriendship = 0;
  let atMaxGrudge = 0;
  let totalRelationshipsObserved = 0;

  for (let i = 0; i < config.seedCount; i++) {
    const seed = `npc-headless-${i}`;
    const programId = config.programIds[i % config.programIds.length];

    try {
      let state = buildResidencyState(seed, programId);
      startingCounts.push(Object.values(state.npcs).filter((n) => n.active).length);

      for (let week = 1; week <= config.weeksPerSeed; week++) {
        if (state.career.phase !== "residency") break;
        const weekRng = createScopedRng(seed, `residency:week:${week}`);
        const eventsRng = createScopedRng(seed, `events:week:${week}`);
        const result = advanceResidencyWeekWithEvents(state, weekRng, eventsRng, emptyRepo);
        state = result.state;

        for (const t of result.npcTransitions) {
          if (t.type === "became_specialist") becameSpecialistCount++;
          if (t.type === "left") leftCount++;
          if (t.type === "arrived") arrivedCount++;
        }

        if (Object.values(state.npcs).every((n) => !n.active)) {
          everWentFullyEmpty = true;
        }
      }

      const allIds = Object.keys(state.npcs);
      if (new Set(allIds).size !== allIds.length) {
        duplicateIdOrNameCases.push(`seed=${seed}: duplicate npc id in roster`);
      }
      const activeNames = Object.values(state.npcs).filter((n) => n.active).map((n) => n.identity.name);
      if (new Set(activeNames).size !== activeNames.length) {
        duplicateIdOrNameCases.push(`seed=${seed}: duplicate active npc name in roster`);
      }

      activeNpcCountAfterRun.push(Object.values(state.npcs).filter((n) => n.active).length);

      for (const rel of Object.values(state.relationships)) {
        totalRelationshipsObserved++;
        if (rel.trust >= 100 || rel.trust <= -100 || rel.friendship >= 100 || rel.friendship <= -100) atMaxTrustOrFriendship++;
        if (rel.grudge >= 100) atMaxGrudge++;
      }
    } catch (err) {
      crashes.push(`seed=${seed} programId=${programId}: ${(err as Error).message}`);
    }
  }

  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

  return {
    startingAverageNpcCount: sum(startingCounts) / startingCounts.length,
    activeNpcCountAfterRun,
    averageActiveNpcCountAfterRun: sum(activeNpcCountAfterRun) / (activeNpcCountAfterRun.length || 1),
    becameSpecialistCount,
    leftCount,
    arrivedCount,
    everWentFullyEmpty,
    duplicateIdOrNameCases,
    crashes,
    relationshipExtremes: { atMaxTrustOrFriendship, atMaxGrudge },
    totalRelationshipsObserved,
  };
}
