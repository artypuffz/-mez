import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './createInitialGameState';
import { beginTus } from './transitions';

describe('beginTus', () => {
  it('moves the phase to tus without mutating the input state', () => {
    const initial = createInitialGameState({
      name: 'Ada',
      age: 26,
      gender: 'kadın',
      hometown: 'İzmir',
      background: 'aile_yaninda',
    });
    const started = beginTus(initial);

    expect(initial.career.phase).toBe('character_creation');
    expect(started.career.phase).toBe('tus');
    expect(started).not.toBe(initial);
  });
});
