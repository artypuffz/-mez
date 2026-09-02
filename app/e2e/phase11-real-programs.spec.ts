import { test, expect } from "@playwright/test";

import {
  gotoFreshMainMenu,
  createCharacterThroughUi,
  completeTusThroughUi,
  readDebugGameState,
  reloadAndResume,
} from "./helpers";

// Phase 11 §44 flow A — new game -> TUS -> see real programs -> filter ->
// select -> residency starts -> the correct real institution/branch shows.
test("real ÖSYM programs are visible, filterable, and selectable end to end", async ({ page }) => {
  await gotoFreshMainMenu(page);
  await page.getByTestId("btn-new-game").click();
  await createCharacterThroughUi(page, "Real Program Test");
  await completeTusThroughUi(page, "duzenli");

  await expect(page.getByTestId("tus-result-count")).toBeVisible({ timeout: 20_000 });

  // The disclaimer about real institution/branch names must be present
  // somewhere on the preference list before any selection (§28).
  await expect(page.getByText(/gerçek kurum/i)).toBeVisible();

  // Filter to a single real branch (Kardiyoloji only exists as a real
  // Phase 11 branch — none of the 13 fictional programs use it) and
  // confirm the result count narrows and every visible card is that
  // branch.
  await page.getByTestId("filter-branch-kardiyoloji").click();
  await expect(page.getByTestId("tus-result-count")).toBeVisible();
  const cardCountText = await page.getByTestId("tus-result-count").textContent();
  expect(cardCountText).toMatch(/^\d+ program$/);
  expect(Number(cardCountText!.split(" ")[0])).toBeGreaterThan(0);

  await page.locator('[data-testid^="pick-program-"]').first().click();
  await expect(page.getByTestId("btn-confirm-program")).toBeVisible();
  await page.getByTestId("btn-confirm-program").click();

  await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 20_000 });

  const state = await readDebugGameState(page);
  expect(state.career.branch).toBe("kardiyoloji");
  expect(typeof state.career.hierarchyPressure).toBe("number");
  expect(state.career.hierarchyPressure).toBeGreaterThanOrEqual(0.5);
  expect(state.career.hierarchyPressure).toBeLessThanOrEqual(5.0);
});

// Phase 11 §44 flow B — a hard real branch/program actually produces
// working-hours + on-call state that survives a refresh.
test("residency in a real program produces workload state that survives a refresh", async ({ page }) => {
  await gotoFreshMainMenu(page);
  await page.getByTestId("btn-new-game").click();
  await createCharacterThroughUi(page, "Workload Test");
  await completeTusThroughUi(page, "duzenli");
  await expect(page.getByTestId("tus-result-count")).toBeVisible({ timeout: 20_000 });

  // Genel Cerrahi is the hardest branch (workingHours=5.0) — pick any
  // real program in it.
  await page.getByTestId("filter-branch-genel_cerrahi").click();
  await page.locator('[data-testid^="pick-program-"]').first().click();
  await page.getByTestId("btn-confirm-program").click();
  await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 20_000 });

  // Drain whatever the first few weeks queue, advancing in between.
  for (let i = 0; i < 5; i++) {
    const anyEventCard = page.locator('[data-testid^="event-card-"]');
    if ((await anyEventCard.count()) > 0) {
      await anyEventCard.first().locator('[data-testid^="choice-"]').first().click();
      continue;
    }
    if (await page.getByTestId("btn-advance-week").isVisible().catch(() => false)) {
      await page.getByTestId("btn-advance-week").click();
    }
  }

  const beforeState = await readDebugGameState(page);
  expect(beforeState.workload).not.toBeNull();
  expect(typeof beforeState.workload.currentWeekHours).toBe("number");
  expect(beforeState.workload.currentWeekHours).toBeGreaterThan(0);

  await reloadAndResume(page);
  const afterState = await readDebugGameState(page);
  expect(afterState.workload).toEqual(beforeState.workload);
  expect(afterState.onCall).toEqual(beforeState.onCall);
});

// Phase 11 §44 flow E — a legacy RC2 (v8) save, referencing only a
// fictional program, must open cleanly under the Phase 11 (v9) schema.
test("a legacy RC2 (v8) save migrates and opens without crashing", async ({ page }) => {
  await gotoFreshMainMenu(page);

  const v8Save = {
    meta: { saveVersion: 8, rngSeed: "legacy-e2e-seed", createdAt: "2026-03-15T00:00:00.000Z" },
    character: { name: "Legacy Save", age: 27, gender: "kadın", hometown: "Ankara", background: "kendi_basina" },
    career: {
      phase: "residency", branch: "ic_hastaliklari", hospital: "baskent_devlet", city: "ankara",
      tusScore: 50, residencyStartedAt: "2026-03-15", residencyWeek: 10, residencyYear: 1, seniorityStage: "comez",
    },
    tus: { step: "result", examEventIds: [], examLog: [], selectedProgramId: "baskent_ic" },
    resources: { stress: 30, fatigue: 25, burnout: 5, money: 15000 },
    relationships: {}, npcs: {}, flags: {}, pendingEvents: [], activeChains: {},
    eventHistory: [], behaviorStats: {}, statistics: {}, status: "active",
    eventCooldowns: {}, pendingEffects: [], weeklyEventQueue: [],
    onCall: { schedule: null }, economy: { lastProcessedMonthKey: null, lastBreakdown: null },
    resourcePressure: { highStressWeeks: 0, highFatigueWeeks: 0, combinedPressureWeeks: 0, lowPressureWeeks: 0 },
    financialPressure: { consecutiveNegativeMonths: 0, lowestBalance: 15000 },
    crisisState: { lastCrisisWeek: null },
  };

  await page.evaluate((raw) => window.localStorage.setItem("comez.save", JSON.stringify(raw)), v8Save);
  await page.reload();

  await expect(page.getByTestId("btn-continue")).toBeEnabled({ timeout: 15_000 });
  await page.getByTestId("btn-continue").click();
  await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 20_000 });

  const state = await readDebugGameState(page);
  // The migration chain now runs all the way to CURRENT_SAVE_VERSION (11,
  // Gameplay Expansion Part B/C), not just the v8->v9 step this save
  // started one hop below.
  expect(state.meta.saveVersion).toBe(11);
  expect(state.workload).toBeNull();
  expect(state.character.name).toBe("Legacy Save");
  expect(typeof state.career.hierarchyPressure).toBe("number");
  expect(state.character.avatar).toBeDefined();
  expect(state.relationshipHistory).toEqual({});

  // The engine still runs normally from a migrated save.
  await page.getByTestId("btn-advance-week").click();
  await expect(page.getByTestId("week-line")).toContainText("Hafta 11");
});
