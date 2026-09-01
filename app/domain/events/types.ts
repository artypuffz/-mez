// Mirrors docs/event-schema.md v0.3. Where this phase extends beyond what
// that doc shows (the full eq/neq/gt/gte/lt/lte/in/notIn operator set,
// rather than just the eq/gte/lte the doc's examples happened to use),
// it's a superset, not a contradiction — see the Phase 5 report.

import type { NpcTargetRef } from "./npcTargets";
import type { NpcSelector } from "../npc/selector";
import type { GameOverReason, NpcTransition } from "../state/types";
import type { OnCallEffect } from "../oncall/applyEffects";

export type EventCategory =
  | "GENERAL"
  | "BRANCH"
  | "HOSPITAL"
  | "NPC"
  | "MOBBING"
  | "ON_CALL"
  | "FINANCIAL"
  | "SOCIAL"
  | "HEALTH_SYSTEM"
  | "WORLD"
  | "RARE"
  | "CAREER"
  | "CRISIS";

// "crisis" (Phase 9 §11) is deliberately a THIRD mode, not a pool event
// with high weight: it's picked by its own resource/pressure-gated
// resolver (domain/crisis/selection.ts), never by selectPoolEvents's
// weighted draw — see docs/event-schema.md §16 for why that separation
// matters (a crisis must never be "just unlucky", it must track sustained
// state). A crisis event's later chain checkpoints stay ordinary
// "scheduled" events, resolved through the exact same followUpEvent/
// scheduled machinery as any other chain — only the ENTRY point is special.
export type TriggerMode = "pool" | "scheduled" | "crisis";

// Phase 9 §9 — which pressure signal a crisis event reacts to; read only
// by the crisis resolver's priority ordering (§12), never by the engine's
// generic pool/scheduled machinery. Required on every triggerMode:"crisis"
// event (validated).
export type CrisisType = "exhaustion" | "burnout" | "financial" | "career";

// Phase 9 §31 — motor/selection-facing only ("Ancak UI'da 'Severity 3'
// gibi göstermene gerek yok"); optional, defaults to "serious" in the
// resolver when absent.
export type CrisisSeverity = "warning" | "serious" | "critical";

export type ComparableValue = string | number | boolean;

// Shared by every leaf condition kind that supports comparison operators.
export interface ComparisonOperators {
  eq?: ComparableValue;
  neq?: ComparableValue;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
  in?: ComparableValue[];
  notIn?: ComparableValue[];
}

export interface StatCondition extends ComparisonOperators {
  stat: string;
}

export interface FlagCondition extends ComparisonOperators {
  flag: string;
}

export interface BranchInCondition {
  branchIn: string[];
}

// Narrowed in Phase 6 — NPC personality now lives entirely in
// NpcState.personality, never mixed into the dyadic relationship record.
export type RelationshipField = "trust" | "friendship" | "grudge";

export type RelationshipConditionFields = Partial<Record<RelationshipField, ComparisonOperators>>;

export interface RelationshipCondition {
  relationship: NpcTargetRef & RelationshipConditionFields;
}

export type LeafCondition = StatCondition | FlagCondition | BranchInCondition | RelationshipCondition;

export interface AllNode {
  all: RequirementNode[];
}
export interface AnyNode {
  any: RequirementNode[];
}
export type RequirementNode = AllNode | AnyNode | LeafCondition;

export interface TextVariant {
  requirements: RequirementNode;
  text: string;
}

export type NumericOrRange = number | { min: number; max: number };

export interface EffectMap {
  stress?: NumericOrRange;
  fatigue?: NumericOrRange;
  burnout?: NumericOrRange;
  money?: NumericOrRange;
}

export type RelationshipEffect = NpcTargetRef & Partial<Record<RelationshipField, number>>;

export interface FollowUpRef {
  chainId: string;
  checkpoint: string;
  delayWeeks: number;
}

export interface DelayedEffectEntry {
  delayWeeks: number;
  effects: EffectMap;
}

// An authored, immediate NPC lifecycle change — distinct from the generic
// monthly lifecycle tick (domain/npc/lifecycle.ts). This is how
// chain-baris.json narrates Barış becoming a specialist at his chain's
// resolution: the engine applies whatever `type` the content authors,
// with zero special-casing of which npc/boundNpc it targets (§12, §31).
export type NpcTransitionEffect = NpcTargetRef & {
  type: NpcTransition["type"];
};

// Phase 9 §51/§52 — the ONLY way a choice can end the career. A generic,
// explicit, allow-listed DSL (never an arbitrary GameState.career.phase
// mutation) so content authors can't special-case a new phase value
// without a schema change. "end_career" is the only member today; a
// future "set_phase" (§52) would be added here the same way, not as a
// bare string field somewhere else.
export type CareerEffect = { type: "end_career"; reason: GameOverReason };

export interface ChoiceDefinition {
  id: string;
  text: string;
  requirements?: RequirementNode;
  immediateEffects?: EffectMap;
  delayedEffects?: DelayedEffectEntry[];
  relationshipEffects?: RelationshipEffect[];
  flags?: { set?: Record<string, boolean | number | string>; clear?: string[] };
  behaviorTags?: string[];
  statistics?: { increment?: Record<string, number> };
  followUpEvent?: FollowUpRef;
  npcTransitions?: NpcTransitionEffect[];
  // Phase 7 §23 — mutates the CURRENT month's on-call schedule. A no-op
  // (never throws) if there's no active schedule yet (e.g. an event
  // resolved before residency starts, which shouldn't happen but stays
  // safe either way) or if a mutation runs out of valid dates/assignments.
  onCallEffects?: OnCallEffect[];
  // Phase 9 — see CareerEffect above. Always the LAST thing resolveEventChoice
  // applies for a choice (§25): every other effect on the same choice
  // still lands (a resignation choice's stress relief is real, not erased
  // by the career ending), the career just also ends afterward.
  careerEffects?: CareerEffect[];
}

export interface EventDefinition {
  id: string;
  title: string;
  titleVariants?: TextVariant[];
  description: string;
  descriptionVariants?: TextVariant[];
  category: EventCategory;
  triggerMode: TriggerMode;
  requirements?: RequirementNode;
  weight?: number;
  cooldownWeeks?: number;
  chainId?: string;
  chainCheckpoint?: string;
  priority?: number;
  isFallback?: boolean;
  choices: ChoiceDefinition[];
  // True one-shot content (§21): once this event id appears anywhere in
  // eventHistory, it's never eligible again — pool or scheduled/chain.
  // Distinct from cooldownWeeks, which just gates re-triggering for a
  // while and always remains eligible again eventually.
  once?: boolean;
  // Procedural NPC binding (§15/§16): resolved exactly once, when this
  // event is added to weeklyEventQueue, into QueuedEventInstance.boundNpcIds.
  // Key is an arbitrary selector name content refers to via `boundNpc`
  // (e.g. "primary") in relationshipEffects/relationship conditions.
  npcSelectors?: Record<string, NpcSelector>;
  // Gates eligibility on a specific authored NpcTemplate existing in the
  // roster (e.g. "baris") — how authored content requires a template
  // character without the engine special-casing a name (§17/§18).
  requiredNpcTemplate?: string;
  // Phase 9 — required (validated) on every triggerMode:"crisis" event,
  // meaningless/ignored on any other triggerMode.
  crisisType?: CrisisType;
  severity?: CrisisSeverity;
}
