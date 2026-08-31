import { z } from "zod";
import type { EventDefinition, RequirementNode } from "./types";

function collectFlagReferences(node: RequirementNode | undefined, out: Set<string>): void {
  if (!node) return;
  if ("all" in node) { for (const child of node.all) collectFlagReferences(child, out); return; }
  if ("any" in node) { for (const child of node.any) collectFlagReferences(child, out); return; }
  if ("flag" in node) out.add(node.flag);
}

const ComparableValueSchema = z.union([z.string(), z.number(), z.boolean()]);

const ComparisonOperatorsSchema = z.object({
  eq: ComparableValueSchema.optional(),
  neq: ComparableValueSchema.optional(),
  gt: z.number().optional(),
  gte: z.number().optional(),
  lt: z.number().optional(),
  lte: z.number().optional(),
  in: z.array(ComparableValueSchema).optional(),
  notIn: z.array(ComparableValueSchema).optional(),
});

const StatConditionSchema = ComparisonOperatorsSchema.extend({ stat: z.string().min(1) }).strict();
const FlagConditionSchema = ComparisonOperatorsSchema.extend({ flag: z.string().min(1) }).strict();
const BranchInConditionSchema = z.object({ branchIn: z.array(z.string().min(1)).min(1) }).strict();

// Every NPC target below (relationship condition/effect, npcTransition)
// takes exactly one of npc (a fixed authored id) or boundNpc (a key into
// the event's own npcSelectors, resolved at queue time — §16/§24).
const RelationshipConditionSchema = z
  .object({
    relationship: z
      .object({
        npc: z.string().min(1).optional(),
        boundNpc: z.string().min(1).optional(),
        trust: ComparisonOperatorsSchema.optional(),
        friendship: ComparisonOperatorsSchema.optional(),
        grudge: ComparisonOperatorsSchema.optional(),
      })
      .strict()
      .refine((r) => (r.npc ? 1 : 0) + (r.boundNpc ? 1 : 0) === 1, {
        message: "exactly one of npc/boundNpc must be set",
      }),
  })
  .strict();

const LeafConditionSchema = z.union([
  StatConditionSchema,
  FlagConditionSchema,
  BranchInConditionSchema,
  RelationshipConditionSchema,
]);

// Recursive — z.lazy needs the explicit type annotation or TS can't infer
// through the cycle.
const RequirementNodeSchema: z.ZodType<RequirementNode> = z.lazy(() =>
  z.union([
    z.object({ all: z.array(RequirementNodeSchema).min(1) }).strict(),
    z.object({ any: z.array(RequirementNodeSchema).min(1) }).strict(),
    LeafConditionSchema,
  ])
) as z.ZodType<RequirementNode>;

const TextVariantSchema = z.object({ requirements: RequirementNodeSchema, text: z.string().min(1) }).strict();

const NumericOrRangeSchema = z.union([
  z.number(),
  z
    .object({ min: z.number(), max: z.number() })
    .strict()
    .refine((r) => r.min <= r.max, "range min must be <= max"),
]);

// .strict() is what actually catches "invalid resource adı" — any key
// besides these four is a schema violation, not silently ignored.
const EffectMapSchema = z
  .object({
    stress: NumericOrRangeSchema.optional(),
    fatigue: NumericOrRangeSchema.optional(),
    burnout: NumericOrRangeSchema.optional(),
    money: NumericOrRangeSchema.optional(),
  })
  .strict();

// Same principle for relationship fields — .strict() catches "invalid
// relationship field" (a typo'd field name fails validation instead of
// silently doing nothing at runtime). Narrowed in Phase 6 to
// trust/friendship/grudge only — NPC personality never mixes in here.
const RelationshipEffectSchema = z
  .object({
    npc: z.string().min(1).optional(),
    boundNpc: z.string().min(1).optional(),
    trust: z.number().optional(),
    friendship: z.number().optional(),
    grudge: z.number().optional(),
  })
  .strict()
  .refine((e) => (e.npc ? 1 : 0) + (e.boundNpc ? 1 : 0) === 1, {
    message: "exactly one of npc/boundNpc must be set",
  });

const NPC_TRANSITION_TYPES = ["became_specialist", "became_faculty", "became_department_head", "left"] as const;

const NpcTransitionEffectSchema = z
  .object({
    npc: z.string().min(1).optional(),
    boundNpc: z.string().min(1).optional(),
    type: z.enum(NPC_TRANSITION_TYPES),
  })
  .strict()
  .refine((e) => (e.npc ? 1 : 0) + (e.boundNpc ? 1 : 0) === 1, {
    message: "exactly one of npc/boundNpc must be set",
  });

const NPC_ROLES = [
  "department_head", "faculty", "specialist", "senior_resident",
  "peer_resident", "junior_resident", "nurse", "secretary",
] as const;

const NpcSelectorSchema = z.union([
  z.object({ byId: z.string().min(1) }).strict(),
  z.object({ randomActiveByRole: z.enum(NPC_ROLES) }).strict(),
  z.object({ highestTrustByRole: z.enum(NPC_ROLES) }).strict(),
  z.object({ highestGrudgeByRole: z.enum(NPC_ROLES) }).strict(),
  z.object({ lowestTrustByRole: z.enum(NPC_ROLES) }).strict(),
]);

const FollowUpRefSchema = z
  .object({
    chainId: z.string().min(1),
    checkpoint: z.string().min(1),
    delayWeeks: z.number().int().positive(),
  })
  .strict();

const DelayedEffectEntrySchema = z
  .object({ delayWeeks: z.number().int().positive(), effects: EffectMapSchema })
  .strict();

// "domain:direction[:more]" — e.g. junior:supportive, npc:baris:cooperative.
const BEHAVIOR_TAG_PATTERN = /^[a-z0-9]+(:[a-z0-9_]+)+$/;

const ChoiceDefinitionSchema = z
  .object({
    id: z.string().min(1),
    text: z.string().min(1),
    requirements: RequirementNodeSchema.optional(),
    immediateEffects: EffectMapSchema.optional(),
    delayedEffects: z.array(DelayedEffectEntrySchema).optional(),
    relationshipEffects: z.array(RelationshipEffectSchema).optional(),
    flags: z
      .object({
        set: z.record(z.string(), z.union([z.boolean(), z.number(), z.string()])).optional(),
        clear: z.array(z.string()).optional(),
      })
      .strict()
      .optional(),
    behaviorTags: z.array(z.string().regex(BEHAVIOR_TAG_PATTERN, "malformed behaviorTag")).optional(),
    statistics: z.object({ increment: z.record(z.string(), z.number()).optional() }).strict().optional(),
    followUpEvent: FollowUpRefSchema.optional(),
    npcTransitions: z.array(NpcTransitionEffectSchema).optional(),
  })
  .strict();

const EVENT_CATEGORIES = [
  "GENERAL", "BRANCH", "HOSPITAL", "NPC", "MOBBING", "ON_CALL",
  "FINANCIAL", "SOCIAL", "HEALTH_SYSTEM", "WORLD", "RARE", "CAREER", "CRISIS",
] as const;

const EventDefinitionSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    titleVariants: z.array(TextVariantSchema).optional(),
    description: z.string().min(1),
    descriptionVariants: z.array(TextVariantSchema).optional(),
    category: z.enum(EVENT_CATEGORIES),
    triggerMode: z.enum(["pool", "scheduled"]),
    requirements: RequirementNodeSchema.optional(),
    weight: z.number().nonnegative().optional(),
    cooldownWeeks: z.number().int().nonnegative().optional(),
    chainId: z.string().min(1).optional(),
    chainCheckpoint: z.string().min(1).optional(),
    priority: z.number().optional(),
    isFallback: z.boolean().optional(),
    choices: z.array(ChoiceDefinitionSchema).min(1, "event has no choices"),
    once: z.boolean().optional(),
    npcSelectors: z.record(z.string(), NpcSelectorSchema).optional(),
    requiredNpcTemplate: z.string().min(1).optional(),
  })
  .strict()
  .refine((e) => e.triggerMode !== "scheduled" || (!!e.chainId && !!e.chainCheckpoint), {
    message: "scheduled event is missing chainId/chainCheckpoint",
  })
  .refine(
    (e) => {
      const ids = e.choices.map((c) => c.id);
      return new Set(ids).size === ids.length;
    },
    { message: "duplicate choice id within event" }
  );

export interface ValidationIssue {
  severity: "error" | "warning";
  eventId?: string;
  message: string;
}

export interface ValidationResult {
  events: EventDefinition[];
  issues: ValidationIssue[];
}

// Schema-shape errors come from Zod above; everything below is a
// cross-event/repository-wide check Zod can't express on a single object
// (duplicate ids across files, dangling followUp targets, >1 fallback per
// checkpoint, an unreachable checkpoint).
export function validateEventContent(rawEvents: unknown[], externallySetFlags: string[] = []): ValidationResult {
  const issues: ValidationIssue[] = [];
  const events: EventDefinition[] = [];

  for (const raw of rawEvents) {
    const result = EventDefinitionSchema.safeParse(raw);
    const rawId = typeof raw === "object" && raw !== null && "id" in raw ? String((raw as { id: unknown }).id) : undefined;
    if (!result.success) {
      for (const issue of result.error.issues) {
        issues.push({ severity: "error", eventId: rawId, message: `${issue.path.join(".")}: ${issue.message}` });
      }
    } else {
      events.push(result.data as EventDefinition);
    }
  }

  const idCounts = new Map<string, number>();
  for (const e of events) idCounts.set(e.id, (idCounts.get(e.id) ?? 0) + 1);
  for (const [id, count] of idCounts) {
    if (count > 1) issues.push({ severity: "error", eventId: id, message: `duplicate event id (${count}x)` });
  }

  const scheduledCheckpoints = new Set<string>();
  const fallbackCounts = new Map<string, number>();
  for (const e of events) {
    if (e.triggerMode === "scheduled" && e.chainId && e.chainCheckpoint) {
      const key = `${e.chainId}::${e.chainCheckpoint}`;
      scheduledCheckpoints.add(key);
      if (e.isFallback) fallbackCounts.set(key, (fallbackCounts.get(key) ?? 0) + 1);
    }
  }
  for (const [key, count] of fallbackCounts) {
    if (count > 1) issues.push({ severity: "error", message: `checkpoint ${key} has ${count} fallback candidates (must be at most 1)` });
  }

  for (const e of events) {
    for (const c of e.choices) {
      if (c.followUpEvent) {
        const key = `${c.followUpEvent.chainId}::${c.followUpEvent.checkpoint}`;
        if (!scheduledCheckpoints.has(key)) {
          issues.push({
            severity: "error",
            eventId: e.id,
            message: `choice "${c.id}" schedules a followUpEvent to unknown checkpoint ${key} (no scheduled event declares it)`,
          });
        }
      }
    }
  }

  const checkpointGroups = new Map<string, EventDefinition[]>();
  for (const e of events) {
    if (e.triggerMode === "scheduled" && e.chainId && e.chainCheckpoint) {
      const key = `${e.chainId}::${e.chainCheckpoint}`;
      const list = checkpointGroups.get(key) ?? [];
      list.push(e);
      checkpointGroups.set(key, list);
    }
  }
  for (const [key, group] of checkpointGroups) {
    if (!group.some((e) => e.isFallback)) {
      issues.push({
        severity: "warning",
        message: `checkpoint ${key} has no isFallback candidate — could dead-end if no candidate's requirements ever match`,
      });
    }
  }

  // A flag that's checked in a requirement but that nothing (no choice's
  // flags.set, no character background) ever sets is unreachable content
  // — this is exactly the class of bug that caught fin_002_dogum_gunu's
  // has_partner flag during Phase 5 (see the report).
  const referencedFlags = new Set<string>();
  for (const e of events) {
    collectFlagReferences(e.requirements, referencedFlags);
    for (const c of e.choices) collectFlagReferences(c.requirements, referencedFlags);
  }
  const setFlags = new Set<string>(externallySetFlags);
  for (const e of events) {
    for (const c of e.choices) {
      for (const key of Object.keys(c.flags?.set ?? {})) setFlags.add(key);
    }
  }
  for (const flag of referencedFlags) {
    if (!setFlags.has(flag)) {
      issues.push({ severity: "warning", message: `flag "${flag}" is checked in a requirement but never set anywhere — likely unreachable content` });
    }
  }

  // A `boundNpc: "x"` reference that isn't a key in this event's own
  // npcSelectors is a content typo — it would silently resolve to no NPC
  // (skipped by the effect applier) rather than crash, so this is the
  // only place that would ever catch it.
  for (const e of events) {
    const selectorKeys = new Set(Object.keys(e.npcSelectors ?? {}));
    for (const c of e.choices) {
      const boundRefs = [
        ...(c.relationshipEffects ?? []).map((r) => r.boundNpc),
        ...(c.npcTransitions ?? []).map((t) => t.boundNpc),
      ].filter((v): v is string => !!v);
      for (const ref of boundRefs) {
        if (!selectorKeys.has(ref)) {
          issues.push({
            severity: "error",
            eventId: e.id,
            message: `choice "${c.id}" references boundNpc "${ref}" which is not a key in this event's npcSelectors`,
          });
        }
      }
    }
  }

  return { events, issues };
}

export function hasValidationErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}
