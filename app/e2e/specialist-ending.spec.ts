import { test, expect } from "@playwright/test";

import { loadDebugScenario, advanceUntilVisible, readDebugGameState, reloadAndResume } from "./helpers";

// Phase 10 §28 — specialist exam -> successful final -> Career Report,
// plus the two determinism guarantees the spec calls out explicitly:
// a refresh must never reroll the exam result (§4), and the completed
// Career Report must read the same on every refresh (§52).
test("specialist exam attempt -> pass -> UZMAN OLDUN -> Career Report, stable across refresh", async ({
  page,
}) => {
  await loadDebugScenario(page, "specialist_exam");
  await expect(page.getByTestId("event-card-specialist_exam_02_sinav_gunu")).toBeVisible();

  const before = await readDebugGameState(page);
  expect(before.specialistExam.attempt).toBe(0);
  expect(before.specialistExam.result).toBeUndefined();

  await page.getByTestId("choice-sinava_gir").click();

  const afterAttempt = await readDebugGameState(page);
  expect(afterAttempt.specialistExam.attempt).toBe(1);
  expect(afterAttempt.specialistExam.result).toBe("passed");
  expect(afterAttempt.flags.specialist_exam_result).toBe("passed");

  await advanceUntilVisible(page, "event-card-specialist_exam_03_gectin");
  await page.getByTestId("choice-devam").click();

  await expect(page.getByTestId("specialist-ending-screen")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("UZMAN OLDUN")).toBeVisible();

  const passedState = await readDebugGameState(page);
  expect(passedState.career.phase).toBe("specialist");
  expect(passedState.status).toBe("specialist");

  // Refresh (kill and relaunch) — the ending screen and the underlying
  // result must not change; resolveEntryRoute resumes a "specialist"
  // phase straight back onto the ending screen.
  await reloadAndResume(page);
  await expect(page.getByTestId("specialist-ending-screen")).toBeVisible();
  const reloadedState = await readDebugGameState(page);
  expect(reloadedState.specialistExam).toEqual(passedState.specialistExam);
  expect(reloadedState.career.phase).toBe("specialist");

  await page.getByTestId("btn-career-report").click();
  await expect(page.getByTestId("career-report-screen")).toBeVisible();
  await expect(page.getByText("ASİSTANLIK KARNESİ")).toBeVisible();

  const reportHeading = await page.locator('[data-testid="career-report-screen"]').innerText();
  expect(reportHeading.length).toBeGreaterThan(0);

  // Full-result determinism (§52) — buildCareerReport is a pure function
  // of the persisted state, so relaunching and re-navigating back to the
  // Career Report (Career Report itself isn't a resumable phase — it's
  // reached via a button from an ending screen, same as in real play)
  // must reproduce the exact same text, not a re-roll.
  await reloadAndResume(page);
  await expect(page.getByTestId("specialist-ending-screen")).toBeVisible();
  await page.getByTestId("btn-career-report").click();
  await expect(page.getByTestId("career-report-screen")).toBeVisible();
  const reportHeadingAfterReload = await page.locator('[data-testid="career-report-screen"]').innerText();
  expect(reportHeadingAfterReload).toBe(reportHeading);
});
