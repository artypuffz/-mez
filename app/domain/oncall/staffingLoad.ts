import { STAFFING_LOAD_CONFIG } from "../config/onCallEconomyConfig";

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export interface StaffingLoadInput {
  activeResidents: number;
  targetResidents: number;
  staffingPressure: number; // program.hiddenProfile.staffingPressure, 0..100
}

// §5 — turns Phase 6's roster decline into a real gameplay input. Blends
// how far under the "fully staffed" reference the active roster is with
// the program's own static staffingPressure profile, so a healthy roster
// on a structurally understaffed program still reads some pressure, and a
// thin roster on an otherwise easy program still shows it.
export function calculateStaffingLoad({ activeResidents, targetResidents, staffingPressure }: StaffingLoadInput): number {
  const shortageRatio = targetResidents > 0 ? Math.max(0, (targetResidents - activeResidents) / targetResidents) : 0;
  const load = shortageRatio * 100 * STAFFING_LOAD_CONFIG.shortageWeight + staffingPressure * STAFFING_LOAD_CONFIG.pressureWeight;
  return Math.round(clamp(load));
}
