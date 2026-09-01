import { describe, expect, it } from 'vitest';
import { calculateStaffingLoad } from './staffingLoad';

describe('calculateStaffingLoad', () => {
  it('is 0 shortage-driven when the roster is fully staffed and pressure is 0', () => {
    expect(calculateStaffingLoad({ activeResidents: 9, targetResidents: 9, staffingPressure: 0 })).toBe(0);
  });

  it('rises as active residents fall below target', () => {
    const full = calculateStaffingLoad({ activeResidents: 9, targetResidents: 9, staffingPressure: 30 });
    const half = calculateStaffingLoad({ activeResidents: 5, targetResidents: 9, staffingPressure: 30 });
    const empty = calculateStaffingLoad({ activeResidents: 0, targetResidents: 9, staffingPressure: 30 });
    expect(half).toBeGreaterThan(full);
    expect(empty).toBeGreaterThan(half);
  });

  it('never goes negative even if activeResidents exceeds targetResidents', () => {
    expect(calculateStaffingLoad({ activeResidents: 12, targetResidents: 9, staffingPressure: 0 })).toBe(0);
  });

  it('is clamped to [0, 100]', () => {
    const load = calculateStaffingLoad({ activeResidents: 0, targetResidents: 9, staffingPressure: 100 });
    expect(load).toBeLessThanOrEqual(100);
    expect(load).toBeGreaterThanOrEqual(0);
  });

  it('staffingPressure alone still contributes even with a fully staffed roster', () => {
    const load = calculateStaffingLoad({ activeResidents: 9, targetResidents: 9, staffingPressure: 100 });
    expect(load).toBeGreaterThan(0);
  });
});
