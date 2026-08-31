import { advanceResidencyWeekWithEvents, resolveEventChoice } from "./engine";
import { getEventRepository } from "./content";
import { buildRequirementContext } from "./requirements";
import { getVisibleChoices } from "./choices";
import { createInitialGameState } from "../state/createInitialGameState";
import { beginTus } from "../state/transitions";
import { selectResidencyProgram, proceedToPreference } from "../state/tusTransitions";
import { getResidencyProgram } from "../config/residencyPrograms";
import { createScopedRng } from "../rng/seededRng";
import type { GameState } from "../state/types";

export interface HeadlessSimulationConfig {
  seedCount: number;
  weeksPerSeed: number;
  programIds: string[];
}

export interface SimulationReport {
  totalWeeksSimulated: number;
  totalEventsTriggered: number;
  quietWeeks: number;
  categoryDistribution: Record<string, number>;
  eventFrequency: Record<string, number>;
  neverTriggeredPoolEventIds: string[];
  cooldownViolations: string[];
  crashes: string[];
}

function buildResidencyState(seed: string, programId: string): GameState {
  const initial = createInitialGameState(
    { name: "Sim", age: 26, gender: "belirtmek_istemiyorum", hometown: "Ankara", background: "kendi_basina" },
    { seed }
  );
  const program = getResidencyProgram(programId);
  return selectResidencyProgram(proceedToPreference(beginTus(initial)), program);
}

function rngs(seed: string, week: number) {
  return {
    weekRng: createScopedRng(seed, `residency:week:${week}`),
    eventsRng: createScopedRng(seed, `events:week:${week}`),
  };
}

// Not final balancing (§35) — a sanity pass to catch unreachable content,
// cooldown bugs, or a choiceless/crashing event before Phase 8 fills the
// pool out. Every queued event is resolved with its first visible choice
// (deterministic, keeps chains actually progressing through the run).
export function runHeadlessSimulation(config: HeadlessSimulationConfig): SimulationReport {
  const repo = getEventRepository();
  const allPoolIds = new Set(repo.getPoolEvents().map((e) => e.id));

  const eventFrequency: Record<string, number> = {};
  const categoryDistribution: Record<string, number> = {};
  const cooldownViolations: string[] = [];
  const crashes: string[] = [];
  let totalEventsTriggered = 0;
  let quietWeeks = 0;
  let totalWeeksSimulated = 0;

  for (let i = 0; i < config.seedCount; i++) {
    const seed = `headless-${i}`;
    const programId = config.programIds[i % config.programIds.length];
    const lastTriggeredWeek: Record<string, number> = {};

    try {
      let state = buildResidencyState(seed, programId);

      for (let week = 1; week <= config.weeksPerSeed; week++) {
        if (state.career.phase !== "residency") break;
        totalWeeksSimulated++;

        const { weekRng, eventsRng } = rngs(seed, week);
        const result = advanceResidencyWeekWithEvents(state, weekRng, eventsRng, repo);
        state = result.state;

        if (result.queuedEventIds.length === 0) quietWeeks++;
        totalEventsTriggered += result.queuedEventIds.length;

        for (const id of result.queuedEventIds) {
          eventFrequency[id] = (eventFrequency[id] ?? 0) + 1;
          const event = repo.getEventById(id);
          if (event) categoryDistribution[event.category] = (categoryDistribution[event.category] ?? 0) + 1;

          if (event?.triggerMode === "pool" && event.cooldownWeeks) {
            const last = lastTriggeredWeek[id];
            if (last !== undefined && week - last < event.cooldownWeeks) {
              cooldownViolations.push(`${id} retriggered at week ${week} (last ${last}, cooldownWeeks ${event.cooldownWeeks})`);
            }
            lastTriggeredWeek[id] = week;
          }
        }

        for (const id of [...state.weeklyEventQueue]) {
          const event = repo.getEventById(id);
          if (!event) {
            crashes.push(`seed=${seed} week=${week}: queued event "${id}" not found in repository`);
            continue;
          }
          const visible = getVisibleChoices(event, buildRequirementContext(state));
          if (visible.length === 0) {
            crashes.push(`seed=${seed} week=${week}: event "${id}" had zero visible choices at resolution time`);
            continue;
          }
          state = resolveEventChoice(state, event, visible[0].id, createScopedRng(seed, `resolve:${id}:${week}`)).state;
        }
      }
    } catch (err) {
      crashes.push(`seed=${seed} programId=${programId}: ${(err as Error).message}`);
    }
  }

  const neverTriggeredPoolEventIds = [...allPoolIds].filter((id) => !(id in eventFrequency)).sort();

  return {
    totalWeeksSimulated,
    totalEventsTriggered,
    quietWeeks,
    categoryDistribution,
    eventFrequency,
    neverTriggeredPoolEventIds,
    cooldownViolations,
    crashes,
  };
}
