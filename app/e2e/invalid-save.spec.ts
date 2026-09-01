import { test, expect } from "@playwright/test";

import { gotoFreshMainMenu } from "./helpers";

// RC2 §2/§3/§19 (RC-001) — a corrupt or unmigratable save must never
// blank-screen the app. Covers the invalid-save test matrix from the
// RC1 review: malformed JSON, an empty/wrong-shaped object, null, and a
// save with a missing or unsupported saveVersion (which fails inside
// migrateSaveData, not JSON.parse — a different code path, worth its
// own case).
const CASES: Record<string, string> = {
  malformed_json: "{not valid json",
  empty_object: "{}",
  null_value: "null",
  wrong_shape: JSON.stringify({ foo: "bar", notAGameState: true }),
  missing_save_version: JSON.stringify({ character: { name: "X" } }),
  unsupported_save_version: JSON.stringify({ meta: { saveVersion: 999 } }),
};

for (const [label, rawValue] of Object.entries(CASES)) {
  test(`corrupt save (${label}) shows a load-error message, never a blank screen`, async ({ page }) => {
    await gotoFreshMainMenu(page);

    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.evaluate((raw) => window.localStorage.setItem("comez.save", raw), rawValue);
    await page.reload();

    await expect(page.getByTestId("load-error-text")).toBeVisible({ timeout: 15_000 });
    expect(pageErrors).toEqual([]);

    // The bad value must still be sitting in storage — nothing silently
    // cleared it just because loading failed.
    const stillThere = await page.evaluate(() => window.localStorage.getItem("comez.save"));
    expect(stillThere).toBe(rawValue);

    // DEVAM ET must not be a trap — there's nothing to resume.
    await expect(page.getByTestId("btn-continue")).toBeDisabled();

    // Recovery: an explicit New Game action overwrites the bad entry.
    await page.getByTestId("btn-new-game").click();
    await expect(page.getByTestId("input-name")).toBeVisible();
  });
}

test("starting a new game after a corrupt save fully recovers gameplay", async ({ page }) => {
  await gotoFreshMainMenu(page);
  await page.evaluate(() => window.localStorage.setItem("comez.save", "{not valid json"));
  await page.reload();
  await expect(page.getByTestId("load-error-text")).toBeVisible();

  await page.getByTestId("btn-new-game").click();
  await page.getByTestId("input-name").fill("Recovery Test");
  await page.getByTestId("input-hometown").fill("Ankara");
  await page.getByTestId("btn-step1-next").click();
  await page.getByTestId("background-kendi_basina").click();
  await page.getByTestId("btn-step2-next").click();
  await page.getByTestId("btn-start-tus").click();
  await expect(page.getByTestId("prep-profile-duzenli")).toBeVisible();

  // The old corrupt value is gone now — overwritten by the new,
  // explicitly-started game, not by loadGame() silently discarding it.
  const saved = await page.evaluate(() => window.localStorage.getItem("comez.save"));
  expect(saved).not.toBe("{not valid json");
  expect(() => JSON.parse(saved!)).not.toThrow();
});
