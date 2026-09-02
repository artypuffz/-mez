import { z } from "zod";
import type { EventDefinition, RequirementNode } from "./types";
import { NPC_TEMPLATES } from "../npc/templates";
import { BRANCH_DEFINITIONS } from "../config/branches";

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
    health: NumericOrRangeSchema.optional(),
    social: NumericOrRangeSchema.optional(),
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

// Phase 7 §23 — tiny surface, matching domain/oncall/applyEffects.ts's
// OnCallEffect union exactly.
// Phase 11 §19 — mirrors WorkloadEffect exactly (domain/events/types.ts).
const WorkloadEffectSchema = z.union([
  z.object({ type: z.literal("add_overtime_hours"), hours: z.number() }).strict(),
]);

const OnCallEffectSchema = z.union([
  z.object({ type: z.literal("add_player_shift"), count: z.number().int().positive(), shiftType: z.enum(["weekday", "weekend"]).optional() }).strict(),
  z.object({ type: z.literal("remove_player_shift"), count: z.number().int().positive() }).strict(),
  z
    .object({
      type: z.literal("transfer_player_shift_to_npc"),
      target: z
        .object({ npc: z.string().min(1).optional(), boundNpc: z.string().min(1).optional() })
        .strict()
        .refine((t) => (t.npc ? 1 : 0) + (t.boundNpc ? 1 : 0) === 1, { message: "exactly one of npc/boundNpc must be set" }),
    })
    .strict(),
]);

// "domain:direction[:more]" — e.g. junior:supportive, npc:baris:cooperative.
const BEHAVIOR_TAG_PATTERN = /^[a-z0-9]+(:[a-z0-9_]+)+$/;

// Phase 9 §51/§52 — mirrors CareerEffect exactly (domain/events/types.ts):
// the only DSL entry allowed to end a career, and GameOverReason is a
// closed, explicit list — never an arbitrary string.
const GAME_OVER_REASONS = ["resigned_burnout", "resigned_career", "financial_collapse", "program_left", "dismissed", "specialist_exam_failed"] as const;
const CareerEffectSchema = z.union([
  z.object({ type: z.literal("end_career"), reason: z.enum(GAME_OVER_REASONS) }).strict(),
  z.object({ type: z.literal("become_specialist") }).strict(),
]);
// Phase 10 §4 — mirrors SpecialistExamEffect (domain/events/types.ts).
const SpecialistExamEffectSchema = z.object({ type: z.literal("attempt") }).strict();

const ChoiceDefinitionSchema = z
  .object({
    id: z.string().min(1),
    text: z.string().min(1),
    requirements: RequirementNodeSchema.optional(),
    immediateEffects: EffectMapSchema.optional(),
    delayedEffects: z.array(DelayedEffectEntrySchema).optional(),
    relationshipEffects: z.array(RelationshipEffectSchema).optional(),
    interactionSummary: z.string().min(1).optional(),
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
    onCallEffects: z.array(OnCallEffectSchema).optional(),
    workloadEffects: z.array(WorkloadEffectSchema).optional(),
    careerEffects: z.array(CareerEffectSchema).optional(),
    specialistExamEffects: z.array(SpecialistExamEffectSchema).optional(),
  })
  .strict();

const EVENT_CATEGORIES = [
  "GENERAL", "BRANCH", "HOSPITAL", "NPC", "MOBBING", "ON_CALL",
  "FINANCIAL", "SOCIAL", "HEALTH_SYSTEM", "WORLD", "RARE", "CAREER", "CRISIS",
] as const;

// Phase 9 §9/§31 — mirrors CrisisType/CrisisSeverity (domain/events/types.ts).
const CRISIS_TYPES = ["exhaustion", "burnout", "financial", "career"] as const;
const CRISIS_SEVERITIES = ["warning", "serious", "critical"] as const;

const EventDefinitionSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    titleVariants: z.array(TextVariantSchema).optional(),
    description: z.string().min(1),
    descriptionVariants: z.array(TextVariantSchema).optional(),
    category: z.enum(EVENT_CATEGORIES),
    triggerMode: z.enum(["pool", "scheduled", "crisis"]),
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
    crisisType: z.enum(CRISIS_TYPES).optional(),
    severity: z.enum(CRISIS_SEVERITIES).optional(),
  })
  .strict()
  .refine((e) => e.triggerMode !== "scheduled" || (!!e.chainId && !!e.chainCheckpoint), {
    message: "scheduled event is missing chainId/chainCheckpoint",
  })
  .refine((e) => e.triggerMode !== "crisis" || !!e.crisisType, {
    message: "crisis event is missing crisisType",
  })
  .refine((e) => e.triggerMode === "crisis" || (!e.crisisType && !e.severity), {
    message: "crisisType/severity set on a non-crisis event — meaningless outside triggerMode:\"crisis\"",
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

  // Phase 8 §38 — content-authoring-quality checks, all warnings (none of
  // these are structurally broken, just worth a human's attention as the
  // content pool grows).

  // Exact-duplicate title across different events — a real near-copy
  // smell (§1's "aynı eventin neredeyse birebir kopyası" rule).
  const titleOwners = new Map<string, string[]>();
  for (const e of events) {
    const owners = titleOwners.get(e.title) ?? [];
    owners.push(e.id);
    titleOwners.set(e.title, owners);
  }
  for (const [title, owners] of titleOwners) {
    if (owners.length > 1) {
      issues.push({ severity: "warning", message: `title "${title}" is reused verbatim by ${owners.length} events: ${owners.join(", ")}` });
    }
  }

  const MAX_DESCRIPTION_LENGTH = 600;
  const MAX_CHOICE_TEXT_LENGTH = 90;
  for (const e of events) {
    if (e.description.length > MAX_DESCRIPTION_LENGTH) {
      issues.push({ severity: "warning", eventId: e.id, message: `description is ${e.description.length} chars — long for a mobile event (§35 guidance)` });
    }
    for (const c of e.choices) {
      if (c.text.length > MAX_CHOICE_TEXT_LENGTH) {
        issues.push({ severity: "warning", eventId: e.id, message: `choice "${c.id}" text is ${c.text.length} chars — long for a single-line choice (§35 guidance)` });
      }
    }
  }

  // Two choices on the same event with byte-identical immediateEffects
  // read as "no real choice" to a player, even if hidden consequences
  // differ (§4's trade-off rule).
  for (const e of events) {
    const byEffect = new Map<string, string[]>();
    for (const c of e.choices) {
      const key = JSON.stringify(c.immediateEffects ?? {});
      const ids = byEffect.get(key) ?? [];
      ids.push(c.id);
      byEffect.set(key, ids);
    }
    for (const [key, ids] of byEffect) {
      if (ids.length > 1 && key !== "{}") {
        issues.push({ severity: "warning", eventId: e.id, message: `choices ${ids.join(", ")} have identical visible (immediateEffects) outcomes` });
      }
    }
  }

  // A requirement that demands the same stat/flag equal two different
  // literal values simultaneously (within the same `all` block) can
  // never pass — a copy-paste requirement bug, not a design choice.
  function findConflictingEq(node: RequirementNode | undefined): string[] {
    const conflicts: string[] = [];
    function walk(n: RequirementNode | undefined): void {
      if (!n) return;
      if ("all" in n) {
        const eqByKey = new Map<string, unknown>();
        for (const child of n.all) {
          if ("stat" in child && child.eq !== undefined) {
            const key = `stat:${child.stat}`;
            if (eqByKey.has(key) && eqByKey.get(key) !== child.eq) {
              conflicts.push(`${key} requires both "${eqByKey.get(key)}" and "${child.eq}" at once`);
            }
            eqByKey.set(key, child.eq);
          }
          if ("flag" in child && child.eq !== undefined) {
            const key = `flag:${child.flag}`;
            if (eqByKey.has(key) && eqByKey.get(key) !== child.eq) {
              conflicts.push(`${key} requires both "${eqByKey.get(key)}" and "${child.eq}" at once`);
            }
            eqByKey.set(key, child.eq);
          }
          walk(child);
        }
      } else if ("any" in n) {
        for (const child of n.any) walk(child);
      }
    }
    walk(node);
    return conflicts;
  }
  for (const e of events) {
    for (const conflict of findConflictingEq(e.requirements)) {
      issues.push({ severity: "warning", eventId: e.id, message: `unreachable requirement — ${conflict}` });
    }
    for (const c of e.choices) {
      for (const conflict of findConflictingEq(c.requirements)) {
        issues.push({ severity: "warning", eventId: e.id, message: `choice "${c.id}" has an unreachable requirement — ${conflict}` });
      }
    }
  }

  // requiredNpcTemplate must name a real authored template.
  const knownTemplateIds = new Set(NPC_TEMPLATES.map((t) => t.templateId));
  for (const e of events) {
    if (e.requiredNpcTemplate && !knownTemplateIds.has(e.requiredNpcTemplate)) {
      issues.push({ severity: "error", eventId: e.id, message: `requiredNpcTemplate "${e.requiredNpcTemplate}" does not match any authored NpcTemplate` });
    }
  }

  // branchIn must reference a real branch id — a typo'd branch id would
  // otherwise silently mean "never eligible for any branch".
  const knownBranchIds = new Set(BRANCH_DEFINITIONS.map((b) => b.id));
  function collectBranchIds(node: RequirementNode | undefined, out: Set<string>): void {
    if (!node) return;
    if ("all" in node) { for (const c of node.all) collectBranchIds(c, out); return; }
    if ("any" in node) { for (const c of node.any) collectBranchIds(c, out); return; }
    if ("branchIn" in node) { for (const id of node.branchIn) out.add(id); }
  }
  for (const e of events) {
    const branchIds = new Set<string>();
    collectBranchIds(e.requirements, branchIds);
    for (const c of e.choices) collectBranchIds(c.requirements, branchIds);
    for (const id of branchIds) {
      if (!knownBranchIds.has(id)) {
        issues.push({ severity: "error", eventId: e.id, message: `branchIn references unknown branch id "${id}"` });
      }
    }
  }

  // once:true makes cooldownWeeks meaningless (the event never becomes
  // eligible again regardless) — almost certainly a leftover from before
  // the event was migrated to `once`.
  for (const e of events) {
    if (e.once && e.cooldownWeeks !== undefined) {
      issues.push({ severity: "warning", eventId: e.id, message: `has both once:true and cooldownWeeks:${e.cooldownWeeks} — cooldownWeeks is unreachable dead config once "once" is set` });
    }
  }

  return { events, issues };
}

export function hasValidationErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}
