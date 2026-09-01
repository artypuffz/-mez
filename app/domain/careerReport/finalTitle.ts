import type { GameState } from "../state/types";
import type { CycleOutcome } from "./behaviorProfile";

// Phase 10 §14 — every candidate is gated on a REAL tracked counter, never
// assigned at random. Checked in priority order; the first match wins,
// "Hayatta Kalan" is the always-available fallback so every career gets
// a title.
export function selectFinalTitle(state: GameState, cycleOutcome: CycleOutcome): string {
  const extraShifts = state.statistics["oncall_lifetime_extra_shifts"] ?? 0;
  const loyalty = state.behaviorStats["colleague:loyal"] ?? 0;
  if (extraShifts >= 6 && loyalty >= 2) return "Her Nöbeti Değiştiren İnsan";

  const bureaucracyEvents = state.eventHistory.filter((e) => e.eventId.startsWith("bur_")).length;
  if (bureaucracyEvents >= 5) return "Form 17-B Uzmanı";

  const protective = state.behaviorStats["hierarchy:protective"] ?? 0;
  if (cycleOutcome === "broke_cycle" && protective >= 3) return "Servisin Sessiz Diplomatı";

  const complaints = state.statistics["career_complaints_filed"] ?? 0;
  if (complaints >= 1 && (state.statistics["crisis:career"] ?? 0) >= 1) return "Şikayet Dilekçesi Ustası";

  return "Hayatta Kalan";
}
