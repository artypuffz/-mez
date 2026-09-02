import type { SeededRng } from "../rng/seededRng";
import {
  EYEBROW_STYLE_OPTIONS,
  EYE_STYLE_OPTIONS,
  FACE_SHAPE_OPTIONS,
  FACIAL_HAIR_OPTIONS,
  GLASSES_OPTIONS,
  HAIR_COLOR_OPTIONS,
  HAIR_STYLE_OPTIONS,
  DETAIL_OPTIONS,
  SKIN_TONE_OPTIONS,
} from "./options";
import type { PlayerAvatar } from "./types";

// §26/§27/§28 — every category picked uniformly from its full catalog, no
// gender-based filtering anywhere (the renderer already "technically
// supports arbitrary combinations" simply by never branching on gender).
// Pure function of the rng passed in — callers control determinism by
// controlling the rng's scope (see createScopedRng call sites).
export function randomizePlayerAvatar(rng: SeededRng): PlayerAvatar {
  return {
    skinTone: rng.pick(SKIN_TONE_OPTIONS).id,
    faceShape: rng.pick(FACE_SHAPE_OPTIONS).id,
    hairStyle: rng.pick(HAIR_STYLE_OPTIONS).id,
    hairColor: rng.pick(HAIR_COLOR_OPTIONS).id,
    eyebrowStyle: rng.pick(EYEBROW_STYLE_OPTIONS).id,
    eyeStyle: rng.pick(EYE_STYLE_OPTIONS).id,
    facialHair: rng.pick(FACIAL_HAIR_OPTIONS).id,
    glasses: rng.pick(GLASSES_OPTIONS).id,
    detail: rng.pick(DETAIL_OPTIONS).id,
  };
}
