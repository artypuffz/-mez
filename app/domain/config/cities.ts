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
];

export function getCityDefinition(id: CityId): CityDefinition {
  const def = CITY_DEFINITIONS.find((c) => c.id === id);
  if (!def) {
    throw new Error(`Unknown city id: ${id}`);
  }
  return def;
}
