import type { BackgroundId } from "../state/types";

export interface BackgroundDefinition {
  id: BackgroundId;
  label: string;
  shortDescription: string;
  resourceModifiers: Partial<{
    stress: number;
    fatigue: number;
    burnout: number;
    money: number;
  }>;
  flags: Record<string, boolean | number | string>;
}

// Data-driven per the design bible (madde 2): each background nudges
// starting resources and leaves flags that later event weighting reads —
// not implemented here, just recorded for Phase 5+ to pick up.
export const BACKGROUND_DEFINITIONS: BackgroundDefinition[] = [
  {
    id: "aile_yaninda",
    label: "Aile Yanında Yaşıyor",
    shortDescription:
      "Kira gideri düşük ya da yok, ama aile kaynaklı olayların ihtimali artıyor.",
    resourceModifiers: { money: 8000 },
    flags: { lives_with_family: true },
  },
  {
    id: "baska_sehirden",
    label: "Başka Şehirden Geldi",
    shortDescription:
      "Kira ödüyorsun; şehir değiştirme ve yalnızlık olayları daha sık.",
    resourceModifiers: { money: -4000, stress: 5 },
    flags: { relocated: true },
  },
  {
    id: "ekonomik_rahat",
    label: "Ekonomik Olarak Rahat Aile",
    shortDescription: "Başlangıç para rezervin yüksek.",
    resourceModifiers: { money: 20000 },
    flags: { financially_comfortable: true },
  },
  {
    id: "kendi_basina",
    label: "Kendi Başına Geçinen",
    shortDescription:
      "Ekonomik baskı daha yüksek, ama kimseye hesap vermiyorsun.",
    resourceModifiers: { money: -2000, stress: 3 },
    flags: { self_sufficient: true },
  },
];

export function getBackgroundDefinition(id: BackgroundId): BackgroundDefinition {
  const def = BACKGROUND_DEFINITIONS.find((b) => b.id === id);
  if (!def) {
    throw new Error(`Unknown background id: ${id}`);
  }
  return def;
}
