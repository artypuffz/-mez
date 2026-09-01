import type { GameState, GameOverReason } from "../state/types";
import { getBranchDefinition } from "../config/branches";
import { getHospitalDefinition } from "../config/hospitals";
import { getCityDefinition } from "../config/cities";
import { getBackgroundDefinition } from "../config/backgrounds";
import { formatDuration } from "../state/selectors";
import { computeCycleScore, resolveCycleEnding, computeFlavorTags, flavorTagLabel, type CycleEnding, type FlavorTag } from "./behaviorProfile";
import { selectNotableEvents, type NotableEvent } from "./notableEvents";
import { selectNpcCallbacks, type NpcCallback } from "./npcCallbacks";
import { selectFinalTitle } from "./finalTitle";

// Phase 10 §10 — a pure helper: reads a raw GameState, produces a
// readable summary, contains no UI logic. Both endings (specialist AND
// every gameover reason) share this exact same builder (§7) — a
// career that ended isn't a wiped slate, it's a report.
export interface CareerReport {
  identity: {
    name: string;
    age: number;
    hometown: string;
    backgroundLabel: string;
  };
  career: {
    branchName?: string;
    hospitalName?: string;
    cityName?: string;
    durationLabel: string;
    weeksCompleted: number;
    seniorityReached: string;
  };
  onCall: {
    lifetimeShifts: number;
    lifetimeWeekendShifts: number;
    lifetimeExtraShifts: number;
  };
  economy: {
    lowestBalance: number;
    finalBalance: number;
  };
  crisis: {
    total: number;
    recovered: number;
    byType: Record<string, number>;
  };
  relationships: NpcCallback[];
  hierarchyBehavior: CycleEnding & { supportiveScore: number; negativeScore: number };
  social: {
    flavorTags: { tag: FlavorTag; label: string }[];
    missedSocialEvents: number;
  };
  notableEvents: NotableEvent[];
  // §9 — real counters only, never fabricated. Empty when nothing
  // qualifies rather than padding with invented numbers.
  absurdStats: { label: string; count: number }[];
  ending: {
    kind: "specialist" | "gameover";
    reason?: GameOverReason;
    week: number;
  };
  finalTitle: string;
}

const ABSURD_STAT_LABELS: [statKey: string, label: string][] = [
  ["oncall:extra_shift_accepted", "Ekstra nöbet kabul etme"],
  ["career_opportunities_taken", "Akademik fırsat değerlendirme"],
];

export function buildCareerReport(state: GameState): CareerReport {
  const cycleScore = computeCycleScore(state.behaviorStats);
  const cycleEnding = resolveCycleEnding(cycleScore);
  const week = state.gameOver?.week ?? state.career.residencyWeek;

  const absurdStats = ABSURD_STAT_LABELS
    .map(([key, label]) => ({ label, count: state.statistics[key] ?? 0 }))
    .filter((s) => s.count > 0);

  return {
    identity: {
      name: state.character.name,
      age: state.character.age,
      hometown: state.character.hometown,
      backgroundLabel: getBackgroundDefinition(state.character.background).label,
    },
    career: {
      branchName: state.career.branch ? getBranchDefinition(state.career.branch).name : undefined,
      hospitalName: state.career.hospital ? getHospitalDefinition(state.career.hospital).name : undefined,
      cityName: state.career.city ? getCityDefinition(state.career.city).name : undefined,
      durationLabel: formatDuration(week),
      weeksCompleted: week,
      seniorityReached: state.career.seniorityStage,
    },
    onCall: {
      lifetimeShifts: state.statistics["oncall_lifetime_shifts"] ?? 0,
      lifetimeWeekendShifts: state.statistics["oncall_lifetime_weekend_shifts"] ?? 0,
      lifetimeExtraShifts: state.statistics["oncall_lifetime_extra_shifts"] ?? 0,
    },
    economy: {
      lowestBalance: state.financialPressure.lowestBalance,
      finalBalance: state.resources.money,
    },
    crisis: {
      total: state.statistics["crisis:total"] ?? 0,
      recovered: state.statistics["crisis:recovered"] ?? 0,
      byType: {
        exhaustion: state.statistics["crisis:exhaustion"] ?? 0,
        burnout: state.statistics["crisis:burnout"] ?? 0,
        financial: state.statistics["crisis:financial"] ?? 0,
        career: state.statistics["crisis:career"] ?? 0,
      },
    },
    relationships: selectNpcCallbacks(state),
    hierarchyBehavior: { ...cycleEnding, supportiveScore: cycleScore.supportiveScore, negativeScore: cycleScore.negativeScore },
    social: {
      flavorTags: computeFlavorTags(state).map((tag) => ({ tag, label: flavorTagLabel(tag) })),
      missedSocialEvents: state.statistics["social_events_missed"] ?? 0,
    },
    notableEvents: selectNotableEvents(state),
    absurdStats,
    ending: state.gameOver
      ? { kind: "gameover", reason: state.gameOver.reason, week: state.gameOver.week }
      : { kind: "specialist", week: state.career.residencyWeek },
    finalTitle: selectFinalTitle(state, cycleEnding.outcome),
  };
}
