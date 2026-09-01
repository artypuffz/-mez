import { test, expect } from "@playwright/test";

import { loadDebugScenario, advanceUntilVisible, readDebugGameState, reloadAndResume } from "./helpers";

// Phase 9->10 tech debt closure (see Phase 9's final report) — the exact
// deep-state flow that couldn't be driven end to end before this
// harness existed: high burnout -> crisis card -> resignation -> Game
// Over -> Career Report -> New Career.
test("burnout crisis -> resignation -> Game Over -> Career Report -> New Career", async ({ page }) => {
  await loadDebugScenario(page, "high_burnout");
  await expect(page.getByTestId("event-card-crisis_burnout_01_yeter")).toBeVisible();

  // A specific real path through burnout-resignation.json's branching
  // (see data/events/crisis/burnout-resignation.json) that's guaranteed
  // to land on the resignation choice rather than one of the chain's
  // "keeps going" dead ends — picked by tracing each choice's flags
  // against each checkpoint's requirements.
  await page.getByTestId("choice-devam_et").click();

  await advanceUntilVisible(page, "event-card-crisis_burnout_02_agirlasiyor");
  await page.getByTestId("choice-devam").click();

  await advanceUntilVisible(page, "event-card-crisis_burnout_03_karar_ani");
  await page.getByTestId("choice-istifayi_dusun").click();

  await advanceUntilVisible(page, "event-card-crisis_burnout_04_karar");
  await page.getByTestId("choice-istifa_et").click();

  // useEndingRedirect (navigation/RootStack.tsx) fires the moment
  // career.phase flips to "gameover", from wherever the player was.
  await expect(page.getByTestId("gameover-screen")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("gameover-reason")).toHaveText("İSTİFA ETTİN");

  const state = await readDebugGameState(page);
  expect(state.gameOver.reason).toBe("resigned_burnout");
  expect(state.career.phase).toBe("gameover");

  await page.getByTestId("btn-career-report").click();
  await expect(page.getByTestId("career-report-screen")).toBeVisible();
  await expect(page.getByText("ASİSTANLIK KARNESİ")).toBeVisible();

  await page.getByTestId("btn-new-career").click();
  // resetGame() clears the save and replaces onto CharacterCreation.
  await expect(page.getByTestId("input-name")).toBeVisible();
});

// Phase 10 §28 — financial crisis flow: state -> kriz -> extra shift ->
// money/fatigue/stress change -> refresh -> same state -> devam.
test("financial crisis -> extra shift -> refresh preserves state -> continues", async ({ page }) => {
  await loadDebugScenario(page, "financial_crisis");
  await expect(page.getByTestId("event-card-crisis_financial_01_hesap_sifirin_altinda")).toBeVisible();

  const before = await readDebugGameState(page);
  expect(before.resources.money).toBeLessThan(0);

  await page.getByTestId("choice-ekstra_nobet_kabul_et").click();

  const afterChoice = await readDebugGameState(page);
  // immediateEffects on ekstra_nobet_kabul_et: money +3500, fatigue +5, stress +3.
  expect(afterChoice.resources.money).toBe(before.resources.money + 3500);
  expect(afterChoice.resources.fatigue).toBe(before.resources.fatigue + 5);
  expect(afterChoice.resources.stress).toBe(before.resources.stress + 3);
  expect(afterChoice.flags.financial_crisis_path).toBe("extra_shift");

  // Refresh (kill and relaunch, via Main Menu's "DEVAM ET") — the
  // resolved choice must not reroll or re-offer itself.
  await reloadAndResume(page);
  await expect(page.getByTestId("home-screen")).toBeVisible();
  const afterReload = await readDebugGameState(page);
  expect(afterReload.resources).toEqual(afterChoice.resources);
  expect(afterReload.career.phase).toBe("residency");

  // "extra_shift" routes stage2 to the no-further-escalation branch —
  // the chain simply continues, no career-ending risk from this path.
  await advanceUntilVisible(page, "event-card-crisis_financial_02_iyilesme");
  await page.getByTestId("choice-devam").click();
  await expect(page.getByTestId("home-screen")).toBeVisible();

  const finalState = await readDebugGameState(page);
  expect(finalState.career.phase).toBe("residency");
});
