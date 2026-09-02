import { describe, expect, it } from 'vitest';
import { resolveExpression } from './expressionResolver';

function res(overrides: Partial<{ stress: number; fatigue: number; burnout: number; health: number }> = {}) {
  return { stress: 10, fatigue: 10, burnout: 0, health: 100, ...overrides };
}

describe('resolveExpression', () => {
  it('is normal at low/healthy resource levels', () => {
    expect(resolveExpression(res())).toBe('normal');
  });

  it('is burned_out when burnout is high, regardless of other resources', () => {
    expect(resolveExpression(res({ burnout: 85, stress: 0, fatigue: 0, health: 100 }))).toBe('burned_out');
  });

  it('is unhealthy when health is very low and burnout is not yet critical', () => {
    expect(resolveExpression(res({ health: 10, burnout: 20 }))).toBe('unhealthy');
  });

  it('is exhausted at high fatigue (below the burned_out/unhealthy thresholds)', () => {
    expect(resolveExpression(res({ fatigue: 80, burnout: 20, health: 80 }))).toBe('exhausted');
  });

  it('is stressed at high stress alone', () => {
    expect(resolveExpression(res({ stress: 75, fatigue: 20, burnout: 10, health: 90 }))).toBe('stressed');
  });

  it('is tired at moderate stress/fatigue', () => {
    expect(resolveExpression(res({ stress: 45, fatigue: 20 }))).toBe('tired');
  });

  it('never itself mutates or returns anything but the expression value (read-only)', () => {
    const input = res({ stress: 50 });
    const before = { ...input };
    resolveExpression(input);
    expect(input).toEqual(before);
  });

  it('prioritizes burned_out over every other condition even when several thresholds are met at once', () => {
    expect(resolveExpression({ stress: 90, fatigue: 90, burnout: 90, health: 5 })).toBe('burned_out');
  });
});
