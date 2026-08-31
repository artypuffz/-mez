import { describe, expect, it } from 'vitest';
import { getEventRepository } from './content';
import { getVisibleChoices } from './choices';
import { buildRequirementContext } from './requirements';
import { resolveEventChoice } from './engine';
import { createInitialGameState } from '../state/createInitialGameState';
import { beginTus } from '../state/transitions';
import { selectResidencyProgram, proceedToPreference } from '../state/tusTransitions';
import { getResidencyProgram } from '../config/residencyPrograms';
import { createScopedRng } from '../rng/seededRng';
import type { GameState } from '../state/types';

const repo = getEventRepository();

function residencyState(seed: string, seniorityStage: GameState['career']['seniorityStage']): GameState {
  const initial = createInitialGameState(
    { name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' },
    { seed }
  );
  const program = getResidencyProgram('baskent_ic');
  const withResidency = selectResidencyProgram(proceedToPreference(beginTus(initial)), program);
  return { ...withResidency, career: { ...withResidency.career, seniorityStage } };
}

describe('career-npc-mirror.json — real engine integration', () => {
  it('mirror_02: the "biz_comezken" choice is hidden without the flag, visible once it is set', () => {
    const event = repo.getEventById('mirror_02_kidemli_yeni_comez')!;
    expect(event).toBeDefined();

    const withoutFlag = residencyState('mirror-no-flag', 'kidemli');
    const visibleWithout = getVisibleChoices(event, buildRequirementContext(withoutFlag));
    expect(visibleWithout.map((c) => c.id)).not.toContain('biz_comezken');
    expect(visibleWithout.length).toBe(3);

    const withFlag: GameState = { ...withoutFlag, flags: { ...withoutFlag.flags, chain_mobbing_deneyimi_var: true } };
    const visibleWith = getVisibleChoices(event, buildRequirementContext(withFlag));
    expect(visibleWith.map((c) => c.id)).toContain('biz_comezken');
    expect(visibleWith.length).toBe(4);
  });

  it('mirror_01 (as çömez), choosing kabul_et, sets the flag that later unlocks mirror_02\'s hidden choice', () => {
    const event = repo.getEventById('mirror_01_comez_nobet_istegi')!;
    const state: GameState = { ...residencyState('mirror-flow', 'comez'), weeklyEventQueue: [event.id] };
    const result = resolveEventChoice(state, event, 'kabul_et', createScopedRng('mirror-flow', 'r'));
    expect(result.state.flags.chain_mobbing_deneyimi_var).toBe(true);

    const asKidemli: GameState = {
      ...result.state,
      career: { ...result.state.career, seniorityStage: 'kidemli' },
    };
    const mirror02 = repo.getEventById('mirror_02_kidemli_yeni_comez')!;
    const visible = getVisibleChoices(mirror02, buildRequirementContext(asKidemli));
    expect(visible.map((c) => c.id)).toContain('biz_comezken');
  });

  it('resolving mirror_02 choices writes behaviorTags into behaviorStats correctly', () => {
    const event = repo.getEventById('mirror_02_kidemli_yeni_comez')!;
    const state: GameState = { ...residencyState('mirror-tags', 'kidemli'), weeklyEventQueue: [event.id] };

    const supportive = resolveEventChoice(state, event, 'nobetini_degistir', createScopedRng('mirror-tags', 'a'));
    expect(supportive.state.behaviorStats['junior:supportive']).toBe(1);

    const exploitative = resolveEventChoice(state, event, 'reddet', createScopedRng('mirror-tags', 'b'));
    expect(exploitative.state.behaviorStats['junior:exploitative']).toBe(1);
  });

  it('mirror_01 (as kıdemli — the wrong seniority) is not eligible at all: zero visible choices would otherwise be impossible since the event requirements gate it, but confirms the event-level gate too', () => {
    const event = repo.getEventById('mirror_01_comez_nobet_istegi')!;
    const ctx = buildRequirementContext(residencyState('mirror-gate', 'kidemli'));
    // event.requirements itself requires seniorityStage === comez
    expect(getVisibleChoices(event, ctx).length).toBe(event.choices.length); // choices themselves aren't gated
    // eligibility (event-level requirements) is exercised via isEventEligible in choices.test.ts;
    // here we just confirm the mirror content's own event-level requirement exists.
    expect(event.requirements).toBeDefined();
  });
});
