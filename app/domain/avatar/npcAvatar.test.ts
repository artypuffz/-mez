import { describe, expect, it } from 'vitest';
import { generateNpcAvatar } from './npcAvatar';
import type { Gender, NpcState } from '../state/types';

function npc(overrides: Partial<NpcState> & { gender?: Gender } = {}): Pick<NpcState, 'id' | 'role' | 'career' | 'templateId' | 'identity'> {
  const { gender, ...rest } = overrides;
  return {
    id: 'npc_1', role: 'peer_resident', career: { stage: 'resident', joinedWeek: 0 }, templateId: undefined,
    identity: { name: 'Test Npc', gender },
    ...rest,
  };
}

describe('generateNpcAvatar', () => {
  it('is deterministic — same (rngSeed, npc.id) always produces the same avatar', () => {
    const a = generateNpcAvatar('save-seed-1', npc());
    const b = generateNpcAvatar('save-seed-1', npc());
    expect(a).toEqual(b);
  });

  it('a different save seed gives a different NPC avatar', () => {
    const a = generateNpcAvatar('save-seed-1', npc());
    const b = generateNpcAvatar('save-seed-2', npc());
    expect(a).not.toEqual(b);
  });

  it('two different NPCs in the same save get different avatars (not one shared appearance)', () => {
    const a = generateNpcAvatar('save-seed-1', npc({ id: 'npc_1' }));
    const b = generateNpcAvatar('save-seed-1', npc({ id: 'npc_2' }));
    expect(a).not.toEqual(b);
  });

  it('an authored NPC (templateId) gets its appearanceOverrides applied on top of the procedural draw', () => {
    const withBaris = generateNpcAvatar('save-seed-1', npc({ id: 'baris', templateId: 'baris', gender: 'erkek' }));
    // baris's template override sets hairStyle/hairColor/faceShape explicitly (see domain/npc/templates.ts)
    expect(withBaris.hairStyle).toBe('short_swept');
    expect(withBaris.hairColor).toBe('dark_brown');
    expect(withBaris.faceShape).toBe('square');
  });

  it('an authored NPC still gets a deterministic, non-override field (eyeStyle) from the normal roll', () => {
    const a = generateNpcAvatar('save-seed-1', npc({ id: 'baris', templateId: 'baris', gender: 'erkek' }));
    const b = generateNpcAvatar('save-seed-1', npc({ id: 'baris', templateId: 'baris', gender: 'erkek' }));
    expect(a.eyeStyle).toBe(b.eyeStyle);
  });

  it('senior roles trend toward gray/white hair more often than junior roles, without ever guaranteeing it', () => {
    let seniorGray = 0;
    let juniorGray = 0;
    const N = 80;
    for (let i = 0; i < N; i++) {
      const senior = generateNpcAvatar(`seed-${i}`, npc({ id: `dh_${i}`, role: 'department_head', career: { stage: 'department_head', joinedWeek: 0 } }));
      const junior = generateNpcAvatar(`seed-${i}`, npc({ id: `jr_${i}`, role: 'junior_resident', career: { stage: 'resident', joinedWeek: 0 } }));
      if (senior.hairColor === 'gray' || senior.hairColor === 'white') seniorGray++;
      if (junior.hairColor === 'gray' || junior.hairColor === 'white') juniorGray++;
    }
    expect(seniorGray).toBeGreaterThan(juniorGray);
    // Never a stereotype/guarantee — some juniors still roll gray/white, some seniors don't.
    expect(seniorGray).toBeLessThan(N);
  });

  it('never crashes for any known role/stage combination', () => {
    const roles: NpcState['role'][] = ['department_head', 'faculty', 'specialist', 'senior_resident', 'peer_resident', 'junior_resident', 'nurse', 'secretary'];
    for (const role of roles) {
      expect(() => generateNpcAvatar('seed', npc({ id: `r_${role}`, role }))).not.toThrow();
    }
  });

  // Android Device QA Hotfix 1, Issue 1 — procedural generation must use
  // the NPC's actual stored identity.gender, never anything inferred.
  describe('gender-aware procedural generation', () => {
    it('a female (kadın) NPC never receives facial hair from automatic generation, across many draws', () => {
      for (let i = 0; i < 60; i++) {
        const avatar = generateNpcAvatar(`fem-seed-${i}`, npc({ id: `f_${i}`, gender: 'kadın' }));
        expect(avatar.facialHair).toBe('none');
      }
    });

    it('a male (erkek) NPC CAN receive facial hair from automatic generation (never forced, never excluded)', () => {
      const facialHairSeen = new Set<string>();
      for (let i = 0; i < 60; i++) {
        const avatar = generateNpcAvatar(`male-seed-${i}`, npc({ id: `m_${i}`, gender: 'erkek' }));
        facialHairSeen.add(avatar.facialHair);
      }
      expect(facialHairSeen.has('none')).toBe(true);
      expect(facialHairSeen.size).toBeGreaterThan(1);
    });

    it('hairstyle trends differently by gender — feminine-leaning styles are drawn more often for kadın than for erkek', () => {
      const FEMININE = new Set(['medium_straight', 'medium_wavy', 'medium_center_part', 'long_straight', 'long_wavy', 'ponytail', 'bun']);
      let femaleFeminineCount = 0;
      let maleFeminineCount = 0;
      const N = 100;
      for (let i = 0; i < N; i++) {
        const female = generateNpcAvatar(`hs-seed-${i}`, npc({ id: `hf_${i}`, gender: 'kadın' }));
        const male = generateNpcAvatar(`hs-seed-${i}`, npc({ id: `hm_${i}`, gender: 'erkek' }));
        if (FEMININE.has(female.hairStyle)) femaleFeminineCount++;
        if (FEMININE.has(male.hairStyle)) maleFeminineCount++;
      }
      expect(femaleFeminineCount).toBeGreaterThan(maleFeminineCount);
      // Never a hard rule — some male draws still land on a feminine-leaning style.
      expect(maleFeminineCount).toBeGreaterThan(0);
    });

    it('"belirtmek_istemiyorum" and a missing gender both fall back to neutral (uniform) weighting, never crashing', () => {
      expect(() => generateNpcAvatar('seed', npc({ gender: 'belirtmek_istemiyorum' }))).not.toThrow();
      expect(() => generateNpcAvatar('seed', npc({ gender: undefined }))).not.toThrow();
    });

    it('gender never changes determinism — same seed+id+gender always reproduces the same avatar', () => {
      const a = generateNpcAvatar('gender-det-seed', npc({ id: 'gd_1', gender: 'kadın' }));
      const b = generateNpcAvatar('gender-det-seed', npc({ id: 'gd_1', gender: 'kadın' }));
      expect(a).toEqual(b);
    });

    it('authored NPCs (Zeynep, kadın) never receive facial hair even without an explicit facialHair override', () => {
      // zeynep_sekreter's template has no facialHair override — this must
      // come from the gender-gated candidate pool, not the unfiltered catalog.
      for (let i = 0; i < 20; i++) {
        const avatar = generateNpcAvatar(`zeynep-seed-${i}`, npc({ id: 'zeynep_sekreter', templateId: 'zeynep_sekreter', gender: 'kadın' }));
        expect(avatar.facialHair).toBe('none');
      }
    });
  });
});
