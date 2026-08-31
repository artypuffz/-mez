import { describe, expect, it } from 'vitest';
import { createScopedRng, createSeededRng, generateRandomSeed } from './seededRng';

describe('createSeededRng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createSeededRng('comez-test-seed');
    const b = createSeededRng('comez-test-seed');
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces a different sequence for a different seed', () => {
    const a = createSeededRng('seed-one');
    const b = createSeededRng('seed-two');
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('next() stays within [0, 1)', () => {
    const rng = createSeededRng('range-check');
    for (let i = 0; i < 500; i++) {
      const n = rng.next();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });

  it('int() stays within the requested inclusive bounds', () => {
    const rng = createSeededRng('bounds-check');
    for (let i = 0; i < 500; i++) {
      const n = rng.int(3, 8);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(8);
    }
  });

  it('pick() only returns elements from the given array', () => {
    const rng = createSeededRng('pick-check');
    const options = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) {
      expect(options).toContain(rng.pick(options));
    }
  });

  it('pick() throws on an empty array', () => {
    const rng = createSeededRng('empty-check');
    expect(() => rng.pick([])).toThrow();
  });
});

describe('createScopedRng', () => {
  it('is deterministic per base seed + scope', () => {
    const a = createScopedRng('base-seed', 'tus:score');
    const b = createScopedRng('base-seed', 'tus:score');
    expect(a.next()).toBe(b.next());
  });

  it('gives different scopes independent sequences', () => {
    const a = createScopedRng('base-seed', 'tus:examselect');
    const b = createScopedRng('base-seed', 'tus:score');
    expect(a.next()).not.toBe(b.next());
  });
});

describe('generateRandomSeed', () => {
  it('generates non-empty, mostly-distinct seeds', () => {
    const seeds = new Set(Array.from({ length: 20 }, () => generateRandomSeed()));
    expect(seeds.size).toBeGreaterThan(15);
    for (const s of seeds) {
      expect(s.length).toBeGreaterThan(0);
    }
  });
});
