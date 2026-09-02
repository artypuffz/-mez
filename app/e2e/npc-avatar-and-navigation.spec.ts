import { test, expect } from "@playwright/test";

import { loadDebugScenario, reloadAndResume, readDebugGameState } from "./helpers";

// Gameplay Expansion Part C §32/§68 — "save seed + NPC identity -> avatar"
// (domain/avatar/npcAvatar.ts) is unit-tested for determinism directly;
// this proves the ONE thing an E2E can add on top of that: the seed the
// avatar is derived from survives a real page refresh unchanged, and the
// same NPC keeps rendering (no crash, same identity) after that refresh
// — together those two facts guarantee the same NPC never randomly
// changes appearance in the running app, without needing pixel-level
// visual-regression tooling (not present in this project).
test("Hastane NPC avatars are deterministic — identity and derivation seed survive a refresh", async ({ page }) => {
  await loadDebugScenario(page, "senior_power_reversal");
  await expect(page.getByTestId("home-screen")).toBeVisible();

  await page.getByRole("tab", { name: /Hastane/ }).click();
  await expect(page.getByTestId("npc-row-baris")).toBeVisible();

  const before = await readDebugGameState(page);

  await page.getByTestId("npc-row-baris").click();
  await expect(page.getByTestId("btn-close-npc-detail")).toBeVisible();
  await expect(page.getByText("Barış Demir").last()).toBeVisible();
  await page.getByTestId("btn-close-npc-detail").click();

  await reloadAndResume(page);
  const after = await readDebugGameState(page);
  // The single input the NPC avatar renderer derives from (save seed) is
  // unchanged, and Barış is still the same roster entry.
  expect(after.meta.rngSeed).toBe(before.meta.rngSeed);
  expect(after.npcs.baris.identity.name).toBe(before.npcs.baris.identity.name);

  await page.getByRole("tab", { name: /Hastane/ }).click();
  await expect(page.getByTestId("npc-row-baris")).toBeVisible();
  await page.getByTestId("npc-row-baris").click();
  await expect(page.getByTestId("btn-close-npc-detail")).toBeVisible();
  await expect(page.getByText("Barış Demir").last()).toBeVisible();
});

// Android Device QA Hotfix 1, Issue 1 — the authored roster's stored
// gender must match who they actually are (root cause: it used to come
// from a discarded random name draw, see domain/npc/generation.ts).
// domain/avatar/npcAvatar.test.ts proves generation itself honors gender;
// this proves the real running app's roster carries the correct gender
// end to end.
test("authored NPC roster carries the correct stored gender", async ({ page }) => {
  await loadDebugScenario(page, "senior_power_reversal");
  const state = await readDebugGameState(page);
  expect(state.npcs.baris.identity.gender).toBe("erkek");
  expect(state.npcs.zeynep_sekreter.identity.gender).toBe("kadın");
  expect(state.npcs.hoca_erhan.identity.gender).toBe("erkek");
  expect(state.npcs.deniz_comez.identity.gender).toBe("kadın");
});

// §1/§69 — final primary navigation is Ana Sayfa/Hastane/Harcamalar/
// Profil; no standalone İlişkiler route is reachable from anywhere.
test("primary navigation cycles through all four tabs with no standalone Relationships route", async ({ page }) => {
  await loadDebugScenario(page, "senior_power_reversal");
  await expect(page.getByTestId("home-screen")).toBeVisible();

  await expect(page.getByRole("tab", { name: /İlişkiler/ })).toHaveCount(0);

  await page.getByRole("tab", { name: /Hastane/ }).click();
  await expect(page.getByTestId("hospital-screen")).toBeVisible();

  await page.getByRole("tab", { name: /Harcamalar/ }).click();
  await expect(page.getByTestId("spending-screen")).toBeVisible();

  await page.getByRole("tab", { name: /Profil/ }).click();
  await expect(page.getByTestId("profile-screen")).toBeVisible();

  await page.getByRole("tab", { name: /Ana Sayfa/ }).click();
  await expect(page.getByTestId("home-screen")).toBeVisible();
});

// §17/§18/§19/§20 — Profil's nested stack (İstatistikler/Başarımlar/
// Ayarlar) is reachable and each screen actually renders real content.
test("Profile sub-screens (statistics, achievements, settings) are reachable and navigate back cleanly", async ({
  page,
}) => {
  await loadDebugScenario(page, "senior_power_reversal");
  await page.getByRole("tab", { name: /Profil/ }).click();
  await expect(page.getByTestId("profile-screen")).toBeVisible();

  await page.getByTestId("profile-menu-CareerStatistics").click();
  await expect(page.getByTestId("career-statistics-screen")).toBeVisible();
  await page.getByTestId("btn-back-statistics").click();
  await expect(page.getByTestId("profile-screen")).toBeVisible();

  await page.getByTestId("profile-menu-Achievements").click();
  await expect(page.getByTestId("achievements-screen")).toBeVisible();
  await page.getByTestId("btn-back-achievements").click();
  await expect(page.getByTestId("profile-screen")).toBeVisible();

  await page.getByTestId("profile-menu-Settings").click();
  await expect(page.getByTestId("settings-screen")).toBeVisible();
  await page.getByTestId("btn-back-settings").click();
  await expect(page.getByTestId("profile-screen")).toBeVisible();
});
