export type ProfileLevel = "low" | "medium" | "high" | "very_high";

export type ProfileDimension =
  | "education"
  | "workload"
  | "onCallDensity"
  | "academicEnvironment"
  | "cityCost";

// Same 4-tier scale, worded differently per dimension so it reads
// naturally ("Eğitim: Çok iyi" vs "İş yükü: Çok yüksek").
const LABELS: Record<ProfileDimension, Record<ProfileLevel, string>> = {
  education: { low: "Zayıf", medium: "Orta", high: "İyi", very_high: "Çok iyi" },
  workload: { low: "Düşük", medium: "Orta", high: "Yüksek", very_high: "Çok yüksek" },
  onCallDensity: { low: "Hafif", medium: "Orta", high: "Yoğun", very_high: "Çok yoğun" },
  academicEnvironment: { low: "Zayıf", medium: "Orta", high: "Güçlü", very_high: "Çok güçlü" },
  cityCost: { low: "Düşük", medium: "Orta", high: "Yüksek", very_high: "Çok yüksek" },
};

export const PROFILE_DIMENSION_LABELS: Record<ProfileDimension, string> = {
  education: "Eğitim",
  workload: "İş yükü",
  onCallDensity: "Nöbet",
  academicEnvironment: "Akademik ortam",
  cityCost: "Şehir maliyeti",
};

export function getProfileLevelLabel(dimension: ProfileDimension, level: ProfileLevel): string {
  return LABELS[dimension][level];
}
