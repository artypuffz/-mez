// npm run simulate:events
// Headless sanity pass over the event pool — NOT final balancing (that's
// Phase 8/10). Catches unreachable content, cooldown bugs, or a
// choiceless/crashing event before the content pool grows.
import { runHeadlessSimulation } from "../domain/events/headlessSimulation";

const report = runHeadlessSimulation({
  seedCount: 100,
  weeksPerSeed: 100,
  programIds: ["baskent_ic", "porsuk_cerrahi", "baskent_psik", "sahil_ic", "bogazkoy_cerrahi", "orhangazi_psik"],
});

console.log(`Weeks simulated: ${report.totalWeeksSimulated}`);
console.log(`Events triggered: ${report.totalEventsTriggered}`);
console.log(`Quiet weeks: ${report.quietWeeks} (${((report.quietWeeks / report.totalWeeksSimulated) * 100).toFixed(1)}%)`);

console.log("\nCategory distribution:");
for (const [category, count] of Object.entries(report.categoryDistribution).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${category}: ${count}`);
}

console.log("\nMost frequent events:");
for (const [id, count] of Object.entries(report.eventFrequency).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
  console.log(`  ${id}: ${count}`);
}

console.log(`\nNever-triggered pool events (${report.neverTriggeredPoolEventIds.length}):`);
for (const id of report.neverTriggeredPoolEventIds) console.log(`  ${id}`);

console.log(`\nCooldown violations: ${report.cooldownViolations.length}`);
for (const v of report.cooldownViolations) console.log(`  ${v}`);

console.log(`\nCrashes / choiceless events: ${report.crashes.length}`);
for (const c of report.crashes) console.log(`  ${c}`);

if (report.crashes.length > 0 || report.cooldownViolations.length > 0) {
  process.exit(1);
}
