export interface NpcLifecycleConfig {
  promotionTenureWeeksResidentToSpecialist: number;
  promotionChancePerMonthResidentToSpecialist: number;
  promotionTenureWeeksSpecialistToFaculty: number;
  promotionChancePerMonthSpecialistToFaculty: number;
  promotionChancePerMonthFacultyToHead: number;
  baseLeaveChancePerMonth: number;
  burnoutLeaveChanceMultiplier: number;
}

// Monthly-tick probabilities (§10/§11) — deliberately conservative so a
// 5-year run doesn't chaotically reshuffle the whole clinic; the headless
// simulation (§32) is what validates these aren't too hot or too cold.
export const DEFAULT_NPC_LIFECYCLE_CONFIG: NpcLifecycleConfig = {
  promotionTenureWeeksResidentToSpecialist: 100,
  promotionChancePerMonthResidentToSpecialist: 0.03,
  promotionTenureWeeksSpecialistToFaculty: 150,
  promotionChancePerMonthSpecialistToFaculty: 0.02,
  promotionChancePerMonthFacultyToHead: 0.01,
  baseLeaveChancePerMonth: 0.01,
  burnoutLeaveChanceMultiplier: 0.04,
};
