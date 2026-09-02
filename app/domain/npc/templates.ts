import type { Gender, NpcPersonality, NpcRole } from "../state/types";
import type { PlayerAvatar } from "../avatar/types";

// Authored-character slots — injected into every generated clinic
// alongside the procedural roster (§17 option B). The engine treats this
// exactly like any other roster entry; nothing in domain/npc or
// domain/events ever checks `id === "baris"`. Content (chain-baris.json)
// is what gives "baris" narrative meaning, by referencing this id.
export interface NpcTemplate {
  templateId: string;
  name: string;
  role: NpcRole;
  // Android Device QA Hotfix 1, Issue 1 — an authored character's gender
  // is an authored FACT, never something incidentally drawn from an
  // unrelated random-name-generation call (see the root-cause note on
  // spawnNpc in domain/npc/generation.ts: before this fix, identity.gender
  // came from a throwaway generated name whose own name was then
  // discarded and replaced by `name` below, so an authored NPC's stored
  // gender had no relation to who they actually are). Required, not
  // optional, so no future authored template can silently skip it.
  gender: Gender;
  personalityOverrides?: Partial<NpcPersonality>;
  // Gameplay Expansion Part C section 33 — a stable authored LOOK, layered
  // on top of the same role-weighted procedural draw every NPC gets (see
  // domain/avatar/npcAvatar.ts). Plain data, never a name-keyed branch in
  // the renderer/generator; an override wins only for the fields it sets,
  // every omitted field still comes from the normal roll.
  appearanceOverrides?: Partial<PlayerAvatar>;
}

// Phase 8 §9 — three more authored major-chain characters, same
// mechanism as Barış: each gets a stable id equal to its templateId, so
// content (chains/secretary.json, chains/faculty.json, chains/junior.json)
// can reference a real, persistent NpcState across every checkpoint of
// its chain without the engine ever special-casing a name.
export const NPC_TEMPLATES: NpcTemplate[] = [
  {
    templateId: "baris",
    name: "Barış Demir",
    role: "senior_resident",
    gender: "erkek",
    appearanceOverrides: { hairStyle: "short_swept", hairColor: "dark_brown", faceShape: "square" },
  },
  {
    templateId: "zeynep_sekreter",
    name: "Zeynep Arslan",
    role: "secretary",
    gender: "kadın",
    appearanceOverrides: { hairStyle: "medium_wavy", hairColor: "auburn", glasses: "round" },
  },
  {
    templateId: "hoca_erhan",
    name: "Doç. Dr. Erhan Kaya",
    role: "faculty",
    gender: "erkek",
    appearanceOverrides: { hairStyle: "short_side_part", hairColor: "gray", facialHair: "mustache", glasses: "square" },
  },
  {
    templateId: "deniz_comez",
    name: "Deniz Yıldız",
    role: "junior_resident",
    gender: "kadın",
    appearanceOverrides: { hairStyle: "ponytail", hairColor: "black", faceShape: "round" },
  },
];
