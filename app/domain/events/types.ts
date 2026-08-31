// Mirrors docs/event-schema.md v0.3. Where this phase extends beyond what
// that doc shows (the full eq/neq/gt/gte/lt/lte/in/notIn operator set,
// rather than just the eq/gte/lte the doc's examples happened to use),
// it's a superset, not a contradiction — see the Phase 5 report.

import type { NpcTargetRef } from "./npcTargets";
import type { NpcSelector } from "../npc/selector";
import type { NpcTransition } from "../state/types";

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

export type TriggerMode = "pool" | "scheduled";

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
}
