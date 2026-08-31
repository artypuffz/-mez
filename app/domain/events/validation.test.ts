import { describe, expect, it } from 'vitest';
import { validateEventContent, hasValidationErrors } from './validation';

function baseEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ev_1', title: 'T', description: 'D', category: 'GENERAL', triggerMode: 'pool',
    choices: [{ id: 'a', text: 'A' }],
    ...overrides,
  };
}

function errorsFor(rawEvents: unknown[]) {
  return validateEventContent(rawEvents).issues.filter((i) => i.severity === 'error');
}

describe('validateEventContent', () => {
  it('accepts a well-formed event with no errors', () => {
    const { issues } = validateEventContent([baseEvent()]);
    expect(hasValidationErrors(issues)).toBe(false);
  });

  it('flags duplicate event ids', () => {
    const errors = errorsFor([baseEvent(), baseEvent()]);
    expect(errors.some((e) => e.message.includes('duplicate event id'))).toBe(true);
  });

  it('flags an invalid triggerMode', () => {
    const errors = errorsFor([baseEvent({ triggerMode: 'sometimes' })]);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('flags a scheduled event missing chainId/chainCheckpoint', () => {
    const errors = errorsFor([baseEvent({ triggerMode: 'scheduled' })]);
    expect(errors.some((e) => e.message.includes('chainId/chainCheckpoint'))).toBe(true);
  });

  it('flags a followUpEvent pointing to a checkpoint nothing declares', () => {
    const withDanglingFollowUp = baseEvent({
      choices: [{ id: 'a', text: 'A', followUpEvent: { chainId: 'ghost', checkpoint: 'stageX', delayWeeks: 1 } }],
    });
    const errors = errorsFor([withDanglingFollowUp]);
    expect(errors.some((e) => e.message.includes('unknown checkpoint'))).toBe(true);
  });

  it('does not flag a followUpEvent pointing to a checkpoint that IS declared', () => {
    const source = baseEvent({
      choices: [{ id: 'a', text: 'A', followUpEvent: { chainId: 'x', checkpoint: 'stage2', delayWeeks: 1 } }],
    });
    const target = baseEvent({ id: 'ev_2', triggerMode: 'scheduled', chainId: 'x', chainCheckpoint: 'stage2' });
    const errors = errorsFor([source, target]);
    expect(errors.some((e) => e.message.includes('unknown checkpoint'))).toBe(false);
  });

  it('flags more than one fallback candidate for the same checkpoint', () => {
    const f1 = baseEvent({ id: 'f1', triggerMode: 'scheduled', chainId: 'x', chainCheckpoint: 'stage2', isFallback: true });
    const f2 = baseEvent({ id: 'f2', triggerMode: 'scheduled', chainId: 'x', chainCheckpoint: 'stage2', isFallback: true });
    const errors = errorsFor([f1, f2]);
    expect(errors.some((e) => e.message.includes('fallback candidates'))).toBe(true);
  });

  it('warns (not errors) when a checkpoint has no fallback candidate at all', () => {
    const single = baseEvent({ id: 'single', triggerMode: 'scheduled', chainId: 'x', chainCheckpoint: 'stage2' });
    const { issues } = validateEventContent([single]);
    expect(hasValidationErrors(issues)).toBe(false);
    expect(issues.some((i) => i.severity === 'warning' && i.message.includes('no isFallback candidate'))).toBe(true);
  });

  it('rejects an invalid requirement operator shape', () => {
    const errors = errorsFor([baseEvent({ requirements: { stat: 'career.week', unknownOperator: 5 } })]);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects an invalid resource name in immediateEffects', () => {
    const errors = errorsFor([
      baseEvent({ choices: [{ id: 'a', text: 'A', immediateEffects: { happiness: 5 } }] }),
    ]);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects an invalid relationship field', () => {
    const errors = errorsFor([
      baseEvent({ choices: [{ id: 'a', text: 'A', relationshipEffects: [{ npc: 'x', charisma: 5 }] }] }),
    ]);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a malformed behaviorTag', () => {
    const errors = errorsFor([
      baseEvent({ choices: [{ id: 'a', text: 'A', behaviorTags: ['NotLowercaseNoColon'] }] }),
    ]);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects an event with an empty choice list', () => {
    const errors = errorsFor([baseEvent({ choices: [] })]);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects duplicate choice ids within one event', () => {
    const errors = errorsFor([baseEvent({ choices: [{ id: 'a', text: 'A' }, { id: 'a', text: 'B' }] })]);
    expect(errors.some((e) => e.message.includes('duplicate choice id'))).toBe(true);
  });

  it('rejects impossible numeric values (negative weight, negative cooldown, non-positive delayWeeks)', () => {
    expect(errorsFor([baseEvent({ weight: -5 })]).length).toBeGreaterThan(0);
    expect(errorsFor([baseEvent({ cooldownWeeks: -1 })]).length).toBeGreaterThan(0);
    expect(
      errorsFor([baseEvent({ choices: [{ id: 'a', text: 'A', followUpEvent: { chainId: 'x', checkpoint: 'y', delayWeeks: 0 } }] })])
        .length
    ).toBeGreaterThan(0);
  });
});
