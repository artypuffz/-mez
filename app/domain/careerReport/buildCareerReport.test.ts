import { describe, expect, it } from 'vitest';
import { buildCareerReport } from './buildCareerReport';
import { createInitialGameState } from '../state/createInitialGameState';
import { beginTus } from '../state/transitions';
import { selectResidencyProgram, proceedToPreference } from '../state/tusTransitions';
import { getResidencyProgram } from '../config/residencyPrograms';
import type { GameState } from '../state/types';

// §50 — CareerReport correctness across the required scenario matrix.
function residencyState(programId: string, seed: string): GameState {
  const initial = createInitialGameState({ name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' }, { seed });
  return selectResidencyProgram(proceedToPreference(beginTus(initial)), getResidencyProgram(programId));
}

describe('buildCareerReport', () => {
  it('specialist career: ending.kind is "specialist", no reason, identity/career fields populated', () => {
    const state: GameState = {
      ...residencyState('baskent_ic', 'career-specialist'),
      career: { ...residencyState('baskent_ic', 'career-specialist').career, phase: 'specialist', residencyWeek: 208, seniorityStage: 'kidemli' },
      status: 'specialist',
    };
    const report = buildCareerReport(state);
    expect(report.ending).toEqual({ kind: 'specialist', week: 208 });
    expect(report.career.branchName).toBe('İç Hastalıkları');
    expect(report.career.seniorityReached).toBe('kidemli');
    expect(report.identity.name).toBe('Ada');
  });

  it('burnout resignation: ending carries the reason and the gameOver week (not residencyWeek)', () => {
    const base = residencyState('baskent_ic', 'career-burnout');
    const state: GameState = {
      ...base,
      career: { ...base.career, phase: 'gameover', residencyWeek: 140 },
      gameOver: { reason: 'resigned_burnout', week: 130, triggeredByEventId: 'crisis_burnout_04_karar', selectedChoiceId: 'istifa_et' },
    };
    const report = buildCareerReport(state);
    expect(report.ending).toEqual({ kind: 'gameover', reason: 'resigned_burnout', week: 130 });
    expect(report.career.weeksCompleted).toBe(130);
  });

  it('financial collapse: economy fields reflect financialPressure, not the live balance alone', () => {
    const base = residencyState('baskent_ic', 'career-financial');
    const state: GameState = {
      ...base,
      career: { ...base.career, phase: 'gameover' },
      gameOver: { reason: 'financial_collapse', week: 60 },
      financialPressure: { consecutiveNegativeMonths: 5, lowestBalance: -21300 },
      resources: { ...base.resources, money: -8000 },
    };
    const report = buildCareerReport(state);
    expect(report.economy.lowestBalance).toBe(-21300);
    expect(report.economy.finalBalance).toBe(-8000);
  });

  it('short career: a career ending after just a few weeks still produces a coherent report (no crash on sparse data)', () => {
    const base = residencyState('baskent_ic', 'career-short');
    const state: GameState = {
      ...base,
      career: { ...base.career, phase: 'gameover', residencyWeek: 8 },
      gameOver: { reason: 'financial_collapse', week: 8 },
    };
    const report = buildCareerReport(state);
    expect(report.career.weeksCompleted).toBe(8);
    expect(report.notableEvents).toEqual([]);
    // Template NPCs (Barış etc.) exist in the roster from week 1, so even
    // a short career still gets neutral-tier callback lines for them —
    // it's only PROCEDURAL-NPC affinity/grudge callbacks that need real
    // accumulated history and are absent here.
    expect(report.relationships.every((r) => ['baris', 'zeynep_sekreter', 'hoca_erhan', 'deniz_comez'].includes(r.npcId))).toBe(true);
    expect(report.hierarchyBehavior.outcome).toBe('mixed');
  });

  it('full 5-year surgery career: branch/duration reflect the longer program', () => {
    const base = residencyState('porsuk_cerrahi', 'career-surgery');
    const state: GameState = {
      ...base,
      career: { ...base.career, phase: 'specialist', residencyWeek: 260, seniorityStage: 'kidemli' },
      status: 'specialist',
    };
    const report = buildCareerReport(state);
    expect(report.career.branchName).toBe('Genel Cerrahi');
    expect(report.career.durationLabel).toBe('5 yıl');
  });

  it('behavior supportive: majority-supportive behaviorStats produce broke_cycle', () => {
    const base = residencyState('baskent_ic', 'career-supportive');
    const state: GameState = {
      ...base,
      career: { ...base.career, phase: 'specialist' },
      status: 'specialist',
      behaviorStats: { 'junior:supportive': 8, 'hierarchy:protective': 4, 'junior:exploitative': 1 },
    };
    const report = buildCareerReport(state);
    expect(report.hierarchyBehavior.outcome).toBe('broke_cycle');
    expect(report.hierarchyBehavior.title).toBe('DÖNGÜYÜ KIRDIN');
  });

  it('behavior exploitative: majority-negative behaviorStats produce repeated_cycle', () => {
    const base = residencyState('baskent_ic', 'career-exploitative');
    const state: GameState = {
      ...base,
      career: { ...base.career, phase: 'specialist' },
      status: 'specialist',
      behaviorStats: { 'junior:exploitative': 8, 'hierarchy:abusive': 4, 'junior:supportive': 1 },
    };
    const report = buildCareerReport(state);
    expect(report.hierarchyBehavior.outcome).toBe('repeated_cycle');
    expect(report.hierarchyBehavior.title).toBe('DEVİR TESLİM');
  });

  it('never fabricates absurdStats entries with zero backing count', () => {
    const state = residencyState('baskent_ic', 'career-absurd');
    const report = buildCareerReport(state);
    expect(report.absurdStats).toEqual([]);
  });

  it('§52 — is fully deterministic: same state in, byte-identical report out', () => {
    const state = residencyState('baskent_ic', 'career-determinism');
    const a = buildCareerReport(state);
    const b = buildCareerReport(state);
    expect(a).toEqual(b);
  });
});
