import type { NpcId, NpcState, NpcTransition, RelationshipState } from "../state/types";
import type { SeededRng } from "../rng/seededRng";
import type { ResidencyProgram } from "../config/residencyPrograms";
import { DEFAULT_CLINIC_COMPOSITION, type ClinicCompositionTemplate } from "../config/clinicComposition";
import { DEFAULT_NPC_LIFECYCLE_CONFIG, type NpcLifecycleConfig } from "../config/npcLifecycle";
import { cultureBias, spawnNpc } from "./generation";
import { hierarchyPressureToMobbingRiskEquivalent, resolveFinalHierarchyPressure } from "../residency/hospitalCulture";

export interface TickNpcLifecycleResult {
  npcs: Record<NpcId, NpcState>;
  relationships: Record<NpcId, RelationshipState>;
  transitions: NpcTransition[];
}

// Roles the replenishment pass will top back up toward the composition's
// minimum when they fall short (§13). department_head is the one role
// excluded — losing it is instead refilled organically by the faculty ->
// department_head promotion path above (that promotion only fires when
// !hasActiveDepartmentHead), so a fresh outside hire would be redundant.
const REPLENISHABLE_ROLES: (keyof ClinicCompositionTemplate)[] = [
  "faculty", "specialist", "senior_resident", "peer_resident", "junior_resident", "nurse", "secretary",
];

// One monthly tick (§11, called on the calendar's monthChanged transition,
// never per-week): promotions, departures, then replenishment. Templated
// NPCs (Barış) are excluded entirely — their career stage is driven only
// by their own authored chain, never by this generic roll (§12, §31).
export function tickNpcLifecycle(
  npcs: Record<NpcId, NpcState>,
  relationships: Record<NpcId, RelationshipState>,
  program: ResidencyProgram,
  currentWeek: number,
  rng: SeededRng,
  options: {
    config?: NpcLifecycleConfig;
    composition?: ClinicCompositionTemplate;
    ensureJuniorForSeniorPlayer?: boolean;
    // Phase 11 — required only when program.hiddenProfile.mobbingRisk is
    // absent (a real program), to derive its procedural culture the same
    // way generateInitialClinic does. See resolveMobbingRiskEquivalent's
    // twin logic below.
    gameSeed?: string;
  } = {}
): TickNpcLifecycleResult {
  const config = options.config ?? DEFAULT_NPC_LIFECYCLE_CONFIG;
  const composition = options.composition ?? DEFAULT_CLINIC_COMPOSITION;
  const nextNpcs: Record<NpcId, NpcState> = { ...npcs };
  const nextRelationships: Record<NpcId, RelationshipState> = { ...relationships };
  const transitions: NpcTransition[] = [];
  let hasActiveDepartmentHead = Object.values(nextNpcs).some((n) => n.active && n.role === "department_head");

  const eligibleIds = Object.values(npcs)
    .filter((n) => n.active && !n.templateId)
    .map((n) => n.id)
    .sort();

  for (const id of eligibleIds) {
    const npc = nextNpcs[id];
    if (!npc.active) continue;
    const tenureWeeks = currentWeek - npc.career.joinedWeek;

    const leaveChance = config.baseLeaveChancePerMonth + (npc.personality.burnout / 100) * config.burnoutLeaveChanceMultiplier;
    if (rng.next() < leaveChance) {
      nextNpcs[id] = { ...npc, active: false, career: { ...npc.career, stage: "left", leftWeek: currentWeek } };
      transitions.push({ npcId: id, type: "left", week: currentWeek });
      continue;
    }

    if (
      npc.career.stage === "resident" &&
      npc.role === "senior_resident" &&
      tenureWeeks >= config.promotionTenureWeeksResidentToSpecialist &&
      rng.next() < config.promotionChancePerMonthResidentToSpecialist
    ) {
      nextNpcs[id] = { ...npc, role: "specialist", career: { ...npc.career, stage: "specialist" } };
      transitions.push({ npcId: id, type: "became_specialist", week: currentWeek });
      continue;
    }

    if (
      npc.career.stage === "specialist" &&
      tenureWeeks >= config.promotionTenureWeeksSpecialistToFaculty &&
      rng.next() < config.promotionChancePerMonthSpecialistToFaculty
    ) {
      nextNpcs[id] = { ...npc, role: "faculty", career: { ...npc.career, stage: "faculty" } };
      transitions.push({ npcId: id, type: "became_faculty", week: currentWeek });
      continue;
    }

    if (
      npc.career.stage === "faculty" &&
      !hasActiveDepartmentHead &&
      rng.next() < config.promotionChancePerMonthFacultyToHead
    ) {
      nextNpcs[id] = { ...npc, role: "department_head", career: { ...npc.career, stage: "department_head" } };
      transitions.push({ npcId: id, type: "became_department_head", week: currentWeek });
      hasActiveDepartmentHead = true;
      continue;
    }
  }

  let mobbingRiskEquivalent = program.hiddenProfile.mobbingRisk;
  if (mobbingRiskEquivalent === undefined) {
    if (!options.gameSeed) {
      throw new Error(
        `tickNpcLifecycle: program "${program.id}" has no static hiddenProfile.mobbingRisk and no gameSeed was provided to derive one procedurally`
      );
    }
    mobbingRiskEquivalent = hierarchyPressureToMobbingRiskEquivalent(resolveFinalHierarchyPressure(options.gameSeed, program));
  }
  const culture = cultureBias(mobbingRiskEquivalent, program.hiddenProfile.npcCultureSeedModifier ?? 0);
  const usedNames = new Set(Object.values(nextNpcs).map((n) => n.identity.name));

  const activeCountByRole = (role: keyof ClinicCompositionTemplate) =>
    Object.values(nextNpcs).filter((n) => n.active && n.role === role).length;

  let replacementIndex = 0;
  const spawnReplacement = (role: keyof ClinicCompositionTemplate) => {
    const { npc, relationship } = spawnNpc({
      role: role as NpcState["role"],
      hospitalId: program.hospitalId,
      branchId: program.branchId,
      currentWeek,
      culture,
      rng,
      usedNames,
      idPrefix: `npc_${program.id}_r${currentWeek}`,
      index: replacementIndex++,
      backdateJoinWeek: false,
    });
    nextNpcs[npc.id] = npc;
    nextRelationships[npc.id] = relationship;
    transitions.push({ npcId: npc.id, type: "arrived", week: currentWeek });
  };

  for (const role of REPLENISHABLE_ROLES) {
    const min = composition[role].min;
    while (activeCountByRole(role) < min) {
      spawnReplacement(role);
    }
  }

  // Player seniority mirror (§14): once the player is "kıdemli", the
  // career-npc-mirror chain needs a real junior_resident to target, not
  // just whatever the base composition minimum happens to allow.
  if (options.ensureJuniorForSeniorPlayer && activeCountByRole("junior_resident") === 0 && activeCountByRole("peer_resident") === 0) {
    spawnReplacement("junior_resident");
  }

  return { npcs: nextNpcs, relationships: nextRelationships, transitions };
}
