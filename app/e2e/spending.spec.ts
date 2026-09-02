import { test, expect } from "@playwright/test";

import { drainAllVisibleEvents, loadDebugScenario, readDebugGameState, reloadAndResume, resolveFirstVisibleChoice } from "./helpers";

// Gameplay Expansion Part B §9/§10/§66 — proves: Harcamalar -> an
// activity action -> money/free time/resources change immediately in the
// UI (no double-submit) -> navigate away -> refresh -> the result
// persists (never replays/re-applies on reload).
test("resolving a spending activity updates money/free time/resources immediately and persists across navigation + refresh", async ({
  page,
}) => {
  await loadDebugScenario(page, "senior_power_reversal");
  await resolveFirstVisibleChoice(page);
  await drainAllVisibleEvents(page);

  // A real weekly tick (not a hand-seeded debug scenario) is what
  // actually populates Part A's freeTime/schedule state.
  await page.getByTestId("btn-advance-week").click();
  await drainAllVisibleEvents(page);
  await expect(page.getByTestId("home-screen")).toBeVisible();

  const before = await readDebugGameState(page);
  expect(before.freeTime.totalHours).toBeGreaterThan(0);

  await page.getByRole("tab", { name: /Harcamalar/ }).click();
  await expect(page.getByTestId("activity-evde_dinlen")).toBeVisible();
  await page.getByTestId("btn-activity-evde_dinlen").click();

  // Immediate UI feedback: the same activity now shows its cooldown
  // rejection rather than staying clickable (no artificial delay, no
  // double-submit window).
  await expect(page.getByText("Yakın zamanda yapıldı.")).toBeVisible();

  const afterResolve = await readDebugGameState(page);
  expect(afterResolve.freeTime.usedHours).toBe(before.freeTime.usedHours + 6);
  expect(afterResolve.resources.fatigue).toBeLessThan(before.resources.fatigue);
  expect(afterResolve.statistics["spending:total"]).toBe((before.statistics["spending:total"] ?? 0) + 1);

  // Double-tap safety: the button is already gated by eligibility, a
  // second click must not double-apply the effect.
  await page.getByTestId("btn-activity-evde_dinlen").click({ force: true }).catch(() => {});
  const afterSecondTap = await readDebugGameState(page);
  expect(afterSecondTap.freeTime.usedHours).toBe(afterResolve.freeTime.usedHours);

  // Navigate away and back — result must still be there, not re-rolled.
  await page.getByRole("tab", { name: /Ana Sayfa/ }).click();
  await expect(page.getByTestId("home-screen")).toBeVisible();
  await page.getByRole("tab", { name: /Harcamalar/ }).click();
  await expect(page.getByText("Yakın zamanda yapıldı.")).toBeVisible();

  // Refresh — the resolved activity's effects persist, no replay.
  await reloadAndResume(page);
  const afterReload = await readDebugGameState(page);
  expect(afterReload.freeTime.usedHours).toBe(afterResolve.freeTime.usedHours);
  expect(afterReload.resources.fatigue).toBe(afterResolve.resources.fatigue);
  expect(afterReload.statistics["spending:total"]).toBe(afterResolve.statistics["spending:total"]);
});

// §9/§47 — a lifestyle tier switch (free, immediate, no cost) — separate
// from the paid activities above.
test("changing food tier in Yaşam Tarzı applies immediately and persists across refresh", async ({ page }) => {
  await loadDebugScenario(page, "senior_power_reversal");
  await resolveFirstVisibleChoice(page);
  await drainAllVisibleEvents(page);
  await expect(page.getByTestId("home-screen")).toBeVisible();

  await page.getByRole("tab", { name: /Harcamalar/ }).click();
  const before = await readDebugGameState(page);
  expect(before.lifestyle.foodTier).toBe("normal");

  await page.getByTestId("food-tier-good").click();
  const after = await readDebugGameState(page);
  expect(after.lifestyle.foodTier).toBe("good");

  await reloadAndResume(page);
  const afterReload = await readDebugGameState(page);
  expect(afterReload.lifestyle.foodTier).toBe("good");
});
