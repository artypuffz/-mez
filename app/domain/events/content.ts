// Loads the actual /data/events/*.json content — the single source of
// content truth, not a copy mirrored into app/. Metro can reach outside
// app/ here because metro.config.js adds ../data to watchFolders; Vitest
// (plain Node) needs no such config, it resolves relative JSON imports
// natively either way.
//
// Phase 8 reorganized data/events/examples/ (a Phase 5-era name that
// stopped being accurate once this became real production content) into
// data/events/<category>/<file>.json — see docs/event-design-bible.md
// §Content Organization for the rationale. This loader is still a flat
// static-import list; the directory nesting is purely organizational.
import branchInternalMedicine from "../../../data/events/branches/internal-medicine/internal-medicine.json";
import branchSurgery from "../../../data/events/branches/surgery/surgery.json";
import branchPsychiatry from "../../../data/events/branches/psychiatry/psychiatry.json";
import chainBaris from "../../../data/events/chains/baris.json";
import chainSecretary from "../../../data/events/chains/secretary.json";
import chainFaculty from "../../../data/events/chains/faculty.json";
import chainJunior from "../../../data/events/chains/junior.json";
import microChains from "../../../data/events/chains/micro-chains.json";
import crisisWarnings from "../../../data/events/crisis/warnings.json";
import crisisExhaustion from "../../../data/events/crisis/exhaustion-spiral.json";
import crisisBurnout from "../../../data/events/crisis/burnout-resignation.json";
import crisisFinancial from "../../../data/events/crisis/economic-crisis.json";
import crisisCareer from "../../../data/events/crisis/career-crisis.json";
import specialistExam from "../../../data/events/specialist-exam/specialist-exam.json";
import economy from "../../../data/events/economy/economy.json";
import economyExpansion from "../../../data/events/economy/economy-expansion.json";
import general from "../../../data/events/general/general.json";
import generalExpansion from "../../../data/events/general/general-expansion.json";
import bureaucracy from "../../../data/events/general/bureaucracy.json";
import healthSystem from "../../../data/events/system/health-system.json";
import turkeyHealthSystem from "../../../data/events/system/turkey-health-system.json";
import hospital from "../../../data/events/system/hospital.json";
import mobbing from "../../../data/events/mobbing/mobbing.json";
import mobbingExpansion from "../../../data/events/mobbing/mobbing-expansion.json";
import powerReversal from "../../../data/events/mobbing/power-reversal.json";
import careerNpcMirror from "../../../data/events/npc/career-mirror.json";
import proceduralNpc from "../../../data/events/npc/procedural.json";
import onCall from "../../../data/events/oncall/oncall.json";
import onCallExpansion from "../../../data/events/oncall/oncall-expansion.json";
import rare from "../../../data/events/rare/rare.json";
import social from "../../../data/events/social/social.json";
import socialExpansion from "../../../data/events/social/social-expansion.json";

import { validateEventContent, hasValidationErrors, type ValidationIssue } from "./validation";
import type { EventDefinition } from "./types";
import { createEventRepository, type EventRepository } from "./repository";
import { BACKGROUND_DEFINITIONS } from "../config/backgrounds";

// Flags a character can start with (madde 3 of Phase 2) count as
// "externally set" for the unreachable-flag check below — they're never
// set by an event's flags.set, but they're a legitimate source too.
const BACKGROUND_FLAGS = BACKGROUND_DEFINITIONS.flatMap((b) => Object.keys(b.flags));

// Phase 10 §4 — set by the engine itself (applySpecialistExamAttempt),
// never by any event's flags.set; same "legitimate but not content-set"
// case as BACKGROUND_FLAGS above.
const ENGINE_SET_FLAGS = ["specialist_exam_result"];

const RAW_EVENT_FILES: unknown[] = [
  ...branchInternalMedicine,
  ...branchSurgery,
  ...branchPsychiatry,
  ...chainBaris,
  ...chainSecretary,
  ...chainFaculty,
  ...chainJunior,
  ...microChains,
  ...crisisWarnings,
  ...crisisExhaustion,
  ...crisisBurnout,
  ...crisisFinancial,
  ...crisisCareer,
  ...specialistExam,
  ...economy,
  ...economyExpansion,
  ...general,
  ...generalExpansion,
  ...bureaucracy,
  ...healthSystem,
  ...turkeyHealthSystem,
  ...hospital,
  ...mobbing,
  ...mobbingExpansion,
  ...powerReversal,
  ...careerNpcMirror,
  ...proceduralNpc,
  ...onCall,
  ...onCallExpansion,
  ...rare,
  ...social,
  ...socialExpansion,
];

let cached: { events: EventDefinition[]; issues: ValidationIssue[] } | null = null;

function load(): { events: EventDefinition[]; issues: ValidationIssue[] } {
  if (!cached) {
    cached = validateEventContent(RAW_EVENT_FILES, [...BACKGROUND_FLAGS, ...ENGINE_SET_FLAGS]);
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
