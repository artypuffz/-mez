// Gameplay Expansion Part C §22/§23 — a layered, composable avatar model.
// Every field is a SEMANTIC ID, never a filename/path — the renderer
// (components/avatar) is the only place an ID gets resolved to an actual
// visual (color, shape, path). An unknown/future ID always falls back
// safely (see resolveAvatarOption in ./options) rather than throwing, so a
// save from a build with more options never breaks on an older build.
//
// The SAME shape is reused for NPCs (see ./npcAvatar.ts) — one renderer,
// one option catalog, per §32.

export type SkinTone = "tone_01" | "tone_02" | "tone_03" | "tone_04" | "tone_05" | "tone_06";

export type FaceShape = "oval" | "round" | "square" | "heart";

export type HairStyle =
  | "bald"
  | "buzz"
  | "short_side_part"
  | "short_swept"
  | "short_curly"
  | "medium_straight"
  | "medium_wavy"
  | "medium_center_part"
  | "long_straight"
  | "long_wavy"
  | "ponytail"
  | "bun";

export type HairColor =
  | "black"
  | "dark_brown"
  | "brown"
  | "auburn"
  | "blonde"
  | "gray"
  | "white";

export type EyebrowStyle = "straight" | "arched" | "thick" | "thin";

export type EyeStyle = "round" | "almond" | "narrow" | "wide";

export type FacialHair = "none" | "stubble" | "mustache" | "goatee" | "full_beard";

export type Glasses = "none" | "round" | "square" | "rimless";

export type AvatarDetail = "none" | "freckles" | "beauty_mark" | "earrings";

// §24 — persisted on GameState.character.avatar (player) and derived
// on-the-fly for NPCs (see ./npcAvatar.ts) from the exact same shape.
export interface PlayerAvatar {
  skinTone: SkinTone;
  faceShape: FaceShape;
  hairStyle: HairStyle;
  hairColor: HairColor;
  eyebrowStyle: EyebrowStyle;
  eyeStyle: EyeStyle;
  facialHair: FacialHair;
  glasses: Glasses;
  detail: AvatarDetail;
}

// §30 — contextual outfit, layered ON TOP of the physical identity above;
// never changes skin/face/hair. Resolved by ./outfitResolver.ts from real
// career state, never chosen by content/UI directly.
export type OutfitContext = "casual" | "white_coat" | "scrubs" | "surgical" | "specialist";

// §31 — state-driven expression, resolved centrally by
// ./expressionResolver.ts from resource thresholds. Never stored (always
// recomputed from current resources), and never alters skinTone/faceShape/
// hairStyle/etc — only the mouth/eye rendering in the SAME renderer.
export type ExpressionState = "normal" | "tired" | "stressed" | "exhausted" | "burned_out" | "unhealthy";
