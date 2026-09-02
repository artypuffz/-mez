import { resolveAvatarOption, SKIN_TONE_OPTIONS, HAIR_COLOR_OPTIONS } from '../../domain/avatar/options';
import type { ExpressionState, OutfitContext, PlayerAvatar } from '../../domain/avatar/types';

// Gameplay Expansion Part C §21/§22 — a pure, RN-independent builder: it
// turns a PlayerAvatar (+ outfit/expression context) into a flat list of
// simple vector primitives. Kept separate from AvatarRenderer.tsx (the
// only thing that actually imports react-native-svg) so the composition
// logic — which style draws what, in what order — is unit-testable
// without mounting any RN component. "modern flat 2D + lightly
// caricatured" is interpreted here as clean geometric shapes with
// intentional asymmetry/texture cues per style, not hand-painted art —
// see the Part B/C/D final report's Limitations section for the explicit
// "final production art" caveat section 26 allows for this pass.

export type SvgPrimitive =
  | { shape: 'ellipse'; cx: number; cy: number; rx: number; ry: number; fill: string; opacity?: number; stroke?: string; strokeWidth?: number }
  | { shape: 'circle'; cx: number; cy: number; r: number; fill: string; opacity?: number }
  | { shape: 'rect'; x: number; y: number; width: number; height: number; rx?: number; fill: string; opacity?: number; stroke?: string; strokeWidth?: number }
  | { shape: 'path'; d: string; fill: string; stroke?: string; strokeWidth?: number; opacity?: number }
  | { shape: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: string; strokeWidth: number };

const OUTFIT_COLOR: Record<OutfitContext, string> = {
  casual: '#3d5a80',
  white_coat: '#e9edf5',
  scrubs: '#2f6b5e',
  surgical: '#6fa8c9',
  specialist: '#1c2843',
};

const OUTFIT_ACCENT: Record<OutfitContext, string> = {
  casual: '#2a4260',
  white_coat: '#c7d0e0',
  scrubs: '#1f4d43',
  surgical: '#4f8299',
  specialist: '#4f8cff',
};

function skinHex(avatar: PlayerAvatar): string {
  return resolveAvatarOption(SKIN_TONE_OPTIONS, avatar.skinTone).hex!;
}
function hairHex(avatar: PlayerAvatar): string {
  return resolveAvatarOption(HAIR_COLOR_OPTIONS, avatar.hairColor).hex!;
}

function headShape(avatar: PlayerAvatar, skin: string): SvgPrimitive[] {
  switch (avatar.faceShape) {
    case 'round':
      return [{ shape: 'ellipse', cx: 50, cy: 42, rx: 25, ry: 24, fill: skin }];
    case 'square':
      return [{ shape: 'rect', x: 27, y: 18, width: 46, height: 48, rx: 12, fill: skin }];
    case 'heart':
      return [
        { shape: 'ellipse', cx: 50, cy: 38, rx: 22, ry: 22, fill: skin },
        { shape: 'path', d: 'M 33 50 L 50 70 L 67 50 Z', fill: skin },
      ];
    case 'oval':
    default:
      return [{ shape: 'ellipse', cx: 50, cy: 42, rx: 21, ry: 27, fill: skin }];
  }
}

function eyeShape(style: PlayerAvatar['eyeStyle']): { rx: number; ry: number } {
  switch (style) {
    case 'round': return { rx: 4.2, ry: 4.2 };
    case 'narrow': return { rx: 4.5, ry: 2.2 };
    case 'wide': return { rx: 5.2, ry: 4 };
    case 'almond':
    default: return { rx: 4.2, ry: 3.2 };
  }
}

function eyesLayer(avatar: PlayerAvatar): SvgPrimitive[] {
  const { rx, ry } = eyeShape(avatar.eyeStyle);
  const pupil = Math.min(rx, ry) * 0.55;
  const out: SvgPrimitive[] = [];
  for (const cx of [38, 62]) {
    out.push({ shape: 'ellipse', cx, cy: 41, rx, ry, fill: '#ffffff' });
    out.push({ shape: 'circle', cx, cy: 41, r: pupil, fill: '#2a2a2a' });
  }
  return out;
}

function eyebrowsLayer(avatar: PlayerAvatar, hair: string): SvgPrimitive[] {
  const y = 33;
  const w = avatar.eyebrowStyle === 'thick' ? 3.2 : avatar.eyebrowStyle === 'thin' ? 1.3 : 2.2;
  const arch = avatar.eyebrowStyle === 'arched' ? -3 : 0;
  return [38, 62].map<SvgPrimitive>((cx) => ({
    shape: 'path',
    d: `M ${cx - 6} ${y} Q ${cx} ${y + arch} ${cx + 6} ${y}`,
    fill: 'none',
    stroke: hair,
    strokeWidth: w,
  }));
}

function mouthForExpression(expression: ExpressionState): SvgPrimitive {
  const cx = 50;
  const y = 55;
  switch (expression) {
    case 'burned_out':
      return { shape: 'path', d: `M ${cx - 8} ${y + 3} Q ${cx} ${y - 2} ${cx + 8} ${y + 3}`, fill: 'none', stroke: '#7a4a4a', strokeWidth: 2 };
    case 'exhausted':
      return { shape: 'line', x1: cx - 7, y1: y, x2: cx + 7, y2: y, stroke: '#5a4a4a', strokeWidth: 2 };
    case 'stressed':
      return { shape: 'path', d: `M ${cx - 7} ${y + 1} Q ${cx} ${y - 3} ${cx + 7} ${y + 1}`, fill: 'none', stroke: '#5a4a4a', strokeWidth: 2 };
    case 'unhealthy':
      return { shape: 'path', d: `M ${cx - 7} ${y - 1} Q ${cx} ${y + 4} ${cx + 7} ${y - 1}`, fill: 'none', stroke: '#6b8a6b', strokeWidth: 2 };
    case 'tired':
      return { shape: 'line', x1: cx - 6, y1: y, x2: cx + 6, y2: y + 1, stroke: '#4a3a3a', strokeWidth: 2 };
    case 'normal':
    default:
      return { shape: 'path', d: `M ${cx - 7} ${y - 1} Q ${cx} ${y + 5} ${cx + 7} ${y - 1}`, fill: 'none', stroke: '#4a3a3a', strokeWidth: 2 };
  }
}

function tiredMarksLayer(expression: ExpressionState): SvgPrimitive[] {
  if (expression !== 'tired' && expression !== 'exhausted' && expression !== 'burned_out') return [];
  return [30, 70].map<SvgPrimitive>((cx) => ({
    shape: 'ellipse', cx, cy: 47, rx: 5, ry: 2.4, fill: '#000000', opacity: expression === 'burned_out' ? 0.22 : 0.14,
  }));
}

// Hair — cap silhouette + optional back/long extensions, parametrized per
// style rather than hand-authored per-style bezier art (see file header).
function hairLayers(avatar: PlayerAvatar, hair: string): { back: SvgPrimitive[]; front: SvgPrimitive[] } {
  const style = avatar.hairStyle;
  if (style === 'bald') return { back: [], front: [] };

  const back: SvgPrimitive[] = [];
  const front: SvgPrimitive[] = [];

  // Base cap covering the scalp — every non-bald style gets this, sized
  // by how much coverage the style implies.
  const capCoverage: Record<PlayerAvatar['hairStyle'], number> = {
    bald: 0, buzz: 0.35, short_side_part: 0.55, short_swept: 0.55, short_curly: 0.6,
    medium_straight: 0.7, medium_wavy: 0.7, medium_center_part: 0.68,
    long_straight: 0.75, long_wavy: 0.75, ponytail: 0.6, bun: 0.6,
  } as const;
  const cov = capCoverage[style];
  front.push({ shape: 'path', d: `M 27 30 Q 50 ${8 + (1 - cov) * 20} 73 30 Q 73 ${18} 50 16 Q 27 18 27 30 Z`, fill: hair });

  if (style === 'short_side_part') {
    front.push({ shape: 'path', d: 'M 30 24 L 44 30 L 30 32 Z', fill: hair, opacity: 0.9 });
  }
  if (style === 'short_swept') {
    front.push({ shape: 'path', d: 'M 60 22 Q 50 28 42 24', fill: 'none', stroke: hair, strokeWidth: 3 });
  }
  if (style === 'short_curly') {
    for (const cx of [32, 42, 50, 58, 68]) front.push({ shape: 'circle', cx, cy: 20, r: 4, fill: hair });
  }
  if (style === 'medium_center_part') {
    front.push({ shape: 'path', d: 'M 50 16 L 50 26', fill: 'none', stroke: '#00000030', strokeWidth: 2 });
  }
  if (style === 'medium_wavy' || style === 'long_wavy') {
    for (const cx of [26, 74]) front.push({ shape: 'circle', cx, cy: 50, r: 4, fill: hair, opacity: 0.85 });
  }
  if (style === 'medium_straight' || style === 'medium_wavy' || style === 'medium_center_part') {
    front.push({ shape: 'rect', x: 22, y: 26, width: 8, height: 26, rx: 4, fill: hair });
    front.push({ shape: 'rect', x: 70, y: 26, width: 8, height: 26, rx: 4, fill: hair });
  }
  if (style === 'long_straight' || style === 'long_wavy') {
    back.push({ shape: 'rect', x: 20, y: 26, width: 9, height: 55, rx: 4.5, fill: hair });
    back.push({ shape: 'rect', x: 71, y: 26, width: 9, height: 55, rx: 4.5, fill: hair });
  }
  if (style === 'ponytail') {
    front.push({ shape: 'rect', x: 22, y: 26, width: 8, height: 20, rx: 4, fill: hair });
    front.push({ shape: 'rect', x: 70, y: 26, width: 8, height: 20, rx: 4, fill: hair });
    back.push({ shape: 'path', d: 'M 74 24 Q 90 40 78 66 Q 74 50 70 28 Z', fill: hair });
  }
  if (style === 'bun') {
    front.push({ shape: 'rect', x: 22, y: 26, width: 8, height: 20, rx: 4, fill: hair });
    front.push({ shape: 'rect', x: 70, y: 26, width: 8, height: 20, rx: 4, fill: hair });
    back.push({ shape: 'circle', cx: 50, cy: 12, r: 9, fill: hair });
  }

  return { back, front };
}

function facialHairLayer(avatar: PlayerAvatar, hair: string): SvgPrimitive[] {
  switch (avatar.facialHair) {
    case 'stubble':
      return [{ shape: 'path', d: 'M 33 50 Q 50 66 67 50 L 67 58 Q 50 70 33 58 Z', fill: hair, opacity: 0.28 }];
    case 'mustache':
      return [{ shape: 'path', d: 'M 41 51 Q 50 54 59 51 Q 50 56 41 51 Z', fill: hair }];
    case 'goatee':
      return [{ shape: 'path', d: 'M 44 58 Q 50 68 56 58 Q 50 62 44 58 Z', fill: hair }];
    case 'full_beard':
      return [{ shape: 'path', d: 'M 31 48 Q 50 72 69 48 L 68 58 Q 50 74 32 58 Z', fill: hair }];
    case 'none':
    default:
      return [];
  }
}

function glassesLayer(avatar: PlayerAvatar): SvgPrimitive[] {
  const stroke = '#2a2a2a';
  switch (avatar.glasses) {
    case 'round':
      return [
        { shape: 'ellipse', cx: 38, cy: 41, rx: 7, ry: 6, fill: 'none', stroke, strokeWidth: 1.8 },
        { shape: 'ellipse', cx: 62, cy: 41, rx: 7, ry: 6, fill: 'none', stroke, strokeWidth: 1.8 },
        { shape: 'line', x1: 45, y1: 41, x2: 55, y2: 41, stroke, strokeWidth: 1.8 },
      ];
    case 'square':
      return [
        { shape: 'rect', x: 31, y: 35, width: 14, height: 11, rx: 2, fill: 'none', stroke, strokeWidth: 1.8 },
        { shape: 'rect', x: 55, y: 35, width: 14, height: 11, rx: 2, fill: 'none', stroke, strokeWidth: 1.8 },
        { shape: 'line', x1: 45, y1: 40, x2: 55, y2: 40, stroke, strokeWidth: 1.8 },
      ];
    case 'rimless':
      return [
        { shape: 'ellipse', cx: 38, cy: 41, rx: 7, ry: 6, fill: 'none', stroke: '#8a94a8', strokeWidth: 1 },
        { shape: 'ellipse', cx: 62, cy: 41, rx: 7, ry: 6, fill: 'none', stroke: '#8a94a8', strokeWidth: 1 },
      ];
    case 'none':
    default:
      return [];
  }
}

function detailLayer(avatar: PlayerAvatar): SvgPrimitive[] {
  switch (avatar.detail) {
    case 'freckles':
      return [[33, 36], [37, 39], [63, 36], [67, 39]].map<SvgPrimitive>(([cx, cy]) => ({
        shape: 'circle', cx, cy, r: 0.8, fill: '#8a5a3a', opacity: 0.6,
      }));
    case 'beauty_mark':
      return [{ shape: 'circle', cx: 60, cy: 50, r: 1, fill: '#3a2a2a' }];
    case 'earrings':
      return [26, 74].map<SvgPrimitive>((cx) => ({ shape: 'circle', cx, cy: 48, r: 1.6, fill: '#d9b45e' }));
    case 'none':
    default:
      return [];
  }
}

export function buildAvatarLayers(
  avatar: PlayerAvatar,
  outfit: OutfitContext,
  expression: ExpressionState
): SvgPrimitive[] {
  const skin = skinHex(avatar);
  const hair = hairHex(avatar);
  const outfitColor = OUTFIT_COLOR[outfit];
  const outfitAccent = OUTFIT_ACCENT[outfit];
  const { back, front } = hairLayers(avatar, hair);

  return [
    // Shoulders / outfit
    { shape: 'path', d: 'M 8 120 L 92 120 L 74 76 L 26 76 Z', fill: outfitColor },
    ...back,
    // Neck
    { shape: 'rect', x: 42, y: 66, width: 16, height: 18, rx: 3, fill: skin },
    // Ears
    { shape: 'circle', cx: 26, cy: 44, r: 4.5, fill: skin },
    { shape: 'circle', cx: 74, cy: 44, r: 4.5, fill: skin },
    // Head
    ...headShape(avatar, skin),
    ...front,
    ...eyebrowsLayer(avatar, hair),
    ...eyesLayer(avatar),
    ...tiredMarksLayer(expression),
    ...facialHairLayer(avatar, hair),
    mouthForExpression(expression),
    ...glassesLayer(avatar),
    ...detailLayer(avatar),
    // Outfit collar accent (white coat lapel / scrub v-neck / specialist tie)
    { shape: 'path', d: 'M 34 76 L 50 92 L 66 76', fill: 'none', stroke: outfitAccent, strokeWidth: 2.4 },
  ];
}
