import { createScopedRng } from "../rng/seededRng";
import type { NpcCareerStage, NpcRole, NpcState } from "../state/types";
import { NPC_TEMPLATES } from "../npc/templates";
import {
  EYE_STYLE_OPTIONS,
  FACE_SHAPE_OPTIONS,
  GLASSES_OPTIONS,
  HAIR_COLOR_OPTIONS,
  DETAIL_OPTIONS,
  SKIN_TONE_OPTIONS,
} from "./options";
import { eyebrowStyleWeights, facialHairCandidates, hairStyleWeights, resolveGenderPresentation } from "./genderAwareGeneration";
import { weightedPick, type WeightedOption } from "./weightedPick";
import type { HairColor, PlayerAvatar } from "./types";

// §34 — role/career-stage may weight PRESENTATION, never personality. This
// is the one deliberate role/stage weighting in the whole system: senior
// staff trend (not guarantee) toward gray/white hair, exactly the same
// "trend, not a stereotype" restraint domain/npc/generation.ts already
// uses for personality rolls. Nothing here reads NpcPersonality.
const SENIOR_ROLES = new Set<NpcRole>(["department_head", "faculty", "specialist"]);
const SENIOR_STAGES = new Set<NpcCareerStage>(["faculty", "department_head"]);

function hairColorWeights(role: NpcRole, stage: NpcCareerStage): WeightedOption<HairColor>[] {
  const senior = SENIOR_ROLES.has(role) || SENIOR_STAGES.has(stage);
  return HAIR_COLOR_OPTIONS.map((opt) => ({
    id: opt.id,
    weight: senior && (opt.id === "gray" || opt.id === "white") ? 4 : 1,
  }));
}

// Android Device QA Hotfix 1, Issue 1 — §32/§33 — deterministic "save seed
// + NPC identity -> avatar", computed fresh every call rather than
// persisted: the same (rngSeed, npc.id) always draws the exact same rng
// sequence, so the SAME npc never changes appearance across a refresh/
// reload/lifecycle-tick without needing an avatar field on NpcState at all
// (no migration required for this half of the system — see the doc note
// on migrations.ts's v10->v11 entry).
//
// Gender-aware generation reads npc.identity.gender — the SAME authoritative
// field the rest of the game already treats as the NPC's real gender —
// never inferred from role/personality/relationship/etc. Procedural NPCs
// get theirs from generateUniqueName (domain/npc/names.ts); authored NPCs
// get theirs from NpcTemplate.gender (domain/npc/generation.ts threads it
// through as spawnNpc's overrideGender). identity.gender is optional in
// the type (a very old pre-Phase-6 save could in principle lack it), so an
// absent value falls back to "neutral" weighting rather than crashing.
//
// §33 — authored NPCs (Barış, Zeynep, Erhan, Deniz) get a stable identity
// via NpcTemplate.appearanceOverrides (plain DATA), merged generically
// here on top of the same role-weighted procedural draw every other NPC
// gets. Nothing below branches on npc.id/templateId by name.
export function generateNpcAvatar(
  rngSeed: string,
  npc: Pick<NpcState, "id" | "role" | "career" | "templateId" | "identity">
): PlayerAvatar {
  const rng = createScopedRng(rngSeed, `avatar:npc:${npc.id}`);
  const presentation = resolveGenderPresentation(npc.identity.gender ?? "belirtmek_istemiyorum");
  const base: PlayerAvatar = {
    skinTone: rng.pick(SKIN_TONE_OPTIONS).id,
    faceShape: rng.pick(FACE_SHAPE_OPTIONS).id,
    hairStyle: weightedPick(rng, hairStyleWeights(presentation)),
    hairColor: weightedPick(rng, hairColorWeights(npc.role, npc.career.stage)),
    eyebrowStyle: weightedPick(rng, eyebrowStyleWeights(presentation)),
    eyeStyle: rng.pick(EYE_STYLE_OPTIONS).id,
    facialHair: rng.pick(facialHairCandidates(presentation)).id,
    glasses: rng.pick(GLASSES_OPTIONS).id,
    detail: rng.pick(DETAIL_OPTIONS).id,
  };

  const template = npc.templateId ? NPC_TEMPLATES.find((t) => t.templateId === npc.templateId) : undefined;
  return template?.appearanceOverrides ? { ...base, ...template.appearanceOverrides } : base;
}
