import type { BranchId, HospitalId, CityId, ProgramId } from "../state/types";
import type { ProfileLevel } from "./programProfileLabels";
import { getHospitalDefinition } from "./hospitals";
import { getBranchDefinition } from "./branches";
import { getCityDefinition } from "./cities";
import { getBranchCompetitivenessTier } from "./branchCompetitiveness";
import { getHospitalCompetitivenessModifier } from "./hospitalCompetitiveness";
import { getCityCompetitivenessModifier } from "./cityCompetitiveness";
import { DEFAULT_TUS_SCORE_CONFIG } from "./tusScoreConfig";
import realProgramsData from "../../../data/tus/programs.json";

// Phase 11 §22-24 — a small, OPTIONAL nudge on a specific real
// institution+branch combination. Deliberately tiny (branch identity must
// stay dominant, §22) and NEVER fabricated from forum impressions (§23) —
// every real program in this phase ships with modifier 0 (i.e. omitted)
// because no verifiable per-institution methodology exists yet; the field
// only exists so a future phase with real data has somewhere to put it.
export interface ProgramDifficultyModifier {
  onCallLoad: number;
  workingHours: number;
}

export interface ResidencyProgram {
  id: ProgramId;
  hospitalId: HospitalId;
  branchId: BranchId;
  cityId: CityId;

  // Phase 11 §5 — entry difficulty ("yerleşme koşulu"), kept conceptually
  // and structurally separate from residency (gameplay) difficulty below.
  // Optional because the real ÖSYM source used this phase (a pre-exam
  // KONTENJAN PLANLAMASI table) does not include taban puanı/yerleştirme
  // sonucu data — see docs/program-data-sources.md. A program with no
  // minScore is treated as having no TUS score gate (see
  // domain/tus/filterAvailablePrograms.ts), never a fabricated number.
  minScore?: number;
  // Android Device QA Hotfix 1, Issue 2 — the real-program equivalent of
  // `minScore` above, computed by `deriveGameplayEntryThreshold` below.
  // Kept as a SEPARATE, differently-named field on purpose (never folded
  // into `minScore`) so it can never be mistaken for, or accidentally
  // rendered as, an official ÖSYM taban puanı — we do not possess one for
  // any real program (see docs/program-data-sources.md). It IS the field
  // that actually gates real-program eligibility (see
  // domain/tus/resolveEntryThreshold.ts, the one place both this and
  // `minScore` are read together).
  gameplayEntryThreshold?: number;
  // Phase 11 — real quota from the ÖSYM source, display-only (and, since
  // this hotfix, also one of gameplayEntryThreshold's real inputs).
  quota?: number;
  // Phase 11 — "fictional" for the original Phase 3 MVP programs (kept
  // unchanged for backward compatibility), "real" for programs sourced
  // from the official ÖSYM dataset this phase.
  sourceType?: "fictional" | "real";
  // Phase 11 §22 — see ProgramDifficultyModifier above.
  difficultyModifier?: ProgramDifficultyModifier;
  // Phase 11 — set only when the ÖSYM row named a joint-use university
  // partner for an EAH program (ortak kullanım protokolü). Display-only.
  jointUsePartner?: string;

  visibleProfile: {
    education: ProfileLevel;
    workload: ProfileLevel;
    onCallDensity: ProfileLevel;
    academicEnvironment: ProfileLevel;
    cityCost: ProfileLevel;
  };

  hintText?: string;

  // Never rendered directly in the preference screen — only hintText and
  // visibleProfile are shown. Static/hand-authored for the Phase 3 MVP;
  // see hospitals.ts for why the institutions themselves are fictional.
  //
  // Phase 11 §10/§11 — for a REAL program, mobbingRisk is deliberately
  // OMITTED here rather than filled with a static per-hospital number: a
  // fixed dataset value would be exactly the "gerçek hastaneye sabit
  // mobbing puanı" the spec forbids. Real programs instead derive their
  // culture procedurally, per (gameSeed, programId), from the branch's
  // difficultyBaseline.hierarchyPressure — see
  // domain/residency/hospitalCulture.ts and generateInitialClinic's
  // fallback in domain/npc/generation.ts. burnoutPressure/staffingPressure
  // stay present (branch-derived, not a "culture" claim — see
  // deriveHiddenProfileFromBranch below) since the existing Phase 9
  // program-pressure model and Phase 7 staffing-load model need a value.
  hiddenProfile: {
    mobbingRisk?: number;
    burnoutPressure: number;
    staffingPressure: number;
    npcCultureSeedModifier?: number;
  };
}

interface RealProgramRow {
  id: string;
  hospitalId: string;
  branchId: string;
  cityId: string;
  quota: number;
  jointUsePartner?: string;
}

// Phase 11 — a purely BRANCH-derived (never per-institution) starting
// point for the two hiddenProfile fields real programs still need
// (burnoutPressure feeds weeklyResources.ts's programPressureDivisor,
// staffingPressure feeds the on-call staffing-load calculation) — every
// real program of the same branch gets the exact same number here, so
// this can never read as an institution-specific claim. mobbingRisk is
// intentionally left undefined (see the interface doc above).
function deriveHiddenProfileFromBranch(branchId: BranchId): ResidencyProgram["hiddenProfile"] {
  const { onCallLoad, workingHours } = getBranchDefinition(branchId).difficultyBaseline;
  return {
    burnoutPressure: Math.round(((workingHours - 1) / 4) * 100),
    staffingPressure: Math.round(((onCallLoad - 1) / 4) * 60 + 20),
  };
}

// Phase 11 — a minimal, defensible visibleProfile derived from the same
// branch axes, since the real ÖSYM source has no per-program "how hard is
// this service" survey data to show pre-selection. cityCost reads off the
// program's own city, not the branch.
function deriveVisibleProfile(branchId: BranchId, cityId: CityId): ResidencyProgram["visibleProfile"] {
  const branch = getBranchDefinition(branchId);
  const { onCallLoad, workingHours } = branch.difficultyBaseline;
  const city = getCityDefinition(cityId);
  const level = (value: number): ProfileLevel => {
    if (value >= 4.3) return "very_high";
    if (value >= 3.5) return "high";
    if (value >= 2.5) return "medium";
    return "low";
  };
  const cityCostLevel = (index: number): ProfileLevel => {
    if (index >= 65) return "very_high";
    if (index >= 52) return "high";
    if (index >= 40) return "medium";
    return "low";
  };
  return {
    education: "medium",
    workload: level(workingHours),
    onCallDensity: level(onCallLoad),
    academicEnvironment: "medium",
    cityCost: cityCostLevel(city.costIndex),
  };
}

// TUS System Redesign (post-Hotfix-1), §10 — a deterministic,
// centrally-computed gameplay entry-competitiveness threshold for real
// programs, built from a THREE-LAYER model plus a small quota modifier:
//   1. SPECIALTY competitiveness (branchCompetitiveness.ts) — PRIMARY.
//   2. HOSPITAL competitiveness (hospitalCompetitiveness.ts) — SECONDARY.
//   3. CITY competitiveness (cityCompetitiveness.ts) — TERTIARY.
//   4. Quota scarcity — a SMALL fourth modifier (this program's own real
//      `quota` field). Bucketed against the real dataset's own quota
//      distribution (median quota is 3; ~19% of programs have quota=1):
//      quota 1 (very scarce) -> +2, quota 2-3 (small) -> +1, quota 4-6
//      (normal) -> 0, quota 7+ (large) -> -1.
//
// SPECIALTY_TIER_BASELINE below are the starting per-tier values from the
// redesign brief (52/58/64/70/76 — an even 6-point step per tier), kept
// as-is: distribution-tuning against all 2191 real programs (see the TUS
// system redesign report) showed they already produce the desired
// progression without further adjustment.
//
// Deliberately allows realistic overlap between adjacent specialty tiers
// (per §11) — a single hospital/city combination can swing a threshold by
// more than one tier-step, so a highly-competitive specialty at a weak
// institution can score lower than a less-competitive specialty at an
// elite one. The AGGREGATE ordering (mean threshold per specialty tier)
// stays strictly increasing T5>T4>T3>T2>T1 — verified by test — because
// hospital/city modifiers average out across the many programs each
// specialty offers. Preserves SPECIALTY >> HOSPITAL > CITY > QUOTA by
// each layer's modifier magnitude: specialty tier steps are 6 points;
// hospital modifier spans a 9-point range but specialty dominates in
// aggregate; city spans 5; quota spans only 3, the smallest component.
//
// Final value is clamp(sum, 50, 85) — the ONE place this formula clamps,
// intentionally, per §10's explicit instruction; this is different from
// computeTusScore.ts's redesign, which was required to hit [50, 85] by
// construction rather than by clamping a mismatched range.
//
// This is a GAMEPLAY APPROXIMATION, explicitly labeled as such everywhere
// it's read (see resolveEntryThreshold.ts and the TUS preference UI) —
// never presented as an official ÖSYM score.
const SPECIALTY_TIER_BASELINE: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 52,
  2: 58,
  3: 64,
  4: 70,
  5: 76,
};

function quotaModifier(quota: number): number {
  if (quota <= 1) return 2;
  if (quota <= 3) return 1;
  if (quota <= 6) return 0;
  return -1;
}

function deriveGameplayEntryThreshold(
  branchId: BranchId,
  quota: number,
  cityId: CityId,
  hospitalId: HospitalId
): number {
  const tier = getBranchCompetitivenessTier(branchId);
  const specialtyBase = SPECIALTY_TIER_BASELINE[tier];
  const hospitalMod = getHospitalCompetitivenessModifier(hospitalId);
  const cityMod = getCityCompetitivenessModifier(cityId);
  const quotaMod = quotaModifier(quota);

  const raw = specialtyBase + hospitalMod + cityMod + quotaMod;
  const clamped = Math.min(DEFAULT_TUS_SCORE_CONFIG.maxScore, Math.max(DEFAULT_TUS_SCORE_CONFIG.minScore, raw));
  return Math.round(clamped);
}

const REAL_PROGRAMS: ResidencyProgram[] = (realProgramsData as RealProgramRow[]).map(
  (row): ResidencyProgram => ({
    id: row.id,
    hospitalId: row.hospitalId,
    branchId: row.branchId,
    cityId: row.cityId,
    quota: row.quota,
    sourceType: "real",
    gameplayEntryThreshold: deriveGameplayEntryThreshold(row.branchId, row.quota, row.cityId, row.hospitalId),
    jointUsePartner: row.jointUsePartner,
    visibleProfile: deriveVisibleProfile(row.branchId, row.cityId),
    hiddenProfile: deriveHiddenProfileFromBranch(row.branchId),
  })
);

const FICTIONAL_PROGRAMS: ResidencyProgram[] = [
  {
    id: "yesilkent_ic",
    hospitalId: "yesilkent_universite",
    branchId: "ic_hastaliklari",
    cityId: "ankara",
    minScore: 78,
    sourceType: "fictional",
    visibleProfile: { education: "high", workload: "medium", onCallDensity: "medium", academicEnvironment: "high", cityCost: "medium" },
    hintText: "Servis yoğun ama eğitim iyi.",
    hiddenProfile: { mobbingRisk: 35, burnoutPressure: 45, staffingPressure: 40, npcCultureSeedModifier: 2 },
  },
  {
    id: "yesilkent_cerrahi",
    hospitalId: "yesilkent_universite",
    branchId: "genel_cerrahi",
    cityId: "ankara",
    minScore: 82,
    sourceType: "fictional",
    visibleProfile: { education: "very_high", workload: "very_high", onCallDensity: "very_high", academicEnvironment: "high", cityCost: "medium" },
    hintText: "Ameliyathane programı yoğun, ekip deneyimli.",
    hiddenProfile: { mobbingRisk: 55, burnoutPressure: 70, staffingPressure: 50, npcCultureSeedModifier: -1 },
  },
  {
    id: "baskent_ic",
    hospitalId: "baskent_devlet",
    branchId: "ic_hastaliklari",
    cityId: "ankara",
    minScore: 45,
    sourceType: "fictional",
    visibleProfile: { education: "medium", workload: "medium", onCallDensity: "medium", academicEnvironment: "medium", cityCost: "medium" },
    hintText: "Bölüm sakin görünür.",
    hiddenProfile: { mobbingRisk: 30, burnoutPressure: 35, staffingPressure: 45 },
  },
  {
    id: "baskent_psik",
    hospitalId: "baskent_devlet",
    branchId: "psikiyatri",
    cityId: "ankara",
    minScore: 40,
    sourceType: "fictional",
    visibleProfile: { education: "medium", workload: "low", onCallDensity: "low", academicEnvironment: "medium", cityCost: "medium" },
    hintText: "Süpervizyon düzenli işliyor.",
    hiddenProfile: { mobbingRisk: 20, burnoutPressure: 25, staffingPressure: 30 },
  },
  {
    id: "bogazkoy_cerrahi",
    hospitalId: "bogazkoy_universite",
    branchId: "genel_cerrahi",
    cityId: "istanbul",
    minScore: 88,
    sourceType: "fictional",
    visibleProfile: { education: "very_high", workload: "very_high", onCallDensity: "very_high", academicEnvironment: "very_high", cityCost: "very_high" },
    hintText: "Kıdem sistemi gelenekseldir.",
    hiddenProfile: { mobbingRisk: 65, burnoutPressure: 75, staffingPressure: 55, npcCultureSeedModifier: -3 },
  },
  {
    id: "sahil_psik",
    hospitalId: "sahil_egitim_arastirma",
    branchId: "psikiyatri",
    cityId: "istanbul",
    minScore: 55,
    sourceType: "fictional",
    visibleProfile: { education: "high", workload: "medium", onCallDensity: "low", academicEnvironment: "medium", cityCost: "very_high" },
    hintText: "Burada herkes birbirini tanır.",
    hiddenProfile: { mobbingRisk: 40, burnoutPressure: 35, staffingPressure: 35 },
  },
  {
    id: "sahil_ic",
    hospitalId: "sahil_egitim_arastirma",
    branchId: "ic_hastaliklari",
    cityId: "istanbul",
    minScore: 60,
    sourceType: "fictional",
    visibleProfile: { education: "high", workload: "high", onCallDensity: "high", academicEnvironment: "medium", cityCost: "very_high" },
    hintText: "Nöbetler biraz yorucu.",
    hiddenProfile: { mobbingRisk: 45, burnoutPressure: 55, staffingPressure: 50 },
  },
  {
    id: "egekiyi_ic",
    hospitalId: "egekiyi_universite",
    branchId: "ic_hastaliklari",
    cityId: "izmir",
    minScore: 70,
    sourceType: "fictional",
    visibleProfile: { education: "high", workload: "medium", onCallDensity: "medium", academicEnvironment: "high", cityCost: "medium" },
    hintText: "Hocalar biraz eski usul.",
    hiddenProfile: { mobbingRisk: 50, burnoutPressure: 40, staffingPressure: 35 },
  },
  {
    id: "yesilova_cerrahi",
    hospitalId: "yesilova_devlet",
    branchId: "genel_cerrahi",
    cityId: "izmir",
    minScore: 35,
    sourceType: "fictional",
    visibleProfile: { education: "medium", workload: "high", onCallDensity: "high", academicEnvironment: "low", cityCost: "medium" },
    hintText: "Personel sık değişiyor.",
    hiddenProfile: { mobbingRisk: 40, burnoutPressure: 50, staffingPressure: 70 },
  },
  {
    id: "orhangazi_psik",
    hospitalId: "orhangazi_egitim_arastirma",
    branchId: "psikiyatri",
    cityId: "bursa",
    minScore: 30,
    sourceType: "fictional",
    visibleProfile: { education: "medium", workload: "low", onCallDensity: "low", academicEnvironment: "medium", cityCost: "low" },
    hintText: "Sistem biraz eski usul.",
    hiddenProfile: { mobbingRisk: 30, burnoutPressure: 25, staffingPressure: 40 },
  },
  {
    id: "akdeniz_ic",
    hospitalId: "akdeniz_kent",
    branchId: "ic_hastaliklari",
    cityId: "antalya",
    minScore: 25,
    sourceType: "fictional",
    visibleProfile: { education: "low", workload: "medium", onCallDensity: "medium", academicEnvironment: "low", cityCost: "low" },
    hintText: "Asistan yorumları: idare eder.",
    hiddenProfile: { mobbingRisk: 35, burnoutPressure: 40, staffingPressure: 60 },
  },
  {
    id: "porsuk_cerrahi",
    hospitalId: "porsuk_universite",
    branchId: "genel_cerrahi",
    cityId: "eskisehir",
    minScore: 50,
    sourceType: "fictional",
    visibleProfile: { education: "medium", workload: "high", onCallDensity: "high", academicEnvironment: "medium", cityCost: "low" },
    hintText: "Ekip küçük, iş çok.",
    hiddenProfile: { mobbingRisk: 45, burnoutPressure: 55, staffingPressure: 65 },
  },
  {
    id: "anadolu_ic",
    hospitalId: "anadolu_devlet",
    branchId: "ic_hastaliklari",
    cityId: "eskisehir",
    minScore: 20,
    sourceType: "fictional",
    visibleProfile: { education: "low", workload: "high", onCallDensity: "high", academicEnvironment: "low", cityCost: "low" },
    hintText: "Buraya kimse gönüllü gelmiyor ama iş öğreniyorsun.",
    hiddenProfile: { mobbingRisk: 40, burnoutPressure: 50, staffingPressure: 75 },
  },
];

// Android Device QA Hotfix 1, Issue 3 — "real production programs" is now
// its OWN exported pool, deliberately separate from the legacy fictional
// ones. This is what every NEW-GAME discovery/filtering path must read
// (domain/state/selectors.ts's selectAvailablePrograms is the one real
// consumer) — a fictional program can never reach a new player through
// this export, structurally, not just by UI omission.
export const PRODUCTION_PROGRAMS: ResidencyProgram[] = REAL_PROGRAMS;

// The original Phase 3 MVP programs — kept ONLY so an existing save that
// already references one (tus.selectedProgramId, or a mid-residency
// career whose engine tick re-resolves it every month) keeps loading and
// playing correctly forever. NEVER read by new-game TUS discovery/
// filtering/search — see PRODUCTION_PROGRAMS above and
// domain/state/selectors.ts.
export const LEGACY_PROGRAMS: ResidencyProgram[] = FICTIONAL_PROGRAMS;

// The full lookup set — both pools combined — used ONLY by
// getResidencyProgram(id) below (a by-id resolver that must be able to
// find ANY program a save might reference, old or new) and by dev/test
// tooling that intentionally needs the complete dataset (e.g.
// domain/debug/debugScenarios.ts, which references legacy fictional ids
// on purpose to keep its own long-standing scenarios stable). Never used
// for new-game preference discovery.
export const RESIDENCY_PROGRAMS: ResidencyProgram[] = [...LEGACY_PROGRAMS, ...PRODUCTION_PROGRAMS];

export function getResidencyProgram(id: ProgramId): ResidencyProgram {
  const program = RESIDENCY_PROGRAMS.find((p) => p.id === id);
  if (!program) {
    throw new Error(`Unknown residency program id: ${id}`);
  }
  return program;
}

export function getProgramHospitalName(program: ResidencyProgram): string {
  return getHospitalDefinition(program.hospitalId).name;
}
