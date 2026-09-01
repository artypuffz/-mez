import { describe, expect, it } from "vitest";

import { DEBUG_SCENARIO_IDS, buildDebugScenario } from "./debugScenarios";
import { getEventRepository } from "../events/content";

describe("buildDebugScenario", () => {
  const repository = getEventRepository();

  it("builds every named scenario without throwing", () => {
    for (const id of DEBUG_SCENARIO_IDS) {
      expect(() => buildDebugScenario(id, repository)).not.toThrow();
    }
  });

  it("is deterministic — same scenario id always returns the same state", () => {
    for (const id of DEBUG_SCENARIO_IDS) {
      const a = buildDebugScenario(id, repository);
      const b = buildDebugScenario(id, repository);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    }
  });

  it("high_burnout queues a resolvable crisis card with high pressure resources", () => {
    const state = buildDebugScenario("high_burnout", repository);
    expect(state.weeklyEventQueue).toHaveLength(1);
    expect(state.weeklyEventQueue[0].eventId).toBe("crisis_burnout_01_yeter");
    expect(repository.getEventById(state.weeklyEventQueue[0].eventId)).toBeDefined();
    expect(state.resources.burnout).toBeGreaterThan(60);
  });

  it("financial_crisis queues a resolvable financial crisis card with negative money", () => {
    const state = buildDebugScenario("financial_crisis", repository);
    expect(state.weeklyEventQueue[0].eventId).toBe("crisis_financial_01_hesap_sifirin_altinda");
    expect(state.resources.money).toBeLessThan(0);
  });

  it("residency_complete lands exactly one week before the branch's total residency length", () => {
    const state = buildDebugScenario("residency_complete", repository);
    expect(state.career.phase).toBe("residency");
    expect(state.career.residencyWeek).toBeGreaterThan(0);
  });

  it("specialist_exam is already in the specialist_exam phase with an attempt event queued", () => {
    const state = buildDebugScenario("specialist_exam", repository);
    expect(state.career.phase).toBe("specialist_exam");
    expect(state.specialistExam?.attempt).toBe(0);
    expect(state.weeklyEventQueue[0].eventId).toBe("specialist_exam_02_sinav_gunu");
  });

  it("gameover_burnout is already a terminal, resigned career", () => {
    const state = buildDebugScenario("gameover_burnout", repository);
    expect(state.career.phase).toBe("gameover");
    expect(state.status).toBe("gameover");
    expect(state.gameOver?.reason).toBe("resigned_burnout");
  });

  it("senior_power_reversal binds a real active NPC to the queued event", () => {
    const state = buildDebugScenario("senior_power_reversal", repository);
    const boundId = state.weeklyEventQueue[0].boundNpcIds.primary;
    expect(boundId).toBeTruthy();
    expect(state.npcs[boundId]).toBeDefined();
    expect(state.npcs[boundId].active).toBe(true);
  });

  it("baris_chain_midpoint has baris on the dostluk path with stage2 queued", () => {
    const state = buildDebugScenario("baris_chain_midpoint", repository);
    expect(state.flags.chain_baris_path).toBe("dostluk");
    expect(state.relationships.baris?.trust).toBeGreaterThanOrEqual(10);
    expect(state.weeklyEventQueue[0].eventId).toBe("chain_baris_02_dostluk");
  });

  it("every queued event's bound NPC selectors are satisfied (no missing npc lookups)", () => {
    for (const id of DEBUG_SCENARIO_IDS) {
      const state = buildDebugScenario(id, repository);
      for (const queued of state.weeklyEventQueue) {
        for (const npcId of Object.values(queued.boundNpcIds)) {
          expect(state.npcs[npcId]).toBeDefined();
        }
      }
    }
  });
});
