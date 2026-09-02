import type {
  AvatarDetail,
  EyeStyle,
  EyebrowStyle,
  FaceShape,
  FacialHair,
  Glasses,
  HairColor,
  HairStyle,
  PlayerAvatar,
  SkinTone,
} from "./types";

export interface AvatarOption<T extends string> {
  id: T;
  label: string;
  // Only skin tones and hair colors need an actual paint color — every
  // other category is a pure shape, colored by skin/hair already.
  hex?: string;
}

// §26 — 6 skin tones, a small deliberately-desaturated flat-illustration
// ramp (not a literal photographic skin-tone scale).
export const SKIN_TONE_OPTIONS: AvatarOption<SkinTone>[] = [
  { id: "tone_01", label: "Ton 1", hex: "#ffe0bd" },
  { id: "tone_02", label: "Ton 2", hex: "#f1c27d" },
  { id: "tone_03", label: "Ton 3", hex: "#e0ac69" },
  { id: "tone_04", label: "Ton 4", hex: "#c68642" },
  { id: "tone_05", label: "Ton 5", hex: "#8d5524" },
  { id: "tone_06", label: "Ton 6", hex: "#5c3a21" },
];

export const FACE_SHAPE_OPTIONS: AvatarOption<FaceShape>[] = [
  { id: "oval", label: "Oval" },
  { id: "round", label: "Yuvarlak" },
  { id: "square", label: "Köşeli" },
  { id: "heart", label: "Kalp" },
];

export const HAIR_STYLE_OPTIONS: AvatarOption<HairStyle>[] = [
  { id: "bald", label: "Dazlak" },
  { id: "buzz", label: "Asker Tıraşı" },
  { id: "short_side_part", label: "Kısa, Yandan Ayrık" },
  { id: "short_swept", label: "Kısa, Taranmış" },
  { id: "short_curly", label: "Kısa Kıvırcık" },
  { id: "medium_straight", label: "Orta Boy Düz" },
  { id: "medium_wavy", label: "Orta Boy Dalgalı" },
  { id: "medium_center_part", label: "Orta Boy, Ortadan Ayrık" },
  { id: "long_straight", label: "Uzun Düz" },
  { id: "long_wavy", label: "Uzun Dalgalı" },
  { id: "ponytail", label: "At Kuyruğu" },
  { id: "bun", label: "Topuz" },
];

export const HAIR_COLOR_OPTIONS: AvatarOption<HairColor>[] = [
  { id: "black", label: "Siyah", hex: "#1c1a17" },
  { id: "dark_brown", label: "Koyu Kahve", hex: "#3b2620" },
  { id: "brown", label: "Kahverengi", hex: "#6b4226" },
  { id: "auburn", label: "Kestane", hex: "#8a3b25" },
  { id: "blonde", label: "Sarışın", hex: "#d9b45e" },
  { id: "gray", label: "Gri", hex: "#9a9a9a" },
  { id: "white", label: "Beyaz", hex: "#e8e8e8" },
];

export const EYEBROW_STYLE_OPTIONS: AvatarOption<EyebrowStyle>[] = [
  { id: "straight", label: "Düz" },
  { id: "arched", label: "Kemerli" },
  { id: "thick", label: "Kalın" },
  { id: "thin", label: "İnce" },
];

export const EYE_STYLE_OPTIONS: AvatarOption<EyeStyle>[] = [
  { id: "round", label: "Yuvarlak" },
  { id: "almond", label: "Badem" },
  { id: "narrow", label: "Çekik" },
  { id: "wide", label: "İri" },
];

export const FACIAL_HAIR_OPTIONS: AvatarOption<FacialHair>[] = [
  { id: "none", label: "Yok" },
  { id: "stubble", label: "Hafif Sakal" },
  { id: "mustache", label: "Bıyık" },
  { id: "goatee", label: "Keçi Sakalı" },
  { id: "full_beard", label: "Tam Sakal" },
];

export const GLASSES_OPTIONS: AvatarOption<Glasses>[] = [
  { id: "none", label: "Yok" },
  { id: "round", label: "Yuvarlak" },
  { id: "square", label: "Dikdörtgen" },
  { id: "rimless", label: "Çerçevesiz" },
];

export const DETAIL_OPTIONS: AvatarOption<AvatarDetail>[] = [
  { id: "none", label: "Yok" },
  { id: "freckles", label: "Çil" },
  { id: "beauty_mark", label: "Ben" },
  { id: "earrings", label: "Küpe" },
];

// §23 — a save (or an authored NPC override) that names an ID this build
// no longer knows about must never crash the renderer; it silently
// resolves to the catalog's first entry instead.
export function resolveAvatarOption<T extends string>(options: AvatarOption<T>[], id: T | undefined): AvatarOption<T> {
  return options.find((o) => o.id === id) ?? options[0];
}

export const DEFAULT_PLAYER_AVATAR: PlayerAvatar = {
  skinTone: "tone_02",
  faceShape: "oval",
  hairStyle: "short_side_part",
  hairColor: "black",
  eyebrowStyle: "straight",
  eyeStyle: "almond",
  facialHair: "none",
  glasses: "none",
  detail: "none",
};
