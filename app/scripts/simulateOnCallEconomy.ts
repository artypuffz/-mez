// npm run simulate:oncall-economy
// Headless sanity pass over on-call schedule generation + monthly economy
// (Phase 7, §29/§30/§31) — NOT final balancing. Runs with an EMPTY event
// repository so no event-sourced spending contaminates the economy
// numbers; only the deterministic monthly on-call/economy processing
// touches money.
import { runHeadlessOnCallEconomySimulation } from "../domain/oncall/headlessOnCallEconomySimulation";

const report = runHeadlessOnCallEconomySimulation({
  seedCount: 100,
  programIds: ["baskent_ic", "porsuk_cerrahi", "baskent_psik", "sahil_ic", "bogazkoy_cerrahi", "orhangazi_psik"],
  backgrounds: ["aile_yaninda", "baska_sehirden", "ekonomik_rahat", "kendi_basina"],
});

console.log("=== ON-CALL (§29) ===");
console.log(`Total months observed: ${report.onCall.totalMonthsObserved}`);
console.log("By branch:");
for (const [branch, stats] of Object.entries(report.onCall.byBranch)) {
  console.log(`  ${branch}: avg ${stats.avgShifts.toFixed(2)}, min ${stats.minShifts}, max ${stats.maxShifts}`);
}
console.log("By seniority (avg shifts):");
for (const [stage, avg] of Object.entries(report.onCall.bySeniority)) {
  if (stage === "none") continue;
  console.log(`  ${stage}: ${avg.toFixed(2)}`);
}
console.log(`Avg shifts when staffingLoad >= 50: ${report.onCall.avgShiftsHighStaffingLoad.toFixed(2)}`);
console.log(`Avg shifts when staffingLoad < 50: ${report.onCall.avgShiftsLowStaffingLoad.toFixed(2)}`);
console.log(`Months above the global max (12): ${report.onCall.monthsAboveGlobalMax}`);
console.log(`Months with 0 shifts: ${report.onCall.monthsWithZeroShifts}`);

console.log("\n=== ECONOMY (§30, no event-sourced spending) ===");
console.log(`Avg monthly net income: ${report.economy.avgMonthlyNet.toFixed(0)} TL`);
console.log(`Avg balance end of year 1: ${report.economy.avgBalanceEndOfYear1.toFixed(0)} TL`);
console.log(`Avg balance end of residency: ${report.economy.avgBalanceEndOfResidency.toFixed(0)} TL`);
console.log(`Fraction of runs ever negative: ${(report.economy.fractionRunsEverNegative * 100).toFixed(1)}%`);
console.log("By background (avg end-of-residency balance):");
for (const [bg, avg] of Object.entries(report.economy.byBackground)) {
  console.log(`  ${bg}: ${avg.toFixed(0)} TL`);
}
console.log("By city (avg end-of-residency balance):");
for (const [city, avg] of Object.entries(report.economy.byCity)) {
  console.log(`  ${city}: ${avg.toFixed(0)} TL`);
}

console.log("\n=== CROSS-SYSTEM SANITY (§31) ===");
console.log(`Correlation staffingLoad -> totalShifts (pooled, confounded by branch/seniority): ${report.crossSystem.correlationStaffingLoadToShiftsPooled.toFixed(2)}`);
console.log(`Correlation staffingLoad -> totalShifts (controlled for branch+seniority): ${report.crossSystem.correlationStaffingLoadToShiftsControlled.toFixed(2)}`);
console.log(`Correlation totalShifts -> onCallPay: ${report.crossSystem.correlationShiftsToOnCallPay.toFixed(2)}`);
console.log(`Crashes: ${report.crossSystem.crashes.length}`);
for (const c of report.crossSystem.crashes) console.log(`  ${c}`);

if (
  report.crossSystem.crashes.length > 0 ||
  report.onCall.monthsAboveGlobalMax > 0
) {
  process.exit(1);
}
