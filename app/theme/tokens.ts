// Gameplay Expansion Part D section 36 — the ONE place a color/spacing/
// typography value is defined. Every screen imports from here instead of
// scattering hex literals; a future palette change (or a real light-theme
// pass, out of scope this phase) only ever touches this file.
//
// Dark navy/charcoal foundation (section 37) — deliberately not pure
// black, with elevation expressed as distinct surface tones rather than
// shadows (RN shadow support is inconsistent across platforms/web).

export const colors = {
  bgBase: "#0a0f1c",
  bgElevated: "#101828",
  surfaceCard: "#151f34",
  surfaceCardAlt: "#1c2843",
  border: "#263353",
  borderStrong: "#334467",

  textPrimary: "#eef2fb",
  textSecondary: "#9aa8c7",
  textMuted: "#6b7896",
  textOnAccent: "#0a0f1c",

  // Restrained vivid accent (section 38) — used for selected nav, primary
  // actions, important progress. Everything else stays low-saturation.
  accent: "#4f8cff",
  accentMuted: "#28406e",
  accentAlt: "#8a6bff",

  success: "#33c48a",
  successMuted: "#1c3a30",
  warning: "#e0a83e",
  warningMuted: "#3a301c",
  danger: "#e05a63",
  dangerMuted: "#3a1f22",
  info: "#4fb8e0",
  infoMuted: "#1c333a",

  // Section 12 — semantic per-resource colors. Never the ONLY signal (a
  // numeric label is always shown alongside), just a reinforcing cue.
  resourceStress: "#e0a83e",
  resourceFatigue: "#e08a3e",
  resourceBurnout: "#e05a63",
  resourceHealth: "#33c48a",
  resourceSocial: "#8a6bff",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

// Section 41 — a small, deliberate hierarchy. No system-font dependency
// beyond RN's own default, per the "no large external font dependency
// unless justified" rule.
export const typography = {
  screenTitle: { fontSize: 22, fontWeight: "700" as const, color: colors.textPrimary },
  sectionHeading: { fontSize: 14, fontWeight: "700" as const, color: colors.textSecondary, letterSpacing: 0.4 },
  cardTitle: { fontSize: 15, fontWeight: "700" as const, color: colors.textPrimary },
  body: { fontSize: 13, fontWeight: "400" as const, color: colors.textPrimary },
  bodySecondary: { fontSize: 13, fontWeight: "400" as const, color: colors.textSecondary },
  metadata: { fontSize: 11, fontWeight: "500" as const, color: colors.textMuted },
  numericEmphasis: { fontSize: 22, fontWeight: "700" as const, color: colors.textPrimary },
} as const;

export const touchTarget = {
  minHeight: 44,
  minWidth: 44,
} as const;
