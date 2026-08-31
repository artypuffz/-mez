import type { GameState, RelationshipState } from "../state/types";
import type {
  ComparableValue,
  ComparisonOperators,
  RequirementNode,
} from "./types";
import { resolveNpcTargetId } from "./npcTargets";

// The DSL's view of GameState — a deliberately controlled surface rather
// than the raw GameState, so the queryable set stays stable even if
// GameState's internal shape changes later. "career.week" is an alias
// for residencyWeek (existing content, e.g. chain-baris.json, already
// uses that path).
export interface RequirementContext {
  career: {
    phase: string;
    week: number;
    residencyWeek: number;
    residencyYear: number;
    seniorityStage: string;
    branch?: string;
    hospital?: string;
    city?: string;
  };
  resources: { stress: number; fatigue: number; burnout: number; money: number };
  flags: Record<string, boolean | number | string>;
  statistics: Record<string, number>;
  behaviorStats: Record<string, number>;
  relationships: Record<string, RelationshipState>;
  // Resolved keys of the CURRENT QueuedEventInstance's boundNpcIds (empty
  // before an event is bound, e.g. during pool/checkpoint eligibility
  // scanning — see the ordering note in domain/npc/selector.ts).
  boundNpcIds: Record<string, string>;
  // Active NpcState.templateId values present in the roster — backs
  // EventDefinition.requiredNpcTemplate without the DSL ever needing to
  // know what an NpcState looks like.
  activeNpcTemplateIds: Set<string>;
  // §9/§29 — lets a requirement read an NPC's CURRENT role/career stage
  // (e.g. {stat: "npcs.baris.career.stage", eq: "specialist"}) via the
  // existing generic "stat" dot-path leaf, rather than a whole new
  // requirement-node kind. Only meaningful for a fixed, known id
  // (authored content like "baris") — a procedurally-bound npc's id
  // isn't known at content-authoring time.
  npcs: Record<string, { role: string; career: { stage: string }; active: boolean }>;
}

export function buildRequirementContext(
  state: GameState,
  boundNpcIds: Record<string, string> = {}
): RequirementContext {
  const activeNpcTemplateIds = new Set<string>();
  const npcs: RequirementContext["npcs"] = {};
  for (const npc of Object.values(state.npcs)) {
    if (npc.active && npc.templateId) activeNpcTemplateIds.add(npc.templateId);
    npcs[npc.id] = { role: npc.role, career: { stage: npc.career.stage }, active: npc.active };
  }

  return {
    career: {
      phase: state.career.phase,
      week: state.career.residencyWeek,
      residencyWeek: state.career.residencyWeek,
      residencyYear: state.career.residencyYear,
      seniorityStage: state.career.seniorityStage,
      branch: state.career.branch,
      hospital: state.career.hospital,
      city: state.career.city,
    },
    resources: state.resources,
    flags: state.flags,
    statistics: state.statistics,
    behaviorStats: state.behaviorStats,
    relationships: state.relationships,
    boundNpcIds,
    activeNpcTemplateIds,
    npcs,
  };
}

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === "object" && key in (acc as object)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function compare(actual: unknown, cond: ComparisonOperators): boolean {
  if (cond.eq !== undefined && actual !== cond.eq) return false;
  if (cond.neq !== undefined && actual === cond.neq) return false;
  if (cond.gt !== undefined && !(typeof actual === "number" && actual > cond.gt)) return false;
  if (cond.gte !== undefined && !(typeof actual === "number" && actual >= cond.gte)) return false;
  if (cond.lt !== undefined && !(typeof actual === "number" && actual < cond.lt)) return false;
  if (cond.lte !== undefined && !(typeof actual === "number" && actual <= cond.lte)) return false;
  if (cond.in !== undefined && !cond.in.includes(actual as ComparableValue)) return false;
  if (cond.notIn !== undefined && cond.notIn.includes(actual as ComparableValue)) return false;
  return true;
}

// NPC not found -> the condition fails (never silently treated as a
// match, never auto-creates a relationship record). See domain/events'
// engine.ts docs on NPC target resolution for the full policy.
function evaluateRelationship(
  node: Extract<RequirementNode, { relationship: unknown }>,
  ctx: RequirementContext
): boolean {
  const { npc, boundNpc, ...fields } = node.relationship;
  const npcId = resolveNpcTargetId({ npc, boundNpc }, ctx.boundNpcIds);
  if (!npcId) return false;
  const rel = ctx.relationships[npcId];
  if (!rel) return false;
  return (Object.keys(fields) as (keyof typeof fields)[]).every((field) => {
    const cond = fields[field];
    if (!cond) return true;
    return compare(rel[field], cond);
  });
}

export function evaluateRequirements(
  node: RequirementNode | undefined,
  ctx: RequirementContext
): boolean {
  if (!node) return true;
  if ("all" in node) return node.all.every((child) => evaluateRequirements(child, ctx));
  if ("any" in node) return node.any.some((child) => evaluateRequirements(child, ctx));
  if ("stat" in node) return compare(getPath(ctx, node.stat), node);
  if ("flag" in node) return compare(ctx.flags[node.flag], node);
  if ("branchIn" in node) return node.branchIn.includes(ctx.career.branch ?? "");
  if ("relationship" in node) return evaluateRelationship(node, ctx);
  throw new Error(`Unknown requirement leaf: ${JSON.stringify(node)}`);
}

// Used to break priority ties in checkpoint resolution — a requirement
// with more leaf conditions is treated as "more specific" per
// docs/event-schema.md §4.2 step 3.
export function countLeaves(node: RequirementNode | undefined): number {
  if (!node) return 0;
  if ("all" in node) return node.all.reduce((sum, child) => sum + countLeaves(child), 0);
  if ("any" in node) return node.any.reduce((sum, child) => sum + countLeaves(child), 0);
  return 1;
}
