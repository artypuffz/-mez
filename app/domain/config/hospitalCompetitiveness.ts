import type { HospitalId } from "../state/types";
import { HOSPITAL_DEFINITIONS } from "./hospitals";

// TUS System Redesign, Hospital-Independence Pass — a THIRD, independent
// gameplay-authored layer, explicitly SEPARATE from both specialty
// competitiveness (branchCompetitiveness.ts) and city desirability
// (cityCompetitiveness.ts). Never presented as an official ÖSYM hospital
// ranking — no such ranking exists in any source data this codebase
// possesses.
//
// CORE CORRECTION FROM THE PRIOR PASS: institution tier previously
// inherited from city tier for training/research hospitals (a hospital in
// İstanbul was automatically "strong" because İstanbul is a strong city).
// That coupling is REMOVED here. Every production institution below gets
// an EXPLICIT tier from its own identity — city contributes ONLY through
// cityCompetitiveness.ts's separate modifier, never through this file.
// (Deriving one purely from the other was never a sound way to keep them
// "independent" — the previous pass's methodology comment claimed
// independence while the code coupled them; this pass corrects the code to
// match the claim.)
//
// METHODOLOGY: institution TYPE (university vs. training/research
// hospital) informs but never determines the tier — per the explicit
// instruction "University != automatically excellent, EAH != automatically
// mediocre." Every one of the 159 real institutions was individually
// considered and placed into one of the groups below.
//
// SEMANTIC RULE (Five-Tier Population Pass): a tier here answers ONLY
// "how competitive/desirable is this specific institution as a TUS
// residency preference?" It is NOT a claim about patient care quality,
// physician competence, accreditation, clinical safety, or residency
// workload — those remain entirely separate concerns (residency
// difficulty lives in BranchDefinition.difficultyBaseline, untouched by
// this file). Placing an institution at tier 1 or 2 is a statement about
// typical relative PREFERENCE DEMAND, not a claim that it is a "bad
// hospital." Signals used: institution prominence, scale, breadth of
// training, national vs. regional recognition, referral-center identity,
// historical establishment, and plausible preference demand — informed
// by institution TYPE as CONTEXT only, never city desirability, workload,
// on-call burden, or mobbing. Where a specific institution's evidence was
// ambiguous between two adjacent tiers, the more conservative (closer to
// the middle, tier 3) of the two was chosen. This is a gameplay-authored
// classification informed by general, widely-known facts about specific
// institutions — the SAME provenance class as branchCompetitiveness.ts's
// own judgment calls — not a verified, record-by-record official dataset
// (none exists — see resolveEntryThreshold.ts).
//
// Tier 1/2 population (this pass): built by differentiating the previous
// pass's single 111-institution tier-3 bucket, WITHOUT demoting any
// existing tier 4/5 institution and WITHOUT using city tier as a proxy —
// see TIER_1_IDS/TIER_2_IDS below for the concrete, per-institution
// reasoning groups (district/branch facilities, single-specialty-scope
// hospitals, and the newest/smallest-track-record universities).
//
// Every group below is matched by exact institution id — never a
// substring/pattern match against arbitrary names.
export type HospitalCompetitivenessTier = 1 | 2 | 3 | 4 | 5;

// §5 re-audit, post-five-tier-population: with real institutions now
// spanning all five tiers, the FULL T1->T5 modifier swing is genuinely
// reachable (not just the T3->T5 sliver from the prior pass). Measured
// against the fully-populated dataset (see the calibration report's
// distribution audit): specialty's own total swing is ~24-25 points
// across its 5 tiers. A T1->T5 hospital swing was tuned to stay
// comfortably under half that (so it can never flip a program across
// more than roughly one specialty-tier gap on its own), while still
// exceeding city's practical swing (city's own tier range is smaller,
// +3..-2) so the SPECIALTY >> HOSPITAL > CITY > QUOTA ordering holds by
// construction, not by accident of which tiers happen to be populated.
export const HOSPITAL_COMPETITIVENESS_MODIFIER: Record<HospitalCompetitivenessTier, number> = {
  5: 5,
  4: 2,
  3: 0,
  2: -2,
  1: -5,
};

// TIER 5 — nationally elite / exceptionally competitive training
// institutions. Kept deliberately narrow: Turkey's longest-established,
// largest-scale, most consistently cited academic medical faculties.
// Reassessed this pass — Bursa Uludağ moved OUT (to tier 4, see below):
// on reflection it is a strong, large, long-established regional flagship
// but this session found no basis to place it in the same "nationally
// dominant" bracket as the remaining seven. No training/research hospital
// is placed at tier 5 in this pass — the specialty/referral centers
// reviewed (Kartal Koşuyolu, Gülhane, etc., see tier 4 below) are major
// and nationally recognized, but this session judged them, conservatively,
// as tier 4 ("major highly desirable... referral institution") rather
// than tier 5 ("nationally elite" in the comprehensive, university-level
// sense) — flagged explicitly in the report for your own judgment call.
const TIER_5_IDS: ReadonlySet<HospitalId> = new Set<HospitalId>([
  "hacettepe_universitesi_tip_fakultesi__ankara",
  "ankara_universitesi_tip_fakultesi__ankara",
  "gazi_universitesi_tip_fakultesi__ankara",
  "istanbul_universitesi_istanbul_tip_fakultesi__istanbul",
  "istanbul_universitesi_cerrahpasa_cerrahpasa_tip_fakultesi__istanbul",
  "istanbul_universitesi_cerrahpasa_kardiyoloji_enstitusu__istanbul",
  "ege_universitesi_tip_fakultesi__izmir",
  "dokuz_eylul_universitesi_tip_fakultesi__izmir",
]);

// TIER 4 — major, highly desirable academic or tertiary referral
// institutions. Two sub-groups, both reviewed individually and NOT
// promoted wholesale by type:
//
//  (a) Large, long-established, nationally-recognized regional-flagship
//      or notable foundation universities — reviewed per the redesign
//      brief's explicit candidate list (§6) plus a few more of comparable
//      profile found while auditing the full 62-university list. NOT
//      promoted to tier 5 — "use T4 where appropriate" per the brief.
//  (b) Training/research hospitals with a specific, nameable distinguishing
//      fact: either a long-established, large, historically major teaching
//      hospital (often founded in the Ottoman/early-Republic era, decades
//      of residency-training history), OR a recognized national referral
//      center for a specific specialty (cardiology/cardiovascular surgery,
//      thoracic disease, ophthalmology, orthopedics, oncology, psychiatry,
//      pediatrics), OR one of the newest, largest, highest-profile "mega"
//      city hospitals. This is the direct fix for the prior pass's main
//      complaint: Trabzon Ahi Evren (a cardiothoracic referral center) is
//      here specifically because of what it IS, not because Trabzon is a
//      strong city (Trabzon is city tier 3, not 5) — see the independence
//      audit in the report.
const TIER_4_IDS: ReadonlySet<HospitalId> = new Set<HospitalId>([
  // -- (a) regional-flagship / notable foundation universities --
  "bursa_uludag_universitesi_tip_fakultesi__bursa",
  "akdeniz_universitesi_tip_fakultesi__antalya",
  "erciyes_universitesi_tip_fakultesi__kayseri",
  "cukurova_universitesi_tip_fakultesi__adana",
  "ondokuz_mayis_universitesi_tip_fakultesi__samsun",
  "selcuk_universitesi_tip_fakultesi__konya",
  "karadeniz_teknik_universitesi_tip_fakultesi__trabzon",
  "koc_universitesi_tip_fakultesi__istanbul",
  "acibadem_mehmet_ali_aydinlar_universitesi_tip_fakultesi__istanbul",
  "ataturk_universitesi_tip_fakultesi__erzurum",
  "dicle_universitesi_tip_fakultesi__diyarbakir",
  "gaziantep_universitesi_tip_fakultesi__gaziantep",

  // -- (b) major/historic teaching hospitals and national referral centers --
  // Ankara
  "t_c_saglik_bakanligi_ankara_egitim_ve_arastirma_hastanesi__ankara",
  "t_c_saglik_bakanligi_diskapi_yildirim_beyazit_egitim_ve_arastirma_hastanesi__ankara",
  "t_c_saglik_bakanligi_gulhane_egitim_ve_arastirma_hastanesi__ankara",
  "t_c_saglik_bakanligi_dr_abdurrahman_yurtaslan_onkoloji_egitim_ve_arastirma_hastanesi__ankara",
  "t_c_saglik_bakanligi_ankara_bilkent_sehir_hastanesi__ankara",
  "t_c_saglik_bakanligi_ankara_etlik_sehir_hastanesi__ankara",
  "t_c_saglik_bakanligi_ankara_ulucanlar_goz_egitim_ve_arastirma_hastanesi__ankara",
  // İstanbul
  "t_c_saglik_bakanligi_istanbul_egitim_ve_arastirma_hastanesi__istanbul",
  "t_c_saglik_bakanligi_istanbul_haseki_egitim_ve_arastirma_hastanesi__istanbul",
  "t_c_saglik_bakanligi_sisli_hamidiye_etfal_egitim_ve_arastirma_hastanesi__istanbul",
  "t_c_saglik_bakanligi_istanbul_haydarpasa_numune_egitim_ve_arastirma_hastanesi__istanbul",
  "t_c_saglik_bakanligi_bakirkoy_dr_sadi_konuk_egitim_ve_arastirma_hastanesi__istanbul",
  "t_c_saglik_bakanligi_kartal_dr_lutfi_kirdar_sehir_hastanesi__istanbul",
  "t_c_saglik_bakanligi_kartal_kosuyolu_yuksek_ihtisas_egitim_ve_arastirma_hastanesi__istanbul",
  "t_c_saglik_bakanligi_mehmet_akif_ersoy_gogus_kalp_ve_damar_cerrahisi_egitim_ve_arastirma_hastanesi__istanbul",
  "t_c_saglik_bakanligi_istanbul_dr_siyami_ersek_gogus_kalp_ve_damar_cerrahisi_egitim_ve_arastirma_hastanesi__istanbul",
  "t_c_saglik_bakanligi_istanbul_zeynep_kamil_kadin_ve_cocuk_hastaliklari_egitim_ve_arastirma_hastanesi__istanbul",
  "t_c_saglik_bakanligi_bakirkoy_prof_dr_mazhar_osman_ruh_sagligi_ve_sinir_hastaliklari_egitim_ve_arastirma_hastanesi__istanbul",
  "t_c_saglik_bakanligi_beyoglu_goz_egitim_ve_arastirma_hastanesi__istanbul",
  "t_c_saglik_bakanligi_istanbul_baltalimani_metin_sabanci_kemik_hastaliklari_egitim_ve_arastirma_hastanesi__istanbul",
  "t_c_saglik_bakanligi_basaksehir_cam_ve_sakura_sehir_hastanesi__istanbul",
  "t_c_saglik_bakanligi_marmara_universitesi_pendik_egitim_ve_arastirma_hastanesi__istanbul",
  "t_c_saglik_bakanligi_istanbul_sureyyapasa_gogus_hastaliklari_ve_gogus_cerrahisi_egitim_ve_arastirma_hastanesi__istanbul",
  "t_c_saglik_bakanligi_istanbul_yedikule_gogus_hastaliklari_ve_gogus_cerrahisi_egitim_ve_arastirma_hastanesi__istanbul",
  // İzmir
  "t_c_saglik_bakanligi_dr_suat_seren_gogus_hastaliklari_ve_cerrahisi_egitim_ve_arastirma_hastanesi__izmir",
  "t_c_saglik_bakanligi_izmir_tepecik_egitim_ve_arastirma_hastanesi__izmir",
  "t_c_saglik_bakanligi_izmir_dr_behcet_uz_cocuk_hastaliklari_ve_cerrahisi_egitim_ve_arastirma_hastanesi__izmir",
  // Trabzon — the direct §7 example: a named cardiothoracic referral
  // center, in a city tier 3 (not 5) city. Its tier comes from what it
  // IS, not from Trabzon's city tier.
  "t_c_saglik_bakanligi_trabzon_ahi_evren_gogus_kalp_ve_damar_cerrahisi_egitim_ve_arastirma_hastanesi__trabzon",
]);

// TIER 2 — lower-demand training institutions. Populated entirely by
// differentiating the prior pass's tier-3 bucket, using signals that are
// about the INSTITUTION itself, never its city:
//  - the newest, smallest-track-record foundation universities (recently
//    established medical faculties with the least accumulated preference
//    history among foundation universities);
//  - single-specialty-scope hospitals (Fizik Tedavi ve Rehabilitasyon,
//    Ruh ve Sinir Hastalıkları, a specialized sanatoryum-origin facility,
//    a single-specialty kadın-doğum-ve-çocuk hospital) that are NOT
//    already a nationally-dominant referral center (those are tier 4);
//  - secondary/district-branch facilities that are a province's SECOND
//    (smaller, newer) training hospital rather than its main one — e.g.
//    Alanya vs. the main Antalya E&A, Bandırma vs. the main Balıkesir
//    hospital, Sincan/Yenimahalle vs. central Ankara, Buca/Çiğli vs.
//    central İzmir, Konya Beyhekim vs. Konya Şehir Hastanesi — a fact
//    about the institution's own role/scale within its province, present
//    in both large-city and small-city provinces alike (several of these
//    ARE in tier-5 cities — see the independence audit in the report);
//  - ordinary single-hospital-per-province E&A in smaller provinces,
//    where "ordinary, no distinguishing scale/specialty feature" is the
//    stated reason, not the province's size per se.
const TIER_2_IDS: ReadonlySet<HospitalId> = new Set<HospitalId>([
  // newest / smallest-track-record foundation & specialized universities
  "istinye_universitesi_tip_fakultesi__istanbul",
  "lokman_hekim_universitesi_tip_fakultesi__ankara",
  "maltepe_universitesi_tip_fakultesi__istanbul",
  "sanko_universitesi_tip_fakultesi__gaziantep",
  "uskudar_universitesi_tip_fakultesi__istanbul",
  "atilim_universitesi_tip_fakultesi__ankara",
  "ufuk_universitesi_tip_fakultesi__ankara",
  "duzce_universitesi_tip_fakultesi__duzce",
  "kahramanmaras_sutcu_imam_universitesi_tip_fakultesi__kahramanmaras",
  "kirikkale_universitesi_tip_fakultesi__kirikkale",
  "necmettin_erbakan_universitesi_tip_fakultesi__konya",
  "tekirdag_namik_kemal_universitesi_tip_fakultesi__tekirdag",
  "tokat_gaziosmanpasa_universitesi_tip_fakultesi__tokat",
  "kafkas_universitesi_tip_fakultesi__kars",
  "yozgat_bozok_universitesi_tip_fakultesi__yozgat",
  "zonguldak_bulent_ecevit_universitesi_tip_fakultesi__zonguldak",
  // single-specialty-scope hospitals
  "t_c_saglik_bakanligi_ankara_ataturk_sanatoryum_egitim_ve_arastirma_hastanesi__ankara",
  "t_c_saglik_bakanligi_bolu_izzet_baysal_fizik_tedavi_ve_rehabilitasyon_egitim_ve_arastirma_hastanesi__bolu",
  "t_c_saglik_bakanligi_gaziler_fizik_tedavi_ve_rehabilitasyon_egitim_ve_arastirma_hastanesi__ankara",
  "t_c_saglik_bakanligi_istanbul_fizik_tedavi_ve_rehabilitasyon_egitim_ve_arastirma_hastanesi__istanbul",
  "t_c_saglik_bakanligi_erenkoy_ruh_ve_sinir_hastaliklari_egitim_ve_arastirma_hastanesi__istanbul",
  // secondary/district-branch facilities (a province's second, smaller
  // training hospital — several deliberately in tier-5 cities, see below)
  "t_c_saglik_bakanligi_alanya_egitim_ve_arastirma_hastanesi__antalya",
  "t_c_saglik_bakanligi_bandirma_egitim_ve_arastirma_hastanesi__balikesir",
  "t_c_saglik_bakanligi_buca_seyfi_demirsoy_egitim_ve_arastirma_hastanesi__izmir",
  "t_c_saglik_bakanligi_cigli_egitim_ve_arastirma_hastanesi__izmir",
  "t_c_saglik_bakanligi_konya_beyhekim_egitim_ve_arastirma_hastanesi__konya",
  "t_c_saglik_bakanligi_sincan_egitim_ve_arastirma_hastanesi__ankara",
  "t_c_saglik_bakanligi_yenimahalle_egitim_ve_arastirma_hastanesi__ankara",
  "t_c_saglik_bakanligi_trabzon_kanuni_egitim_ve_arastirma_hastanesi__trabzon",
  // ordinary single-hospital-per-province E&A, no distinguishing feature
  "t_c_saglik_bakanligi_adiyaman_egitim_ve_arastirma_hastanesi__adiyaman",
  "t_c_saglik_bakanligi_aksaray_egitim_ve_arastirma_hastanesi__aksaray",
  "t_c_saglik_bakanligi_amasya_sabuncuoglu_serefeddin_egitim_ve_arastirma_hastanesi__amasya",
  "t_c_saglik_bakanligi_corum_erol_olcok_egitim_ve_arastirma_hastanesi__corum",
  "t_c_saglik_bakanligi_erzincan_mengucek_gazi_egitim_ve_arastirma_hastanesi__erzincan",
  "t_c_saglik_bakanligi_giresun_egitim_ve_arastirma_hastanesi__giresun",
  "t_c_saglik_bakanligi_karabuk_egitim_ve_arastirma_hastanesi__karabuk",
  "t_c_saglik_bakanligi_karaman_egitim_ve_arastirma_hastanesi__karaman",
  "t_c_saglik_bakanligi_kastamonu_egitim_ve_arastirma_hastanesi__kastamonu",
  "t_c_saglik_bakanligi_kirklareli_egitim_ve_arastirma_hastanesi__kirklareli",
  "t_c_saglik_bakanligi_mardin_egitim_ve_arastirma_hastanesi__mardin",
  "t_c_saglik_bakanligi_nigde_egitim_ve_arastirma_hastanesi__nigde",
  "t_c_saglik_bakanligi_ordu_egitim_ve_arastirma_hastanesi__ordu",
  "t_c_saglik_bakanligi_rize_egitim_ve_arastirma_hastanesi__rize",
  "t_c_saglik_bakanligi_usak_egitim_ve_arastirma_hastanesi__usak",
  "t_c_saglik_bakanligi_yalova_egitim_ve_arastirma_hastanesi__yalova",
]);

// TIER 1 — the least institutionally competitive choices in the dataset.
// Kept deliberately small (matches the requested "small least-competitive
// group" shape). Two groups, both about the specific institution:
//  - the very newest, smallest-track-record health-sciences-focused or
//    foundation universities (the least accumulated preference history
//    of any university in the dataset);
//  - the smallest single-hospital-per-province E&A facilities AND a
//    narrowly single-specialty small-province hospital, i.e. the
//    combination of "smallest apparent scale" and "narrowest scope"
//    together, not either alone (a genuinely small BUT broad-scope
//    hospital, or a specialty-focused BUT larger one, stays at tier 2).
const TIER_1_IDS: ReadonlySet<HospitalId> = new Set<HospitalId>([
  "afyonkarahisar_saglik_bilimleri_universitesi_tip_fakultesi__afyonkarahisar",
  "istanbul_atlas_universitesi_tip_fakultesi__istanbul",
  "izmir_tinaztepe_universitesi_tip_fakultesi__izmir",
  "t_c_saglik_bakanligi_agri_egitim_ve_arastirma_hastanesi__agri",
  "t_c_saglik_bakanligi_bilecik_egitim_ve_arastirma_hastanesi__bilecik",
  "t_c_saglik_bakanligi_kirsehir_egitim_ve_arastirma_hastanesi__kirsehir",
  "t_c_saglik_bakanligi_siirt_egitim_ve_arastirma_hastanesi__siirt",
  "t_c_saglik_bakanligi_giresun_kadin_dogum_ve_cocuk_hastaliklari_egitim_ve_arastirma_hastanesi__giresun",
]);

function computeHospitalCompetitivenessTier(hospitalId: HospitalId): HospitalCompetitivenessTier {
  if (TIER_5_IDS.has(hospitalId)) return 5;
  if (TIER_4_IDS.has(hospitalId)) return 4;
  if (TIER_2_IDS.has(hospitalId)) return 2;
  if (TIER_1_IDS.has(hospitalId)) return 1;
  // Conservative middle default — see the methodology note above for why
  // this is not "falling through silently": every production institution
  // is still given an explicit entry in HOSPITAL_COMPETITIVENESS_TIER
  // below (built by mapping every real institution through this
  // function), so this is a deliberate, reviewed default value for each
  // of them (the largest, "ordinary mainstream", group), not an
  // unreviewed fallback for an unknown id.
  return 3;
}

// Built from every REAL institution (never the 10 legacy fictional
// hospitals, which don't participate in production threshold computation
// at all — see PRODUCTION_PROGRAMS/LEGACY_PROGRAMS in
// residencyPrograms.ts) — every key below was reviewed, none is an
// unreviewed catch-all.
const HOSPITAL_COMPETITIVENESS_TIER: Record<HospitalId, HospitalCompetitivenessTier> = Object.fromEntries(
  HOSPITAL_DEFINITIONS.filter((h) => h.kind !== "fictional").map((h) => [h.id, computeHospitalCompetitivenessTier(h.id)])
) as Record<HospitalId, HospitalCompetitivenessTier>;

export function getHospitalCompetitivenessTier(hospitalId: HospitalId): HospitalCompetitivenessTier {
  // The ?? 3 here is purely defensive for a legacy fictional hospital id
  // (never read for production threshold computation) — every real
  // institution always hits an explicit, reviewed entry above.
  return HOSPITAL_COMPETITIVENESS_TIER[hospitalId] ?? 3;
}

export function getHospitalCompetitivenessModifier(hospitalId: HospitalId): number {
  return HOSPITAL_COMPETITIVENESS_MODIFIER[getHospitalCompetitivenessTier(hospitalId)];
}

export function isUniversityHospital(hospitalId: HospitalId): boolean {
  return HOSPITAL_DEFINITIONS.find((h) => h.id === hospitalId)?.kind === "university";
}
