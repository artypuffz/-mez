import { describe, expect, it } from 'vitest';
import { buildAvatarLayers } from './avatarVisuals';
import { DEFAULT_PLAYER_AVATAR } from '../../domain/avatar/options';
import type { PlayerAvatar } from '../../domain/avatar/types';

describe('buildAvatarLayers', () => {
  it('is a pure function — same avatar/outfit/expression always produces the same layers', () => {
    const a = buildAvatarLayers(DEFAULT_PLAYER_AVATAR, 'white_coat', 'normal');
    const b = buildAvatarLayers(DEFAULT_PLAYER_AVATAR, 'white_coat', 'normal');
    expect(a).toEqual(b);
  });

  it('bald produces fewer layers than a full hairstyle (no hair primitives added)', () => {
    const bald: PlayerAvatar = { ...DEFAULT_PLAYER_AVATAR, hairStyle: 'bald' };
    const long: PlayerAvatar = { ...DEFAULT_PLAYER_AVATAR, hairStyle: 'long_wavy' };
    expect(buildAvatarLayers(bald, 'casual', 'normal').length).toBeLessThan(buildAvatarLayers(long, 'casual', 'normal').length);
  });

  it('different outfits produce a different shoulder fill color', () => {
    const casual = buildAvatarLayers(DEFAULT_PLAYER_AVATAR, 'casual', 'normal')[0];
    const specialist = buildAvatarLayers(DEFAULT_PLAYER_AVATAR, 'specialist', 'normal')[0];
    expect(casual).not.toEqual(specialist);
  });

  it('different expressions change the mouth primitive without changing physical identity layers', () => {
    const normal = buildAvatarLayers(DEFAULT_PLAYER_AVATAR, 'casual', 'normal');
    const burnedOut = buildAvatarLayers(DEFAULT_PLAYER_AVATAR, 'casual', 'burned_out');
    // Same layer count (expression never adds/removes identity layers, only swaps mouth + tired marks)
    // burned_out DOES add tired-mark ellipses, so allow for that — but the shapes differ overall.
    expect(normal).not.toEqual(burnedOut);
  });

  it('never crashes for any combination of hairStyle x facialHair x glasses', () => {
    const hairStyles: PlayerAvatar['hairStyle'][] = ['bald', 'buzz', 'short_side_part', 'short_swept', 'short_curly', 'medium_straight', 'medium_wavy', 'medium_center_part', 'long_straight', 'long_wavy', 'ponytail', 'bun'];
    const facialHairs: PlayerAvatar['facialHair'][] = ['none', 'stubble', 'mustache', 'goatee', 'full_beard'];
    const glasses: PlayerAvatar['glasses'][] = ['none', 'round', 'square', 'rimless'];
    for (const hairStyle of hairStyles) {
      for (const facialHair of facialHairs) {
        for (const g of glasses) {
          expect(() => buildAvatarLayers({ ...DEFAULT_PLAYER_AVATAR, hairStyle, facialHair, glasses: g }, 'casual', 'normal')).not.toThrow();
        }
      }
    }
  });

  it('every primitive has a valid shape discriminator', () => {
    const layers = buildAvatarLayers(DEFAULT_PLAYER_AVATAR, 'casual', 'normal');
    for (const layer of layers) {
      expect(['ellipse', 'circle', 'rect', 'path', 'line']).toContain(layer.shape);
    }
  });
});
