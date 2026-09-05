import { describe, expect, it } from 'vitest';
import { selectAvailablePrograms } from './selectors';
import { createInitialGameState } from './createInitialGameState';
import { beginTus } from './transitions';
import { proceedToPreference } from './tusTransitions';
import type { GameState } from './types';
import { PRODUCTION_PROGRAMS, LEGACY_PROGRAMS } from '../config/residencyPrograms';
import { resolveEntryThreshold } from '../tus/resolveEntryThreshold';
import { DEFAULT_TUS_SCORE_CONFIG } from '../config/tusScoreConfig';

// Android Device QA Hotfix 1, Issues 2 & 3 — this is the ONE production
// trigger for new-game TUS discovery (screens/Tus/TusPreferenceListScreen.tsx
// reads state through it), so it is the correct place to prove both:
// (a) score materially gates which programs are visible, and
// (b) new-game discovery contains zero legacy fictional programs.
function stateWithScore(score: number): GameState {
  const initial = createInitialGameState({ name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' });
  let state = proceedToPreference(beginTus(initial));
  state = { ...state, career: { ...state.career, tusScore: score } };
  return state;
}

describe('selectAvailablePrograms', () => {
  it('returns nothing before a TUS score exists', () => {
    const initial = createInitialGameState({ name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' });
    const state = proceedToPreference(beginTus(initial));
    expect(selectAvailablePrograms(state)).toEqual([]);
  });

  // Issue 3 — the core fictional-program-removal requirement.
  it('never includes a legacy fictional program, at any score', () => {
    const legacyIds = new Set(LEGACY_PROGRAMS.map((p) => p.id));
    for (const score of [20, 45, 65, 85, 98]) {
      const available = selectAvailablePrograms(stateWithScore(score));
      for (const program of available) {
        expect(legacyIds.has(program.id)).toBe(false);
      }
    }
  });

  it('only ever returns real production programs', () => {
    const productionIds = new Set(PRODUCTION_PROGRAMS.map((p) => p.id));
    const available = selectAvailablePrograms(stateWithScore(DEFAULT_TUS_SCORE_CONFIG.maxScore));
    expect(available.length).toBeGreaterThan(0);
    for (const program of available) {
      expect(productionIds.has(program.id)).toBe(true);
    }
  });

  // Issue 2 — a low score must not unlock everything (the reported bug).
  it('a low score cannot select every program', () => {
    const low = selectAvailablePrograms(stateWithScore(DEFAULT_TUS_SCORE_CONFIG.minScore));
    expect(low.length).toBeLessThan(PRODUCTION_PROGRAMS.length);
  });

  it('increasing score monotonically expands or holds steady the available set', () => {
    const scores = [50, 55, 60, 65, 70, 75, 80, 85];
    let previousIds: Set<string> = new Set();
    let previousCount = 0;
    for (const score of scores) {
      const available = selectAvailablePrograms(stateWithScore(score));
      for (const id of previousIds) {
        expect(available.some((p) => p.id === id)).toBe(true);
      }
      expect(available.length).toBeGreaterThanOrEqual(previousCount);
      previousIds = new Set(available.map((p) => p.id));
      previousCount = available.length;
    }
  });

  // High-demand branches (tier 5, e.g. plastik_cerrahi) must require a
  // meaningfully stronger score than low-demand ones (tier 1, e.g.
  // aile_hekimligi) to remain selectable.
  it('high-demand branches require a meaningfully stronger score than low-demand ones', () => {
    const lowDemand = PRODUCTION_PROGRAMS.filter((p) => p.branchId === 'aile_hekimligi');
    const highDemand = PRODUCTION_PROGRAMS.filter((p) => p.branchId === 'plastik_cerrahi');
    expect(lowDemand.length).toBeGreaterThan(0);
    expect(highDemand.length).toBeGreaterThan(0);
    const avgThreshold = (programs: typeof lowDemand) =>
      programs.reduce((sum, p) => sum + (resolveEntryThreshold(p) ?? 0), 0) / programs.length;
    expect(avgThreshold(highDemand)).toBeGreaterThan(avgThreshold(lowDemand));
  });

  it('every realistic score band retains at least one valid career option', () => {
    for (let score = DEFAULT_TUS_SCORE_CONFIG.minScore; score <= DEFAULT_TUS_SCORE_CONFIG.maxScore; score += 5) {
      expect(selectAvailablePrograms(stateWithScore(score)).length).toBeGreaterThan(0);
    }
  });

  it('a very high score unlocks the broadest possible choice (every production program)', () => {
    const available = selectAvailablePrograms(stateWithScore(DEFAULT_TUS_SCORE_CONFIG.maxScore));
    expect(available.length).toBe(PRODUCTION_PROGRAMS.length);
  });
});
