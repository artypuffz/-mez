// Gameplay Expansion Part A §4 — Health/Social Life weekly progression
// config. Both resources are driven by the SAME kind of signal the fixed
// burnout streak already uses (see weeklyResources.ts/residencySimulation.ts),
// reusing the already-leaky ResourcePressureState counters rather than
// inventing a second parallel streak-tracking struct. Every number here
// is small and additive — never a multiplier, never able to swing a
// resource by more than a few points in a single week.
export interface WellbeingConfig {
  health: {
    // resourcePressure.combinedPressureWeeks (leaky, see weeklyResources.ts)
    moderateStrainWeeks: number;
    moderateStrainDelta: number; // negative
    severeStrainWeeks: number;
    severeStrainDelta: number; // negative, ADDITIONAL on top of moderate
    // burnout itself, independent of the stress+fatigue streak — a
    // long-since-accumulated burnout keeps straining health even in a
    // week where stress/fatigue happen to dip.
    burnoutThreshold: number;
    burnoutDelta: number; // negative
    // workload.currentWeekHours — heavy hours strain health directly,
    // not just through stress/fatigue (§4: "ağır çalışma saatleri").
    heavyHoursThreshold: number;
    heavyHoursDelta: number; // negative
    // resourcePressure.lowPressureWeeks (leaky) + a genuinely light
    // week's hours — real rest, not just "not currently in crisis".
    restRecoveryLowPressureWeeks: number;
    restRecoveryMaxHours: number;
    restRecoveryDelta: number; // positive
    // Applied every week regardless of the above — resolved by the
    // caller from lifestyle.foodTier + ownership.housing (see
    // domain/economy/lifestyle.ts). Clamped into the total delta range
    // below, same as every other contributor.
    minWeeklyDelta: number;
    maxWeeklyDelta: number;
  };
  social: {
    heavyHoursThreshold: number;
    heavyHoursDelta: number; // negative
    lowFreeTimeThreshold: number; // this week's freeTime.totalHours
    lowFreeTimeDelta: number; // negative
    ampleFreeTimeThreshold: number;
    ampleFreeTimeDelta: number; // positive — genuinely light week, passive relief
    minWeeklyDelta: number;
    maxWeeklyDelta: number;
  };
}

export const DEFAULT_WELLBEING_CONFIG: WellbeingConfig = {
  health: {
    moderateStrainWeeks: 3,
    moderateStrainDelta: -1,
    severeStrainWeeks: 6,
    severeStrainDelta: -1,
    burnoutThreshold: 70,
    burnoutDelta: -1,
    heavyHoursThreshold: 75,
    heavyHoursDelta: -1,
    restRecoveryLowPressureWeeks: 3,
    restRecoveryMaxHours: 60,
    restRecoveryDelta: 1,
    minWeeklyDelta: -3,
    maxWeeklyDelta: 2,
  },
  social: {
    heavyHoursThreshold: 75,
    heavyHoursDelta: -1,
    lowFreeTimeThreshold: 6,
    lowFreeTimeDelta: -1,
    ampleFreeTimeThreshold: 16,
    ampleFreeTimeDelta: 1,
    minWeeklyDelta: -2,
    maxWeeklyDelta: 1,
  },
};
