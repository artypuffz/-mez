import { test, expect } from "@playwright/test";

import {
  gotoFreshMainMenu,
  loadDebugScenario,
  createCharacterThroughUi,
  completeTusThroughUi,
  pickFirstResidencyProgram,
  resolveFirstVisibleChoice,
  advanceUntilVisible,
  drainAllVisibleEvents,
} from "./helpers";

// Phase 10 §28 — the full happy path. Split into two tests rather than
// one continuous 208+-week run (infeasible in an E2E budget, and exactly
// why the debug scenario infrastructure exists — see §30): the FRONT
// half exercises the real character-creation -> TUS -> preference ->
// residency UI end to end; the BACK half (a separately-seeded state)
// proves the real residencyCompleted -> specialist_exam engine
// transition fires correctly from a normal week-advance tap. The
// specialist-exam-to-ending-to-report tail is covered in depth by
// specialist-ending.spec.ts using a state seeded further along, so it
// isn't repeated here.
test.describe("full career — front half (real UI)", () => {
  test("character creation -> TUS -> preference -> residency, resolves a week", async ({ page }) => {
    await gotoFreshMainMenu(page);
    await page.getByTestId("btn-new-game").click();

    await createCharacterThroughUi(page, "Ayşe Yılmaz");
    await completeTusThroughUi(page, "duzenli");
    await pickFirstResidencyProgram(page);

    await expect(page.getByTestId("week-line")).toContainText("Hafta 0");

    // Resolve whatever the first week offers (event card or a quiet
    // "HAFTAYI GEÇ" week) — the point is proving the residency loop
    // itself runs end to end from a freshly created character.
    if (await page.locator('[data-testid^="event-card-"]').first().isVisible().catch(() => false)) {
      await resolveFirstVisibleChoice(page);
    }
    await page.getByTestId("btn-advance-week").click();
    await expect(page.getByTestId("week-line")).toContainText("Hafta 1");
  });
});

test.describe("full career — back half (residency completion transition)", () => {
  test("residency_complete -> HAFTAYI GEÇ drives the real engine transition into specialist_exam", async ({
    page,
  }) => {
    await loadDebugScenario(page, "residency_complete");
    await expect(page.getByTestId("home-screen")).toBeVisible();
    // Still residency — the engine hasn't ticked yet.
    await expect(page.getByTestId("btn-advance-week")).toHaveText("HAFTAYI GEÇ");

    // The same tick that crosses residencyCompleted immediately queues
    // specialist_exam's stage1 event (see engine.ts's
    // advanceResidencyWeekWithEvents) — no intermediate screen, no lost
    // week. That transitional week's own normal event selection can also
    // queue an ordinary pool event alongside it, so drain generically
    // rather than assuming only one event is queued.
    await advanceUntilVisible(page, "event-card-specialist_exam_01_bir_hafta_once");
    await drainAllVisibleEvents(page);
    // The advance button is replaced by the event card(s) while any are
    // queued; once the queue is empty it reappears, now relabeled
    // "DEVAM ET" because career.phase is "specialist_exam".
    await expect(page.getByTestId("btn-advance-week")).toHaveText("DEVAM ET");
  });
});
