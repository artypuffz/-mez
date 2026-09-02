import { test, expect } from "@playwright/test";

import { loadDebugScenario, reloadAndResume } from "./helpers";

// Gameplay Expansion Part B §6/§8/§65 — proves the full chain: an event
// choice with relationshipEffects (and, for this specific content, an
// authored interactionSummary — see data/events/chains/baris.json)
// -> immediate restrained feedback on Home -> Hastane -> NPC Detail
// -> the interaction shows up in relationship history -> refresh
// -> both the relationship and the history entry persist.
test("resolving a relationship-affecting choice gives immediate feedback and persists into Hastane's NPC history across a refresh", async ({
  page,
}) => {
  await loadDebugScenario(page, "baris_chain_midpoint");
  await expect(page.getByTestId("event-card-chain_baris_02_dostluk")).toBeVisible();

  await page.getByTestId("choice-karsiliksiz_yardim").click();

  // Immediate restrained feedback (§6) — a sentence, never a raw number.
  await expect(page.getByTestId("home-screen")).toBeVisible();
  const feedback = page.getByText("Barış Demir ile ilişkin gelişti.");
  await expect(feedback).toBeVisible();
  await expect(page.getByText(/\+\d+\s*(FRIENDSHIP|TRUST)/i)).toHaveCount(0);

  // Hastane -> Barış's row -> detail modal -> history.
  await page.getByRole("tab", { name: /Hastane/ }).click();
  await expect(page.getByTestId("npc-row-baris")).toBeVisible();
  await page.getByTestId("npc-row-baris").click();

  await expect(page.getByTestId("btn-close-npc-detail")).toBeVisible();
  await expect(page.getByText("Barış'ın nöbetini karşılıksız üstlendin.")).toBeVisible();
  // Never leak the event/choice id or a raw relationship number in the UI.
  await expect(page.getByText(/chain_baris|karsiliksiz_yardim/i)).toHaveCount(0);

  await page.getByTestId("btn-close-npc-detail").click();

  // Refresh — relationship label/history must persist, not reroll or vanish.
  await reloadAndResume(page);
  await page.getByRole("tab", { name: /Hastane/ }).click();
  await expect(page.getByTestId("npc-row-baris")).toBeVisible();
  await page.getByTestId("npc-row-baris").click();
  await expect(page.getByText("Barış'ın nöbetini karşılıksız üstlendin.")).toBeVisible();
});
