// Android Device QA Hotfix 1, Issue 1 — automatically generated/default
// avatars (player initial generation, player Randomize, procedural NPC
// generation, and generated defaults for authored NPCs with no explicit
// override) must be gender-aware, using the character/NPC's ACTUAL stored
// Gender field — never inferred from name, personality, role, relationship,
// specialty, hospital, or appearance.
//
// This is deliberately a WEIGHTING layer, not a hard restriction on the
// underlying option catalogs (domain/avatar/options.ts) or the renderer:
// manual customization in Character Creation's Görünüş step calls
// setAvatarField directly and never goes through this module, so a player
// can still freely combine any option with any gender by hand — nothing
// here "destroys the flexibility of the underlying renderer" (per the
// hotfix brief). Only the AUTOMATIC draw is biased.
//
// Facial hair is the one field with a hard filter rather than a soft
// weight for a feminine-leaning presentation (see facialHairCandidates) —
// the hotfix brief calls this out explicitly ("must not randomly assign
// beard/moustache options to characters for whom that presentation is
// inappropriate"), and a soft weight was judged not restrained enough
// given how visually jarring a mismatched beard reads at a glance.
import type { Gender } from "../state/types";
import { EYEBROW_STYLE_OPTIONS, FACIAL_HAIR_OPTIONS, HAIR_STYLE_OPTIONS, type AvatarOption } from "./options";
import type { EyebrowStyle, FacialHair, HairStyle } from "./types";
import type { WeightedOption } from "./weightedPick";

export type GenderPresentation = "feminine_leaning" | "masculine_leaning" | "neutral";

// "belirtmek_istemiyorum" (prefer not to say) is a REAL, deliberately
// declared value of the same authoritative Gender field — not a missing
// signal to guess around. It maps to "neutral" (the pre-hotfix uniform
// behavior), which is the only presentation-honest choice for it.
export function resolveGenderPresentation(gender: Gender): GenderPresentation {
  if (gender === "kadın") return "feminine_leaning";
  if (gender === "erkek") return "masculine_leaning";
  return "neutral";
}

// Deliberately modest categorization — not every style is claimed by a
// presentation; short_curly and similar stay neutral-weighted for
// everyone, avoiding an absurdly rigid "every hairstyle has a gender" rule.
const FEMININE_LEANING_HAIR = new Set<HairStyle>([
  "medium_straight", "medium_wavy", "medium_center_part", "long_straight", "long_wavy", "ponytail", "bun",
]);
const MASCULINE_LEANING_HAIR = new Set<HairStyle>(["bald", "buzz", "short_side_part", "short_swept"]);

// A trend (3x more likely), never a guarantee — the off-presentation
// styles stay reachable (0.4x), just uncommon in auto-generated defaults.
export function hairStyleWeights(presentation: GenderPresentation): WeightedOption<HairStyle>[] {
  return HAIR_STYLE_OPTIONS.map((opt) => {
    if (presentation === "neutral") return { id: opt.id, weight: 1 };
    const isFeminineLeaning = FEMININE_LEANING_HAIR.has(opt.id);
    const isMasculineLeaning = MASCULINE_LEANING_HAIR.has(opt.id);
    const matchesPresentation = presentation === "feminine_leaning" ? isFeminineLeaning : isMasculineLeaning;
    const conflictsWithPresentation = presentation === "feminine_leaning" ? isMasculineLeaning : isFeminineLeaning;
    if (matchesPresentation) return { id: opt.id, weight: 3 };
    if (conflictsWithPresentation) return { id: opt.id, weight: 0.4 };
    return { id: opt.id, weight: 1 };
  });
}

const FEMININE_LEANING_EYEBROW = new Set<EyebrowStyle>(["arched", "thin"]);
const MASCULINE_LEANING_EYEBROW = new Set<EyebrowStyle>(["thick", "straight"]);

// A mild nudge only (2x, never exclusionary) — eyebrow shape is a weak
// presentation signal, so this stays far short of a "rule".
export function eyebrowStyleWeights(presentation: GenderPresentation): WeightedOption<EyebrowStyle>[] {
  return EYEBROW_STYLE_OPTIONS.map((opt) => {
    if (presentation === "neutral") return { id: opt.id, weight: 1 };
    const favored = presentation === "feminine_leaning" ? FEMININE_LEANING_EYEBROW.has(opt.id) : MASCULINE_LEANING_EYEBROW.has(opt.id);
    return { id: opt.id, weight: favored ? 2 : 1 };
  });
}

// Facial hair — see file header. A feminine-leaning AUTOMATIC draw only
// ever candidates "none"; masculine-leaning and neutral candidate the
// full catalog unchanged (clean-shaven stays a normal, common outcome for
// "erkek" too — this never forces facial hair on anyone).
export function facialHairCandidates(presentation: GenderPresentation): AvatarOption<FacialHair>[] {
  if (presentation === "feminine_leaning") {
    return FACIAL_HAIR_OPTIONS.filter((opt) => opt.id === "none");
  }
  return FACIAL_HAIR_OPTIONS;
}
