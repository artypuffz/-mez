import type { BranchId } from "../state/types";
import { GLOBAL_SHIFT_BOUNDS } from "./onCallEconomyConfig";

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

// Phase 11 §6/§7 — the authoritative, user-provided 3-axis balance
// baseline (1.0-5.0 each). These are gameplay balance values, not a
// scientific/institutional rating of real working conditions (§7). NEVER
// a direct resource penalty (§9) — they only ever reach the player through
// the existing on-call system (onCallLoad), the new working-hours system
// (workingHours), and the event-weight modifier (hierarchyPressure), which
// then produce real fatigue/stress/burnout through the untouched Phase 9
// resource-pull model.
export interface BranchDifficultyBaseline {
  onCallLoad: number;
  workingHours: number;
  hierarchyPressure: number;
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
  // Phase 11 — present on all 26 branches (including the 3 pre-existing
  // ones). See getBranchOverallDifficulty for the derived UI number.
  difficultyBaseline: BranchDifficultyBaseline;
  // Phase 11 §30 — true only for the 3 branches whose residencyYears
  // predates this phase and was already trusted/verified (İç Hastalıkları,
  // Genel Cerrahi, Psikiyatri). Every branch added in Phase 11 uses an
  // explicit, documented NEUTRAL DEFAULT (see DEFAULT_UNVERIFIED_DURATION_YEARS
  // below) — this session could not reach a verifiable official Ek-1
  // çizelge source for the other 23 (WebFetch to osym.gov.tr/mevzuat
  // sources is blocked in this sandbox, see docs/program-data-sources.md),
  // and the explicit instruction was "tahmin etme... uydurma; raporla ve
  // nötr/default gameplay değerini kullan" rather than presenting an
  // unverified guess as fact. Spot-check against the real Ek-1 çizelge
  // before treating durationYears on a flagged branch as final.
  durationYearsVerified: boolean;
}

// Phase 11 — overall = onCallLoad*0.35 + workingHours*0.40 + hierarchyPressure*0.25
// (§8). Deliberately never stored — always derived from the three axes so
// there is exactly one source of truth.
export function getBranchOverallDifficulty(branch: BranchDefinition): number {
  const { onCallLoad, workingHours, hierarchyPressure } = branch.difficultyBaseline;
  return onCallLoad * 0.35 + workingHours * 0.4 + hierarchyPressure * 0.25;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// Phase 11 §14 — a smooth, testable mapping from the authoritative
// onCallLoad axis (1.0-5.0) onto a BranchOnCallProfile, reusing the exact
// same generateOnCallSchedule/GLOBAL_SHIFT_BOUNDS machinery every existing
// branch already goes through (no new on-call code path). Only used for
// the 23 branches added in this phase — the 3 pre-existing branches keep
// their Phase 10-tuned onCallProfile untouched (see the file-level note
// below). Anchored loosely against the §14 guide table (1.x -> 1-4/mo ...
// 5.x -> 8-12/mo); NOT a literal lookup, a linear interpolation, per the
// spec's explicit "literal lookup olmak zorunda bırakmıyorum".
export function deriveOnCallProfile(onCallLoad: number): BranchOnCallProfile {
  const t = (onCallLoad - 1) / 4; // 0..1
  const base = Math.round(2 + t * 7); // 1.0 -> 2, 5.0 -> 9
  const [globalMin, globalMax] = GLOBAL_SHIFT_BOUNDS;
  return {
    baseMonthlyShifts: base,
    minMonthlyShifts: Math.max(globalMin, base - 2),
    maxMonthlyShifts: Math.min(globalMax, base + 3),
    weekendBias: round2(0.25 + t * 0.2), // 1.0 -> 0.25, 5.0 -> 0.45
  };
}

// Phase 11 — a smooth mapping from the workingHours/hierarchyPressure axes
// onto the existing BranchWeeklyBaseline (fatiguePressure/stressPressure)
// shape, so a new branch's baseline weekly pressure flows through the
// exact same, untouched Phase 9 resource-pull model as every other branch.
// Only used for the 23 new branches — see the file-level note.
export function deriveWeeklyBaseline(workingHours: number, hierarchyPressure: number): BranchWeeklyBaseline {
  const wt = (workingHours - 1) / 4;
  const ht = (hierarchyPressure - 1) / 4;
  return {
    fatiguePressure: round1(2.0 + wt * 2.6), // 1.0 -> 2.0, 5.0 -> 4.6
    stressPressure: round1(1.8 + ht * 1.8), // 1.0 -> 1.8, 5.0 -> 3.6
  };
}

// Phase 11 — every branch added this phase whose real official Ek-1
// çizelge duration could not be verified in this session (see
// durationYearsVerified above). A single neutral default rather than 23
// separate guesses: 4 years is the median/most common duration across
// Turkish tıpta uzmanlık eğitimi and matches 2 of the 3 already-trusted
// legacy values (İç Hastalıkları, Psikiyatri), so it is a defensible
// gameplay default, not an arbitrary number — but it is NOT a claim about
// any specific branch's real official duration.
export const DEFAULT_UNVERIFIED_DURATION_YEARS = 4;

// NOTE on why the first 3 entries below are NOT derived via
// deriveWeeklyBaseline/deriveOnCallProfile even though they now also carry
// a difficultyBaseline: Phase 10 hand-tuned their weeklyBaseline/
// onCallProfile against a 1000-seed headless sim (see the inline comments
// on genel_cerrahi/psikiyatri below) and those values do not correlate
// cleanly with the NEW authoritative axes (e.g. genel_cerrahi has the
// HIGHEST workingHours=5.0 in the new table, yet its old fatiguePressure
// tuning is lower than a naive linear mapping would produce). Re-deriving
// them would silently re-litigate Phase 10's validated balance. Instead
// this phase adds difficultyBaseline to all 26 for a consistent on-call/
// event-weight/working-hours integration, while leaving these 3 branches'
// own weeklyBaseline/onCallProfile numbers exactly as Phase 10 left them.
export const BRANCH_DEFINITIONS: BranchDefinition[] = [
  {
    id: "ic_hastaliklari",
    name: "İç Hastalıkları",
    residencyYears: 4,
    description: "Poliklinik, konsültasyon ve uzun takip dosyalarının branşı.",
    weeklyBaseline: { fatiguePressure: 4, stressPressure: 3 },
    onCallProfile: { baseMonthlyShifts: 6, minMonthlyShifts: 4, maxMonthlyShifts: 9, weekendBias: 0.35 },
    difficultyBaseline: { onCallLoad: 4.2, workingHours: 4.3, hierarchyPressure: 3.7 },
    durationYearsVerified: true,
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
    difficultyBaseline: { onCallLoad: 4.8, workingHours: 5.0, hierarchyPressure: 4.7 },
    durationYearsVerified: true,
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
    // Official branch name is "Ruh Sağlığı ve Hastalıkları" — the id/name
    // here predate Phase 11 and are kept as-is for backward compatibility
    // (existing saves/content reference branchId "psikiyatri" throughout);
    // the Phase 11 authoritative table's "Ruh Sağlığı ve Hastalıkları" row
    // is the one used for this branch's difficultyBaseline.
    difficultyBaseline: { onCallLoad: 2.6, workingHours: 2.8, hierarchyPressure: 2.6 },
    durationYearsVerified: true,
  },
  {
    id: "acil_tip",
    name: "Acil Tıp",
    residencyYears: DEFAULT_UNVERIFIED_DURATION_YEARS,
    description: "Kesintisiz akış, hızlı karar ve triyaj temposunun branşı.",
    weeklyBaseline: deriveWeeklyBaseline(4.2, 3.5),
    onCallProfile: deriveOnCallProfile(4.8),
    difficultyBaseline: { onCallLoad: 4.8, workingHours: 4.2, hierarchyPressure: 3.5 },
    durationYearsVerified: false,
  },
  {
    id: "aile_hekimligi",
    name: "Aile Hekimliği",
    residencyYears: DEFAULT_UNVERIFIED_DURATION_YEARS,
    description: "Birinci basamak, geniş yaş yelpazesi ve düzenli poliklinik akışı.",
    weeklyBaseline: deriveWeeklyBaseline(2.1, 2.1),
    onCallProfile: deriveOnCallProfile(1.7),
    difficultyBaseline: { onCallLoad: 1.7, workingHours: 2.1, hierarchyPressure: 2.1 },
    durationYearsVerified: false,
  },
  {
    id: "anesteziyoloji_ve_reanimasyon",
    name: "Anesteziyoloji ve Reanimasyon",
    residencyYears: DEFAULT_UNVERIFIED_DURATION_YEARS,
    description: "Ameliyathane, yoğun bakım ve saniyelerin önemli olduğu branş.",
    weeklyBaseline: deriveWeeklyBaseline(4.3, 3.6),
    onCallProfile: deriveOnCallProfile(4.5),
    difficultyBaseline: { onCallLoad: 4.5, workingHours: 4.3, hierarchyPressure: 3.6 },
    durationYearsVerified: false,
  },
  {
    id: "beyin_ve_sinir_cerrahisi",
    name: "Beyin ve Sinir Cerrahisi",
    residencyYears: DEFAULT_UNVERIFIED_DURATION_YEARS,
    description: "En uzun ameliyatlar ve en yoğun nöbet temposundan biri.",
    weeklyBaseline: deriveWeeklyBaseline(5.0, 4.8),
    onCallProfile: deriveOnCallProfile(5.0),
    difficultyBaseline: { onCallLoad: 5.0, workingHours: 5.0, hierarchyPressure: 4.8 },
    durationYearsVerified: false,
  },
  {
    id: "cocuk_cerrahisi",
    name: "Çocuk Cerrahisi",
    residencyYears: DEFAULT_UNVERIFIED_DURATION_YEARS,
    description: "Pediatrik cerrahi hassasiyeti ve ağır nöbet yükü.",
    weeklyBaseline: deriveWeeklyBaseline(4.9, 4.6),
    onCallProfile: deriveOnCallProfile(4.8),
    difficultyBaseline: { onCallLoad: 4.8, workingHours: 4.9, hierarchyPressure: 4.6 },
    durationYearsVerified: false,
  },
  {
    id: "cocuk_sagligi_ve_hastaliklari",
    name: "Çocuk Sağlığı ve Hastalıkları",
    residencyYears: DEFAULT_UNVERIFIED_DURATION_YEARS,
    description: "Poliklinik ve servis dengesi, aile iletişiminin öne çıktığı branş.",
    weeklyBaseline: deriveWeeklyBaseline(4.3, 3.7),
    onCallProfile: deriveOnCallProfile(4.5),
    difficultyBaseline: { onCallLoad: 4.5, workingHours: 4.3, hierarchyPressure: 3.7 },
    durationYearsVerified: false,
  },
  {
    id: "cocuk_ve_ergen_ruh_sagligi",
    name: "Çocuk ve Ergen Ruh Sağlığı ve Hastalıkları",
    residencyYears: DEFAULT_UNVERIFIED_DURATION_YEARS,
    description: "Görüşme temposu daha yavaş, aile/okul koordinasyonu yoğun.",
    weeklyBaseline: deriveWeeklyBaseline(2.7, 2.6),
    onCallProfile: deriveOnCallProfile(2.2),
    difficultyBaseline: { onCallLoad: 2.2, workingHours: 2.7, hierarchyPressure: 2.6 },
    durationYearsVerified: false,
  },
  {
    id: "deri_ve_zuhrevi_hastaliklari",
    name: "Deri ve Zührevi Hastalıkları",
    residencyYears: DEFAULT_UNVERIFIED_DURATION_YEARS,
    description: "Ağırlıklı poliklinik temposu, düşük nöbet yükü.",
    weeklyBaseline: deriveWeeklyBaseline(2.3, 2.5),
    onCallProfile: deriveOnCallProfile(1.5),
    difficultyBaseline: { onCallLoad: 1.5, workingHours: 2.3, hierarchyPressure: 2.5 },
    durationYearsVerified: false,
  },
  {
    id: "enfeksiyon_hastaliklari",
    name: "Enfeksiyon Hastalıkları ve Klinik Mikrobiyolojisi",
    residencyYears: DEFAULT_UNVERIFIED_DURATION_YEARS,
    description: "Konsültasyon ağırlıklı, laboratuvar/klinik koordinasyonu yoğun.",
    weeklyBaseline: deriveWeeklyBaseline(3.6, 3.1),
    onCallProfile: deriveOnCallProfile(3.5),
    difficultyBaseline: { onCallLoad: 3.5, workingHours: 3.6, hierarchyPressure: 3.1 },
    durationYearsVerified: false,
  },
  {
    id: "fiziksel_tip_ve_rehabilitasyon",
    name: "Fiziksel Tıp ve Rehabilitasyon",
    residencyYears: DEFAULT_UNVERIFIED_DURATION_YEARS,
    description: "Uzun soluklu rehabilitasyon takibi, düşük nöbet yükü.",
    weeklyBaseline: deriveWeeklyBaseline(2.6, 2.5),
    onCallProfile: deriveOnCallProfile(2.0),
    difficultyBaseline: { onCallLoad: 2.0, workingHours: 2.6, hierarchyPressure: 2.5 },
    durationYearsVerified: false,
  },
  {
    id: "gogus_cerrahisi",
    name: "Göğüs Cerrahisi",
    residencyYears: DEFAULT_UNVERIFIED_DURATION_YEARS,
    description: "Toraks cerrahisi temposu ve yoğun nöbet yükü.",
    weeklyBaseline: deriveWeeklyBaseline(4.8, 4.4),
    onCallProfile: deriveOnCallProfile(4.5),
    difficultyBaseline: { onCallLoad: 4.5, workingHours: 4.8, hierarchyPressure: 4.4 },
    durationYearsVerified: false,
  },
  {
    id: "gogus_hastaliklari",
    name: "Göğüs Hastalıkları",
    residencyYears: DEFAULT_UNVERIFIED_DURATION_YEARS,
    description: "Servis ve poliklinik dengesi, orta düzey nöbet yükü.",
    weeklyBaseline: deriveWeeklyBaseline(3.7, 3.2),
    onCallProfile: deriveOnCallProfile(3.7),
    difficultyBaseline: { onCallLoad: 3.7, workingHours: 3.7, hierarchyPressure: 3.2 },
    durationYearsVerified: false,
  },
  {
    id: "goz_hastaliklari",
    name: "Göz Hastalıkları",
    residencyYears: DEFAULT_UNVERIFIED_DURATION_YEARS,
    description: "Ameliyathane + poliklinik dengesi, düşük-orta nöbet yükü.",
    weeklyBaseline: deriveWeeklyBaseline(3.6, 3.3),
    onCallProfile: deriveOnCallProfile(2.8),
    difficultyBaseline: { onCallLoad: 2.8, workingHours: 3.6, hierarchyPressure: 3.3 },
    durationYearsVerified: false,
  },
  {
    id: "kadin_dogum",
    name: "Kadın Hastalıkları ve Doğum",
    residencyYears: DEFAULT_UNVERIFIED_DURATION_YEARS,
    description: "Doğumhane temposu, öngörülemeyen nöbet çağrıları.",
    weeklyBaseline: deriveWeeklyBaseline(4.8, 4.3),
    onCallProfile: deriveOnCallProfile(4.8),
    difficultyBaseline: { onCallLoad: 4.8, workingHours: 4.8, hierarchyPressure: 4.3 },
    durationYearsVerified: false,
  },
  {
    id: "kalp_ve_damar_cerrahisi",
    name: "Kalp ve Damar Cerrahisi",
    residencyYears: DEFAULT_UNVERIFIED_DURATION_YEARS,
    description: "Açık kalp ameliyatları temposu, çok yüksek nöbet yükü.",
    weeklyBaseline: deriveWeeklyBaseline(5.0, 4.6),
    onCallProfile: deriveOnCallProfile(4.9),
    difficultyBaseline: { onCallLoad: 4.9, workingHours: 5.0, hierarchyPressure: 4.6 },
    durationYearsVerified: false,
  },
  {
    id: "kardiyoloji",
    name: "Kardiyoloji",
    residencyYears: DEFAULT_UNVERIFIED_DURATION_YEARS,
    description: "Kateter laboratuvarı ve koroner yoğun bakım temposu.",
    weeklyBaseline: deriveWeeklyBaseline(4.3, 3.6),
    onCallProfile: deriveOnCallProfile(4.3),
    difficultyBaseline: { onCallLoad: 4.3, workingHours: 4.3, hierarchyPressure: 3.6 },
    durationYearsVerified: false,
  },
  {
    id: "kbb",
    name: "Kulak Burun Boğaz Hastalıkları",
    residencyYears: DEFAULT_UNVERIFIED_DURATION_YEARS,
    description: "Ameliyathane + poliklinik dengesi, orta nöbet yükü.",
    weeklyBaseline: deriveWeeklyBaseline(4.0, 3.7),
    onCallProfile: deriveOnCallProfile(3.5),
    difficultyBaseline: { onCallLoad: 3.5, workingHours: 4.0, hierarchyPressure: 3.7 },
    durationYearsVerified: false,
  },
  {
    id: "noroloji",
    name: "Nöroloji",
    residencyYears: DEFAULT_UNVERIFIED_DURATION_YEARS,
    description: "Servis + poliklinik + elektrofizyoloji dengesi.",
    weeklyBaseline: deriveWeeklyBaseline(3.8, 3.3),
    onCallProfile: deriveOnCallProfile(3.8),
    difficultyBaseline: { onCallLoad: 3.8, workingHours: 3.8, hierarchyPressure: 3.3 },
    durationYearsVerified: false,
  },
  {
    id: "nukleer_tip",
    name: "Nükleer Tıp",
    residencyYears: DEFAULT_UNVERIFIED_DURATION_YEARS,
    description: "Görüntüleme temposu, düşük nöbet yükü.",
    weeklyBaseline: deriveWeeklyBaseline(2.5, 2.5),
    onCallProfile: deriveOnCallProfile(1.8),
    difficultyBaseline: { onCallLoad: 1.8, workingHours: 2.5, hierarchyPressure: 2.5 },
    durationYearsVerified: false,
  },
  {
    id: "ortopedi_ve_travmatoloji",
    name: "Ortopedi ve Travmatoloji",
    residencyYears: DEFAULT_UNVERIFIED_DURATION_YEARS,
    description: "Travma nöbetleri ve ameliyathane temposunun branşı.",
    weeklyBaseline: deriveWeeklyBaseline(4.7, 4.3),
    onCallProfile: deriveOnCallProfile(4.5),
    difficultyBaseline: { onCallLoad: 4.5, workingHours: 4.7, hierarchyPressure: 4.3 },
    durationYearsVerified: false,
  },
  {
    id: "plastik_cerrahi",
    name: "Plastik, Rekonstrüktif ve Estetik Cerrahi",
    residencyYears: DEFAULT_UNVERIFIED_DURATION_YEARS,
    description: "Rekonstrüktif + estetik denge, uzun ameliyat temposu.",
    weeklyBaseline: deriveWeeklyBaseline(4.2, 3.7),
    onCallProfile: deriveOnCallProfile(3.4),
    difficultyBaseline: { onCallLoad: 3.4, workingHours: 4.2, hierarchyPressure: 3.7 },
    durationYearsVerified: false,
  },
  {
    id: "radyoloji",
    name: "Radyoloji",
    residencyYears: DEFAULT_UNVERIFIED_DURATION_YEARS,
    description: "Görüntüleme raporlama temposu, orta-düşük nöbet yükü.",
    weeklyBaseline: deriveWeeklyBaseline(3.5, 3.1),
    onCallProfile: deriveOnCallProfile(3.0),
    difficultyBaseline: { onCallLoad: 3.0, workingHours: 3.5, hierarchyPressure: 3.1 },
    durationYearsVerified: false,
  },
  {
    id: "uroloji",
    name: "Üroloji",
    residencyYears: DEFAULT_UNVERIFIED_DURATION_YEARS,
    description: "Ameliyathane + poliklinik + nöbet dengesi.",
    weeklyBaseline: deriveWeeklyBaseline(4.4, 4.0),
    onCallProfile: deriveOnCallProfile(4.0),
    difficultyBaseline: { onCallLoad: 4.0, workingHours: 4.4, hierarchyPressure: 4.0 },
    durationYearsVerified: false,
  },
];

export function getBranchDefinition(id: BranchId): BranchDefinition {
  const def = BRANCH_DEFINITIONS.find((b) => b.id === id);
  if (!def) {
    throw new Error(`Unknown branch id: ${id}`);
  }
  return def;
}
