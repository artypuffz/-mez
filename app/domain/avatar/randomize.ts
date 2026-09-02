import type { SeededRng } from "../rng/seededRng";
import type { Gender } from "../state/types";
import {
  EYE_STYLE_OPTIONS,
  FACE_SHAPE_OPTIONS,
  GLASSES_OPTIONS,
  HAIR_COLOR_OPTIONS,
  DETAIL_OPTIONS,
  SKIN_TONE_OPTIONS,
} from "./options";
import { eyebrowStyleWeights, facialHairCandidates, hairStyleWeights, resolveGenderPresentation } from "./genderAwareGeneration";
import { weightedPick } from "./weightedPick";
import type { PlayerAvatar } from "./types";

// Android Device QA Hotfix 1, Issue 1 — automatic generation (initial
// default AND the Randomize button) must be gender-aware, using the
// character's actual stored Gender — never inferred from anything else.
// skinTone/hairColor/faceShape/eyeStyle/glasses/detail stay uniform: none
// of them are a meaningful gender-presentation signal in this flat-
// illustration system, and weighting them would be exactly the "absurdly
// rigid stereotype" the hotfix brief warns against. hairStyle/facialHair/
// eyebrowStyle are the three fields that actually carry that signal — see
// genderAwareGeneration.ts for the weighting/filtering rules themselves.
export function randomizePlayerAvatar(rng: SeededRng, gender: Gender): PlayerAvatar {
  const presentation = resolveGenderPresentation(gender);
  return {
    skinTone: rng.pick(SKIN_TONE_OPTIONS).id,
    faceShape: rng.pick(FACE_SHAPE_OPTIONS).id,
    hairStyle: weightedPick(rng, hairStyleWeights(presentation)),
    hairColor: rng.pick(HAIR_COLOR_OPTIONS).id,
    eyebrowStyle: weightedPick(rng, eyebrowStyleWeights(presentation)),
    eyeStyle: rng.pick(EYE_STYLE_OPTIONS).id,
    facialHair: rng.pick(facialHairCandidates(presentation)).id,
    glasses: rng.pick(GLASSES_OPTIONS).id,
    detail: rng.pick(DETAIL_OPTIONS).id,
  };
}
