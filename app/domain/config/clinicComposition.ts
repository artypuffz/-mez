import type { NpcRole } from "../state/types";

export interface RoleCountRange {
  min: number;
  max: number;
}

export type ClinicCompositionTemplate = Record<NpcRole, RoleCountRange>;

// §8 of the Phase 6 spec's example ranges. Actual generated counts vary
// per program via that program's own seed (and a small staffing-pressure
// nudge, see generation.ts) — this is the shared baseline, not a fixed
// roster every program produces identically.
export const DEFAULT_CLINIC_COMPOSITION: ClinicCompositionTemplate = {
  department_head: { min: 1, max: 1 },
  faculty: { min: 1, max: 3 },
  specialist: { min: 1, max: 2 },
  senior_resident: { min: 1, max: 3 },
  peer_resident: { min: 2, max: 4 },
  junior_resident: { min: 0, max: 2 },
  nurse: { min: 2, max: 5 },
  secretary: { min: 1, max: 1 },
};

// Roughly how long (in weeks, relative to the player's week 0) someone in
// this role has typically already been there when the player arrives —
// used only to seed a plausible joinedWeek, not shown to the player.
export const ROLE_TENURE_RANGE: Record<NpcRole, [number, number]> = {
  department_head: [-800, -400],
  faculty: [-500, -150],
  specialist: [-250, -50],
  senior_resident: [-150, -20],
  peer_resident: [-60, -10],
  junior_resident: [-20, 0],
  nurse: [-400, -20],
  secretary: [-400, -20],
};
