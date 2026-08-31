import type { TusPrepProfileId } from "../state/types";

export interface TusPrepProfileDefinition {
  id: TusPrepProfileId;
  title: string;
  description: string;
  // Added to the TUS score's internal base — decision, not RNG, so this
  // deliberately outweighs the bounded RNG contribution (see computeTusScore).
  baseModifier: number;
  flags: Record<string, boolean | number | string>;
}

export const TUS_PREP_PROFILE_DEFINITIONS: TusPrepProfileDefinition[] = [
  {
    id: "duzenli",
    title: "Düzenli çalıştım",
    description: "Son 6 ay disiplinli çalıştım.",
    baseModifier: 8,
    flags: { tus_prep_disciplined: true },
  },
  {
    id: "internlukle",
    title: "İntörnlükle birlikte götürdüm",
    description: "Boş bulduğum her zamanda çalıştım.",
    baseModifier: 3,
    flags: { tus_prep_balanced: true },
  },
  {
    id: "son_uc_ay",
    title: "Son üç ay yüklendim",
    description: "Geç başladım ama yoğun çalıştım.",
    baseModifier: 0,
    flags: { tus_prep_late_push: true },
  },
  {
    id: "son_ay_panik",
    title: "Son ay panikledim",
    description: "Son haftalarda ciddi şekilde yüklenmeye başladım.",
    baseModifier: -4,
    flags: { tus_prep_panicked: true },
  },
  {
    id: "temelime_guveniyorum",
    title: "Temelime güveniyorum",
    description: "Planlı bir hazırlık yapmadım.",
    baseModifier: -2,
    flags: { tus_prep_winged_it: true },
  },
];

export function getTusPrepProfile(id: TusPrepProfileId): TusPrepProfileDefinition {
  const def = TUS_PREP_PROFILE_DEFINITIONS.find((p) => p.id === id);
  if (!def) {
    throw new Error(`Unknown TUS prep profile id: ${id}`);
  }
  return def;
}
