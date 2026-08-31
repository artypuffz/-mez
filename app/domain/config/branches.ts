import type { BranchId } from "../state/types";

export interface BranchWeeklyBaseline {
  fatiguePressure: number;
  stressPressure: number;
}

export interface BranchDefinition {
  id: BranchId;
  name: string;
  residencyYears: number;
  description: string;
  // Small, deliberately understated per-branch difference (see
  // docs/event-design-bible.md's ton rehberi — no stereotyping). The real
  // differentiation between branches comes from on-call load (Phase 7)
  // and event content (Phase 8), not this baseline.
  weeklyBaseline: BranchWeeklyBaseline;
}

export const BRANCH_DEFINITIONS: BranchDefinition[] = [
  {
    id: "ic_hastaliklari",
    name: "İç Hastalıkları",
    residencyYears: 4,
    description: "Poliklinik, konsültasyon ve uzun takip dosyalarının branşı.",
    weeklyBaseline: { fatiguePressure: 4, stressPressure: 3 },
  },
  {
    id: "genel_cerrahi",
    name: "Genel Cerrahi",
    residencyYears: 5,
    description: "Ameliyathane temposu ve uzun nöbetlerle tanışacağın branş.",
    weeklyBaseline: { fatiguePressure: 5, stressPressure: 4 },
  },
  {
    id: "psikiyatri",
    name: "Psikiyatri",
    residencyYears: 4,
    description: "Görüşme odası, süpervizyon ve sabırla ilgili branş.",
    weeklyBaseline: { fatiguePressure: 3, stressPressure: 3 },
  },
];

export function getBranchDefinition(id: BranchId): BranchDefinition {
  const def = BRANCH_DEFINITIONS.find((b) => b.id === id);
  if (!def) {
    throw new Error(`Unknown branch id: ${id}`);
  }
  return def;
}
