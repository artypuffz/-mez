export interface WeeklyResourceConfig {
  fatigueRngRange: [number, number];
  stressRngRange: [number, number];

  // Phase 9 §2-4 — replaces the old "additive pressure + fixed-amount
  // recovery once a threshold is crossed" model. That model's recovery
  // amount was tuned against Phase 4's baseline pressure alone; once
  // on-call's weekly nudge (Phase 7) and ~180 content events' average
  // stress/fatigue effects (Phase 8) layered on top, combined weekly
  // pressure regularly exceeded the fixed recovery amount, so crossing
  // the threshold no longer meant recovering — it just slowed the climb
  // to a ceiling the resource then sat at permanently (see the Phase 9
  // report's root-cause section for the measured numbers).
  //
  // The replacement is a proportional pull toward a low resting point,
  // applied every week (not threshold-gated): recovery = rate*(current -
  // restingPoint) + floor, whenever current > restingPoint. This makes
  // the two forces genuinely competing rather than the same fixed number
  // regardless of how bad "current" pressure is: light/typical weekly
  // pressure settles into a low-to-mid equilibrium (pull > pressure),
  // sustained heavy pressure (many events + heavy on-call) still climbs
  // toward a high equilibrium (pressure > pull at that band) because the
  // pull term grows with distance from resting, and a genuinely quiet
  // stretch actually drains back down — there's no cliff, no permanent
  // ceiling residency.
  fatigueRestingPoint: number;
  fatiguePullRate: number;
  fatiguePullFloor: number;

  stressRestingPoint: number;
  stressPullRate: number;
  stressPullFloor: number;

  // Phase 9 §3 — burnout no longer reacts to a single week's stress/
  // fatigue crossing a threshold. It reacts to how many CONSECUTIVE weeks
  // both have stayed elevated (ResourcePressureState.combinedPressureWeeks,
  // computed in weeklyResources.ts) — see burnoutStreak* below. The
  // stress/fatigue thresholds here only decide what counts as "elevated"
  // for streak-counting purposes; they're intentionally the same
  // threshold used for the exhaustion/burnout crisis eligibility checks
  // in domain/crisis/ so "sustained pressure" means one consistent thing
  // across the resource model and the crisis system.
  burnoutHighStressThreshold: number;
  burnoutHighFatigueThreshold: number;
  burnoutLowStressThreshold: number;
  burnoutLowFatigueThreshold: number;

  // §3's worked example: 1 week -> no accrual yet (just risk), 4+ weeks
  // -> a moderate weekly increase, 8+ weeks -> a serious one.
  burnoutStreakModerateWeeks: number;
  burnoutStreakSevereWeeks: number;
  burnoutIncreaseModerate: number;
  burnoutIncreaseSevere: number;

  // §2 — "ama tamamen geri dönüşsüz de olmasın": burnout still recovers,
  // just slower than it accrues, and only once BOTH stress and fatigue
  // have stayed comfortably low for a few consecutive weeks in a row
  // (lowPressureWeeks, mirroring the streak-based accrual side).
  burnoutRecoveryStreakWeeks: number;
  burnoutDecrease: number;

  // hiddenProfile fields are 0-100; divide down to a small weekly nudge.
  // mobbingRisk is deliberately not read here — it's an event-weighting
  // parameter for Phase 5+, not a passive resource driver.
  programPressureDivisor: number;

  // Gameplay Expansion Part A — root-caused a real APK finding ("burnout
  // pratikte hiç artmıyor"). The counters below used to hard-reset to 0
  // the INSTANT their condition stopped holding for even one week — a
  // single week where fatigue dipped from 61 to 59 (ordinary rng noise,
  // or the proportional pull-toward-resting itself) wiped out an entire
  // multi-week streak, discarding all accrued progress toward the next
  // burnout increment. A live trace (Genel Cerrahi, 52 weeks, stress
  // consistently 80-100) showed combinedPressureWeeks collapsing from 16
  // back to 0 mid-career purely from that fragility, and burnout visibly
  // plateauing for 6+ real weeks despite objectively terrible resources —
  // exactly what a short human playtest session would perceive as "never
  // increases". Fixed as a leaky bucket: a non-qualifying week decays the
  // streak by this amount instead of zeroing it, so genuinely sustained
  // pressure still accrues net progress through ordinary week-to-week
  // noise, while a real recovery (many consecutive good weeks) still
  // drains it back to 0 same as before.
  pressureStreakLeakPerWeek: number;
}

// Phase 9 rebalance — see the Phase 9 report for the measured weekly
// pressure decomposition (branch baseline + program modifier + on-call
// nudge + average event contribution) these numbers are tuned against,
// and the 500-seed headless matrix that validated the resulting
// equilibrium bands. Not final difficulty balancing (that's Phase 10+) —
// just "resources behave like described in §2, don't sit permanently
// pegged at 100".
export const DEFAULT_WEEKLY_RESOURCE_CONFIG: WeeklyResourceConfig = {
  fatigueRngRange: [-1, 1],
  stressRngRange: [-1, 1],

  fatigueRestingPoint: 15,
  fatiguePullRate: 0.20,
  fatiguePullFloor: 1,

  stressRestingPoint: 15,
  stressPullRate: 0.13,
  stressPullFloor: 1,

  burnoutHighStressThreshold: 60,
  burnoutHighFatigueThreshold: 60,
  burnoutLowStressThreshold: 30,
  burnoutLowFatigueThreshold: 30,

  burnoutStreakModerateWeeks: 4,
  burnoutStreakSevereWeeks: 8,
  burnoutIncreaseModerate: 1,
  burnoutIncreaseSevere: 2,

  burnoutRecoveryStreakWeeks: 3,
  burnoutDecrease: 1,

  programPressureDivisor: 25,

  pressureStreakLeakPerWeek: 1,
};
