import type { BranchId, HospitalId, CityId, ProgramId } from "../state/types";
import type { ProfileLevel } from "./programProfileLabels";
import { getHospitalDefinition } from "./hospitals";

export interface ResidencyProgram {
  id: ProgramId;
  hospitalId: HospitalId;
  branchId: BranchId;
  cityId: CityId;

  minScore: number;

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
  hiddenProfile: {
    mobbingRisk: number;
    burnoutPressure: number;
    staffingPressure: number;
    npcCultureSeedModifier?: number;
  };
}

export const RESIDENCY_PROGRAMS: ResidencyProgram[] = [
  {
    id: "yesilkent_ic",
    hospitalId: "yesilkent_universite",
    branchId: "ic_hastaliklari",
    cityId: "ankara",
    minScore: 78,
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
    visibleProfile: { education: "low", workload: "high", onCallDensity: "high", academicEnvironment: "low", cityCost: "low" },
    hintText: "Buraya kimse gönüllü gelmiyor ama iş öğreniyorsun.",
    hiddenProfile: { mobbingRisk: 40, burnoutPressure: 50, staffingPressure: 75 },
  },
];

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
