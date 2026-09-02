import { describe, expect, it } from 'vitest';
import { createInitialGameState, type CharacterCreationInput } from './createInitialGameState';
import { CURRENT_SAVE_VERSION } from './types';

const baseInput: CharacterCreationInput = {
  name: 'Deniz Yılmaz',
  age: 25,
  gender: 'belirtmek_istemiyorum',
  hometown: 'Ankara',
  background: 'kendi_basina',
};

describe('createInitialGameState', () => {
  it('creates a valid initial state', () => {
    const state = createInitialGameState(baseInput, { seed: 'fixed-seed' });
    expect(state.meta.saveVersion).toBe(CURRENT_SAVE_VERSION);
    expect(state.meta.rngSeed).toBe('fixed-seed');
    expect(state.character.name).toBe('Deniz Yılmaz');
    expect(state.status).toBe('active');
  });

  it('starts in the character_creation phase with zeroed career progress', () => {
    const state = createInitialGameState(baseInput);
    expect(state.career.phase).toBe('character_creation');
    expect(state.career.residencyWeek).toBe(0);
    expect(state.career.residencyYear).toBe(0);
    expect(state.career.seniorityStage).toBe('none');
    expect(state.career.branch).toBeUndefined();
    expect(state.career.hospital).toBeUndefined();
  });

  it('starts with empty gameplay collections', () => {
    const state = createInitialGameState(baseInput);
    expect(state.relationships).toEqual({});
    expect(state.pendingEvents).toEqual([]);
    expect(state.activeChains).toEqual({});
    expect(state.eventHistory).toEqual([]);
    expect(state.behaviorStats).toEqual({});
  });

  it('applies background resource modifiers', () => {
    const rahat = createInitialGameState({ ...baseInput, background: 'ekonomik_rahat' });
    const kendi = createInitialGameState({ ...baseInput, background: 'kendi_basina' });
    expect(rahat.resources.money).toBeGreaterThan(kendi.resources.money);
  });

  it('carries background flags into initial flags', () => {
    const state = createInitialGameState({ ...baseInput, background: 'aile_yaninda' });
    expect(state.flags.lives_with_family).toBe(true);
  });

  it('generates a distinct seed per call unless one is provided', () => {
    const a = createInitialGameState(baseInput);
    const b = createInitialGameState(baseInput);
    expect(a.meta.rngSeed).not.toBe(b.meta.rngSeed);
  });

  it('records the same provided seed deterministically', () => {
    const a = createInitialGameState(baseInput, { seed: 'same-seed' });
    const b = createInitialGameState(baseInput, { seed: 'same-seed' });
    expect(a.meta.rngSeed).toBe(b.meta.rngSeed);
  });

  it('trims name and hometown', () => {
    const state = createInitialGameState({ ...baseInput, name: '  Deniz  ', hometown: ' Ankara ' });
    expect(state.character.name).toBe('Deniz');
    expect(state.character.hometown).toBe('Ankara');
  });

  it('clamps resources into the 0-100 range', () => {
    const state = createInitialGameState({ ...baseInput, background: 'baska_sehirden' });
    expect(state.resources.stress).toBeGreaterThanOrEqual(0);
    expect(state.resources.stress).toBeLessThanOrEqual(100);
    expect(state.resources.fatigue).toBeGreaterThanOrEqual(0);
    expect(state.resources.burnout).toBeGreaterThanOrEqual(0);
  });

  // Android Device QA Hotfix 1, Issue 1
  describe('default player avatar generation', () => {
    it('respects the character\'s selected gender when no explicit avatar is supplied', () => {
      const female = createInitialGameState({ ...baseInput, gender: 'kadın' }, { seed: 'avatar-gender-seed' });
      expect(female.character.avatar.facialHair).toBe('none');
    });

    it('is deterministic for a given seed+gender', () => {
      const a = createInitialGameState({ ...baseInput, gender: 'erkek' }, { seed: 'avatar-det-seed' });
      const b = createInitialGameState({ ...baseInput, gender: 'erkek' }, { seed: 'avatar-det-seed' });
      expect(a.character.avatar).toEqual(b.character.avatar);
    });

    it('an explicitly supplied avatar (from Character Creation manual customization) always wins over the default, regardless of gender', () => {
      const manualAvatar = {
        skinTone: 'tone_06' as const, faceShape: 'heart' as const, hairStyle: 'buzz' as const,
        hairColor: 'blonde' as const, eyebrowStyle: 'thin' as const, eyeStyle: 'wide' as const,
        facialHair: 'full_beard' as const, glasses: 'square' as const, detail: 'earrings' as const,
      };
      const state = createInitialGameState({ ...baseInput, gender: 'kadın', avatar: manualAvatar }, { seed: 'manual-override-seed' });
      expect(state.character.avatar).toEqual(manualAvatar);
    });

    it('avatar/gender choice never affects starting resources, money, or any other gameplay field', () => {
      const female = createInitialGameState({ ...baseInput, gender: 'kadın' }, { seed: 'same-seed-neutrality' });
      const male = createInitialGameState({ ...baseInput, gender: 'erkek' }, { seed: 'same-seed-neutrality' });
      expect(female.resources).toEqual(male.resources);
      expect(female.resourcePressure).toEqual(male.resourcePressure);
      expect(female.financialPressure).toEqual(male.financialPressure);
      expect(female.flags).toEqual(male.flags);
    });
  });
});
