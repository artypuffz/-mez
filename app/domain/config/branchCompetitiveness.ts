import type { BranchId } from "../state/types";

// Android Device QA Hotfix 1, Issue 2 — entry COMPETITIVENESS is a
// DIFFERENT axis from residency (workplace) DIFFICULTY. The hotfix brief
// is explicit: "Do NOT use hospital workplace difficulty as a direct
// proxy for TUS competitiveness. A difficult residency is not necessarily
// harder to enter." This table is therefore built independently of
// `BranchDefinition.difficultyBaseline` (onCallLoad/workingHours/
// hierarchyPressure) — nothing here reads that data.
//
// PROVENANCE — read before touching this file:
// This is a GAME-DESIGN JUDGMENT about the typical RELATIVE ordering of
// branch competitiveness in real Turkish TUS placements (general,
// widely-known domain knowledge — e.g. dermatoloji/plastik cerrahi/göz
// hastalıkları/radyoloji/kardiyoloji/KBB/beyin cerrahisi are consistently
// among the most sought-after specialties, while acil tıp/aile hekimliği
// are consistently among the most accessible). It is NOT sourced from any
// specific official ÖSYM placement/taban puanı document — we do not
// possess one (see docs/program-data-sources.md). It feeds
// `gameplayEntryThreshold` (domain/config/residencyPrograms.ts) as ONE of
// several inputs, never as, or labeled as, an official score.
//
// 1 (most accessible) .. 5 (most competitive).
export type CompetitivenessTier = 1 | 2 | 3 | 4 | 5;

export const BRANCH_COMPETITIVENESS_TIER: Record<BranchId, CompetitivenessTier> = {
  // Tier 5 — traditionally the most sought-after/high-demand specialties.
  deri_ve_zuhrevi_hastaliklari: 5,
  plastik_cerrahi: 5,
  goz_hastaliklari: 5,
  radyoloji: 5,
  kardiyoloji: 5,
  kbb: 5,
  beyin_ve_sinir_cerrahisi: 5,

  // Tier 4 — high demand.
  kalp_ve_damar_cerrahisi: 4,
  cocuk_cerrahisi: 4,
  ortopedi_ve_travmatoloji: 4,
  kadin_dogum: 4,
  genel_cerrahi: 4,
  noroloji: 4,

  // Tier 3 — medium/typical demand.
  ic_hastaliklari: 3,
  psikiyatri: 3,
  cocuk_sagligi_ve_hastaliklari: 3,
  gogus_hastaliklari: 3,
  uroloji: 3,
  cocuk_ve_ergen_ruh_sagligi: 3,
  anesteziyoloji_ve_reanimasyon: 3,

  // Tier 2 — lower-medium demand.
  enfeksiyon_hastaliklari: 2,
  fiziksel_tip_ve_rehabilitasyon: 2,
  gogus_cerrahisi: 2,
  nukleer_tip: 2,

  // Tier 1 — most accessible.
  acil_tip: 1,
  aile_hekimligi: 1,
};

export function getBranchCompetitivenessTier(branchId: BranchId): CompetitivenessTier {
  return BRANCH_COMPETITIVENESS_TIER[branchId] ?? 3;
}
