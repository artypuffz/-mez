import type { BranchId } from "../state/types";

// TUS System Redesign (post-Hotfix-1) — entry COMPETITIVENESS is a
// DIFFERENT axis from residency (workplace) DIFFICULTY, unchanged from the
// prior hotfix's rule: "Do NOT use hospital workplace difficulty as a
// direct proxy for TUS competitiveness." This table is built independently
// of `BranchDefinition.difficultyBaseline`.
//
// PROVENANCE — read before touching this file.
//
// METHODOLOGY: this ranking was built in three passes.
//   1. A target/expected baseline was proposed by the user (26 specialties
//      grouped into 5 tiers, based on general reputation).
//   2. That baseline was checked against REAL recent ÖSYM TUS placement
//      evidence gathered via web search this session — aggregator sites
//      that republish ÖSYM's own posted taban puanı (minimum placement
//      score) tables for 2026-TUS 1st Period (Mart 2026) and 2025-TUS 2nd
//      Period. Direct fetch of those aggregator pages was blocked by this
//      session's network egress proxy, so the underlying numbers below are
//      what WebSearch's own result synthesis surfaced from those pages —
//      real published figures, but read secondhand through a search
//      summary rather than a table this session directly parsed. Treat the
//      specific numbers as indicative anchors, not an audited dataset.
//   3. Where that evidence clearly contradicted the proposed baseline, the
//      tier was CHANGED and the change is documented below. Where no
//      reliable evidence was found for a branch, the proposed baseline (or
//      the general, widely-known reputational ordering already used by the
//      prior hotfix's table) was kept.
//
// This is still fundamentally a GAME-DESIGN JUDGMENT informed by that
// evidence, NOT a verified, directly-sourced official ÖSYM dataset this
// codebase possesses and can cite record-by-record (no such dataset is
// held — see docs comment in resolveEntryThreshold.ts). It feeds
// `gameplayEntryThreshold` (domain/config/residencyPrograms.ts) as ONE of
// several inputs (alongside hospital and city competitiveness — see
// hospitalCompetitiveness.ts / cityCompetitiveness.ts), never as, or
// labeled as, an official score.
//
// EVIDENCE ANCHORS gathered this session (2026-TUS 1st Period unless
// noted; approximate, read via search synthesis, see caveat above):
//   - Dermatoloji, Plastik Cerrahi, Radyoloji, Kardiyoloji, Göz Hastalıkları
//     were repeatedly and consistently named together, across multiple
//     independent searches, as the highest-cutoff group ("Dermatoloji,
//     plastik cerrahi, radyoloji ve kardiyoloji gibi branşlar genellikle en
//     yüksek taban puanlara sahiptir"). This is the strongest, most
//     repeated signal found — Tier 5 = exactly these five.
//   - Beyin ve Sinir Cerrahisi (Neurosurgery): 2025-TUS 2nd Period reported
//     taban ~55+, tavan ~76+; 2026-TUS 1st Period range 45.10-75.77 across
//     institutions, described as "oldukça rekabetçi" (quite competitive).
//     This DIRECTLY CONTRADICTS a low/entry-tier placement — moved up.
//   - Üroloji: ~62.50 vs İç Hastalıkları's ~52.53 and Kadın Doğum's
//     ~52.59 — meaningfully higher than the other "mid" specialties it was
//     originally grouped with. Moved up.
//   - Psikiyatri: search summaries described it as "moderately competitive
//     rather than among the most highly competitive branches" and NOT
//     listed among the repeated Dermatoloji/Plastik/Radyoloji/Kardiyoloji
//     top group, despite reports of genuinely rising applicant demand in
//     recent years. Moved down from the proposed top tier on the placement
//     evidence regardless — a demand trend is a competitiveness signal,
//     but this session's actual score evidence for Psikiyatri did not
//     support a top-tier placement.
//   - Genel Cerrahi (~48.77) and Çocuk Cerrahisi (~48.40) landed at
//     essentially the same level — see the branch-list mismatch note below.
//   - Çocuk Sağlığı ve Hastalıkları was reported in one summary as having
//     the single LOWEST period average (~45-47) of any branch checked,
//     tied structurally to its very large quota. Surprising given its
//     "Tier 2" placement below, but kept there rather than dropped to
//     Tier 1 — the evidence was a single aggregate figure, not confirmed
//     across multiple sources the way the Tier 5 group and the Beyin/
//     Üroloji corrections were; flagged here rather than acted on further.
//   - Kalp ve Damar Cerrahisi: the PRE-EXISTING code (Phase 11 hotfix) had
//     this at tier 4. The user's proposed baseline placed it at tier 2,
//     consistent with a well-documented recent decline in TUS applicant
//     demand for this branch relative to its quota (an ENTRY-competitiveness
//     fact — fewer preference-holders per seat, more programs going unfilled
//     or filled at lower scores). No direct contradicting placement-score
//     evidence was found this session, so the LOWER placement was kept.
//     (Note: an earlier version of this comment also cited the residency's
//     own training length/demands as contributing context — removed, since
//     residency difficulty and TUS entry-competitiveness are two separate
//     axes per this file's own header, and only the applicant-demand fact
//     is a legitimate input to a competitiveness tier.)
//
// BRANCH-LIST MISMATCH (report per the redesign brief's explicit
// instruction: "If the game's actual 26 branchIds differ from this list,
// use the real production branch list. Do NOT fabricate or silently omit
// specialties."): the user's proposed baseline included "Pathology" (in
// tier 3) and never mentioned "Çocuk Cerrahisi" (Pediatric Surgery). This
// game's actual 26 production branchIds (domain/config/branches.ts) do
// NOT include a pathology branch at all — "Tıbbi Patoloji" is one of the
// explicitly EXCLUDED basic-science branches (see
// EXCLUDED_BASIC_SCIENCE_NAMES in domain/tus/validateProgramDataset.ts) —
// it is not a clinical residency a player can select. "Çocuk Cerrahisi"
// IS one of the real 26 production branchIds and was simply never named
// in the proposed baseline. Resolution: Pathology is dropped entirely (it
// cannot appear here — it isn't a selectable branch), and Çocuk Cerrahisi
// fills the actual 26th slot, placed by its own real evidence (~48.40,
// essentially identical to Genel Cerrahi's ~48.77) into Tier 2.
//
// 1 (most accessible) .. 5 (most competitive).
export type CompetitivenessTier = 1 | 2 | 3 | 4 | 5;

export const BRANCH_COMPETITIVENESS_TIER: Record<BranchId, CompetitivenessTier> = {
  // Tier 5 — the consistently-confirmed top group (see evidence anchors
  // above). Psikiyatri, originally proposed here, moved OUT (see below);
  // Kardiyoloji moved IN from the originally-proposed tier 4.
  deri_ve_zuhrevi_hastaliklari: 5,
  plastik_cerrahi: 5,
  goz_hastaliklari: 5,
  radyoloji: 5,
  kardiyoloji: 5,

  // Tier 4 — high competitiveness. Beyin ve Sinir Cerrahisi and Üroloji
  // moved UP into this tier on direct contradicting evidence (see above);
  // Psikiyatri moved DOWN into this tier from the proposed tier 5.
  kbb: 4,
  fiziksel_tip_ve_rehabilitasyon: 4,
  noroloji: 4,
  cocuk_ve_ergen_ruh_sagligi: 4,
  psikiyatri: 4,
  beyin_ve_sinir_cerrahisi: 4,
  uroloji: 4,

  // Tier 3 — mid competitiveness. Üroloji moved OUT to tier 4 (see above).
  anesteziyoloji_ve_reanimasyon: 3,
  ortopedi_ve_travmatoloji: 3,
  ic_hastaliklari: 3,
  kadin_dogum: 3,

  // Tier 2 — low-mid competitiveness. Çocuk Cerrahisi added here (see the
  // branch-list mismatch note above); Kalp ve Damar Cerrahisi kept at the
  // user's proposed (lower than the prior hotfix's) placement.
  genel_cerrahi: 2,
  cocuk_cerrahisi: 2,
  cocuk_sagligi_ve_hastaliklari: 2,
  gogus_hastaliklari: 2,
  enfeksiyon_hastaliklari: 2,
  nukleer_tip: 2,
  kalp_ve_damar_cerrahisi: 2,

  // Tier 1 — lowest competitiveness. Beyin ve Sinir Cerrahisi moved OUT to
  // tier 4 (see above) — the real evidence flatly contradicted a "lowest
  // competitiveness" placement for Neurosurgery.
  acil_tip: 1,
  aile_hekimligi: 1,
  gogus_cerrahisi: 1,
};

export function getBranchCompetitivenessTier(branchId: BranchId): CompetitivenessTier {
  return BRANCH_COMPETITIVENESS_TIER[branchId] ?? 3;
}
