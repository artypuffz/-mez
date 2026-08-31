import { describe, expect, it } from 'vitest';
import { runHeadlessSimulation } from './headlessSimulation';

// Smaller than the full report script (npm run simulate:events) — this is
// the CI-speed sanity gate, not the human-readable report.
describe('runHeadlessSimulation (sanity gate)', () => {
  const report = runHeadlessSimulation({
    seedCount: 30,
    weeksPerSeed: 60,
    programIds: ['baskent_ic', 'porsuk_cerrahi', 'baskent_psik'],
  });

  it('runs to completion with no crashes or choiceless events', () => {
    expect(report.crashes).toEqual([]);
  });

  it('never violates a cooldown', () => {
    expect(report.cooldownViolations).toEqual([]);
  });

  it('actually triggers events across the run (not a silently-broken pool)', () => {
    expect(report.totalEventsTriggered).toBeGreaterThan(0);
    expect(Object.keys(report.eventFrequency).length).toBeGreaterThan(0);
  });

  it('has both quiet and non-quiet weeks (not every week is an event dump, not every week is silent)', () => {
    expect(report.quietWeeks).toBeGreaterThan(0);
    expect(report.quietWeeks).toBeLessThan(report.totalWeeksSimulated);
  });
});
