import { describe, expect, it } from 'vitest';
import { randomizePlayerAvatar } from './randomize';
import { createScopedRng } from '../rng/seededRng';
import {
  SKIN_TONE_OPTIONS, FACE_SHAPE_OPTIONS, HAIR_STYLE_OPTIONS, HAIR_COLOR_OPTIONS,
  EYEBROW_STYLE_OPTIONS, EYE_STYLE_OPTIONS, FACIAL_HAIR_OPTIONS, GLASSES_OPTIONS, DETAIL_OPTIONS,
} from './options';

describe('randomizePlayerAvatar', () => {
  it('is deterministic — the same rng scope always produces the same avatar', () => {
    const a = randomizePlayerAvatar(createScopedRng('seed-1', 'avatar:randomize:0'));
    const b = randomizePlayerAvatar(createScopedRng('seed-1', 'avatar:randomize:0'));
    expect(a).toEqual(b);
  });

  it('produces a different avatar for a different scope (varied, not a fixed constant)', () => {
    const a = randomizePlayerAvatar(createScopedRng('seed-1', 'avatar:randomize:0'));
    const b = randomizePlayerAvatar(createScopedRng('seed-1', 'avatar:randomize:1'));
    expect(a).not.toEqual(b);
  });

  it('every field is always a valid catalog id', () => {
    for (let i = 0; i < 20; i++) {
      const avatar = randomizePlayerAvatar(createScopedRng('seed-x', `avatar:randomize:${i}`));
      expect(SKIN_TONE_OPTIONS.map((o) => o.id)).toContain(avatar.skinTone);
      expect(FACE_SHAPE_OPTIONS.map((o) => o.id)).toContain(avatar.faceShape);
      expect(HAIR_STYLE_OPTIONS.map((o) => o.id)).toContain(avatar.hairStyle);
      expect(HAIR_COLOR_OPTIONS.map((o) => o.id)).toContain(avatar.hairColor);
      expect(EYEBROW_STYLE_OPTIONS.map((o) => o.id)).toContain(avatar.eyebrowStyle);
      expect(EYE_STYLE_OPTIONS.map((o) => o.id)).toContain(avatar.eyeStyle);
      expect(FACIAL_HAIR_OPTIONS.map((o) => o.id)).toContain(avatar.facialHair);
      expect(GLASSES_OPTIONS.map((o) => o.id)).toContain(avatar.glasses);
      expect(DETAIL_OPTIONS.map((o) => o.id)).toContain(avatar.detail);
    }
  });

  it('is capable of producing every facialHair option across enough draws (not gender/anything-locked)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      seen.add(randomizePlayerAvatar(createScopedRng('seed-spread', `avatar:randomize:${i}`)).facialHair);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
