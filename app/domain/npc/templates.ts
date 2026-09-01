import type { NpcPersonality, NpcRole } from "../state/types";

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
  },
  {
    templateId: "zeynep_sekreter",
    name: "Zeynep Arslan",
    role: "secretary",
  },
  {
    templateId: "hoca_erhan",
    name: "Doç. Dr. Erhan Kaya",
    role: "faculty",
  },
  {
    templateId: "deniz_comez",
    name: "Deniz Yıldız",
    role: "junior_resident",
  },
];
