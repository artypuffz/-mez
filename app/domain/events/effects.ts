import type { SeededRng } from "../rng/seededRng";
import type { RelationshipState, ResolvedResourceDelta } from "../state/types";
import type { EffectMap, NumericOrRange, RelationshipEffect, RelationshipField } from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveValue(value: NumericOrRange, rng: SeededRng): number {
  if (typeof value === "number") return value;
  return rng.int(value.min, value.max);
}

// EffectMap fields can be a fixed number or a {min,max} range (seeded RNG
// resolves it). Resolving here — rather than at apply time — means a
// delayed effect's range is rolled once, at the choice, and the concrete
// number is what's stored in pendingEffects; it never re-rolls later.
export function resolveEffectMap(map: EffectMap | undefined, rng: SeededRng): ResolvedResourceDelta {
  if (!map) return {};
  const resolved: ResolvedResourceDelta = {};
  if (map.stress !== undefined) resolved.stress = resolveValue(map.stress, rng);
  if (map.fatigue !== undefined) resolved.fatigue = resolveValue(map.fatigue, rng);
  if (map.burnout !== undefined) resolved.burnout = resolveValue(map.burnout, rng);
  if (map.money !== undefined) resolved.money = resolveValue(map.money, rng);
  return resolved;
}

export interface ResourceState {
  stress: number;
  fatigue: number;
  burnout: number;
  money: number;
}

// stress/fatigue/burnout clamp to [0,100] like every other resource tick
// in the game; money is never clamped — it can go negative (debt is a
// valid, meaningful state, not a system error).
export function applyResourceDelta(resources: ResourceState, delta: ResolvedResourceDelta): ResourceState {
  return {
    stress: clamp(resources.stress + (delta.stress ?? 0), 0, 100),
    fatigue: clamp(resources.fatigue + (delta.fatigue ?? 0), 0, 100),
    burnout: clamp(resources.burnout + (delta.burnout ?? 0), 0, 100),
    money: resources.money + (delta.money ?? 0),
  };
}

const DEFAULT_RELATIONSHIP_STATE: RelationshipState = {
  trust: 0,
  friendship: 0,
  grudge: 0,
  mobbingTendency: 0,
  helpfulness: 0,
  ego: 0,
  burnoutNpc: 0,
};

const RELATIONSHIP_FIELDS: RelationshipField[] = [
  "trust",
  "friendship",
  "grudge",
  "mobbingTendency",
  "helpfulness",
  "ego",
  "burnoutNpc",
];

// Not specified by the schema — clamped to [-100, 100] as a documented
// engine default: permissive enough to keep every existing example's
// deltas meaningful (ego can go negative, ranges reach the 30s), but
// bounded so nothing runs away unboundedly.
const RELATIONSHIP_MIN = -100;
const RELATIONSHIP_MAX = 100;

// Auto-creates a relationship record on first contact — this is the ONE
// place that's allowed to happen (an effect is an explicit authored
// interaction with that NPC). Requirement evaluation (requirements.ts)
// never does this — a missing NPC there just fails the condition.
export function applyRelationshipEffects(
  relationships: Record<string, RelationshipState>,
  effects: RelationshipEffect[] | undefined
): Record<string, RelationshipState> {
  if (!effects || effects.length === 0) return relationships;
  const next = { ...relationships };
  for (const effect of effects) {
    const { npc, ...deltas } = effect;
    const current = next[npc] ?? DEFAULT_RELATIONSHIP_STATE;
    const updated = { ...current };
    for (const field of RELATIONSHIP_FIELDS) {
      const delta = deltas[field];
      if (delta !== undefined) {
        updated[field] = clamp(current[field] + delta, RELATIONSHIP_MIN, RELATIONSHIP_MAX);
      }
    }
    next[npc] = updated;
  }
  return next;
}

export function applyFlags(
  flags: Record<string, boolean | number | string>,
  spec: { set?: Record<string, boolean | number | string>; clear?: string[] } | undefined
): Record<string, boolean | number | string> {
  if (!spec) return flags;
  const next = { ...flags };
  for (const key of spec.clear ?? []) delete next[key];
  Object.assign(next, spec.set ?? {});
  return next;
}

export function applyStatistics(
  statistics: Record<string, number>,
  spec: { increment?: Record<string, number> } | undefined
): Record<string, number> {
  if (!spec?.increment) return statistics;
  const next = { ...statistics };
  for (const [key, amount] of Object.entries(spec.increment)) {
    next[key] = (next[key] ?? 0) + amount;
  }
  return next;
}

// The engine never interprets what a tag means — it just counts it. See
// docs/event-schema.md §6.
export function applyBehaviorTags(
  behaviorStats: Record<string, number>,
  tags: string[] | undefined
): Record<string, number> {
  if (!tags || tags.length === 0) return behaviorStats;
  const next = { ...behaviorStats };
  for (const tag of tags) next[tag] = (next[tag] ?? 0) + 1;
  return next;
}
