import { describe, expect, it } from 'vitest';
import { resolveAvatarOption, SKIN_TONE_OPTIONS, HAIR_STYLE_OPTIONS } from './options';

describe('resolveAvatarOption', () => {
  it('resolves a known id to its own option', () => {
    expect(resolveAvatarOption(SKIN_TONE_OPTIONS, 'tone_03').id).toBe('tone_03');
  });

  it('falls back to the catalog\'s first entry for an unknown/future id (never throws)', () => {
    // A save/authored override can legitimately carry an id from a build
    // this catalog no longer/doesn't yet know — simulated here via an
    // unchecked cast, since the real caller (a JSON save file) has no
    // compile-time guarantee either.
    const unknownId = 'style_from_the_future' as unknown as (typeof HAIR_STYLE_OPTIONS)[number]['id'];
    expect(resolveAvatarOption(HAIR_STYLE_OPTIONS, unknownId)).toBe(HAIR_STYLE_OPTIONS[0]);
  });

  it('falls back to the first entry for undefined (a save field that was never set)', () => {
    expect(resolveAvatarOption(SKIN_TONE_OPTIONS, undefined)).toBe(SKIN_TONE_OPTIONS[0]);
  });
});
