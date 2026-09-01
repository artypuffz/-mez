import type { BranchId } from "../state/types";

export interface BranchWeeklyBaseline {
  fatiguePressure: number;
  stressPressure: number;
}

// Phase 7 — the real per-branch on-call differentiation the comment below
// used to defer. Deliberately modest spreads, not a stereotype: staffing
// (program.hiddenProfile.staffingPressure) and seniority matter at least
// as much as branch identity in the final shift count (see
// domain/oncall/generateSchedule.ts).
export interface BranchOnCallProfile {
  baseMonthlyShifts: number;
  minMonthlyShifts: number;
  maxMonthlyShifts: number;
  // 0..1 — fraction of a month's shifts that land on a weekend day.
  weekendBias: number;
}

export interface BranchDefinition {
  id: BranchId;
  name: string;
  residencyYears: number;
  description: string;
  // Small, deliberately understated per-branch difference (see
  // docs/event-design-bible.md's ton rehberi — no stereotyping). The real
  // differentiation between branches comes from on-call load (Phase 7)
  // and event content (Phase 8), not this baseline.
  weeklyBaseline: BranchWeeklyBaseline;
  onCallProfile: BranchOnCallProfile;
}

export const BRANCH_DEFINITIONS: BranchDefinition[] = [
  {
    id: "ic_hastaliklari",
    name: "İç Hastalıkları",
    residencyYears: 4,
    description: "Poliklinik, konsültasyon ve uzun takip dosyalarının branşı.",
    weeklyBaseline: { fatiguePressure: 4, stressPressure: 3 },
    onCallProfile: { baseMonthlyShifts: 6, minMonthlyShifts: 4, maxMonthlyShifts: 9, weekendBias: 0.35 },
  },
  {
    id: "genel_cerrahi",
    name: "Genel Cerrahi",
    residencyYears: 5,
    description: "Ameliyathane temposu ve uzun nöbetlerle tanışacağın branş.",
    // Phase 10 §21-23 — trimmed from {5,4}/{8,11} after a 1000-seed
    // random-strategy sim showed a ~48pt game-over gap vs Psikiyatri
    // (root cause: this branch's own baseline + on-call load compounds
    // with its longer residencyYears=5 exposure window and its 4
    // programs' own higher-than-average hiddenProfile burnoutPressure —
    // branch-specific event content itself measured only mildly harder
    // than İç Hastalıkları's, see the Phase 10 report). Landed at a ~55%
    // random-strategy game-over rate (close to the design bible's own
    // "Cerrahi ~45%" example) and a ~19pt gap vs İç Hastalıkları — still
    // the hardest branch by design, just not by as much.
    // onCallProfile.baseMonthlyShifts must stay STRICTLY above İç
    // Hastalıkları's (6) and an INTEGER (generateSchedule.ts's clamp
    // doesn't round) — a same-value base tied their average shift counts
    // and broke generateSchedule.test.ts's branch-ordering assertion; 7
    // is the smallest integer that keeps a real, tested gap.
    // residencyYears/hiddenProfile intentionally left alone (thematic,
    // and the global resource model per §23 is not touched here) — the
    // vs-Psikiyatri gap stays wider than the vs-İç one as a result; see
    // the Phase 10 report for why that residual gap was left rather than
    // chased further.
    weeklyBaseline: { fatiguePressure: 3.7, stressPressure: 2.7 },
    onCallProfile: { baseMonthlyShifts: 7, minMonthlyShifts: 5, maxMonthlyShifts: 10, weekendBias: 0.4 },
  },
  {
    id: "psikiyatri",
    name: "Psikiyatri",
    residencyYears: 4,
    description: "Görüşme odası, süpervizyon ve sabırla ilgili branş.",
    // Phase 10 §21-23 — nudged up from {3,3}/{5,8} alongside Genel
    // Cerrahi's trim: at the original values Psikiyatri's random-strategy
    // game-over rate (~16%) read as close to "neredeyse garanti başarı"
    // (§53) rather than a genuinely easier-but-still-real branch.
    weeklyBaseline: { fatiguePressure: 3.3, stressPressure: 3.2 },
    onCallProfile: { baseMonthlyShifts: 6, minMonthlyShifts: 4, maxMonthlyShifts: 9, weekendBias: 0.3 },
  },
];

export function getBranchDefinition(id: BranchId): BranchDefinition {
  const def = BRANCH_DEFINITIONS.find((b) => b.id === id);
  if (!def) {
    throw new Error(`Unknown branch id: ${id}`);
  }
  return def;
}
