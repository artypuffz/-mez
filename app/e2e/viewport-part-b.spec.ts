import { test, expect, type Page } from "@playwright/test";

import { gotoFreshMainMenu, loadDebugScenario } from "./helpers";

// Gameplay Expansion Part D §54/§70 — same smoke-check pattern as
// e2e/mobile-responsive.spec.ts, extended to the screens that are new or
// substantially redesigned this phase: Harcamalar's category cards, the
// Hastane NPC Detail modal, Achievements, Career Statistics, Settings,
// and Character Creation's new Görünüş step.
const VIEWPORTS = [
  { name: "small-phone", width: 360, height: 740 },
  { name: "large-phone", width: 414, height: 896 },
  { name: "small-tablet", width: 768, height: 1024 },
];

async function assertNoHorizontalOverflow(page: Page, screenLabel: string) {
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(100);
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
    });
    expect(
      overflow.scrollWidth,
      `${screenLabel} at ${viewport.name} (${viewport.width}px): scrollWidth ${overflow.scrollWidth} vs clientWidth ${overflow.clientWidth}`
    ).toBeLessThanOrEqual(overflow.clientWidth + 1);
  }
}

test("Harcamalar (all sections) has no horizontal overflow at any viewport", async ({ page }) => {
  await loadDebugScenario(page, "senior_power_reversal");
  await expect(page.getByTestId("home-screen")).toBeVisible();
  await page.getByRole("tab", { name: /Harcamalar/ }).click();
  await expect(page.getByTestId("spending-screen")).toBeVisible();
  await assertNoHorizontalOverflow(page, "Harcamalar");
});

test("Hastane NPC Detail modal has no horizontal overflow at any viewport", async ({ page }) => {
  await loadDebugScenario(page, "senior_power_reversal");
  await page.getByRole("tab", { name: /Hastane/ }).click();
  await page.getByTestId("npc-row-baris").click();
  await expect(page.getByTestId("btn-close-npc-detail")).toBeVisible();
  await assertNoHorizontalOverflow(page, "NPC Detail");
});

test("Achievements, Career Statistics, and Settings have no horizontal overflow at any viewport", async ({ page }) => {
  await loadDebugScenario(page, "senior_power_reversal");
  await page.getByRole("tab", { name: /Profil/ }).click();

  await page.getByTestId("profile-menu-Achievements").click();
  await expect(page.getByTestId("achievements-screen")).toBeVisible();
  await assertNoHorizontalOverflow(page, "Achievements");
  await page.getByTestId("btn-back-achievements").click();

  await page.getByTestId("profile-menu-CareerStatistics").click();
  await expect(page.getByTestId("career-statistics-screen")).toBeVisible();
  await assertNoHorizontalOverflow(page, "Career Statistics");
  await page.getByTestId("btn-back-statistics").click();

  await page.getByTestId("profile-menu-Settings").click();
  await expect(page.getByTestId("settings-screen")).toBeVisible();
  await assertNoHorizontalOverflow(page, "Settings");
});

test("Character Creation, including the Görünüş step, has no horizontal overflow at any viewport", async ({ page }) => {
  await gotoFreshMainMenu(page);
  await page.getByTestId("btn-new-game").click();
  await expect(page.getByTestId("input-name")).toBeVisible();
  await assertNoHorizontalOverflow(page, "Character Creation — Temel Bilgiler");

  await page.getByTestId("input-name").fill("Test");
  await page.getByTestId("input-hometown").fill("Ankara");
  await page.getByTestId("btn-step1-next").click();
  await page.getByTestId("background-kendi_basina").click();
  await page.getByTestId("btn-step2-next").click();

  await expect(page.getByTestId("btn-randomize-avatar")).toBeVisible();
  await assertNoHorizontalOverflow(page, "Character Creation — Görünüş");
});
