import type { GameState, NpcId, NpcRole, NpcState, RelationshipHistoryEntry } from "../state/types";
import { deriveRelationshipLabel, deriveRelationshipScore, type RelationshipLabel } from "./relationshipLabel";
import { selectNpcAvatar } from "../avatar/selectNpcAvatar";
import type { PlayerAvatar } from "../avatar/types";

// Per-npc role label (detail views, İlişkiler rows) — distinct from the
// coarser group labels below (§25/§27/§28: shown text, never a raw stat).
export const NPC_ROLE_LABELS_TR: Record<NpcRole, string> = {
  department_head: "Bölüm Başkanı",
  faculty: "Öğretim Üyesi",
  specialist: "Uzman",
  senior_resident: "Kıdemli Asistan",
  peer_resident: "Asistan",
  junior_resident: "Çömez",
  nurse: "Hemşire",
  secretary: "Sekreter",
};

interface RosterGroupDef {
  label: string;
  roles: NpcRole[];
}

// §27's example grouping — department head and nurses get their own
// section, the three resident roles fold into one "Asistanlar" section
// (their individual role label still shows per-row via NPC_ROLE_LABELS_TR).
const ROSTER_GROUPS: RosterGroupDef[] = [
  { label: "Bölüm Başkanı", roles: ["department_head"] },
  { label: "Öğretim Üyeleri", roles: ["faculty", "specialist"] },
  { label: "Asistanlar", roles: ["senior_resident", "peer_resident", "junior_resident"] },
  { label: "Hemşireler", roles: ["nurse"] },
  { label: "Sekreterlik", roles: ["secretary"] },
];

export interface RosterGroup {
  label: string;
  npcs: NpcState[];
}

// Hastane tab (§27) — active roster only, grouped, no hidden stats. Left
// NPCs are excluded from every group (their history stays in eventHistory
// if content ever referenced them, not surfaced as a roster here).
export function selectHospitalRoster(state: GameState): RosterGroup[] {
  const active = Object.values(state.npcs).filter((n) => n.active);
  return ROSTER_GROUPS.map((group) => ({
    label: group.label,
    npcs: active
      .filter((n) => group.roles.includes(n.role))
      .sort((a, b) => a.identity.name.localeCompare(b.identity.name)),
  })).filter((group) => group.npcs.length > 0);
}

export interface RelationshipRosterEntry {
  npcId: NpcId;
  name: string;
  roleLabel: string;
  active: boolean;
  label: RelationshipLabel;
  score: number;
  avatar: PlayerAvatar | null;
}

// İlişkiler tab (§25/§26) — every active NPC has a relationship record
// from the moment the clinic is generated (§19), so this is effectively
// the same roster as Hastane's, but rendered as name/role/label rows.
// Gameplay Expansion Part B merges this INTO Hastane (§2) — kept as its
// own selector since Hastane still needs the plain grouped roster for its
// "Kişi ara" search, this one is what backs the relationship-focused rows.
export function selectRelationshipRoster(state: GameState): RelationshipRosterEntry[] {
  return Object.values(state.npcs)
    .filter((n) => n.active)
    .map((n) => {
      const relationship = state.relationships[n.id] ?? { trust: 0, friendship: 0, grudge: 0 };
      return {
        npcId: n.id,
        name: n.identity.name,
        roleLabel: NPC_ROLE_LABELS_TR[n.role],
        active: n.active,
        label: deriveRelationshipLabel(relationship),
        score: deriveRelationshipScore(relationship),
        avatar: selectNpcAvatar(state, n.id),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface NpcDetail {
  npcId: NpcId;
  name: string;
  roleLabel: string;
  tenureLabel: string;
  relationshipLabel: RelationshipLabel;
  relationshipScore: number;
  avatar: PlayerAvatar | null;
  history: RelationshipHistoryEntry[];
}

function tenureLabel(joinedWeek: number, currentWeek: number): string {
  const weeks = currentWeek - joinedWeek;
  if (weeks < 8) return "Yeni geldi";
  const years = Math.floor(weeks / 52);
  if (years < 1) return "Bu yıl başladı";
  return years === 1 ? "1 yıldır bu klinikte" : `${years} yıldır bu klinikte`;
}

// §28 — name, role, tenure, relationship label. Deliberately nothing
// else: no personality numbers, no relationship numbers.
export function selectNpcDetail(state: GameState, npcId: NpcId): NpcDetail | null {
  const npc = state.npcs[npcId];
  if (!npc) return null;
  const relationship = state.relationships[npcId] ?? { trust: 0, friendship: 0, grudge: 0 };
  return {
    npcId,
    name: npc.identity.name,
    roleLabel: NPC_ROLE_LABELS_TR[npc.role],
    tenureLabel: tenureLabel(npc.career.joinedWeek, state.career.residencyWeek),
    relationshipLabel: deriveRelationshipLabel(relationship),
    relationshipScore: deriveRelationshipScore(relationship),
    avatar: selectNpcAvatar(state, npcId),
    history: state.relationshipHistory[npcId] ?? [],
  };
}
