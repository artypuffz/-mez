import { describe, expect, it } from 'vitest';
import { createInMemorySaveRepository } from './inMemorySaveRepository';
import { createInitialGameState } from '../state/createInitialGameState';

const sampleInput = {
  name: 'Ada',
  age: 26,
  gender: 'kadın' as const,
  hometown: 'İzmir',
  background: 'aile_yaninda' as const,
};

describe('inMemorySaveRepository', () => {
  it('returns null when nothing has been saved', async () => {
    const repo = createInMemorySaveRepository();
    expect(await repo.load()).toBeNull();
  });

  it('round-trips a saved state', async () => {
    const repo = createInMemorySaveRepository();
    const state = createInitialGameState(sampleInput);
    await repo.save(state);
    expect(await repo.load()).toEqual(state);
  });

  it('clear() removes the saved state', async () => {
    const repo = createInMemorySaveRepository();
    const state = createInitialGameState(sampleInput);
    await repo.save(state);
    await repo.clear();
    expect(await repo.load()).toBeNull();
  });

  it('save() overwrites the previous state', async () => {
    const repo = createInMemorySaveRepository();
    const first = createInitialGameState(sampleInput);
    const second = createInitialGameState({ ...sampleInput, name: 'Deniz' });
    await repo.save(first);
    await repo.save(second);
    expect((await repo.load())?.character.name).toBe('Deniz');
  });
});
