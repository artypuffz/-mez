import type { CityId } from "../state/types";

export interface CityDefinition {
  id: CityId;
  name: string;
  // 0-100 scale, reserved for the weekly economy tick (Phase 4+/7).
  // Not rendered as raw numbers anywhere in the UI.
  costIndex: number;
  rentIndex: number;
  transportPressure: number;
  socialOpportunity: number;
}

// Phase 11 §29 — the real ÖSYM program dataset spans 62 cities, not the
// original 6. Real per-city cost-of-living/rent data for all 62 was not
// available/verifiable in this session (same network constraint as the
// program dataset itself — see docs/program-data-sources.md), so rather
// than inventing 56 individually "researched"-looking numbers, every new
// city gets ONE of two honest, clearly-labeled REGIONAL DEFAULT profiles
// based only on a coarse, defensible size tier (major additional
// metro/provincial-capital-with-large-population vs. smaller city) — never
// a specific claim about that city's real economy. The original 6 cities'
// hand-tuned indices (İstanbul's Phase 10 balance pass in particular) are
// left completely untouched.
const MID_CITY_PROFILE = { costIndex: 50, rentIndex: 45, transportPressure: 45, socialOpportunity: 50 };
const DEFAULT_CITY_PROFILE = { costIndex: 38, rentIndex: 32, transportPressure: 30, socialOpportunity: 35 };

function midCity(id: CityId, name: string): CityDefinition {
  return { id, name, ...MID_CITY_PROFILE };
}

function defaultCity(id: CityId, name: string): CityDefinition {
  return { id, name, ...DEFAULT_CITY_PROFILE };
}

export const CITY_DEFINITIONS: CityDefinition[] = [
  { id: "ankara", name: "Ankara", costIndex: 55, rentIndex: 50, transportPressure: 60, socialOpportunity: 65 },
  // Phase 10 §24 — trimmed from {85,90,90}: with a flat, city-blind
  // salary (SALARY_CONFIG has no city term), the original indices scaled
  // expenses.rent/food/transport/utilities up ~1.7-1.8x Ankara's while
  // income stayed identical, producing a monthly net of roughly -13.5k
  // TL even before on-call pay — a 500-seed random-strategy check showed
  // İstanbul residents averaging -104k TL with 100% ever-negative, i.e.
  // exactly the "İstanbul = ekonomik ölüm" outcome this section warns
  // against. Still clearly the most expensive city (well above every
  // other city's indices), just survivable with on-call pay factored in
  // rather than a guaranteed structural loss regardless of play.
  { id: "istanbul", name: "İstanbul", costIndex: 68, rentIndex: 70, transportPressure: 72, socialOpportunity: 90 },
  { id: "izmir", name: "İzmir", costIndex: 65, rentIndex: 60, transportPressure: 55, socialOpportunity: 70 },
  { id: "bursa", name: "Bursa", costIndex: 55, rentIndex: 50, transportPressure: 50, socialOpportunity: 55 },
  { id: "antalya", name: "Antalya", costIndex: 60, rentIndex: 55, transportPressure: 45, socialOpportunity: 60 },
  { id: "eskisehir", name: "Eskişehir", costIndex: 45, rentIndex: 40, transportPressure: 35, socialOpportunity: 55 },

  // Tier B — major additional cities (regional metro / large provincial
  // capital in the real ÖSYM dataset). MID_CITY_PROFILE, see the note above.
  midCity("adana", "Adana"),
  midCity("gaziantep", "Gaziantep"),
  midCity("konya", "Konya"),
  midCity("kayseri", "Kayseri"),
  midCity("mersin", "Mersin"),
  midCity("kocaeli", "Kocaeli"),
  midCity("samsun", "Samsun"),
  midCity("sanliurfa", "Şanlıurfa"),
  midCity("diyarbakir", "Diyarbakır"),
  midCity("hatay", "Hatay"),
  midCity("manisa", "Manisa"),
  midCity("balikesir", "Balıkesir"),
  midCity("kahramanmaras", "Kahramanmaraş"),
  midCity("van", "Van"),
  midCity("aydin", "Aydın"),
  midCity("tekirdag", "Tekirdağ"),
  midCity("sakarya", "Sakarya"),
  midCity("denizli", "Denizli"),
  midCity("mugla", "Muğla"),
  midCity("trabzon", "Trabzon"),

  // Tier C — remaining cities in the real ÖSYM dataset. DEFAULT_CITY_PROFILE.
  defaultCity("adiyaman", "Adıyaman"),
  defaultCity("afyonkarahisar", "Afyonkarahisar"),
  defaultCity("agri", "Ağrı"),
  defaultCity("aksaray", "Aksaray"),
  defaultCity("amasya", "Amasya"),
  defaultCity("bilecik", "Bilecik"),
  defaultCity("bolu", "Bolu"),
  defaultCity("canakkale", "Çanakkale"),
  defaultCity("corum", "Çorum"),
  defaultCity("duzce", "Düzce"),
  defaultCity("edirne", "Edirne"),
  defaultCity("elazig", "Elazığ"),
  defaultCity("erzincan", "Erzincan"),
  defaultCity("erzurum", "Erzurum"),
  defaultCity("giresun", "Giresun"),
  defaultCity("isparta", "Isparta"),
  defaultCity("karabuk", "Karabük"),
  defaultCity("karaman", "Karaman"),
  defaultCity("kars", "Kars"),
  defaultCity("kastamonu", "Kastamonu"),
  defaultCity("kirikkale", "Kırıkkale"),
  defaultCity("kirklareli", "Kırklareli"),
  defaultCity("kirsehir", "Kırşehir"),
  defaultCity("kutahya", "Kütahya"),
  defaultCity("malatya", "Malatya"),
  defaultCity("mardin", "Mardin"),
  defaultCity("nigde", "Niğde"),
  defaultCity("ordu", "Ordu"),
  defaultCity("rize", "Rize"),
  defaultCity("siirt", "Siirt"),
  defaultCity("sivas", "Sivas"),
  defaultCity("tokat", "Tokat"),
  defaultCity("usak", "Uşak"),
  defaultCity("yalova", "Yalova"),
  defaultCity("yozgat", "Yozgat"),
  defaultCity("zonguldak", "Zonguldak"),
];

export function getCityDefinition(id: CityId): CityDefinition {
  const def = CITY_DEFINITIONS.find((c) => c.id === id);
  if (!def) {
    throw new Error(`Unknown city id: ${id}`);
  }
  return def;
}
