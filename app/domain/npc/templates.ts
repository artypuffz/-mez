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

export const NPC_TEMPLATES: NpcTemplate[] = [
  {
    templateId: "baris",
    name: "Barış Demir",
    role: "senior_resident",
  },
];
