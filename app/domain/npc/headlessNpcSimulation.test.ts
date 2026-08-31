import { describe, expect, it } from 'vitest';
import { runHeadlessNpcSimulation } from './headlessNpcSimulation';

// Smaller than the full report script (npm run simulate:npcs) — this is
// the CI-speed sanity gate, not the human-readable report. §32/§33: not
// final balance tuning, just catching extinction/chaos/decay bugs.
describe('runHeadlessNpcSimulation (sanity gate)', () => {
  const report = runHeadlessNpcSimulation({
    seedCount: 20,
    weeksPerSeed: 260,
    programIds: ['baskent_ic', 'porsuk_cerrahi', 'baskent_psik'],
  });

  it('runs to completion with no lifecycle crashes', () => {
    expect(report.crashes).toEqual([]);
  });

  it('the clinic never goes fully empty across a full 5-year run', () => {
    expect(report.everWentFullyEmpty).toBe(false);
  });

  it('never produces a duplicate npc id or a duplicate active npc name within a roster', () => {
    expect(report.duplicateIdOrNameCases).toEqual([]);
  });

  it('some residents actually become specialists over 5 years (lifecycle is not inert)', () => {
    expect(report.becameSpecialistCount).toBeGreaterThan(0);
  });

  it('some NPCs leave and some new ones arrive (lifecycle + replenishment both fire)', () => {
    expect(report.leftCount).toBeGreaterThan(0);
    expect(report.arrivedCount).toBeGreaterThan(0);
  });

  it('passive relationship decay never lets an untouched relationship drift to an extreme (§33)', () => {
    expect(report.relationshipExtremes.atMaxTrustOrFriendship).toBe(0);
    expect(report.relationshipExtremes.atMaxGrudge).toBe(0);
  });
});
