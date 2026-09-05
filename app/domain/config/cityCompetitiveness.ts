import type { CityId } from "../state/types";

// TUS System Redesign (post-Hotfix-1) — an explicit GAMEPLAY city
// desirability/demand concept for TUS placement, deliberately SEPARATE
// from `CityDefinition.costIndex` (domain/config/cities.ts) — cost of
// living and residency-preference demand are different axes; a cheap city
// is not automatically a low-demand one, and vice versa. This is NOT an
// official desirability ranking of any kind — it is a hand-authored
// gameplay judgment about typical relative TUS-preference demand, in the
// same spirit and provenance class as branchCompetitiveness.ts.
//
// METHODOLOGY: the three metropolitan/highest-demand cities (İstanbul,
// Ankara, İzmir) and the next three (Antalya, Bursa, Eskişehir) were given
// directly by the redesign brief and map 1:1 onto this file's tiers 5 and
// 4 — these six are also the only cities with individually hand-tuned
// `CityDefinition` economy numbers (Phase 10), i.e. the ones this project
// already treats as structurally distinct from the rest.
//
// For the remaining 56 cities, no verified population/demand dataset was
// available this session (same network-access constraint noted throughout
// this codebase's data-provenance comments), so this file reuses
// `cities.ts`'s existing, already-documented two-tier split of the real
// ÖSYM dataset's other cities (see cities.ts's own "Tier B" / "Tier C"
// comment) as a coarse, defensible SIZE proxy — a genuinely larger/more
// prominent regional metro is a reasonable, if approximate, stand-in for
// higher TUS demand — and further splits the larger "Tier C" (36 cities)
// group into two city-competitiveness tiers using general, widely-known
// population/prominence facts about Turkish provinces (larger provincial
// capitals vs. the smallest/most remote provinces in the ÖSYM dataset),
// the same kind of general domain knowledge basis branchCompetitiveness.ts
// already documents for its own tiers. This is explicitly a coarse
// approximation, not a researched per-city ranking.
//
// 1 (lowest demand) .. 5 (highest demand).
export type CityCompetitivenessTier = 1 | 2 | 3 | 4 | 5;

export const CITY_COMPETITIVENESS_MODIFIER: Record<CityCompetitivenessTier, number> = {
  5: 3,
  4: 2,
  3: 0,
  2: -1,
  1: -2,
};

// Tier 5 — highest-demand major metropolitan/academic centers.
const TIER_5: CityId[] = ["istanbul", "ankara", "izmir"];

// Tier 4 — large/attractive/academically strong metropolitan cities.
const TIER_4: CityId[] = ["antalya", "bursa", "eskisehir"];

// Tier 3 — middle-demand provincial/large centers (cities.ts's "Tier B").
const TIER_3: CityId[] = [
  "adana", "gaziantep", "konya", "kayseri", "mersin", "kocaeli", "samsun",
  "sanliurfa", "diyarbakir", "hatay", "manisa", "balikesir", "kahramanmaras",
  "van", "aydin", "tekirdag", "sakarya", "denizli", "mugla", "trabzon",
];

// Tier 2 — lower-demand cities: the larger/more-established half of
// cities.ts's "Tier C" group (regional hubs with their own university,
// larger provincial capitals).
const TIER_2: CityId[] = [
  "afyonkarahisar", "amasya", "bolu", "canakkale", "corum", "duzce",
  "edirne", "elazig", "erzurum", "giresun", "isparta", "karabuk",
  "kastamonu", "kirklareli", "kutahya", "malatya", "ordu", "rize",
  "sivas", "tokat", "usak", "yalova", "zonguldak",
];

// Tier 1 — lowest-demand / hardest-to-fill: the smallest-population,
// most remote provinces in the ÖSYM dataset's "Tier C" group (general,
// widely-known fact about Turkish provincial populations, not a specific
// claim about any individual city's residency programs).
const TIER_1: CityId[] = [
  "adiyaman", "agri", "aksaray", "bilecik", "erzincan", "karaman", "kars",
  "kirikkale", "kirsehir", "mardin", "nigde", "siirt", "yozgat",
];

const CITY_COMPETITIVENESS_TIER: Record<CityId, CityCompetitivenessTier> = Object.fromEntries([
  ...TIER_5.map((id) => [id, 5]),
  ...TIER_4.map((id) => [id, 4]),
  ...TIER_3.map((id) => [id, 3]),
  ...TIER_2.map((id) => [id, 2]),
  ...TIER_1.map((id) => [id, 1]),
]) as Record<CityId, CityCompetitivenessTier>;

export function getCityCompetitivenessTier(cityId: CityId): CityCompetitivenessTier {
  return CITY_COMPETITIVENESS_TIER[cityId] ?? 3;
}

export function getCityCompetitivenessModifier(cityId: CityId): number {
  return CITY_COMPETITIVENESS_MODIFIER[getCityCompetitivenessTier(cityId)];
}
