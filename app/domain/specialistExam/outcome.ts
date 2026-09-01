import type { SeededRng } from "../rng/seededRng";
import type { GameState } from "../state/types";

// Phase 10 §4/§28 — every input here is something the game already
// tracks; nothing invented just for this formula. No single factor can
// auto-fail the exam (§2) — each is capped/weighted so its maximum
// possible swing stays modest relative to the ~65 baseline.
export interface SpecialistExamFactors {
  preparationPoints: number; // statistics.specialist_exam_prep_points, uncapped input
  finalBurnout: number; // 0-100
  finalStress: number; // 0-100
  finalFatigue: number; // 0-100
  crisisRecoveredRatio: number; // 0-1, recoveredCount / max(1, totalCrises)
  highTrustRelationshipCount: number; // relationships with trust >= 15
  careerOpportunitiesTaken: number; // statistics.career_opportunities_taken
  attempt: number; // 1 or 2 (the attempt about to be resolved)
}

export function buildExamFactors(state: GameState): SpecialistExamFactors {
  const totalCrises = state.statistics["crisis:total"] ?? 0;
  const recoveredCrises = state.statistics["crisis:recovered"] ?? 0;
  const highTrustRelationshipCount = Object.values(state.relationships).filter((r) => r.trust >= 15).length;

  return {
    preparationPoints: state.statistics["specialist_exam_prep_points"] ?? 0,
    finalBurnout: state.resources.burnout,
    finalStress: state.resources.stress,
    finalFatigue: state.resources.fatigue,
    crisisRecoveredRatio: totalCrises > 0 ? recoveredCrises / totalCrises : 0.5,
    highTrustRelationshipCount,
    careerOpportunitiesTaken: state.statistics["career_opportunities_taken"] ?? 0,
    attempt: (state.specialistExam?.attempt ?? 0) + 1,
  };
}

export interface SpecialistExamOutcome {
  score: number; // 0-100, informational — never shown to the player as a number (§28 stays deadpan, not a stat readout)
  passProbability: number;
  passed: boolean;
}

// Deterministic given the same factors + rng — the rng itself is always
// scoped by the caller as "specialist-exam:attempt:N" (engine.ts), so a
// refresh mid-decision never rerolls an already-resolved attempt (§4).
export function calculateSpecialistExamOutcome(factors: SpecialistExamFactors, rng: SeededRng): SpecialistExamOutcome {
  let score = 65;

  // Preparation: diminishing returns past ~40 points so grinding one
  // stat doesn't dominate the whole formula.
  score += Math.min(25, factors.preparationPoints * 0.6);

  // End-of-residency condition: burnout hurts most (it's the "did the
  // last 4-5 years wear you down" signal); stress/fatigue only matter
  // once genuinely high, not at their normal day-to-day levels.
  score -= factors.finalBurnout * 0.15;
  score -= Math.max(0, factors.finalStress - 70) * 0.1;
  score -= Math.max(0, factors.finalFatigue - 70) * 0.1;

  // Resilience and support — capped so no single relationship/crisis
  // outcome swings the result on its own.
  score += factors.crisisRecoveredRatio * 10;
  score += Math.min(3, factors.highTrustRelationshipCount) * 3;
  score += Math.min(3, factors.careerOpportunitiesTaken) * 2;

  // §28 — a second attempt follows real additional preparation (the
  // retry chain's own prep event already added prep points), but also
  // carries a flat "you've done this once already" bonus.
  if (factors.attempt >= 2) score += 12;

  score = Math.max(0, Math.min(100, score));
  const passProbability = Math.max(0.05, Math.min(0.97, score / 100));
  const passed = rng.next() < passProbability;

  return { score, passProbability, passed };
}
