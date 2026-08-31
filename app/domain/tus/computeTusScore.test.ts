import { describe, expect, it } from 'vitest';
import { computeTusScore } from './computeTusScore';
import { createSeededRng } from '../rng/seededRng';
import { getTusPrepProfile, TUS_PREP_PROFILE_DEFINITIONS } from '../config/tusPrepProfiles';
import { DEFAULT_TUS_SCORE_CONFIG } from '../config/tusScoreConfig';

const disciplined = getTusPrepProfile('duzenli');
const panicked = getTusPrepProfile('son_ay_panik');

describe('computeTusScore', () => {
  it('is deterministic: same seed + same decisions = same score', () => {
    const examLog = [
      { eventId: 'sinav_sabahi', choiceId: 'hizli_bir_seyler' },
      { eventId: 'kitapcik_dagitimi', choiceId: 'nefes_al' },
    ];
    const a = computeTusScore(disciplined, examLog, createSeededRng('same-seed'));
    const b = computeTusScore(disciplined, examLog, createSeededRng('same-seed'));
    expect(a.score).toBe(b.score);
  });

  it('produces a meaningfully different average for a better vs worse prep profile', () => {
    const seeds = Array.from({ length: 200 }, (_, i) => `prep-avg-${i}`);
    const avg = (profile: typeof disciplined) =>
      seeds.reduce((sum, seed) => sum + computeTusScore(profile, [], createSeededRng(seed)).score, 0) /
      seeds.length;

    const avgDisciplined = avg(disciplined);
    const avgPanicked = avg(panicked);
    expect(avgDisciplined - avgPanicked).toBeGreaterThan(5);
  });

  it('stays within the configured score bounds across many runs', () => {
    for (let i = 0; i < 300; i++) {
      const profile = TUS_PREP_PROFILE_DEFINITIONS[i % TUS_PREP_PROFILE_DEFINITIONS.length];
      const { score } = computeTusScore(profile, [], createSeededRng(`bounds-${i}`));
      expect(score).toBeGreaterThanOrEqual(DEFAULT_TUS_SCORE_CONFIG.minScore);
      expect(score).toBeLessThanOrEqual(DEFAULT_TUS_SCORE_CONFIG.maxScore);
    }
  });

  it('normalizes the score to two decimal places', () => {
    for (let i = 0; i < 30; i++) {
      const { score } = computeTusScore(disciplined, [], createSeededRng(`decimals-${i}`));
      expect(Math.round(score * 100) / 100).toBeCloseTo(score, 9);
    }
  });

  it('lets exam-day choices move the score directionally', () => {
    const goodChoices = [
      { eventId: 'kitapcik_dagitimi', choiceId: 'nefes_al' }, // +2
      { eventId: 'ara_sosyal_medya', choiceId: 'telefonu_kapat' }, // +2
    ];
    const badChoices = [
      { eventId: 'arkadasin_cok_kolay', choiceId: 'paniklet' }, // -2
      { eventId: 'ara_sosyal_medya', choiceId: 'okumaya_devam' }, // -1
    ];
    const good = computeTusScore(disciplined, goodChoices, createSeededRng('exam-effect'));
    const bad = computeTusScore(disciplined, badChoices, createSeededRng('exam-effect'));
    expect(good.examModifier).toBeGreaterThan(bad.examModifier);
  });
});
