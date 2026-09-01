// Loads the actual /data/events/examples/*.json — the single source of
// content truth, not a copy mirrored into app/. Metro can reach outside
// app/ here because metro.config.js adds ../data to watchFolders; Vitest
// (plain Node) needs no such config, it resolves relative JSON imports
// natively either way. See the Phase 5 report for why this was the right
// moment to finally solve that (both the event engine and TUS/backgrounds
// needed it; solving it once for events covers both).
import branchGeneralSurgery from "../../../data/events/examples/branch-general-surgery.json";
import branchInternalMedicine from "../../../data/events/examples/branch-internal-medicine.json";
import branchPsychiatry from "../../../data/events/examples/branch-psychiatry.json";
import careerNpcMirror from "../../../data/events/examples/career-npc-mirror.json";
import chainBaris from "../../../data/events/examples/chain-baris.json";
import financial from "../../../data/events/examples/financial.json";
import general from "../../../data/events/examples/general.json";
import healthSystem from "../../../data/events/examples/health-system.json";
import hospital from "../../../data/events/examples/hospital.json";
import mobbing from "../../../data/events/examples/mobbing.json";
import onCallEconomy from "../../../data/events/examples/oncall-economy.json";
import rare from "../../../data/events/examples/rare.json";
import social from "../../../data/events/examples/social.json";

import { validateEventContent, hasValidationErrors, type ValidationIssue } from "./validation";
import type { EventDefinition } from "./types";
import { createEventRepository, type EventRepository } from "./repository";
import { BACKGROUND_DEFINITIONS } from "../config/backgrounds";

// Flags a character can start with (madde 3 of Phase 2) count as
// "externally set" for the unreachable-flag check below — they're never
// set by an event's flags.set, but they're a legitimate source too.
const BACKGROUND_FLAGS = BACKGROUND_DEFINITIONS.flatMap((b) => Object.keys(b.flags));

const RAW_EVENT_FILES: unknown[] = [
  ...branchGeneralSurgery,
  ...branchInternalMedicine,
  ...branchPsychiatry,
  ...careerNpcMirror,
  ...chainBaris,
  ...financial,
  ...general,
  ...healthSystem,
  ...hospital,
  ...mobbing,
  ...onCallEconomy,
  ...rare,
  ...social,
];

let cached: { events: EventDefinition[]; issues: ValidationIssue[] } | null = null;

function load(): { events: EventDefinition[]; issues: ValidationIssue[] } {
  if (!cached) {
    cached = validateEventContent(RAW_EVENT_FILES, BACKGROUND_FLAGS);
  }
  return cached;
}

// Throws on any validation error — a broken content file must never
// silently ship a partial event pool. Warnings (e.g. "checkpoint has no
// fallback") are logged but don't block loading.
export function loadValidatedEvents(): EventDefinition[] {
  const { events, issues } = load();
  if (hasValidationErrors(issues)) {
    const errors = issues.filter((i) => i.severity === "error");
    throw new Error(
      `Event content failed validation (${errors.length} error(s)):\n` +
        errors.map((e) => `  - [${e.eventId ?? "?"}] ${e.message}`).join("\n")
    );
  }
  return events;
}

export function getContentValidationIssues(): ValidationIssue[] {
  return load().issues;
}

let repository: EventRepository | null = null;
export function getEventRepository(): EventRepository {
  if (!repository) {
    repository = createEventRepository(loadValidatedEvents());
  }
  return repository;
}
