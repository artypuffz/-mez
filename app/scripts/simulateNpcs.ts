// npm run simulate:npcs
// Headless sanity pass over NPC generation + lifecycle + passive
// relationship decay (Phase 6, §32/§33) — NOT final balancing. Catches
// clinic extinction, id/name collisions, lifecycle crashes, and abnormal
// relationship drift before content grows around this system.
import { runHeadlessNpcSimulation } from "../domain/npc/headlessNpcSimulation";

const report = runHeadlessNpcSimulation({
  seedCount: 100,
  weeksPerSeed: 260, // 5 years
  programIds: ["baskent_ic", "porsuk_cerrahi", "baskent_psik", "sahil_ic", "bogazkoy_cerrahi", "orhangazi_psik"],
});

console.log(`Starting average active NPC count: ${report.startingAverageNpcCount.toFixed(2)}`);
console.log(`Average active NPC count after 5 years: ${report.averageActiveNpcCountAfterRun.toFixed(2)}`);
console.log(`Residents who became specialists: ${report.becameSpecialistCount}`);
console.log(`NPCs who left: ${report.leftCount}`);
console.log(`New NPCs who arrived: ${report.arrivedCount}`);
console.log(`Clinic ever went fully empty: ${report.everWentFullyEmpty}`);

console.log(`\nDuplicate id/name cases: ${report.duplicateIdOrNameCases.length}`);
for (const c of report.duplicateIdOrNameCases) console.log(`  ${c}`);

console.log(`\nRelationship sanity (zero player interaction, ${report.totalRelationshipsObserved} relationships observed):`);
console.log(`  at max trust/friendship (±100): ${report.relationshipExtremes.atMaxTrustOrFriendship}`);
console.log(`  at max grudge (100): ${report.relationshipExtremes.atMaxGrudge}`);

console.log(`\nLifecycle crashes: ${report.crashes.length}`);
for (const c of report.crashes) console.log(`  ${c}`);

if (
  report.crashes.length > 0 ||
  report.everWentFullyEmpty ||
  report.duplicateIdOrNameCases.length > 0 ||
  report.relationshipExtremes.atMaxTrustOrFriendship > 0 ||
  report.relationshipExtremes.atMaxGrudge > 0
) {
  process.exit(1);
}
