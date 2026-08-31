import { describe, expect, it } from 'vitest';
import { isOnCooldown, recordTrigger } from './cooldown';
import type { EventDefinition } from './types';

const event: EventDefinition = {
  id: 'ev_1', title: 'T', description: 'D', category: 'GENERAL', triggerMode: 'pool',
  cooldownWeeks: 10, choices: [{ id: 'a', text: 'A' }],
};

const noCooldownEvent: EventDefinition = { ...event, id: 'ev_2', cooldownWeeks: undefined };
const oneShotEvent: EventDefinition = { ...event, id: 'ev_3', cooldownWeeks: 999 };

describe('isOnCooldown', () => {
  it('is not on cooldown when never triggered', () => {
    expect(isOnCooldown(event, 5, {})).toBe(false);
  });

  it('is on cooldown right after triggering', () => {
    const cooldowns = recordTrigger({}, event.id, 10);
    expect(isOnCooldown(event, 12, cooldowns)).toBe(true); // 12-10=2 < 10
  });

  it('comes off cooldown once the gap passes cooldownWeeks', () => {
    const cooldowns = recordTrigger({}, event.id, 10);
    expect(isOnCooldown(event, 19, cooldowns)).toBe(true); // 9 < 10
    expect(isOnCooldown(event, 20, cooldowns)).toBe(false); // 10 >= 10
  });

  it('has no restriction when cooldownWeeks is absent', () => {
    const cooldowns = recordTrigger({}, noCooldownEvent.id, 10);
    expect(isOnCooldown(noCooldownEvent, 11, cooldowns)).toBe(false);
  });

  it('cooldownWeeks: 999 stays on cooldown for the practical length of a residency', () => {
    const cooldowns = recordTrigger({}, oneShotEvent.id, 1);
    expect(isOnCooldown(oneShotEvent, 260, cooldowns)).toBe(true);
  });
});
