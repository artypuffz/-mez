import { test, expect, type Page } from "@playwright/test";

import { loadDebugScenario, advanceUntilVisible } from "./helpers";

// RC2 §5/§6/§19 (RC-IMP-003) — Game Over, Specialist Ending, Career
// Report, and the post-"New Career"/"Ana Menü" screens must never leave
// the old Residency stack entry reachable by going back. There's no real
// Android hardware back button in this environment and the web build
// doesn't sync to browser history (confirmed during the RC1 review), so
// this asserts on the actual react-navigation stack shape via the
// dev-only bridge (navigation/RootStack.tsx's useNavigationDebugBridge)
// rather than literally pressing a hardware button — that part stays
// NOT TESTED on real hardware, reported honestly in the RC report.
async function getNavState(page: Page) {
  return page.evaluate(() => (window as any).__COMEZ_DEBUG__?.getNavigationState());
}

async function tryGoBack(page: Page) {
  return page.evaluate(() => (window as any).__COMEZ_DEBUG__?.navigationGoBack());
}

test("Game Over redirect resets the stack — nothing to back into from Residency", async ({ page }) => {
  await loadDebugScenario(page, "gameover_burnout");
  await expect(page.getByTestId("gameover-screen")).toBeVisible();

  const state = await getNavState(page);
  expect(state.routes).toHaveLength(1);
  expect(state.routes[0].name).toBe("GameOver");

  // goBack() is react-navigation's own dispatch — the same action
  // Android's hardware back button triggers. With a single-route stack
  // there is nothing to pop to.
  const wentBack = await tryGoBack(page);
  expect(wentBack).toBe(false);
  await expect(page.getByTestId("gameover-screen")).toBeVisible();
});

test("Game Over -> Career Report replaces rather than pushes — back still can't reach Residency", async ({
  page,
}) => {
  await loadDebugScenario(page, "gameover_burnout");
  await expect(page.getByTestId("gameover-screen")).toBeVisible();

  await page.getByTestId("btn-career-report").click();
  await expect(page.getByTestId("career-report-screen")).toBeVisible();

  const state = await getNavState(page);
  expect(state.routes).toHaveLength(1);
  expect(state.routes[0].name).toBe("CareerReport");

  const wentBack = await tryGoBack(page);
  expect(wentBack).toBe(false);
});

test("Specialist Ending redirect resets the stack — nothing to back into from Residency", async ({ page }) => {
  await loadDebugScenario(page, "specialist_exam");
  await expect(page.getByTestId("event-card-specialist_exam_02_sinav_gunu")).toBeVisible();
  await page.getByTestId("choice-sinava_gir").click();
  await advanceUntilVisible(page, "event-card-specialist_exam_03_gectin");
  await page.getByTestId("choice-devam").click();
  await expect(page.getByTestId("specialist-ending-screen")).toBeVisible({ timeout: 10_000 });

  const state = await getNavState(page);
  expect(state.routes).toHaveLength(1);
  expect(state.routes[0].name).toBe("SpecialistEnding");

  const wentBack = await tryGoBack(page);
  expect(wentBack).toBe(false);
});

test("New Career after Game Over lands on a single-route stack, not stacked on the old ending", async ({
  page,
}) => {
  await loadDebugScenario(page, "gameover_burnout");
  await page.getByTestId("btn-career-report").click();
  await expect(page.getByTestId("career-report-screen")).toBeVisible();

  await page.getByTestId("btn-new-career").click();
  await expect(page.getByTestId("input-name")).toBeVisible();

  const state = await getNavState(page);
  expect(state.routes).toHaveLength(1);
  expect(state.routes[0].name).toBe("CharacterCreation");

  const wentBack = await tryGoBack(page);
  expect(wentBack).toBe(false);
});
