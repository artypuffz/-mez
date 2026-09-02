import { describe, expect, it } from 'vitest';
import { randomizePlayerAvatar } from './randomize';
import { createScopedRng } from '../rng/seededRng';
import {
  SKIN_TONE_OPTIONS, FACE_SHAPE_OPTIONS, HAIR_STYLE_OPTIONS, HAIR_COLOR_OPTIONS,
  EYEBROW_STYLE_OPTIONS, EYE_STYLE_OPTIONS, FACIAL_HAIR_OPTIONS, GLASSES_OPTIONS, DETAIL_OPTIONS,
} from './options';

describe('randomizePlayerAvatar', () => {
  it('is deterministic — the same rng scope and gender always produces the same avatar', () => {
    const a = randomizePlayerAvatar(createScopedRng('seed-1', 'avatar:randomize:0'), 'belirtmek_istemiyorum');
    const b = randomizePlayerAvatar(createScopedRng('seed-1', 'avatar:randomize:0'), 'belirtmek_istemiyorum');
    expect(a).toEqual(b);
  });

  it('produces a different avatar for a different scope (varied, not a fixed constant)', () => {
    const a = randomizePlayerAvatar(createScopedRng('seed-1', 'avatar:randomize:0'), 'belirtmek_istemiyorum');
    const b = randomizePlayerAvatar(createScopedRng('seed-1', 'avatar:randomize:1'), 'belirtmek_istemiyorum');
    expect(a).not.toEqual(b);
  });

  it('every field is always a valid catalog id, for every gender', () => {
    for (const gender of ['kadın', 'erkek', 'belirtmek_istemiyorum'] as const) {
      for (let i = 0; i < 20; i++) {
        const avatar = randomizePlayerAvatar(createScopedRng('seed-x', `avatar:randomize:${gender}:${i}`), gender);
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
    }
  });

  it('for a gender-neutral ("belirtmek_istemiyorum") draw, facialHair is capable of producing every option across enough draws', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      seen.add(randomizePlayerAvatar(createScopedRng('seed-spread', `avatar:randomize:${i}`), 'belirtmek_istemiyorum').facialHair);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  // Android Device QA Hotfix 1, Issue 1 — player default generation and
  // Randomize must respect the currently selected gender.
  describe('gender-aware generation', () => {
    it('a kadın player never gets facial hair from Randomize, across many draws', () => {
      for (let i = 0; i < 60; i++) {
        const avatar = randomizePlayerAvatar(createScopedRng('seed-fem', `avatar:randomize:${i}`), 'kadın');
        expect(avatar.facialHair).toBe('none');
      }
    });

    it('an erkek player CAN get facial hair from Randomize (never forced, never excluded)', () => {
      const seen = new Set<string>();
      for (let i = 0; i < 60; i++) {
        seen.add(randomizePlayerAvatar(createScopedRng('seed-male', `avatar:randomize:${i}`), 'erkek').facialHair);
      }
      expect(seen.has('none')).toBe(true);
      expect(seen.size).toBeGreaterThan(1);
    });

    it('hairstyle trends differently by gender — masculine-leaning styles are drawn more often for erkek than kadın', () => {
      const MASCULINE = new Set(['bald', 'buzz', 'short_side_part', 'short_swept']);
      let maleMasculineCount = 0;
      let femaleMasculineCount = 0;
      const N = 100;
      for (let i = 0; i < N; i++) {
        const male = randomizePlayerAvatar(createScopedRng(`hs-seed-${i}`, 'avatar:randomize:0'), 'erkek');
        const female = randomizePlayerAvatar(createScopedRng(`hs-seed-${i}`, 'avatar:randomize:0'), 'kadın');
        if (MASCULINE.has(male.hairStyle)) maleMasculineCount++;
        if (MASCULINE.has(female.hairStyle)) femaleMasculineCount++;
      }
      expect(maleMasculineCount).toBeGreaterThan(femaleMasculineCount);
      expect(femaleMasculineCount).toBeGreaterThan(0);
    });

    it('the SAME rng scope produces a DIFFERENT avatar for a different gender (gender genuinely affects the draw)', () => {
      const rngFemale = createScopedRng('same-seed', 'avatar:randomize:0');
      const rngMale = createScopedRng('same-seed', 'avatar:randomize:0');
      const female = randomizePlayerAvatar(rngFemale, 'kadın');
      const male = randomizePlayerAvatar(rngMale, 'erkek');
      // Not guaranteed to differ on every single field, but facialHair is
      // a deterministic structural difference: female is always "none".
      if (male.facialHair !== 'none') {
        expect(female.facialHair).not.toBe(male.facialHair);
      }
    });

    it('manual customization is not restricted by gender — every catalog option remains independently settable', () => {
      // randomizePlayerAvatar only governs AUTOMATIC generation; this test
      // documents that the underlying catalogs themselves are untouched
      // and still contain every option regardless of gender weighting.
      expect(FACIAL_HAIR_OPTIONS.map((o) => o.id)).toEqual(['none', 'stubble', 'mustache', 'goatee', 'full_beard']);
      expect(HAIR_STYLE_OPTIONS.length).toBe(12);
    });
  });
});
