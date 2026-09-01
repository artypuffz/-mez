// npm run export:content-review
// Dumps every authored event (ID/CATEGORY/TITLE/DESCRIPTION/CHOICES/
// REQUIREMENTS) to docs/event-content-review.md for human read-through
// (Phase 8 §46/§51). Not shown to players — a review artifact only.
import * as fs from "node:fs";
import * as path from "node:path";
import { getEventRepository } from "../domain/events/content";
import type { EventDefinition, RequirementNode } from "../domain/events/types";

function formatRequirement(req: RequirementNode | undefined, indent = ""): string {
  if (!req) return `${indent}(none)`;
  return `${indent}\`${JSON.stringify(req)}\``;
}

function formatEvent(e: EventDefinition): string {
  const lines: string[] = [];
  lines.push(`### ${e.id}`);
  lines.push("");
  lines.push(`- **Category:** ${e.category}`);
  lines.push(`- **Trigger:** ${e.triggerMode}${e.chainId ? ` (chain: ${e.chainId} / ${e.chainCheckpoint})` : ""}`);
  if (e.once) lines.push(`- **Once:** true`);
  if (e.cooldownWeeks) lines.push(`- **Cooldown:** ${e.cooldownWeeks} weeks`);
  if (e.requiredNpcTemplate) lines.push(`- **Required NPC template:** ${e.requiredNpcTemplate}`);
  if (e.npcSelectors) lines.push(`- **NPC selectors:** ${JSON.stringify(e.npcSelectors)}`);
  lines.push(`- **Requirements:** ${formatRequirement(e.requirements)}`);
  lines.push("");
  lines.push(`**${e.title}**`);
  lines.push("");
  lines.push(e.description);
  lines.push("");
  lines.push("**Choices:**");
  for (const c of e.choices) {
    lines.push(`- \`${c.id}\`: ${c.text}`);
    if (c.immediateEffects) lines.push(`  - effects: \`${JSON.stringify(c.immediateEffects)}\``);
    if (c.relationshipEffects) lines.push(`  - relationship: \`${JSON.stringify(c.relationshipEffects)}\``);
    if (c.flags) lines.push(`  - flags: \`${JSON.stringify(c.flags)}\``);
    if (c.behaviorTags) lines.push(`  - behaviorTags: \`${JSON.stringify(c.behaviorTags)}\``);
    if (c.statistics) lines.push(`  - statistics: \`${JSON.stringify(c.statistics)}\``);
    if (c.onCallEffects) lines.push(`  - onCallEffects: \`${JSON.stringify(c.onCallEffects)}\``);
    if (c.followUpEvent) lines.push(`  - followUpEvent: \`${JSON.stringify(c.followUpEvent)}\``);
  }
  lines.push("");
  return lines.join("\n");
}

const repo = getEventRepository();
const all = repo.getAllEvents().slice().sort((a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id));

const byCategory = new Map<string, EventDefinition[]>();
for (const e of all) {
  if (!byCategory.has(e.category)) byCategory.set(e.category, []);
  byCategory.get(e.category)!.push(e);
}

const out: string[] = [];
out.push("# ÇÖMEZ — Event Content Review (Phase 8)");
out.push("");
out.push(`Generated for human read-through. Total events: ${all.length}.`);
out.push("");
out.push("## Category counts");
out.push("");
for (const [category, events] of [...byCategory.entries()].sort((a, b) => b[1].length - a[1].length)) {
  out.push(`- ${category}: ${events.length}`);
}
out.push("");

for (const [category, events] of byCategory) {
  out.push(`## ${category} (${events.length})`);
  out.push("");
  for (const e of events) out.push(formatEvent(e));
}

const outPath = path.join(__dirname, "../../docs/event-content-review.md");
fs.writeFileSync(outPath, out.join("\n"));
console.log(`Wrote ${all.length} events to ${outPath}`);
