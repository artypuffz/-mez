// npm run simulate:events
// Headless sanity pass over the FULL event pool — NOT final balancing
// (that's Phase 9/10). Catches unreachable content, cooldown bugs, a
// choiceless/crashing event, chain dead-ends, or an obviously broken
// economy/resource curve as the content pool grows (Phase 8 §41-44).
import { runHeadlessSimulation } from "../domain/events/headlessSimulation";

const report = runHeadlessSimulation({
  seedCount: 500,
  weeksPerSeed: 260,
  programIds: ["baskent_ic", "porsuk_cerrahi", "baskent_psik", "sahil_ic", "bogazkoy_cerrahi", "orhangazi_psik", "yesilkent_ic", "yesilkent_cerrahi", "yesilova_cerrahi", "anadolu_ic"],
  // §42 — random (deterministic per seed) rather than always-first, so
  // different paths through branching content actually get explored.
  choiceStrategy: "random",
});

console.log(`Runs: ${report.runCount}`);
console.log(`Weeks simulated: ${report.totalWeeksSimulated}`);
console.log(`Events triggered: ${report.totalEventsTriggered} (avg ${report.avgEventsPerRun.toFixed(1)}/run)`);
console.log(`Quiet weeks: ${report.quietWeeks} (${((report.quietWeeks / report.totalWeeksSimulated) * 100).toFixed(1)}%)`);
console.log(`Rare event fraction: ${(report.rareEventFraction * 100).toFixed(2)}%`);
console.log(`Avg repeat per triggered event: ${report.avgRepeatPerTriggeredEvent.toFixed(2)}`);
console.log(`Max repeat: ${report.maxRepeatEventId} x${report.maxRepeatCount}`);

console.log("\nCategory distribution:");
for (const [category, count] of Object.entries(report.categoryDistribution).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${category}: ${count}`);
}

console.log("\nBranch distribution (residency starts):");
for (const [branch, count] of Object.entries(report.branchDistribution).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${branch}: ${count}`);
}

console.log("\nTop 20 most frequent events:");
for (const [id, count] of report.top20MostFrequent) {
  console.log(`  ${id}: ${count}`);
}

console.log(`\nNever-triggered eligible events (${report.neverTriggeredEligibleEventIds.length}):`);
for (const id of report.neverTriggeredEligibleEventIds) console.log(`  ${id}`);

console.log("\nChain completion rates:");
for (const [chainId, stats] of Object.entries(report.chainCompletion).sort()) {
  const rate = stats.started > 0 ? ((stats.completed / stats.started) * 100).toFixed(1) : "n/a";
  console.log(`  ${chainId}: ${stats.completed}/${stats.started} (${rate}%)`);
}

console.log("\nBehaviorTag totals:");
for (const [tag, count] of Object.entries(report.behaviorTagTotals).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${tag}: ${count}`);
}

console.log("\nEconomy impact (§43):");
console.log(`  Fraction of runs ever negative: ${(report.economyImpact.fractionRunsEverNegative * 100).toFixed(1)}%`);
console.log(`  Avg end-of-residency balance: ${report.economyImpact.avgEndOfResidencyBalance.toFixed(0)} TL`);
console.log(`  Avg event-sourced spending per run: ${report.economyImpact.avgEventSourcedSpending.toFixed(0)} TL`);

console.log("\nResource impact (§44):");
console.log(`  Avg final stress: ${report.resourceImpact.avgFinalStress.toFixed(1)}`);
console.log(`  Avg final fatigue: ${report.resourceImpact.avgFinalFatigue.toFixed(1)}`);
console.log(`  Avg final burnout: ${report.resourceImpact.avgFinalBurnout.toFixed(1)}`);
console.log(`  Fraction of runs that ever hit 100 on any resource: ${(report.resourceImpact.fractionRunsHitSaturation * 100).toFixed(1)}%`);

console.log(`\nCooldown violations: ${report.cooldownViolations.length}`);
for (const v of report.cooldownViolations) console.log(`  ${v}`);

console.log(`\nCrashes / choiceless events: ${report.crashes.length}`);
for (const c of report.crashes) console.log(`  ${c}`);

if (report.crashes.length > 0 || report.cooldownViolations.length > 0) {
  process.exit(1);
}
