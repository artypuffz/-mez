import { describe, expect, it } from 'vitest';
import { getEventRepository } from '../events/content';
import { buildRequirementContext } from '../events/requirements';
import { getVisibleChoices } from '../events/choices';
import { createInitialGameState } from '../state/createInitialGameState';
import { beginTus } from '../state/transitions';
import { selectResidencyProgram, proceedToPreference } from '../state/tusTransitions';
import { getResidencyProgram } from '../config/residencyPrograms';
import type { GameState } from '../state/types';

// Phase 9 §27/§45 — "acceptance criterion": the SAME crisis event, in the
// SAME resource state, must offer a different set of choices depending on
// whether the bound NPC is a high-trust protective factor or not. This is
// what makes relationship-building matter beyond flavor text.
const repo = getEventRepository();

function baseState(seed: string): GameState {
  const initial = createInitialGameState(
    { name: 'Ada', age: 26, gender: 'kadın', hometown: 'İzmir', background: 'aile_yaninda' },
    { seed }
  );
  return selectResidencyProgram(proceedToPreference(beginTus(initial)), getResidencyProgram('baskent_ic'));
}

function firstNpcIdByRole(state: GameState, role: string): string {
  const found = Object.values(state.npcs).find((n) => n.role === role && n.active);
  if (!found) throw new Error(`Fixture error: no active NPC with role "${role}" in the generated roster`);
  return found.id;
}

describe('crisis protective factors — NPC trust (§27/§45)', () => {
  it('exhaustion crisis: "arkadaştan yardım iste" is only visible when the bound friend has high trust', () => {
    const state = baseState('protective-npc');
    const event = repo.getEventById('crisis_exhaustion_01_bir_gun_daha')!;
    const friendId = firstNpcIdByRole(state, 'peer_resident');

    const lowTrustState: GameState = {
      ...state,
      relationships: { ...state.relationships, [friendId]: { trust: 2, friendship: 0, grudge: 0 } },
    };
    const lowTrustChoices = getVisibleChoices(event, buildRequirementContext(lowTrustState, { friend: friendId }));
    expect(lowTrustChoices.map((c) => c.id)).not.toContain('arkadastan_yardim');
    // The event stays eligible either way — a fallback always exists.
    expect(lowTrustChoices.length).toBeGreaterThan(0);

    const highTrustState: GameState = {
      ...state,
      relationships: { ...state.relationships, [friendId]: { trust: 10, friendship: 0, grudge: 0 } },
    };
    const highTrustChoices = getVisibleChoices(event, buildRequirementContext(highTrustState, { friend: friendId }));
    expect(highTrustChoices.map((c) => c.id)).toContain('arkadastan_yardim');
  });

  it('burnout crisis: "arkadaşınla konuş" is only visible when the bound friend has high trust', () => {
    const state = baseState('protective-npc-burnout');
    const event = repo.getEventById('crisis_burnout_01_yeter')!;
    const friendId = firstNpcIdByRole(state, 'peer_resident');

    const lowTrustState: GameState = {
      ...state,
      relationships: { ...state.relationships, [friendId]: { trust: 0, friendship: 0, grudge: 0 } },
    };
    const lowTrustChoices = getVisibleChoices(event, buildRequirementContext(lowTrustState, { friend: friendId }));
    expect(lowTrustChoices.map((c) => c.id)).not.toContain('arkadasla_konus');

    const highTrustState: GameState = {
      ...state,
      relationships: { ...state.relationships, [friendId]: { trust: 8, friendship: 0, grudge: 0 } },
    };
    const highTrustChoices = getVisibleChoices(event, buildRequirementContext(highTrustState, { friend: friendId }));
    expect(highTrustChoices.map((c) => c.id)).toContain('arkadasla_konus');
  });

  it('financial crisis: "arkadaştan borç al" gated by trust, "aileden yardım iste" gated by lives_with_family background flag (§28)', () => {
    const state = baseState('protective-npc-financial');
    const event = repo.getEventById('crisis_financial_01_hesap_sifirin_altinda')!;
    const friendId = firstNpcIdByRole(state, 'peer_resident');

    const noProtectionState: GameState = {
      ...state,
      flags: { ...state.flags, lives_with_family: false },
      relationships: { ...state.relationships, [friendId]: { trust: 1, friendship: 0, grudge: 0 } },
    };
    const noProtectionChoices = getVisibleChoices(event, buildRequirementContext(noProtectionState, { friend: friendId }));
    expect(noProtectionChoices.map((c) => c.id)).not.toContain('arkadastan_borc_al');
    expect(noProtectionChoices.map((c) => c.id)).not.toContain('aileden_yardim_iste');
    // background does NOT make the player immune — always-available choices remain.
    expect(noProtectionChoices.map((c) => c.id)).toEqual(expect.arrayContaining(['ekstra_nobet_kabul_et', 'harcamalari_kis']));

    const bothProtectionsState: GameState = {
      ...state,
      flags: { ...state.flags, lives_with_family: true },
      relationships: { ...state.relationships, [friendId]: { trust: 9, friendship: 0, grudge: 0 } },
    };
    const bothProtectionsChoices = getVisibleChoices(event, buildRequirementContext(bothProtectionsState, { friend: friendId }));
    expect(bothProtectionsChoices.map((c) => c.id)).toEqual(
      expect.arrayContaining(['arkadastan_borc_al', 'aileden_yardim_iste'])
    );
  });
});
