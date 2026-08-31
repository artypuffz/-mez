import { describe, expect, it } from 'vitest';
import { pickTusExamEvents } from './pickTusExamEvents';
import { createSeededRng } from '../rng/seededRng';
import { TUS_EXAM_EVENT_DEFINITIONS } from '../config/tusExamEvents';

describe('pickTusExamEvents', () => {
  it('picks the requested count with no duplicates', () => {
    const picked = pickTusExamEvents(TUS_EXAM_EVENT_DEFINITIONS, 4, createSeededRng('pick-count'));
    expect(picked).toHaveLength(4);
    expect(new Set(picked.map((e) => e.id)).size).toBe(4);
  });

  it('is deterministic for the same seed', () => {
    const a = pickTusExamEvents(TUS_EXAM_EVENT_DEFINITIONS, 4, createSeededRng('pick-seed'));
    const b = pickTusExamEvents(TUS_EXAM_EVENT_DEFINITIONS, 4, createSeededRng('pick-seed'));
    expect(a.map((e) => e.id)).toEqual(b.map((e) => e.id));
  });

  it('usually differs for different seeds', () => {
    const a = pickTusExamEvents(TUS_EXAM_EVENT_DEFINITIONS, 4, createSeededRng('pick-seed-a'));
    const b = pickTusExamEvents(TUS_EXAM_EVENT_DEFINITIONS, 4, createSeededRng('pick-seed-b'));
    expect(a.map((e) => e.id)).not.toEqual(b.map((e) => e.id));
  });

  it('never picks more than the pool has', () => {
    const picked = pickTusExamEvents(TUS_EXAM_EVENT_DEFINITIONS, 999, createSeededRng('pick-overflow'));
    expect(picked).toHaveLength(TUS_EXAM_EVENT_DEFINITIONS.length);
  });
});
