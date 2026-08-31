import { describe, expect, it } from 'vitest';
import { selectHospitalRoster, selectNpcDetail, selectRelationshipRoster } from './rosterSelectors';
import { createInitialGameState } from '../state/createInitialGameState';
import { beginTus } from '../state/transitions';
import { selectResidencyProgram, proceedToPreference } from '../state/tusTransitions';
import { getResidencyProgram } from '../config/residencyPrograms';

function residencyState(seed: string) {
  const initial = createInitialGameState(
    { name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' },
    { seed }
  );
  const program = getResidencyProgram('baskent_ic');
  return selectResidencyProgram(proceedToPreference(beginTus(initial)), program);
}

describe('selectHospitalRoster', () => {
  it('groups the active roster and excludes inactive npcs', () => {
    const state = residencyState('roster-check');
    const withOneGone = {
      ...state,
      npcs: { ...state.npcs, baris: { ...state.npcs.baris, active: false } },
    };
    const groups = selectHospitalRoster(withOneGone);
    const allNames = groups.flatMap((g) => g.npcs.map((n) => n.identity.name));
    expect(allNames).not.toContain('Barış Demir');
    expect(groups.some((g) => g.label === 'Bölüm Başkanı')).toBe(true);
  });

  it('never returns an empty group', () => {
    const state = residencyState('roster-empty-groups');
    const groups = selectHospitalRoster(state);
    expect(groups.every((g) => g.npcs.length > 0)).toBe(true);
  });
});

describe('selectRelationshipRoster', () => {
  it('returns one row per active npc with a name, role label, and relationship label — never numbers', () => {
    const state = residencyState('relationship-roster');
    const rows = selectRelationshipRoster(state);
    expect(rows.length).toBeGreaterThan(0);
    const baris = rows.find((r) => r.npcId === 'baris');
    expect(baris?.roleLabel).toBe('Kıdemli Asistan');
    for (const row of rows) {
      expect(typeof row.label).toBe('string');
      expect(row.name.length).toBeGreaterThan(0);
    }
  });
});

describe('selectNpcDetail', () => {
  it('returns name/role/tenure/relationship label and nothing else for a known npc', () => {
    const state = residencyState('detail-check');
    const detail = selectNpcDetail(state, 'baris');
    expect(detail).toMatchObject({ name: 'Barış Demir', roleLabel: 'Kıdemli Asistan' });
    expect(Object.keys(detail!).sort()).toEqual(['name', 'relationshipLabel', 'roleLabel', 'tenureLabel']);
  });

  it('returns null for an unknown npc id', () => {
    const state = residencyState('detail-missing');
    expect(selectNpcDetail(state, 'nonexistent')).toBeNull();
  });
});
