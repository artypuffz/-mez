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

  // Phase 8 §38 — content-authoring-quality checks (all warnings).
  describe('content quality warnings (§38)', () => {
    it('warns on an exact-duplicate title across different events', () => {
      const { issues } = validateEventContent([baseEvent({ id: 'a' }), baseEvent({ id: 'b' })]);
      expect(issues.some((i) => i.severity === 'warning' && i.message.includes('is reused verbatim'))).toBe(true);
    });

    it('does not warn on distinct titles', () => {
      const { issues } = validateEventContent([baseEvent({ id: 'a', title: 'X' }), baseEvent({ id: 'b', title: 'Y' })]);
      expect(issues.some((i) => i.message.includes('is reused verbatim'))).toBe(false);
    });

    it('warns on an overly long description', () => {
      const { issues } = validateEventContent([baseEvent({ description: 'x'.repeat(700) })]);
      expect(issues.some((i) => i.severity === 'warning' && i.message.includes('long for a mobile event'))).toBe(true);
    });

    it('warns on an overly long choice text', () => {
      const { issues } = validateEventContent([baseEvent({ choices: [{ id: 'a', text: 'x'.repeat(120) }] })]);
      expect(issues.some((i) => i.severity === 'warning' && i.message.includes('single-line choice'))).toBe(true);
    });

    it('warns when two choices share byte-identical immediateEffects', () => {
      const event = baseEvent({
        choices: [
          { id: 'a', text: 'A', immediateEffects: { stress: 5 } },
          { id: 'b', text: 'B', immediateEffects: { stress: 5 } },
        ],
      });
      const { issues } = validateEventContent([event]);
      expect(issues.some((i) => i.severity === 'warning' && i.message.includes('identical visible'))).toBe(true);
    });

    it('does not warn when both choices simply have no immediateEffects', () => {
      const event = baseEvent({ choices: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }] });
      const { issues } = validateEventContent([event]);
      expect(issues.some((i) => i.message.includes('identical visible'))).toBe(false);
    });

    it('warns on a requirement that demands the same stat equal two different values at once', () => {
      const event = baseEvent({
        requirements: { all: [{ stat: 'career.seniorityStage', eq: 'orta' }, { stat: 'career.seniorityStage', eq: 'kidemli' }] },
      });
      const { issues } = validateEventContent([event]);
      expect(issues.some((i) => i.severity === 'warning' && i.message.includes('unreachable requirement'))).toBe(true);
    });

    it('errors on a requiredNpcTemplate that does not match any authored template', () => {
      const errors = errorsFor([baseEvent({ requiredNpcTemplate: 'not_a_real_template' })]);
      expect(errors.some((e) => e.message.includes('does not match any authored NpcTemplate'))).toBe(true);
    });

    it('does not error on a requiredNpcTemplate that IS a real authored template', () => {
      const errors = errorsFor([baseEvent({ requiredNpcTemplate: 'baris' })]);
      expect(errors.some((e) => e.message.includes('does not match any authored NpcTemplate'))).toBe(false);
    });

    it('errors on a branchIn referencing an unknown branch id', () => {
      const errors = errorsFor([baseEvent({ requirements: { branchIn: ['not_a_real_branch'] } })]);
      expect(errors.some((e) => e.message.includes('unknown branch id'))).toBe(true);
    });

    it('does not error on a branchIn referencing a real branch id', () => {
      const errors = errorsFor([baseEvent({ requirements: { branchIn: ['ic_hastaliklari'] } })]);
      expect(errors.some((e) => e.message.includes('unknown branch id'))).toBe(false);
    });

    it('warns on once:true combined with a cooldownWeeks', () => {
      const { issues } = validateEventContent([baseEvent({ once: true, cooldownWeeks: 20 })]);
      expect(issues.some((i) => i.severity === 'warning' && i.message.includes('unreachable dead config'))).toBe(true);
    });

    it('does not warn when once:true has no cooldownWeeks', () => {
      const { issues } = validateEventContent([baseEvent({ once: true })]);
      expect(issues.some((i) => i.message.includes('unreachable dead config'))).toBe(false);
    });
  });

  // Phase 9 §50 — crisis system content-quality checks.
  describe('crisis content validation (§50)', () => {
    it('rejects a triggerMode:"crisis" event missing crisisType', () => {
      const errors = errorsFor([baseEvent({ triggerMode: 'crisis' })]);
      expect(errors.some((e) => e.message.includes('crisisType'))).toBe(true);
    });

    it('accepts a triggerMode:"crisis" event with a valid crisisType', () => {
      const errors = errorsFor([baseEvent({ triggerMode: 'crisis', crisisType: 'exhaustion' })]);
      expect(errors.length).toBe(0);
    });

    it('rejects an invalid crisisType value', () => {
      const errors = errorsFor([baseEvent({ triggerMode: 'crisis', crisisType: 'not_a_real_type' })]);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects an invalid severity value', () => {
      const errors = errorsFor([baseEvent({ triggerMode: 'crisis', crisisType: 'burnout', severity: 'apocalyptic' })]);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects crisisType set on a non-crisis (pool/scheduled) event', () => {
      const errors = errorsFor([baseEvent({ triggerMode: 'pool', crisisType: 'financial' })]);
      expect(errors.some((e) => e.message.includes('meaningless outside'))).toBe(true);
    });

    it('rejects a careerEffects entry with an unknown GameOverReason', () => {
      const errors = errorsFor([
        baseEvent({ choices: [{ id: 'a', text: 'A', careerEffects: [{ type: 'end_career', reason: 'quit_because_bored' }] }] }),
      ]);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('accepts a careerEffects entry with a valid GameOverReason', () => {
      const errors = errorsFor([
        baseEvent({ choices: [{ id: 'a', text: 'A', careerEffects: [{ type: 'end_career', reason: 'resigned_burnout' }] }] }),
      ]);
      expect(errors.length).toBe(0);
    });

    it('still catches a crisis chain dead-end via the existing dangling-followUpEvent check', () => {
      const crisisEntry = baseEvent({
        id: 'crisis_1', triggerMode: 'crisis', crisisType: 'exhaustion',
        chainId: 'c', chainCheckpoint: 'stage1',
        choices: [{ id: 'go', text: 'Go', followUpEvent: { chainId: 'c', checkpoint: 'stage2', delayWeeks: 1 } }],
      });
      // stage2 is never declared anywhere — a dead end.
      const errors = errorsFor([crisisEntry]);
      expect(errors.some((e) => e.message.includes('unknown checkpoint'))).toBe(true);
    });
  });
});
