import { describe, expect, it } from 'vitest';
import { runHeadlessOnCallEconomySimulation } from './headlessOnCallEconomySimulation';
import { GLOBAL_SHIFT_BOUNDS } from '../config/onCallEconomyConfig';

// Smaller than the full report script (npm run simulate:oncall-economy) —
// CI-speed sanity gate, not the human-readable report. §29/§30/§31: not
// final balance tuning, just catching extreme/broken outcomes.
describe('runHeadlessOnCallEconomySimulation (sanity gate)', () => {
  const report = runHeadlessOnCallEconomySimulation({
    seedCount: 24,
    programIds: ['baskent_ic', 'porsuk_cerrahi', 'baskent_psik', 'sahil_ic', 'bogazkoy_cerrahi', 'orhangazi_psik'],
    backgrounds: ['aile_yaninda', 'baska_sehirden', 'ekonomik_rahat', 'kendi_basina'],
  });

  it('runs to completion with no crashes', () => {
    expect(report.crossSystem.crashes).toEqual([]);
  });

  it('never generates a month above the global shift cap', () => {
    expect(report.onCall.monthsAboveGlobalMax).toBe(0);
  });

  it('never generates a 0-shift month for these three branches (all have minMonthlyShifts >= 3)', () => {
    expect(report.onCall.monthsWithZeroShifts).toBe(0);
  });

  it('every branch stays within its own configured min/max and the global bounds', () => {
    for (const stats of Object.values(report.onCall.byBranch)) {
      expect(stats.minShifts).toBeGreaterThanOrEqual(GLOBAL_SHIFT_BOUNDS[0]);
      expect(stats.maxShifts).toBeLessThanOrEqual(GLOBAL_SHIFT_BOUNDS[1]);
    }
  });

  it('seniority trends comez > orta > kidemli in average shift count', () => {
    expect(report.onCall.bySeniority.comez).toBeGreaterThan(report.onCall.bySeniority.orta);
    expect(report.onCall.bySeniority.orta).toBeGreaterThan(report.onCall.bySeniority.kidemli);
  });

  it('a staffing shortage trends shifts up (controlled for branch/seniority confounds)', () => {
    expect(report.crossSystem.correlationStaffingLoadToShiftsControlled).toBeGreaterThan(0.1);
    // ...but isn't an absurdly overpowering effect either.
    expect(report.crossSystem.correlationStaffingLoadToShiftsControlled).toBeLessThan(0.9);
  });

  it('does not produce the "everyone hoards millions" failure mode', () => {
    // Loose upper bound — not final balancing, just catching a runaway.
    expect(report.economy.avgBalanceEndOfResidency).toBeLessThan(1_000_000);
  });

  it('does not produce a universal-collapse failure mode either', () => {
    expect(report.economy.fractionRunsEverNegative).toBeLessThan(0.9);
  });

  it('city cost actually differentiates outcomes (Istanbul vs. a cheaper city)', () => {
    const istanbul = report.economy.byCity.istanbul;
    const eskisehir = report.economy.byCity.eskisehir;
    expect(istanbul).toBeLessThan(eskisehir);
  });
});
