import type { CityId, HospitalId } from "../state/types";

export interface HospitalDefinition {
  id: HospitalId;
  name: string;
  cityId: CityId;
}

// Fictional institutions — deliberately not real hospital/university names.
// See docs/event-design-bible.md §1 for why: a program's hiddenProfile
// (mobbing risk etc.) is still hand-authored static content in Phase 3,
// not yet generated per-playthrough from a neutral seed, so pairing that
// with a real institution's name would read as a factual claim about it.
// Cities and branch names stay real; only the hospital identity is fictional.
export const HOSPITAL_DEFINITIONS: HospitalDefinition[] = [
  { id: "yesilkent_universite", name: "Yeşilkent Üniversitesi Hastanesi", cityId: "ankara" },
  { id: "baskent_devlet", name: "Başkent Devlet Hastanesi", cityId: "ankara" },
  { id: "bogazkoy_universite", name: "Boğazköy Üniversitesi Tıp Fakültesi Hastanesi", cityId: "istanbul" },
  { id: "sahil_egitim_arastirma", name: "Sahil Eğitim ve Araştırma Hastanesi", cityId: "istanbul" },
  { id: "egekiyi_universite", name: "Ege Kıyı Üniversitesi Hastanesi", cityId: "izmir" },
  { id: "yesilova_devlet", name: "Yeşilova Devlet Hastanesi", cityId: "izmir" },
  { id: "orhangazi_egitim_arastirma", name: "Orhangazi Eğitim ve Araştırma Hastanesi", cityId: "bursa" },
  { id: "akdeniz_kent", name: "Akdeniz Kent Hastanesi", cityId: "antalya" },
  { id: "porsuk_universite", name: "Porsuk Üniversitesi Hastanesi", cityId: "eskisehir" },
  { id: "anadolu_devlet", name: "Anadolu Devlet Hastanesi", cityId: "eskisehir" },
];

export function getHospitalDefinition(id: HospitalId): HospitalDefinition {
  const def = HOSPITAL_DEFINITIONS.find((h) => h.id === id);
  if (!def) {
    throw new Error(`Unknown hospital id: ${id}`);
  }
  return def;
}
