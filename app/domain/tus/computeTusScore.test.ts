import { describe, expect, it } from 'vitest';
import { computeTusScore } from './computeTusScore';
import { pickTusExamEvents } from './pickTusExamEvents';
import { createSeededRng, type SeededRng } from '../rng/seededRng';
import { getTusPrepProfile, TUS_PREP_PROFILE_DEFINITIONS } from '../config/tusPrepProfiles';
import { TUS_EXAM_EVENT_DEFINITIONS } from '../config/tusExamEvents';
import { DEFAULT_TUS_SCORE_CONFIG } from '../config/tusScoreConfig';

const disciplined = getTusPrepProfile('duzenli');
const panicked = getTusPrepProfile('son_ay_panik');

// A minimal SeededRng test double that returns queued int()/next() values
// in call order, rather than deriving them from a hash — lets a test
// assert an exact, controlled outcome instead of searching seed-space for
// a low-probability combination.
function fakeRng({ ints, fractionals }: { ints: number[]; fractionals: number[] }): SeededRng {
  let intIndex = 0;
  let fractionalIndex = 0;
  return {
    int: () => ints[intIndex++],
    next: () => fractionals[fractionalIndex++],
    pick: (items) => items[0],
  };
}

describe('computeTusScore', () => {
  // TUS System Redesign — §1's hard requirement, tested directly against
  // literal values (not just "whatever the config says") so a future
  // accidental config edit can't silently satisfy a self-referential test.
  it('DEFAULT_TUS_SCORE_CONFIG declares exactly [50, 85]', () => {
    expect(DEFAULT_TUS_SCORE_CONFIG.minScore).toBe(50);
    expect(DEFAULT_TUS_SCORE_CONFIG.maxScore).toBe(85);
  });

  it('never returns a score below 50, across every prep profile and many rng seeds', () => {
    for (const profile of TUS_PREP_PROFILE_DEFINITIONS) {
      for (let i = 0; i < 100; i++) {
        const { score } = computeTusScore(profile, [], createSeededRng(`floor-${profile.id}-${i}`));
        expect(score).toBeGreaterThanOrEqual(50);
      }
    }
  });

  it('never returns a score above 85, across every prep profile and many rng seeds', () => {
    for (const profile of TUS_PREP_PROFILE_DEFINITIONS) {
      for (let i = 0; i < 100; i++) {
        const pickRng = createSeededRng(`ceiling-pick-${profile.id}-${i}`);
        const events = pickTusExamEvents(TUS_EXAM_EVENT_DEFINITIONS, DEFAULT_TUS_SCORE_CONFIG.examEventCount, pickRng);
        const examLog = events.map((e) => ({ eventId: e.id, choiceId: pickRng.pick(e.choices).id }));
        const { score } = computeTusScore(profile, examLog, createSeededRng(`ceiling-${profile.id}-${i}`));
        expect(score).toBeLessThanOrEqual(85);
      }
    }
  });

  // The real attainable range must actually REACH both ends, not just stay
  // inside them — proves the [50, 85] requirement was met by construction
  // (deliberate worst/best combination), not by clamping a wider range
  // down so the ends are technically unreachable dead zones. Uses a
  // controlled fake RNG that returns the exact extreme int()/next() values
  // computeTusScore.ts's own header comment claims — a random seed search
  // would need on the order of 56 (int x2) * 200 (fractional < 0.005)
  // tries to find the floor by chance, so this proves it directly instead.
  it('the exact floor (50) and a rounded ceiling (85) are both genuinely reachable', () => {
    const worstProfile = TUS_PREP_PROFILE_DEFINITIONS.reduce((a, b) => (b.baseModifier < a.baseModifier ? b : a));
    const bestProfile = TUS_PREP_PROFILE_DEFINITIONS.reduce((a, b) => (b.baseModifier > a.baseModifier ? b : a));
    const worstPerEvent = [...TUS_EXAM_EVENT_DEFINITIONS].sort(
      (a, b) => Math.min(...a.choices.map((c) => c.scoreModifier ?? 0)) - Math.min(...b.choices.map((c) => c.scoreModifier ?? 0))
    ).slice(0, DEFAULT_TUS_SCORE_CONFIG.examEventCount);
    const bestPerEvent = [...TUS_EXAM_EVENT_DEFINITIONS].sort(
      (a, b) => Math.max(...b.choices.map((c) => c.scoreModifier ?? 0)) - Math.max(...a.choices.map((c) => c.scoreModifier ?? 0))
    ).slice(0, DEFAULT_TUS_SCORE_CONFIG.examEventCount);
    const worstLog = worstPerEvent.map((e) => ({
      eventId: e.id,
      choiceId: e.choices.reduce((a, b) => ((b.scoreModifier ?? 0) < (a.scoreModifier ?? 0) ? b : a)).id,
    }));
    const bestLog = bestPerEvent.map((e) => ({
      eventId: e.id,
      choiceId: e.choices.reduce((a, b) => ((b.scoreModifier ?? 0) > (a.scoreModifier ?? 0) ? b : a)).id,
    }));

    // int(-3,4) floor is -3, int(-3,3) floor is -3; next() at 0 is the
    // fractional floor. int(-3,4) ceiling is 4, int(-3,3) ceiling is 3;
    // next() just under 1 is the fractional ceiling.
    const worstRng = fakeRng({ ints: [-3, -3], fractionals: [0] });
    const bestRng = fakeRng({ ints: [4, 3], fractionals: [0.999999] });

    expect(computeTusScore(worstProfile, worstLog, worstRng).score).toBe(50);
    expect(computeTusScore(bestProfile, bestLog, bestRng).score).toBeGreaterThanOrEqual(84.99);
  });


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

  it('keeps the large majority of realistic outcomes in the 50-80 band', () => {
    // Simulates "typical" play: a prep profile and exam choices picked
    // without trying to game the score in either direction. Empirically
    // ~99% lands in [50, 80] (mean ~67) — asserting a looser 90% floor
    // here so this stays a regression guard, not a brittle exact-match.
    const total = 2000;
    let inBand = 0;
    for (let i = 0; i < total; i++) {
      const seed = `band-${i}`;
      const pickRng = createSeededRng(`${seed}:pick`);
      const profile = TUS_PREP_PROFILE_DEFINITIONS[i % TUS_PREP_PROFILE_DEFINITIONS.length];
      const events = pickTusExamEvents(TUS_EXAM_EVENT_DEFINITIONS, 4, pickRng);
      const examLog = events.map((e) => ({ eventId: e.id, choiceId: pickRng.pick(e.choices).id }));
      const { score } = computeTusScore(profile, examLog, createSeededRng(`${seed}:score`));
      if (score >= 50 && score <= 80) inBand++;
    }
    expect(inBand / total).toBeGreaterThan(0.9);
  });
});
