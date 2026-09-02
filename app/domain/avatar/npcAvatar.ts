import { createScopedRng } from "../rng/seededRng";
import type { NpcCareerStage, NpcRole, NpcState } from "../state/types";
import { NPC_TEMPLATES } from "../npc/templates";
import {
  EYEBROW_STYLE_OPTIONS,
  EYE_STYLE_OPTIONS,
  FACE_SHAPE_OPTIONS,
  FACIAL_HAIR_OPTIONS,
  GLASSES_OPTIONS,
  HAIR_COLOR_OPTIONS,
  HAIR_STYLE_OPTIONS,
  DETAIL_OPTIONS,
  SKIN_TONE_OPTIONS,
} from "./options";
import type { HairColor, PlayerAvatar } from "./types";

// §34 — role/career-stage may weight PRESENTATION, never personality. This
// is the one deliberate weighting in the whole system: senior staff trend
// (not guarantee) toward gray/white hair, exactly the same "trend, not a
// stereotype" restraint domain/npc/generation.ts already uses for
// personality rolls. Nothing here reads NpcPersonality.
const SENIOR_ROLES = new Set<NpcRole>(["department_head", "faculty", "specialist"]);
const SENIOR_STAGES = new Set<NpcCareerStage>(["faculty", "department_head"]);

function hairColorWeights(role: NpcRole, stage: NpcCareerStage): { id: HairColor; weight: number }[] {
  const senior = SENIOR_ROLES.has(role) || SENIOR_STAGES.has(stage);
  return HAIR_COLOR_OPTIONS.map((opt) => ({
    id: opt.id,
    weight: senior && (opt.id === "gray" || opt.id === "white") ? 4 : 1,
  }));
}

function weightedPick<T>(rng: ReturnType<typeof createScopedRng>, weighted: { id: T; weight: number }[]): T {
  const total = weighted.reduce((sum, w) => sum + w.weight, 0);
  let roll = rng.next() * total;
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) return entry.id;
  }
  return weighted[weighted.length - 1].id;
}

// §32/§33 — deterministic "save seed + NPC identity -> avatar", computed
// fresh every call rather than persisted: the same (rngSeed, npc.id) always
// draws the exact same rng sequence, so the SAME npc never changes
// appearance across a refresh/reload/lifecycle-tick without needing an
// avatar field on NpcState at all (no migration required for this half of
// the system — see docs note in migrations.ts's v10->v11 entry).
//
// §33 — authored NPCs (Barış, Zeynep, Erhan, Deniz) get a stable identity
// via NpcTemplate.appearanceOverrides (plain DATA), merged generically
// here on top of the same role-weighted procedural draw every other NPC
// gets. Nothing below branches on npc.id/templateId by name.
export function generateNpcAvatar(
  rngSeed: string,
  npc: Pick<NpcState, "id" | "role" | "career" | "templateId">
): PlayerAvatar {
  const rng = createScopedRng(rngSeed, `avatar:npc:${npc.id}`);
  const base: PlayerAvatar = {
    skinTone: rng.pick(SKIN_TONE_OPTIONS).id,
    faceShape: rng.pick(FACE_SHAPE_OPTIONS).id,
    hairStyle: rng.pick(HAIR_STYLE_OPTIONS).id,
    hairColor: weightedPick(rng, hairColorWeights(npc.role, npc.career.stage)),
    eyebrowStyle: rng.pick(EYEBROW_STYLE_OPTIONS).id,
    eyeStyle: rng.pick(EYE_STYLE_OPTIONS).id,
    facialHair: rng.pick(FACIAL_HAIR_OPTIONS).id,
    glasses: rng.pick(GLASSES_OPTIONS).id,
    detail: rng.pick(DETAIL_OPTIONS).id,
  };

  const template = npc.templateId ? NPC_TEMPLATES.find((t) => t.templateId === npc.templateId) : undefined;
  return template?.appearanceOverrides ? { ...base, ...template.appearanceOverrides } : base;
}
