import { expect, type Page } from "@playwright/test";

import type { DebugScenarioId } from "../domain/debug/debugScenarios";

// Clears any AsyncStorage-web (localStorage-backed) save and lands on a
// freshly-loaded Main Menu — the same starting point every spec needs,
// so a save left over from a previous test never leaks into the next one.
export async function gotoFreshMainMenu(page: Page): Promise<void> {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.getByTestId("btn-new-game")).toBeVisible({ timeout: 20_000 });
}

// Opens the dev-only debug panel (see MainMenuScreen/useGameStore,
// `__DEV__`-gated) and picks one named scenario (domain/debug/
// debugScenarios.ts), then follows the app's own resolveEntryRoute
// navigation into whatever screen that scenario's phase resumes to.
export async function loadDebugScenario(page: Page, scenarioId: DebugScenarioId): Promise<void> {
  await gotoFreshMainMenu(page);
  await page.getByTestId("btn-debug-menu").click();
  await page.getByTestId(`btn-debug-${scenarioId}`).click();
}

// Clicks whichever event choice is currently on screen without needing
// to know its id in advance — used for generic "some content is showing,
// resolve it and move on" steps that aren't the point of the assertion.
export async function resolveFirstVisibleChoice(page: Page): Promise<void> {
  await page.locator('[data-testid^="choice-"]').first().click();
}

// A single week can queue more than one event (e.g. the same tick that
// crosses residencyCompleted also runs that week's normal pool
// selection) — resolving one only reveals the next, it doesn't clear
// the queue. Drains everything currently queued, in whatever order it
// was queued, with the first choice of each.
export async function drainAllVisibleEvents(page: Page, maxSteps = 10): Promise<void> {
  for (let i = 0; i < maxSteps; i++) {
    const anyEventCard = page.locator('[data-testid^="event-card-"]');
    if ((await anyEventCard.count()) === 0) return;
    await resolveFirstVisibleChoice(page);
  }
}

export async function resolveChoice(page: Page, choiceId: string): Promise<void> {
  await page.getByTestId(`choice-${choiceId}`).click();
}

// The full character-creation wizard, minimal valid inputs — used by the
// happy-path spec to reach residency through the REAL UI rather than a
// synthetic state, matching the Phase 10 §28 full-career flow.
export async function createCharacterThroughUi(page: Page, name: string): Promise<void> {
  await page.getByTestId("input-name").fill(name);
  await page.getByTestId("input-hometown").fill("Ankara");
  await page.getByTestId("btn-step1-next").click();

  await page.getByTestId("background-kendi_basina").click();
  await page.getByTestId("btn-step2-next").click();

  // Gameplay Expansion Part C — Görünüş (avatar customization) step,
  // between Geçmiş and Özet. Defaults are fine for a generic E2E flow;
  // this just moves through it.
  await page.getByTestId("btn-step3-next").click();

  await page.getByTestId("btn-start-tus").click();
}

export async function completeTusThroughUi(page: Page, prepProfileId: string): Promise<void> {
  await page.getByTestId(`prep-profile-${prepProfileId}`).click();

  await expect(page.getByTestId("tus-exam-screen")).toBeVisible({ timeout: 20_000 });
  // The exam-day event subset/count is RNG-picked per save (deterministic
  // per seed, but not a fixed count) — just keep answering with whatever
  // choice is first until the engine flips tus.step to "result".
  for (let i = 0; i < 20; i++) {
    if (await page.getByTestId("btn-go-to-preferences").isVisible().catch(() => false)) break;
    const stillOnExam = await page.getByTestId("tus-exam-screen").isVisible().catch(() => false);
    if (!stillOnExam) break;
    await page.locator('[data-testid^="tus-exam-choice-"]').first().click();
  }
  await expect(page.getByTestId("btn-go-to-preferences")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("btn-go-to-preferences").click();
}

export async function pickFirstResidencyProgram(page: Page): Promise<void> {
  await page.locator('[data-testid^="pick-program-"]').first().click();
  await page.getByTestId("btn-confirm-program").click();
  await expect(page.getByTestId("home-screen")).toBeVisible({ timeout: 20_000 });
}

// Drains whatever's queued (resolving each with its first choice) and/or
// advances the week, until `targetTestId` is on screen — or a career
// ending fires first, which also stops the loop since nothing queued
// will ever appear after that. Used instead of hand-authoring the exact
// week-by-week path through unrelated pool/crisis content that might
// interleave with a scheduled chain followUp — the target chain is
// guaranteed to surface once its delayWeeks elapses regardless of what
// else resolves first (Phase 9's pending-event persistence guarantee).
export async function advanceUntilVisible(page: Page, targetTestId: string, maxSteps = 30): Promise<void> {
  for (let i = 0; i < maxSteps; i++) {
    if (await page.getByTestId(targetTestId).isVisible().catch(() => false)) return;
    if (await page.getByTestId("gameover-screen").isVisible().catch(() => false)) return;
    if (await page.getByTestId("specialist-ending-screen").isVisible().catch(() => false)) return;

    const anyEventCard = page.locator('[data-testid^="event-card-"]');
    if ((await anyEventCard.count()) > 0) {
      await anyEventCard.first().locator('[data-testid^="choice-"]').first().click();
      continue;
    }
    await page.getByTestId("btn-advance-week").click();
    await page.waitForTimeout(150);
  }
  throw new Error(`advanceUntilVisible: "${targetTestId}" never appeared within ${maxSteps} steps`);
}

// Dev-only read bridge (see store/useGameStore.ts) — used to assert on
// internal state (behaviorStats, flags, specialistExam) that the UI
// deliberately never renders as raw numbers.
export async function readDebugGameState(page: Page): Promise<any> {
  return page.evaluate(() => (window as any).__COMEZ_DEBUG__?.getGameState() ?? null);
}

// A hard page reload always remounts at "/" — MainMenuScreen — since
// this app has no URL-per-screen linking config (matches how an RN app
// actually relaunches: navigation state is never itself persisted, only
// the save is). The app's own resume path is MainMenu's "DEVAM ET"
// button, which resolves back to the right screen via
// navigation/RootStack.tsx's resolveEntryRoute(gameState) — this helper
// is a reload followed by exactly that, standing in for "kill and
// relaunch the app" rather than a same-screen soft refresh.
export async function reloadAndResume(page: Page): Promise<void> {
  // The store's persist() awaits AsyncStorage.setItem before updating
  // React state, but a Playwright .click() only waits for the DOM event
  // to dispatch — not for that downstream promise to settle. Reloading
  // right after a click can race the save. Wait for the persisted
  // localStorage copy to actually match the live in-memory state first.
  await page.waitForFunction(() => {
    try {
      const raw = window.localStorage.getItem("comez.save");
      if (!raw) return false;
      const live = (window as any).__COMEZ_DEBUG__?.getGameState();
      if (!live) return false;
      return JSON.stringify(JSON.parse(raw)) === JSON.stringify(live);
    } catch {
      return false;
    }
  }, { timeout: 10_000 });

  await page.reload();

  // A "gameover"/"specialist" phase auto-redirects the instant the
  // reloaded gameState loads — useEndingRedirect (navigation/
  // RootStack.tsx) watches career.phase from the app's root, independent
  // of which screen is current, and jumps there with no click involved.
  // In that case Main Menu's own "DEVAM ET" never becomes visible (React
  // Navigation keeps it mounted-but-hidden underneath); any other phase
  // waits there for a real click instead. Poll for whichever happens.
  for (let i = 0; i < 40; i++) {
    if (await page.getByTestId("gameover-screen").isVisible().catch(() => false)) return;
    if (await page.getByTestId("specialist-ending-screen").isVisible().catch(() => false)) return;
    const continueButton = page.getByTestId("btn-continue");
    if (await continueButton.isVisible().catch(() => false)) {
      await continueButton.click();
      return;
    }
    await page.waitForTimeout(250);
  }
  throw new Error("reloadAndResume: neither an ending screen nor 'DEVAM ET' appeared within 10s");
}
