import type { NpcPersonality, NpcRole } from "../state/types";
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
    appearanceOverrides: { hairStyle: "short_swept", hairColor: "dark_brown", faceShape: "square" },
  },
  {
    templateId: "zeynep_sekreter",
    name: "Zeynep Arslan",
    role: "secretary",
    appearanceOverrides: { hairStyle: "medium_wavy", hairColor: "auburn", glasses: "round" },
  },
  {
    templateId: "hoca_erhan",
    name: "Doç. Dr. Erhan Kaya",
    role: "faculty",
    appearanceOverrides: { hairStyle: "short_side_part", hairColor: "gray", facialHair: "mustache", glasses: "square" },
  },
  {
    templateId: "deniz_comez",
    name: "Deniz Yıldız",
    role: "junior_resident",
    appearanceOverrides: { hairStyle: "ponytail", hairColor: "black", faceShape: "round" },
  },
];
