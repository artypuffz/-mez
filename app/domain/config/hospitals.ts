import type { CityId, HospitalId } from "../state/types";
import realInstitutionsData from "../../../data/tus/institutions.json";

// Phase 11 — "fictional" marks the original Phase 3 hand-authored
// hospitals (see the note below); "university"/"training_research_hospital"
// mark real institutions parsed from the official ÖSYM dataset — see
// docs/program-data-sources.md. Never rendered as a claim about the real
// institution's culture (that's the whole point of §10/§11 of the Phase
// 11 spec — see domain/residency/hospitalCulture.ts).
export type HospitalKind = "fictional" | "university" | "training_research_hospital";

export interface HospitalDefinition {
  id: HospitalId;
  name: string;
  cityId: CityId;
  kind: HospitalKind;
}

interface RealInstitutionRow {
  id: string;
  name: string;
  cityId: string;
  kind: "university" | "training_research_hospital";
}

const REAL_INSTITUTIONS = (realInstitutionsData as RealInstitutionRow[]).map(
  (row): HospitalDefinition => ({ id: row.id, name: row.name, cityId: row.cityId, kind: row.kind })
);

// Fictional institutions — deliberately not real hospital/university names.
// See docs/event-design-bible.md §1 for why: a program's hiddenProfile
// (mobbing risk etc.) is still hand-authored static content in Phase 3,
// not yet generated per-playthrough from a neutral seed, so pairing that
// with a real institution's name would read as a factual claim about it.
// Cities and branch names stay real; only the hospital identity is fictional.
// Kept as-is (untouched) for backward compatibility with existing saves
// and the 13 Phase 3 fictional RESIDENCY_PROGRAMS entries — Phase 11 adds
// the real ÖSYM institutions below rather than replacing these.
const FICTIONAL_HOSPITALS: HospitalDefinition[] = [
  { id: "yesilkent_universite", name: "Yeşilkent Üniversitesi Hastanesi", cityId: "ankara", kind: "fictional" },
  { id: "baskent_devlet", name: "Başkent Devlet Hastanesi", cityId: "ankara", kind: "fictional" },
  { id: "bogazkoy_universite", name: "Boğazköy Üniversitesi Tıp Fakültesi Hastanesi", cityId: "istanbul", kind: "fictional" },
  { id: "sahil_egitim_arastirma", name: "Sahil Eğitim ve Araştırma Hastanesi", cityId: "istanbul", kind: "fictional" },
  { id: "egekiyi_universite", name: "Ege Kıyı Üniversitesi Hastanesi", cityId: "izmir", kind: "fictional" },
  { id: "yesilova_devlet", name: "Yeşilova Devlet Hastanesi", cityId: "izmir", kind: "fictional" },
  { id: "orhangazi_egitim_arastirma", name: "Orhangazi Eğitim ve Araştırma Hastanesi", cityId: "bursa", kind: "fictional" },
  { id: "akdeniz_kent", name: "Akdeniz Kent Hastanesi", cityId: "antalya", kind: "fictional" },
  { id: "porsuk_universite", name: "Porsuk Üniversitesi Hastanesi", cityId: "eskisehir", kind: "fictional" },
  { id: "anadolu_devlet", name: "Anadolu Devlet Hastanesi", cityId: "eskisehir", kind: "fictional" },
];

export const HOSPITAL_DEFINITIONS: HospitalDefinition[] = [...FICTIONAL_HOSPITALS, ...REAL_INSTITUTIONS];

export function getHospitalDefinition(id: HospitalId): HospitalDefinition {
  const def = HOSPITAL_DEFINITIONS.find((h) => h.id === id);
  if (!def) {
    throw new Error(`Unknown hospital id: ${id}`);
  }
  return def;
}
