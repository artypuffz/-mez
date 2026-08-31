export interface TusScoreConfig {
  center: number;
  minScore: number;
  maxScore: number;
  examEventCount: number;
}

// Not final balancing. center=65 with the current prep/exam modifier
// ranges puts most runs in the 55-75 band the design called for, extremes
// near minScore/maxScore stay rare because they need several unlikely
// choices/RNG draws to stack in the same direction.
export const DEFAULT_TUS_SCORE_CONFIG: TusScoreConfig = {
  center: 65,
  minScore: 20,
  maxScore: 98,
  examEventCount: 4,
};
