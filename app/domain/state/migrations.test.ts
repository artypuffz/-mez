import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './createInitialGameState';
import { migrateSaveData } from './migrations';

describe('migrateSaveData', () => {
  it('passes a current-version save through unchanged', () => {
    const state = createInitialGameState({
      name: 'Ada',
      age: 26,
      gender: 'kadın',
      hometown: 'İzmir',
      background: 'aile_yaninda',
    });
    const raw = JSON.parse(JSON.stringify(state));
    expect(migrateSaveData(raw)).toEqual(state);
  });

  it('throws for a save version with no registered migration path', () => {
    const raw = { meta: { saveVersion: 0 } };
    expect(() => migrateSaveData(raw)).toThrow();
  });
});
