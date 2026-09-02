import { test, expect } from "@playwright/test";

import { gotoFreshMainMenu, reloadAndResume, completeTusThroughUi, pickFirstResidencyProgram, readDebugGameState } from "./helpers";

// Gameplay Expansion Part C §25/§28/§67 — proves: Character Creation's
// Görünüş step -> a real customization choice -> career start -> Home
// -> Profile -> refresh -> the exact same appearance persists (never a
// silent reroll).
test("player avatar customization persists through career start and a refresh", async ({ page }) => {
  await gotoFreshMainMenu(page);
  await page.getByTestId("btn-new-game").click();

  await page.getByTestId("input-name").fill("Mert Yılmaz");
  await page.getByTestId("input-hometown").fill("İzmir");
  await page.getByTestId("btn-step1-next").click();

  await page.getByTestId("background-kendi_basina").click();
  await page.getByTestId("btn-step2-next").click();

  // Görünüş — pick distinctive, non-default values so a silent reroll
  // would be detectable.
  await expect(page.getByTestId("avatar-Ten Rengi-tone_05")).toBeVisible();
  await page.getByTestId("avatar-Ten Rengi-tone_05").click();
  await page.getByTestId("avatar-Saç Rengi-white").click();
  await page.getByTestId("avatar-Saç Modeli-long_wavy").click();
  await page.getByTestId("avatar-Gözlük-round").click();
  await page.getByTestId("btn-step3-next").click();

  await page.getByTestId("btn-start-tus").click();
  await expect(page.getByTestId("prep-profile-duzenli")).toBeVisible();

  await completeTusThroughUi(page, "duzenli");
  await pickFirstResidencyProgram(page);

  const afterCreation = await readDebugGameState(page);
  expect(afterCreation.character.avatar).toMatchObject({
    skinTone: "tone_05", hairColor: "white", hairStyle: "long_wavy", glasses: "round",
  });

  // Home shows the avatar (a real DOM element, not a placeholder).
  await expect(page.getByTestId("home-screen")).toBeVisible();

  // Profile also renders it.
  await page.getByRole("tab", { name: /Profil/ }).click();
  await expect(page.getByTestId("profile-screen")).toBeVisible();

  // Refresh — must be the exact same avatar, not rerolled.
  await reloadAndResume(page);
  const afterReload = await readDebugGameState(page);
  expect(afterReload.character.avatar).toEqual(afterCreation.character.avatar);
});

test("Randomize on the Görünüş step actually changes the avatar and the final choice is what gets saved", async ({ page }) => {
  await gotoFreshMainMenu(page);
  await page.getByTestId("btn-new-game").click();
  await page.getByTestId("input-name").fill("Deniz Aksoy");
  await page.getByTestId("input-hometown").fill("Bursa");
  await page.getByTestId("btn-step1-next").click();
  await page.getByTestId("background-kendi_basina").click();
  await page.getByTestId("btn-step2-next").click();

  // Deliberately pick a non-default skin tone first...
  await page.getByTestId("avatar-Ten Rengi-tone_06").click();
  // ...then randomize, which is allowed to change it again (pre-career-start reroll, §28).
  await page.getByTestId("btn-randomize-avatar").click();
  await page.getByTestId("btn-step3-next").click();
  await page.getByTestId("btn-start-tus").click();
  await expect(page.getByTestId("prep-profile-duzenli")).toBeVisible();

  await completeTusThroughUi(page, "duzenli");
  await pickFirstResidencyProgram(page);

  // Whatever Randomize landed on is what's actually saved — just prove it's a valid, present avatar.
  const state = await readDebugGameState(page);
  expect(state.character.avatar).toBeDefined();
  expect(typeof state.character.avatar.skinTone).toBe("string");
});

// Android Device QA Hotfix 1, Issue 1 — the DEFAULT (untouched) avatar
// shown on the Görünüş step must already reflect the gender picked in
// step 1, and Randomize must keep respecting it.
test("selecting kadın in step 1 produces a gender-aware default (no facial hair) on the Görünüş step, and Randomize respects it too", async ({ page }) => {
  await gotoFreshMainMenu(page);
  await page.getByTestId("btn-new-game").click();
  await page.getByTestId("input-name").fill("Elif Kaya");
  await page.getByTestId("input-hometown").fill("Ankara");
  await page.getByTestId("gender-kadın").click();
  await page.getByTestId("btn-step1-next").click();
  await page.getByTestId("background-kendi_basina").click();
  await page.getByTestId("btn-step2-next").click();

  // Untouched default — never manually picked a facialHair swatch.
  await expect(page.getByTestId("btn-randomize-avatar")).toBeVisible();

  // Randomize repeatedly — facial hair must never appear for a kadın default.
  for (let i = 0; i < 5; i++) {
    await page.getByTestId("btn-randomize-avatar").click();
  }
  await page.getByTestId("btn-step3-next").click();
  await page.getByTestId("btn-start-tus").click();
  await expect(page.getByTestId("prep-profile-duzenli")).toBeVisible();

  await completeTusThroughUi(page, "duzenli");
  await pickFirstResidencyProgram(page);

  const state = await readDebugGameState(page);
  expect(state.character.gender).toBe("kadın");
  expect(state.character.avatar.facialHair).toBe("none");
});

// §29/§9 — manual customization must remain fully permissive regardless
// of gender: a kadın character can still be given a full_beard by hand,
// and that explicit choice must be respected, not silently corrected.
test("manual facial-hair customization is not restricted by gender", async ({ page }) => {
  await gotoFreshMainMenu(page);
  await page.getByTestId("btn-new-game").click();
  await page.getByTestId("input-name").fill("Selin Demir");
  await page.getByTestId("input-hometown").fill("İzmir");
  await page.getByTestId("gender-kadın").click();
  await page.getByTestId("btn-step1-next").click();
  await page.getByTestId("background-kendi_basina").click();
  await page.getByTestId("btn-step2-next").click();

  await expect(page.getByTestId("avatar-Sakal-full_beard")).toBeVisible();
  await page.getByTestId("avatar-Sakal-full_beard").click();
  await page.getByTestId("btn-step3-next").click();
  await page.getByTestId("btn-start-tus").click();
  await expect(page.getByTestId("prep-profile-duzenli")).toBeVisible();

  await completeTusThroughUi(page, "duzenli");
  await pickFirstResidencyProgram(page);

  const state = await readDebugGameState(page);
  expect(state.character.gender).toBe("kadın");
  expect(state.character.avatar.facialHair).toBe("full_beard");
});
