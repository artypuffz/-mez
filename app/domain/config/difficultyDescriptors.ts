// Gameplay Expansion Part B section 2/3 — Hastane must never show a raw
// difficultyBaseline/hierarchyPressure coefficient (e.g. "hierarchyPressure
// = 1.37"). This is the ONE place a 0.5-5.0 axis value turns into a
// human-readable descriptor, reused by every screen that needs one rather
// than each screen re-guessing its own thresholds.
export type DifficultyDescriptor = "Hafif" | "Orta" | "Ağır" | "Çok Ağır";
export type IntensityDescriptor = "Normal" | "Yoğun" | "Çok Yoğun" | "Aşırı Yoğun";
export type PressureDescriptor = "Düşük" | "Orta" | "Yüksek" | "Çok Yüksek";

function bucket<T>(value: number, labels: [T, T, T, T]): T {
  if (value < 2) return labels[0];
  if (value < 3) return labels[1];
  if (value < 4) return labels[2];
  return labels[3];
}

export function describeOnCallLoad(onCallLoad: number): DifficultyDescriptor {
  return bucket(onCallLoad, ["Hafif", "Orta", "Ağır", "Çok Ağır"]);
}

export function describeWorkingHours(workingHours: number): IntensityDescriptor {
  return bucket(workingHours, ["Normal", "Yoğun", "Çok Yoğun", "Aşırı Yoğun"]);
}

// section 3 — this reads career.hierarchyPressure, the FINAL per-career
// procedural value (branch baseline + this playthrough's seeded culture
// modifier — see domain/residency/hospitalCulture.ts), never a fixed claim
// about the real institution. Screens must label this "Bu kariyerde bölüm
// kültürü" / equivalent, never "Bu hastane ... ile bilinir".
export function describeHierarchyPressure(hierarchyPressure: number): PressureDescriptor {
  return bucket(hierarchyPressure, ["Düşük", "Orta", "Yüksek", "Çok Yüksek"]);
}
