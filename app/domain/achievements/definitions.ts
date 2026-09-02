import type { RequirementNode } from "../events/types";

export type AchievementTone = "serious" | "deadpan";

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  tone: AchievementTone;
  requirements: RequirementNode;
}

// Gameplay Expansion Part B section 19 — reuses the existing generic
// RequirementNode/evaluateRequirements DSL (domain/events/requirements.ts)
// instead of inventing a second condition language. A small, restrained
// set (not dozens of filler entries), mixing real career milestones with
// ÇÖMEZ's own deadpan tone — same voice as the existing behaviorProfile
// flavor tags (domain/careerReport/behaviorProfile.ts).
//
// Every condition here is deliberately drawn from a MONOTONIC source
// (career.residencyWeek/seniorityStage/phase, or a statistics/behaviorStats
// counter — both increment-only, see applyStatistics/applyBehaviorTags in
// domain/events/effects.ts) so an achievement, once true, can never later
// evaluate false again. resourcePressure streaks and
// financialPressure.consecutiveNegativeMonths are intentionally NEVER used
// here — both can legitimately reset to 0, which would make an
// "achievement" flicker in and out, contradicting what the word means.
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: "ilk_ay",
    title: "Hayatta Kaldın",
    description: "Asistanlığının ilk ayını tamamladın.",
    tone: "serious",
    requirements: { stat: "career.residencyWeek", gte: 4 },
  },
  {
    id: "bir_yil",
    title: "Bir Yıl Geçti",
    description: "Asistanlıkta bir yılını doldurdun.",
    tone: "serious",
    requirements: { stat: "career.residencyWeek", gte: 52 },
  },
  {
    id: "orta_kidem",
    title: "Artık Çömez Değilsin",
    description: "Orta kıdeme yükseldin.",
    tone: "serious",
    requirements: { stat: "career.seniorityStage", in: ["orta", "kidemli"] },
  },
  {
    id: "kidemli",
    title: "Kıdemli Asistan",
    description: "Kıdemli asistanlığa ulaştın.",
    tone: "serious",
    requirements: { stat: "career.seniorityStage", eq: "kidemli" },
  },
  {
    id: "uzman_oldun",
    title: "Uzman Oldun",
    description: "Asistanlığı bitirip uzman oldun.",
    tone: "serious",
    requirements: { stat: "career.phase", eq: "specialist" },
  },
  {
    id: "krizden_dondun",
    title: "Krizden Döndün",
    description: "Bir krizi atlattın.",
    tone: "serious",
    requirements: { stat: "statistics.crisis:recovered", gte: 1 },
  },
  {
    id: "firtinayi_gordun",
    title: "Fırtınayı Gördün",
    description: "On farklı krizle yüzleştin. Hâlâ buradasın.",
    tone: "deadpan",
    requirements: { stat: "statistics.crisis:total", gte: 10 },
  },
  {
    id: "destekci",
    title: "Yalnız Bırakmadın",
    description: "Bir çömezi zor anında destekledin.",
    tone: "serious",
    requirements: { stat: "behaviorStats.junior:supportive", gte: 3 },
  },
  {
    id: "dinlenmeyi_ogrendin",
    title: "Dinlenmeyi Öğrendin",
    description: "Birkaç kez gerçekten dinlendin. Şaşırtıcı ama mümkünmüş.",
    tone: "deadpan",
    requirements: { stat: "statistics.spending:total:rest", gte: 3 },
  },
  {
    id: "sosyal_hayat_varmis",
    title: "Sosyal Hayatın Var(mış)",
    description: "Hastane dışında da bir hayatın olduğunu birkaç kez kanıtladın.",
    tone: "deadpan",
    requirements: { stat: "statistics.spending:total:social", gte: 3 },
  },
  {
    id: "yatirimci_ruh",
    title: "Yatırımcı Ruh",
    description: "Kendine az da olsa bir şeyler harcadın.",
    tone: "deadpan",
    requirements: { stat: "statistics.spending:total", gte: 5 },
  },
];
