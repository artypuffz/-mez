import { describe, expect, it } from 'vitest';
import { addExtraShift, removeShift, swapOnCallAssignment, transferOnCallAssignment } from './mutations';
import { generateOnCallSchedule } from './generateSchedule';
import { createSeededRng } from '../rng/seededRng';
import { getBranchDefinition } from '../config/branches';

function testSchedule() {
  return generateOnCallSchedule({
    monthKey: '2028-10',
    generatedAtWeek: 20,
    onCallProfile: getBranchDefinition('ic_hastaliklari').onCallProfile,
    seniorityStage: 'orta',
    activeResidents: 8,
    targetResidents: 9,
    staffingPressure: 40,
    rng: createSeededRng('mutation-fixture'),
  });
}

describe('transferOnCallAssignment', () => {
  it('reassigns an existing assignment to a new holder', () => {
    const schedule = testSchedule();
    const id = schedule.assignments[0].id;
    const result = transferOnCallAssignment(schedule, id, 'npc_1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const moved = result.schedule.assignments.find((a) => a.id === id);
      expect(moved?.assignedNpcId).toBe('npc_1');
      expect(moved?.source).toBe('swap');
      expect(result.schedule.player.totalShifts).toBe(schedule.player.totalShifts - 1);
    }
  });

  it('fails for an unknown assignment id', () => {
    const schedule = testSchedule();
    expect(transferOnCallAssignment(schedule, 'nonexistent', 'npc_1').ok).toBe(false);
  });
});

describe('swapOnCallAssignment', () => {
  it('exchanges holders between two assignments', () => {
    const schedule = testSchedule();
    const withOther = { ...schedule, assignments: [...schedule.assignments, { id: 'npc-a', date: '2028-10-05', type: 'weekday' as const, assignedNpcId: 'npc_1', source: 'generated' as const }] };
    const playerAssignmentId = withOther.assignments.find((a) => a.assignedNpcId === 'player')!.id;
    const result = swapOnCallAssignment(withOther, playerAssignmentId, 'npc-a');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.schedule.assignments.find((a) => a.id === 'npc-a')?.assignedNpcId).toBe('player');
      expect(result.schedule.assignments.find((a) => a.id === playerAssignmentId)?.assignedNpcId).toBe('npc_1');
    }
  });

  it('rejects swapping an assignment with itself', () => {
    const schedule = testSchedule();
    const id = schedule.assignments[0].id;
    expect(swapOnCallAssignment(schedule, id, id).ok).toBe(false);
  });

  it('fails for an unknown assignment id on either side', () => {
    const schedule = testSchedule();
    const id = schedule.assignments[0].id;
    expect(swapOnCallAssignment(schedule, id, 'nonexistent').ok).toBe(false);
    expect(swapOnCallAssignment(schedule, 'nonexistent', id).ok).toBe(false);
  });
});

describe('addExtraShift', () => {
  it('adds a new player shift on a free date within the month', () => {
    const schedule = testSchedule();
    const freeDate = '2028-10-15';
    const before = schedule.assignments.some((a) => a.date === freeDate && a.assignedNpcId === 'player');
    const result = addExtraShift(schedule, freeDate, before ? 'weekday' : 'weekday');
    if (!before) {
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.schedule.assignments.some((a) => a.date === freeDate && a.source === 'extra')).toBe(true);
        expect(result.schedule.player.extraShifts).toBe(schedule.player.extraShifts + 1);
      }
    }
  });

  it('rejects a date outside the schedule month', () => {
    const schedule = testSchedule();
    expect(addExtraShift(schedule, '2028-11-01', 'weekday').ok).toBe(false);
  });

  it('rejects double-booking the player on an already-assigned date', () => {
    const schedule = testSchedule();
    const takenDate = schedule.assignments.find((a) => a.assignedNpcId === 'player')!.date;
    expect(addExtraShift(schedule, takenDate, 'weekday').ok).toBe(false);
  });
});

describe('removeShift', () => {
  it('removes an existing player assignment', () => {
    const schedule = testSchedule();
    const id = schedule.assignments[0].id;
    const result = removeShift(schedule, id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.schedule.assignments.some((a) => a.id === id)).toBe(false);
      expect(result.schedule.player.totalShifts).toBe(schedule.player.totalShifts - 1);
    }
  });

  it('fails for an unknown assignment id', () => {
    const schedule = testSchedule();
    expect(removeShift(schedule, 'nonexistent').ok).toBe(false);
  });

  it('fails to remove a non-player assignment', () => {
    const schedule = testSchedule();
    const withOther = { ...schedule, assignments: [...schedule.assignments, { id: 'npc-only', date: '2028-10-06', type: 'weekday' as const, assignedNpcId: 'npc_1', source: 'generated' as const }] };
    expect(removeShift(withOther, 'npc-only').ok).toBe(false);
  });
});
