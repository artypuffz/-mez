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
// into the arcade band and rounded to two decimals.
//
// TUS System Redesign — HARD REQUIREMENT: the real attainable range must
// be EXACTLY [50, 85] (DEFAULT_TUS_SCORE_CONFIG), built by construction
// rather than by clamping a wider mismatched range down. Worked arithmetic
// (center=65, exam events' own scoreModifier values unchanged, see
// tusExamEvents.ts):
//   worst case: prepProfile.baseModifier(-4, "son_ay_panik") +
//     examModifier(-5, worst choice on the 4 lowest-ceiling exam events) +
//     rngModifier(-6, the int(-3,4)+int(-3,3) floor) + fractional(0)
//     = 65 - 4 - 5 - 6 + 0 = 50 exactly.
//   best case: prepProfile.baseModifier(+6, "duzenli") +
//     examModifier(+6, best choice on the 4 highest-ceiling exam events) +
//     rngModifier(+7, the int(-3,4)+int(-3,3) ceiling) + fractional(<1)
//     = 65 + 6 + 6 + 7 + [0,1) = [84, 85) — the fractional dither only
//     ever rounds the extreme top tail (fractional >= 0.995) up to a
//     displayed 85.00; it can never push a run above it.
// Decisions (prep + exam choices) still dominate: their combined swing
// (prep 10 + exam 11 = 21) outweighs the rng swing (13) — a run's outcome
// is still driven mainly by what the player picked, not the dice.
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

  const rngModifier = rng.int(-3, 4) + rng.int(-3, 3);
  const fractional = rng.next();

  const raw = config.center + prepProfile.baseModifier + examModifier + rngModifier + fractional;
  const clamped = Math.min(config.maxScore, Math.max(config.minScore, raw));
  const score = Math.round(clamped * 100) / 100;

  return { score, prepModifier: prepProfile.baseModifier, examModifier, rngModifier };
}
