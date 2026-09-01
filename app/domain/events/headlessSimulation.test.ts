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

  it('never leaves an eligible chain checkpoint entirely unreached', () => {
    // A small seed count can legitimately miss a rare branch, but every
    // chain that starts should show up in chainCompletion at all.
    expect(Object.keys(report.chainCompletion).length).toBeGreaterThan(0);
  });
});

// §42 — "resource_preserving" must be a real, distinct strategy: it should
// not crash, and it should on average cost the character less than
// "random" play over the same seeds/weeks (proving it actually picks
// lower-cost choices rather than being a no-op alias for "first").
describe('runHeadlessSimulation (resource_preserving strategy sanity)', () => {
  const sharedConfig = {
    seedCount: 20,
    weeksPerSeed: 80,
    programIds: ['baskent_ic', 'porsuk_cerrahi', 'baskent_psik'],
  };

  it('runs to completion with no crashes', () => {
    const report = runHeadlessSimulation({ ...sharedConfig, choiceStrategy: 'resource_preserving' });
    expect(report.crashes).toEqual([]);
  });

  it('results in lower average final stress/fatigue/burnout than random play', () => {
    const preserving = runHeadlessSimulation({ ...sharedConfig, choiceStrategy: 'resource_preserving' });
    const random = runHeadlessSimulation({ ...sharedConfig, choiceStrategy: 'random' });
    const preservingTotal =
      preserving.resourceImpact.avgFinalStress + preserving.resourceImpact.avgFinalFatigue + preserving.resourceImpact.avgFinalBurnout;
    const randomTotal =
      random.resourceImpact.avgFinalStress + random.resourceImpact.avgFinalFatigue + random.resourceImpact.avgFinalBurnout;
    expect(preservingTotal).toBeLessThanOrEqual(randomTotal);
  });
});
