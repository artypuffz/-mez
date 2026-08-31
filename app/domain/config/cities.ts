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
  { id: "istanbul", name: "İstanbul", costIndex: 85, rentIndex: 90, transportPressure: 90, socialOpportunity: 90 },
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
