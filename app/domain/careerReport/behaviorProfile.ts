import type { GameState } from "../state/types";

export type CycleOutcome = "broke_cycle" | "mixed" | "repeated_cycle";

export interface CycleEnding {
  outcome: CycleOutcome;
  title: string;
  body: string;
}

const CYCLE_ENDINGS: Record<CycleOutcome, Omit<CycleEnding, "outcome">> = {
  broke_cycle: {
    title: "DÖNGÜYÜ KIRDIN",
    body: "Kıdemlendikçe sana yapılanları aşağıya aktarmadın.",
  },
  mixed: {
    title: "ELİNDEN GELDİĞİNCE",
    body: "Her zaman başaramadın. Ama çoğu zaman hatırladın.",
  },
  repeated_cycle: {
    title: "DEVİR TESLİM",
    body: "Bir noktada \"biz çömezken...\" cümlesi senden de çıktı.",
  },
};

// Phase 10 §12 — normalized over the WHOLE career's accumulated
// behaviorTags, never a single choice/event. supportive/negative sums
// mirror the canonical tag families established across Phase 6-9 content
// (junior:*, hierarchy:*) — see docs/event-schema.md §6.
const SUPPORTIVE_TAGS = ["junior:supportive", "junior:protected", "junior:defended", "hierarchy:protective"];
const NEGATIVE_TAGS = ["junior:exploitative", "junior:humiliated", "junior:burdened", "hierarchy:abusive", "hierarchy:complicit"];

export interface CycleScore {
  supportiveScore: number;
  negativeScore: number;
  sampleSize: number;
}

export function computeCycleScore(behaviorStats: Record<string, number>): CycleScore {
  const supportiveScore = SUPPORTIVE_TAGS.reduce((sum, tag) => sum + (behaviorStats[tag] ?? 0), 0);
  const negativeScore = NEGATIVE_TAGS.reduce((sum, tag) => sum + (behaviorStats[tag] ?? 0), 0);
  return { supportiveScore, negativeScore, sampleSize: supportiveScore + negativeScore };
}

// §51 boundary rule: a majority-supportive career reads as broke_cycle, a
// majority-negative one as repeated_cycle, anything genuinely split (or
// with too little of either to call) as mixed. No zero-data career is
// ever "broke_cycle" or "repeated_cycle" — mixed is the honest default.
export function resolveCycleEnding(score: CycleScore): CycleEnding {
  if (score.sampleSize === 0) return { outcome: "mixed", ...CYCLE_ENDINGS.mixed };
  const ratio = score.supportiveScore / score.sampleSize;
  const outcome: CycleOutcome = ratio >= 0.65 ? "broke_cycle" : ratio <= 0.35 ? "repeated_cycle" : "mixed";
  return { outcome, ...CYCLE_ENDINGS[outcome] };
}

// Phase 10 §13 — a handful of grounded flavor tags, each backed by a real
// tracked counter (never invented for flavor alone). A career can qualify
// for 0-5 of these; none are mutually exclusive.
export type FlavorTag = "akademik" | "dayanismaci" | "kendini_koruyan" | "iskolik" | "sosyal";

const FLAVOR_LABELS: Record<FlavorTag, string> = {
  akademik: "Akademik",
  dayanismaci: "Dayanışmacı",
  kendini_koruyan: "Kendini Koruyan",
  iskolik: "İşkolik",
  sosyal: "Sosyal",
};

export function computeFlavorTags(state: GameState): FlavorTag[] {
  const tags: FlavorTag[] = [];
  if ((state.statistics["career_opportunities_taken"] ?? 0) >= 2) tags.push("akademik");
  if ((state.behaviorStats["colleague:loyal"] ?? 0) >= 3) tags.push("dayanismaci");
  if ((state.behaviorStats["colleague:self_preserving"] ?? 0) >= 3) tags.push("kendini_koruyan");
  if ((state.statistics["oncall_lifetime_extra_shifts"] ?? 0) >= 5 || (state.statistics["crisis:exhaustion"] ?? 0) >= 2) tags.push("iskolik");
  const socialEventCount = state.eventHistory.filter((e) => e.category === "SOCIAL").length;
  if (socialEventCount >= 8) tags.push("sosyal");
  return tags;
}

export function flavorTagLabel(tag: FlavorTag): string {
  return FLAVOR_LABELS[tag];
}
