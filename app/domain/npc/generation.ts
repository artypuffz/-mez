import { clampRelationshipField, type NpcId, type NpcPersonality, type NpcRole, type NpcState, type RelationshipState } from "../state/types";
import type { SeededRng } from "../rng/seededRng";
import type { ResidencyProgram } from "../config/residencyPrograms";
import { DEFAULT_CLINIC_COMPOSITION, ROLE_TENURE_RANGE, type ClinicCompositionTemplate } from "../config/clinicComposition";
import { NPC_TEMPLATES } from "./templates";
import { generateUniqueName } from "./names";

const ROLE_ORDER: NpcRole[] = [
  "department_head", "faculty", "specialist", "senior_resident",
  "peer_resident", "junior_resident", "nurse", "secretary",
];

// Nudges toward a role's typical character — deliberately modest, not a
// stereotype: e.g. a department head trends a bit more hierarchical, a
// peer resident's burnout roll uses a wider spread. Nothing here is
// visible to the player (personality is never rendered as a number).
const ROLE_PERSONALITY_BIAS: Partial<Record<NpcRole, Partial<NpcPersonality>>> = {
  department_head: { hierarchyOrientation: 20, ego: 10 },
  faculty: { hierarchyOrientation: 10 },
  senior_resident: { conflictTendency: 5 },
  junior_resident: { helpfulness: 5 },
  nurse: { helpfulness: 10, hierarchyOrientation: -10 },
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

// hiddenProfile.mobbingRisk (Phase 3) stops being a fixed claim about the
// institution here — it becomes a procedural bias on generated staff
// personality, so the SAME real hospital name can produce a supportive
// roster in one playthrough and a hostile one in another (see the Phase 6
// report for why this was the resolution instead of removing the field).
export function cultureBias(mobbingRisk: number, npcCultureSeedModifier = 0): Partial<NpcPersonality> {
  const centered = mobbingRisk - 50; // -50..50
  return {
    conflictTendency: Math.round(centered / 6 - npcCultureSeedModifier),
    hierarchyOrientation: Math.round(centered / 8),
    helpfulness: Math.round(-centered / 8 + npcCultureSeedModifier * 2),
  };
}

function rollField(rng: SeededRng, bias: number, range: [number, number]): number {
  return clamp(rng.int(range[0], range[1]) + bias);
}

function generatePersonality(
  role: NpcRole,
  culture: Partial<NpcPersonality>,
  rng: SeededRng
): NpcPersonality {
  const roleBias = ROLE_PERSONALITY_BIAS[role] ?? {};
  const burnoutRange: [number, number] = role === "peer_resident" ? [10, 90] : [15, 75];
  const combined = (field: keyof NpcPersonality) => (roleBias[field] ?? 0) + (culture[field] ?? 0);
  return {
    helpfulness: rollField(rng, combined("helpfulness"), [20, 80]),
    ego: rollField(rng, combined("ego"), [20, 80]),
    hierarchyOrientation: rollField(rng, combined("hierarchyOrientation"), [20, 80]),
    conflictTendency: rollField(rng, combined("conflictTendency"), [20, 80]),
    burnout: rollField(rng, combined("burnout"), burnoutRange),
  };
}

// §19 — small, seeded starting values, not a flat 0 for everyone. Still
// routed through the shared clamp standard even though these narrow rolls
// never approach the bound, so the invariant holds at every call site.
function initialRelationship(rng: SeededRng): RelationshipState {
  return {
    trust: clampRelationshipField("trust", rng.int(-10, 10)),
    friendship: clampRelationshipField("friendship", rng.int(-5, 10)),
    grudge: clampRelationshipField("grudge", 0),
  };
}

function careerStageForRole(role: NpcRole): NpcState["career"]["stage"] {
  if (role === "department_head") return "department_head";
  if (role === "faculty") return "faculty";
  if (role === "specialist") return "specialist";
  return "resident";
}

function seniorityLevelForRole(role: NpcRole): number | undefined {
  if (role === "senior_resident") return 3;
  if (role === "peer_resident") return 2;
  if (role === "junior_resident") return 1;
  return undefined;
}

export interface SpawnNpcOptions {
  role: NpcRole;
  hospitalId: string;
  branchId: string;
  currentWeek: number;
  culture: Partial<NpcPersonality>;
  rng: SeededRng;
  usedNames: Set<string>;
  idPrefix: string;
  index: number;
  templateId?: string;
  overrideName?: string;
  personalityOverrides?: Partial<NpcPersonality>;
  // New arrivals join now; the initial roster gets a plausible backdated
  // tenure instead (see ROLE_TENURE_RANGE) — pass false for replenishment.
  backdateJoinWeek?: boolean;
}

export interface SpawnedNpc {
  npc: NpcState;
  relationship: RelationshipState;
}

// The single place an NpcState is ever constructed — used for both the
// initial clinic roster and later lifecycle replenishment, so the two
// never drift apart in shape or in how personality/tenure are rolled.
// `index` is caller-managed (not a module-level counter) so the same
// (seed, program) always produces the exact same id strings, not just the
// same roster contents.
export function spawnNpc(options: SpawnNpcOptions): SpawnedNpc {
  const { role, hospitalId, branchId, currentWeek, culture, rng, usedNames, idPrefix, index } = options;
  // A templated NPC's id IS its templateId (e.g. "baris") — authored
  // content already references that literal string directly
  // (`npc: "baris"`), so this is what lets existing content keep working
  // unchanged against a real NpcState, with zero name special-casing in
  // the engine itself (§17/§31).
  const id = options.templateId ?? `${idPrefix}_${index}`;
  const generatedName = generateUniqueName(rng, usedNames);
  const personality = { ...generatePersonality(role, culture, rng), ...options.personalityOverrides };

  const joinedWeek = options.backdateJoinWeek === false
    ? currentWeek
    : (() => {
        const [min, max] = ROLE_TENURE_RANGE[role];
        return currentWeek + rng.int(min, max);
      })();

  const npc: NpcState = {
    id,
    identity: { name: options.overrideName ?? generatedName.fullName, gender: generatedName.gender },
    role,
    branchId,
    hospitalId,
    career: {
      stage: careerStageForRole(role),
      seniorityLevel: seniorityLevelForRole(role),
      joinedWeek,
    },
    personality,
    active: true,
    templateId: options.templateId,
  };

  return { npc, relationship: initialRelationship(rng) };
}

function rollRoleCount(min: number, max: number, staffingPressure: number, rng: SeededRng): number {
  // Higher staffing pressure trends the roster a little thinner — reuses
  // Phase 3's static structural profile as intended (§7): the "static
  // structural profile" layer, separate from the procedural culture-seed
  // layer above.
  const pressureAdjustedMax = staffingPressure > 65 ? Math.max(min, max - 1) : max;
  return rng.int(min, pressureAdjustedMax);
}

export interface GenerateInitialClinicResult {
  npcs: NpcState[];
  relationships: Record<NpcId, RelationshipState>;
}

// Deterministic for a given (seed, programId): same save seed + same
// program -> same starting roster, every time (§4).
export function generateInitialClinic(
  program: ResidencyProgram,
  rng: SeededRng,
  composition: ClinicCompositionTemplate = DEFAULT_CLINIC_COMPOSITION
): GenerateInitialClinicResult {
  const npcs: NpcState[] = [];
  const relationships: Record<NpcId, RelationshipState> = {};
  const usedNames = new Set<string>();
  const culture = cultureBias(program.hiddenProfile.mobbingRisk, program.hiddenProfile.npcCultureSeedModifier ?? 0);
  let index = 0;

  const spawn = (role: NpcRole, templateId?: string, overrideName?: string, personalityOverrides?: Partial<NpcPersonality>) => {
    const { npc, relationship } = spawnNpc({
      role, hospitalId: program.hospitalId, branchId: program.branchId, currentWeek: 0,
      culture, rng, usedNames, idPrefix: `npc_${program.id}`, index: index++, templateId, overrideName, personalityOverrides,
    });
    npcs.push(npc);
    relationships[npc.id] = relationship;
  };

  for (const role of ROLE_ORDER) {
    const range = composition[role];
    const count = rollRoleCount(range.min, range.max, program.hiddenProfile.staffingPressure, rng);
    for (let i = 0; i < count; i++) spawn(role);
  }

  for (const template of NPC_TEMPLATES) {
    spawn(template.role, template.templateId, template.name, template.personalityOverrides);
  }

  return { npcs, relationships };
}
