import { describe, expect, it } from 'vitest';
import { getSeniorityStage } from './seniority';

const IC_HASTALIKLARI_WEEKS = 4 * 52; // 208
const GENEL_CERRAHI_WEEKS = 5 * 52; // 260

describe('getSeniorityStage', () => {
  it('starts as comez at week 0', () => {
    expect(getSeniorityStage(0, IC_HASTALIKLARI_WEEKS)).toBe('comez');
  });

  it('stays comez right at the 30% boundary and flips just after it (208-week branch)', () => {
    // 0.3 * 208 = 62.4
    expect(getSeniorityStage(62, IC_HASTALIKLARI_WEEKS)).toBe('comez'); // 62/208 = 0.298
    expect(getSeniorityStage(63, IC_HASTALIKLARI_WEEKS)).toBe('orta'); // 63/208 = 0.3029
  });

  it('stays orta right at the 70% boundary and flips just after it (208-week branch)', () => {
    // 0.7 * 208 = 145.6
    expect(getSeniorityStage(145, IC_HASTALIKLARI_WEEKS)).toBe('orta'); // 145/208 = 0.6971
    expect(getSeniorityStage(146, IC_HASTALIKLARI_WEEKS)).toBe('kidemli'); // 146/208 = 0.7019
  });

  it('lands exactly on the boundary ratios for a 260-week branch', () => {
    // 0.3 * 260 = 78 exactly, 0.7 * 260 = 182 exactly
    expect(getSeniorityStage(78, GENEL_CERRAHI_WEEKS)).toBe('comez');
    expect(getSeniorityStage(79, GENEL_CERRAHI_WEEKS)).toBe('orta');
    expect(getSeniorityStage(182, GENEL_CERRAHI_WEEKS)).toBe('orta');
    expect(getSeniorityStage(183, GENEL_CERRAHI_WEEKS)).toBe('kidemli');
  });

  it('is kidemli at the final week of residency', () => {
    expect(getSeniorityStage(IC_HASTALIKLARI_WEEKS, IC_HASTALIKLARI_WEEKS)).toBe('kidemli');
    expect(getSeniorityStage(GENEL_CERRAHI_WEEKS, GENEL_CERRAHI_WEEKS)).toBe('kidemli');
  });

  it('normalizes by branch length: the same absolute week means different stages', () => {
    // week 70: 70/208 = 0.337 (orta) vs 70/260 = 0.269 (still comez) —
    // the longer branch stays comez longer in absolute weeks.
    expect(getSeniorityStage(70, IC_HASTALIKLARI_WEEKS)).toBe('orta');
    expect(getSeniorityStage(70, GENEL_CERRAHI_WEEKS)).toBe('comez');
  });
});
