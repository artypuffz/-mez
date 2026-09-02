import { describe, expect, it } from 'vitest';
import { generateNpcAvatar } from './npcAvatar';
import type { NpcState } from '../state/types';

function npc(overrides: Partial<NpcState> = {}): Pick<NpcState, 'id' | 'role' | 'career' | 'templateId'> {
  return {
    id: 'npc_1', role: 'peer_resident', career: { stage: 'resident', joinedWeek: 0 }, templateId: undefined,
    ...overrides,
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
    const withBaris = generateNpcAvatar('save-seed-1', npc({ id: 'baris', templateId: 'baris' }));
    // baris's template override sets hairStyle/hairColor/faceShape explicitly (see domain/npc/templates.ts)
    expect(withBaris.hairStyle).toBe('short_swept');
    expect(withBaris.hairColor).toBe('dark_brown');
    expect(withBaris.faceShape).toBe('square');
  });

  it('an authored NPC still gets a deterministic, non-override field (eyeStyle) from the normal roll', () => {
    const a = generateNpcAvatar('save-seed-1', npc({ id: 'baris', templateId: 'baris' }));
    const b = generateNpcAvatar('save-seed-1', npc({ id: 'baris', templateId: 'baris' }));
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
});
