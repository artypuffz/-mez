import { test, expect, type Page } from "@playwright/test";

import {
  gotoFreshMainMenu,
  loadDebugScenario,
  createCharacterThroughUi,
  completeTusThroughUi,
} from "./helpers";

// Phase 10 §37 — a smoke check, not a full responsive audit: across a
// small phone, a large phone, and a small tablet, none of the key
// screens should force the page to scroll horizontally. ÇÖMEZ's layouts
// are single-column ScrollViews with width:'100%' children by design
// (see HomeScreen/EventCard/etc.) — this just verifies that holds in
// practice, not just in the styles.
const VIEWPORTS = [
  { name: "small-phone", width: 360, height: 740 },
  { name: "large-phone", width: 414, height: 896 },
  { name: "small-tablet", width: 768, height: 1024 },
];

async function assertNoHorizontalOverflow(page: Page, screenLabel: string) {
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    // Let layout settle after the resize.
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

test("crisis card (EventCard) has no horizontal overflow at any viewport", async ({ page }) => {
  await loadDebugScenario(page, "high_burnout");
  await expect(page.getByTestId("event-card-crisis_burnout_01_yeter")).toBeVisible();
  await assertNoHorizontalOverflow(page, "EventCard / crisis card");
});

test("hospital roster, relationships, and profile tabs have no horizontal overflow", async ({ page }) => {
  await loadDebugScenario(page, "senior_power_reversal");
  await expect(page.getByTestId("home-screen")).toBeVisible();

  await page.getByRole("tab", { name: /Hastane/ }).click();
  await assertNoHorizontalOverflow(page, "Hospital roster");

  await page.getByRole("tab", { name: /İlişkiler/ }).click();
  await assertNoHorizontalOverflow(page, "Relationships");

  await page.getByRole("tab", { name: /Profil/ }).click();
  await assertNoHorizontalOverflow(page, "Profile");
});

test("TUS result and preference list have no horizontal overflow", async ({ page }) => {
  await gotoFreshMainMenu(page);
  await page.getByTestId("btn-new-game").click();
  await createCharacterThroughUi(page, "Zeynep Kaya");
  await completeTusThroughUi(page, "duzenli");

  await expect(page.locator('[data-testid^="pick-program-"]').first()).toBeVisible();
  await assertNoHorizontalOverflow(page, "Preference list");
});

test("Game Over and Career Report have no horizontal overflow", async ({ page }) => {
  await loadDebugScenario(page, "gameover_burnout");
  await expect(page.getByTestId("gameover-screen")).toBeVisible();
  await assertNoHorizontalOverflow(page, "Game Over");

  await page.getByTestId("btn-career-report").click();
  await expect(page.getByTestId("career-report-screen")).toBeVisible();
  await assertNoHorizontalOverflow(page, "Career Report");
});
