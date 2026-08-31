import { describe, expect, it } from 'vitest';
import { getVisibleChoices, isEventEligible } from './choices';
import { buildRequirementContext } from './requirements';
import { createInitialGameState } from '../state/createInitialGameState';
import type { SeniorityStage } from '../state/types';
import type { EventDefinition } from './types';

function ctx(seniorityStage: SeniorityStage) {
  const base = createInitialGameState({ name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' });
  return buildRequirementContext({ ...base, career: { ...base.career, seniorityStage } });
}

const eventWithGatedChoice: EventDefinition = {
  id: 'ev_1', title: 'T', description: 'D', category: 'CAREER', triggerMode: 'pool',
  choices: [
    { id: 'always', text: 'Always visible' },
    { id: 'kidemli_only', text: 'Kıdemli only', requirements: { stat: 'career.seniorityStage', eq: 'kidemli' } },
  ],
};

const eventWithOnlyGatedChoices: EventDefinition = {
  id: 'ev_2', title: 'T', description: 'D', category: 'CAREER', triggerMode: 'pool',
  choices: [
    { id: 'kidemli_only', text: 'Kıdemli only', requirements: { stat: 'career.seniorityStage', eq: 'kidemli' } },
  ],
};

describe('getVisibleChoices', () => {
  it('hides a choice whose requirements fail', () => {
    const visible = getVisibleChoices(eventWithGatedChoice, ctx('comez'));
    expect(visible.map((c) => c.id)).toEqual(['always']);
  });

  it('shows a gated choice once its requirements pass', () => {
    const visible = getVisibleChoices(eventWithGatedChoice, ctx('kidemli'));
    expect(visible.map((c) => c.id)).toEqual(['always', 'kidemli_only']);
  });
});

describe('isEventEligible', () => {
  it('is eligible when at least one choice is visible', () => {
    expect(isEventEligible(eventWithGatedChoice, ctx('comez'))).toBe(true);
  });

  it('is NOT eligible when every choice is gated out — never a choiceless screen', () => {
    expect(isEventEligible(eventWithOnlyGatedChoices, ctx('comez'))).toBe(false);
    expect(isEventEligible(eventWithOnlyGatedChoices, ctx('kidemli'))).toBe(true);
  });
});
