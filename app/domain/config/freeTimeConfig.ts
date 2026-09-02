// Gameplay Expansion Part A §3 — freeTimeHours is a real, hour-based
// resource, never a 0-3 token/right system. Derived PURELY from the
// existing Phase 11 workload.currentWeekHours (never a second work-hours
// authority) via one smooth linear band, config-driven so it can be
// re-tuned without touching domain/residency/freeTime.ts's logic.
//
// Calibrated against the design brief's own worked example ("72 saat
// çalışma ... 9 saat boş zaman") and its band guidance (yoğun hafta
// (~75h+) -> 4-8h, normal hafta (45-75h) -> 10-16h, rahat hafta (<45h) ->
// daha fazla): baseHours - hoursPerWorkHour*currentWeekHours hits ~9h at
// 72h and ~16h at 45h.
export interface FreeTimeConfig {
  baseHours: number;
  hoursPerWorkHour: number;
  minFreeTimeHours: number;
  maxFreeTimeHours: number;
}

export const DEFAULT_FREE_TIME_CONFIG: FreeTimeConfig = {
  baseHours: 28,
  hoursPerWorkHour: 0.26,
  minFreeTimeHours: 2,
  maxFreeTimeHours: 30,
};
