// npm run validate:release
// Phase 10 §51 — a single command that bundles the checks a release
// candidate needs: typecheck, unit tests, content schema validation, and
// a fast headless sanity pass. Deliberately does NOT run the Playwright
// E2E suite (npm run test:e2e) or the full 1000-seed balance simulation
// (npm run simulate:events) — both are real but slow/browser-dependent,
// kept as separate commands per the spec's own note that "E2E can be
// separate." This script is meant to run in seconds-to-low-minutes, not
// minutes-to-tens-of-minutes.
import { execSync } from "node:child_process";

import { runHeadlessSimulation } from "../domain/events/headlessSimulation";

const PROGRAM_IDS = [
  "baskent_ic", "porsuk_cerrahi", "baskent_psik", "sahil_ic", "bogazkoy_cerrahi",
  "orhangazi_psik", "yesilkent_ic", "yesilkent_cerrahi", "yesilova_cerrahi", "anadolu_ic",
];

function runStep(label: string, command: string): boolean {
  process.stdout.write(`\n▶ ${label}\n`);
  try {
    execSync(command, { stdio: "inherit", cwd: __dirname + "/.." });
    console.log(`✓ ${label}`);
    return true;
  } catch {
    console.log(`✗ ${label} FAILED`);
    return false;
  }
}

function runHeadlessSanity(): boolean {
  process.stdout.write(`\n▶ Headless sanity (50 seeds, random strategy)\n`);
  const report = runHeadlessSimulation({
    seedCount: 50,
    weeksPerSeed: 260,
    programIds: PROGRAM_IDS,
    choiceStrategy: "random",
  });
  const problems: string[] = [];
  if (report.crashes.length > 0) problems.push(`${report.crashes.length} crash(es)`);
  if (report.cooldownViolations.length > 0) problems.push(`${report.cooldownViolations.length} cooldown violation(s)`);
  if (report.gameOver.rate >= 0.999) problems.push("game-over rate is ~100% (nothing is survivable)");
  if (report.specialist.rate <= 0.001) problems.push("specialist rate is ~0% (nobody can finish)");

  if (problems.length > 0) {
    console.log(`✗ Headless sanity FAILED: ${problems.join("; ")}`);
    return false;
  }
  console.log(
    `✓ Headless sanity (0 crashes, 0 cooldown violations, ` +
      `${(report.gameOver.rate * 100).toFixed(1)}% game-over, ${(report.specialist.rate * 100).toFixed(1)}% specialist)`
  );
  return true;
}

function main() {
  const steps: Array<() => boolean> = [
    () => runStep("TypeScript (tsc --noEmit)", "npx tsc --noEmit"),
    () => runStep("Unit tests (vitest)", "npx vitest run"),
    () => runStep("Event content validation", "npx tsx scripts/validateEvents.ts"),
    runHeadlessSanity,
  ];

  let allPassed = true;
  for (const step of steps) {
    if (!step()) allPassed = false;
  }

  console.log(`\n${"=".repeat(50)}`);
  if (allPassed) {
    console.log("✓ validate:release — all checks passed.");
  } else {
    console.log("✗ validate:release — one or more checks failed. See above.");
    process.exit(1);
  }
}

main();
