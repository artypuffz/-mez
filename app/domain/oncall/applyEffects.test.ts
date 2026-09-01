import { describe, expect, it } from 'vitest';
import { applyOnCallEffects } from './applyEffects';
import { generateOnCallSchedule } from './generateSchedule';
import { createSeededRng } from '../rng/seededRng';
import { getBranchDefinition } from '../config/branches';

function testSchedule() {
  return generateOnCallSchedule({
    monthKey: '2028-10',
    generatedAtWeek: 20,
    onCallProfile: getBranchDefinition('psikiyatri').onCallProfile,
    seniorityStage: 'comez',
    activeResidents: 6,
    targetResidents: 8,
    staffingPressure: 30,
    rng: createSeededRng('effects-fixture'),
  });
}

describe('applyOnCallEffects', () => {
  it('is a no-op for a null schedule', () => {
    expect(applyOnCallEffects(null, [{ type: 'add_player_shift', count: 1 }], createSeededRng('r'))).toBeNull();
  });

  it('is a no-op with no effects', () => {
    const schedule = testSchedule();
    expect(applyOnCallEffects(schedule, undefined, createSeededRng('r'))).toBe(schedule);
  });

  it('add_player_shift adds shifts without double-booking', () => {
    const schedule = testSchedule();
    const result = applyOnCallEffects(schedule, [{ type: 'add_player_shift', count: 2 }], createSeededRng('add-r'));
    expect(result!.player.totalShifts).toBe(schedule.player.totalShifts + 2);
    const dates = result!.assignments.map((a) => a.date);
    expect(new Set(dates).size).toBe(dates.length);
  });

  it('remove_player_shift removes shifts', () => {
    const schedule = testSchedule();
    const result = applyOnCallEffects(schedule, [{ type: 'remove_player_shift', count: 1 }], createSeededRng('rm-r'));
    expect(result!.player.totalShifts).toBe(schedule.player.totalShifts - 1);
  });

  it('is deterministic for the same rng seed', () => {
    const schedule = testSchedule();
    const a = applyOnCallEffects(schedule, [{ type: 'add_player_shift', count: 1 }], createSeededRng('det-r'));
    const b = applyOnCallEffects(schedule, [{ type: 'add_player_shift', count: 1 }], createSeededRng('det-r'));
    expect(a).toEqual(b);
  });

  it('stops gracefully (does not throw) once it runs out of removable shifts', () => {
    const schedule = testSchedule();
    const result = applyOnCallEffects(schedule, [{ type: 'remove_player_shift', count: 999 }], createSeededRng('r'));
    expect(result!.player.totalShifts).toBe(0);
  });
});
