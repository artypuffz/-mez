import { test, expect } from "@playwright/test";

import { loadDebugScenario, readDebugGameState, reloadAndResume } from "./helpers";

// Phase 10 §28 — power-reversal flow: a kıdemli player with a junior NPC
// present, an exploitative-vs-protective choice, and the resulting
// behaviorTag change. behaviorStats are deliberately never rendered as
// raw numbers anywhere in the UI (see buildCareerReport's design), so
// this is necessarily an integration-level check via the dev-only debug
// bridge (store/useGameStore.ts's __COMEZ_DEBUG__) rather than a purely
// visual assertion — the domain-level boundary behavior (a single choice
// never fully flips the whole-career profile) is already covered by
// domain/careerReport/behaviorProfile.test.ts.
test("senior power-reversal choice updates behaviorStats and survives a refresh", async ({ page }) => {
  await loadDebugScenario(page, "senior_power_reversal");
  await expect(page.getByTestId("event-card-pr_007_angaryayi_asagi_aktar")).toBeVisible();

  const before = await readDebugGameState(page);
  expect(before.behaviorStats["junior:exploitative"] ?? 0).toBe(0);

  await page.getByTestId("choice-juniora_aktar").click();

  const afterChoice = await readDebugGameState(page);
  expect(afterChoice.behaviorStats["junior:exploitative"]).toBe(1);
  expect(afterChoice.statistics.power_reversal_repeated_cycle).toBe(1);
  // The event is consumed — it must not still be sitting in the queue.
  expect(afterChoice.weeklyEventQueue).toHaveLength(0);

  await reloadAndResume(page);
  await expect(page.getByTestId("home-screen")).toBeVisible();
  const afterReload = await readDebugGameState(page);
  expect(afterReload.behaviorStats["junior:exploitative"]).toBe(1);
  expect(afterReload.weeklyEventQueue).toHaveLength(0);
});
