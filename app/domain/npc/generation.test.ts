import { describe, expect, it } from 'vitest';
import { generateInitialClinic } from './generation';
import { createSeededRng } from '../rng/seededRng';
import { getResidencyProgram } from '../config/residencyPrograms';
import { DEFAULT_CLINIC_COMPOSITION } from '../config/clinicComposition';
import { NPC_TEMPLATES } from './templates';

const program = getResidencyProgram('baskent_ic');

describe('generateInitialClinic', () => {
  it('is deterministic for the same seed + program', () => {
    const a = generateInitialClinic(program, createSeededRng('same-seed'));
    const b = generateInitialClinic(program, createSeededRng('same-seed'));
    expect(a.npcs).toEqual(b.npcs);
    expect(a.relationships).toEqual(b.relationships);
  });

  it('produces a different roster for a different seed', () => {
    const a = generateInitialClinic(program, createSeededRng('seed-a'));
    const b = generateInitialClinic(program, createSeededRng('seed-b'));
    expect(a.npcs).not.toEqual(b.npcs);
  });

  it('never mixes personality fields into the relationship records', () => {
    const { npcs, relationships } = generateInitialClinic(program, createSeededRng('shape-check'));
    for (const npc of npcs) {
      const rel = relationships[npc.id];
      expect(Object.keys(rel).sort()).toEqual(['friendship', 'grudge', 'trust']);
      expect(Object.keys(npc.personality).sort()).toEqual(
        ['burnout', 'conflictTendency', 'ego', 'helpfulness', 'hierarchyOrientation']
      );
    }
  });

  it('respects each role composition range (plus the authored template extras)', () => {
    const { npcs } = generateInitialClinic(program, createSeededRng('composition-check'));
    // Every authored template (Barış senior_resident, Zeynep secretary,
    // Erhan faculty, Deniz junior_resident — see domain/npc/templates.ts)
    // adds one NPC on top of the procedural roll for its role, so the
    // composition range alone is a lower/upper bound on the PROCEDURAL
    // count only — allow +1 per role that has a template.
    const templateBonusByRole: Record<string, number> = {};
    for (const template of NPC_TEMPLATES) {
      templateBonusByRole[template.role] = (templateBonusByRole[template.role] ?? 0) + 1;
    }
    for (const [role, range] of Object.entries(DEFAULT_CLINIC_COMPOSITION)) {
      const count = npcs.filter((n) => n.role === role).length;
      const templateBonus = templateBonusByRole[role] ?? 0;
      expect(count).toBeGreaterThanOrEqual(range.min);
      expect(count).toBeLessThanOrEqual(range.max + templateBonus);
    }
  });

  it('injects the authored "baris" template with a stable id and no name collisions', () => {
    const { npcs } = generateInitialClinic(program, createSeededRng('template-check'));
    const baris = npcs.find((n) => n.id === 'baris');
    expect(baris).toBeDefined();
    expect(baris?.templateId).toBe('baris');
    expect(baris?.identity.name).toBe('Barış Demir');

    const fullNames = npcs.map((n) => n.identity.name);
    expect(new Set(fullNames).size).toBe(fullNames.length);
  });

  it('every generated npc starts active with a valid role/branch/hospital', () => {
    const { npcs } = generateInitialClinic(program, createSeededRng('validity-check'));
    for (const npc of npcs) {
      expect(npc.active).toBe(true);
      expect(npc.branchId).toBe(program.branchId);
      expect(npc.hospitalId).toBe(program.hospitalId);
    }
  });

  // Android Device QA Hotfix 1, Issue 1 (root cause) — every authored
  // template's stored identity.gender must match NpcTemplate.gender, NOT
  // a throwaway random name's gender that got discarded in favor of the
  // authored `name`. This is the real end-to-end path (spawnNpc via
  // generateInitialClinic), not just the avatar module in isolation.
  it('authored NPCs get their identity.gender from NpcTemplate.gender, not an unrelated random draw', () => {
    for (let i = 0; i < 15; i++) {
      const { npcs } = generateInitialClinic(program, createSeededRng(`gender-check-${i}`));
      const byTemplate = Object.fromEntries(npcs.filter((n) => n.templateId).map((n) => [n.templateId, n]));
      expect(byTemplate.baris?.identity.gender).toBe('erkek');
      expect(byTemplate.zeynep_sekreter?.identity.gender).toBe('kadın');
      expect(byTemplate.hoca_erhan?.identity.gender).toBe('erkek');
      expect(byTemplate.deniz_comez?.identity.gender).toBe('kadın');
    }
  });

  it('every procedurally generated (non-templated) npc has some real, valid Gender value', () => {
    const { npcs } = generateInitialClinic(program, createSeededRng('procedural-gender-check'));
    const validGenders = ['kadın', 'erkek', 'belirtmek_istemiyorum'];
    for (const npc of npcs.filter((n) => !n.templateId)) {
      expect(validGenders).toContain(npc.identity.gender);
    }
  });
});
