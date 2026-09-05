export interface TusScoreConfig {
  center: number;
  minScore: number;
  maxScore: number;
  examEventCount: number;
}

// TUS System Redesign — HARD REQUIREMENT: the real attainable range of
// computeTusScore() must be EXACTLY [50, 85], not merely clamped down from
// a wider mismatched range. This is enforced by construction, not by
// clamping: center(65) + worst-case prep/exam/rng inputs sums to exactly
// 50, and center + best-case prep/exam/rng inputs sums to exactly 84 (with
// the [0,1) fractional dither only ever pushing the extreme tail up to a
// rounded 85.00 — see computeTusScore.ts's own header comment for the full
// worked arithmetic). The Math.min/Math.max clamp below stays only as a
// defensive invariant guard, not as the mechanism that produces the range.
export const DEFAULT_TUS_SCORE_CONFIG: TusScoreConfig = {
  center: 65,
  minScore: 50,
  maxScore: 85,
  examEventCount: 4,
};
