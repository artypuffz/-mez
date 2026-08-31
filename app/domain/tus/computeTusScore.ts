import type { SeededRng } from "../rng/seededRng";
import type { TusPrepProfileDefinition } from "../config/tusPrepProfiles";
import type { TusExamChoiceLogEntry } from "../state/types";
import { getTusExamEvent } from "../config/tusExamEvents";
import { DEFAULT_TUS_SCORE_CONFIG, type TusScoreConfig } from "../config/tusScoreConfig";

export interface TusScoreBreakdown {
  score: number;
  prepModifier: number;
  examModifier: number;
  rngModifier: number;
}

// internalScore = prepBase + examDayModifiers + boundedRng, then clamped
// into the arcade band and rounded to two decimals. Decisions (prep +
// exam choices) dominate: prep ranges roughly -4..+8, up to four exam
// choices roughly -2..+3 each, versus an RNG contribution bounded to
// [-8, 8] — a run's outcome is driven by what the player picked.
export function computeTusScore(
  prepProfile: TusPrepProfileDefinition,
  examLog: readonly TusExamChoiceLogEntry[],
  rng: SeededRng,
  config: TusScoreConfig = DEFAULT_TUS_SCORE_CONFIG
): TusScoreBreakdown {
  const examModifier = examLog.reduce((sum, entry) => {
    const event = getTusExamEvent(entry.eventId);
    const choice = event.choices.find((c) => c.id === entry.choiceId);
    return sum + (choice?.scoreModifier ?? 0);
  }, 0);

  const rngModifier = rng.int(-3, 3) + rng.int(-3, 3) + rng.int(-2, 2);
  const fractional = rng.next();

  const raw = config.center + prepProfile.baseModifier + examModifier + rngModifier + fractional;
  const clamped = Math.min(config.maxScore, Math.max(config.minScore, raw));
  const score = Math.round(clamped * 100) / 100;

  return { score, prepModifier: prepProfile.baseModifier, examModifier, rngModifier };
}
