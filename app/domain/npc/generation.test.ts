import { describe, expect, it } from 'vitest';
import { generateInitialClinic } from './generation';
import { createSeededRng } from '../rng/seededRng';
import { getResidencyProgram } from '../config/residencyPrograms';
import { DEFAULT_CLINIC_COMPOSITION } from '../config/clinicComposition';

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
    for (const [role, range] of Object.entries(DEFAULT_CLINIC_COMPOSITION)) {
      const count = npcs.filter((n) => n.role === role).length;
      // senior_resident also gets the authored "baris" template on top of
      // the procedural roll — the composition range alone is a lower/upper
      // bound on the PROCEDURAL count, so allow +1 for that one role.
      const templateBonus = role === 'senior_resident' ? 1 : 0;
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
});
