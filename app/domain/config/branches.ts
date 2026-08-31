import type { BranchId } from "../state/types";

export interface BranchDefinition {
  id: BranchId;
  name: string;
  residencyYears: number;
  description: string;
}

// residencyYears will drive residencyWeek/Year math once weekly
// simulation exists (Phase 4+) — not used for that yet.
export const BRANCH_DEFINITIONS: BranchDefinition[] = [
  {
    id: "ic_hastaliklari",
    name: "İç Hastalıkları",
    residencyYears: 4,
    description: "Poliklinik, konsültasyon ve uzun takip dosyalarının branşı.",
  },
  {
    id: "genel_cerrahi",
    name: "Genel Cerrahi",
    residencyYears: 5,
    description: "Ameliyathane temposu ve uzun nöbetlerle tanışacağın branş.",
  },
  {
    id: "psikiyatri",
    name: "Psikiyatri",
    residencyYears: 4,
    description: "Görüşme odası, süpervizyon ve sabırla ilgili branş.",
  },
];

export function getBranchDefinition(id: BranchId): BranchDefinition {
  const def = BRANCH_DEFINITIONS.find((b) => b.id === id);
  if (!def) {
    throw new Error(`Unknown branch id: ${id}`);
  }
  return def;
}
