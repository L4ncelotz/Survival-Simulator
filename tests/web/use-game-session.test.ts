import { describe, expect, it } from 'bun:test';
import { createGame } from '../../src/engine/create-game.js';
import { resolveDay } from '../../src/engine/resolver/resolve-day.js';
import type { ActionMap, GameState, PlayerAction } from '../../src/engine/types.js';

describe('Web UI State Bridge & Session Logic', () => {
  it('creates and advances a game session identically to the UI session flow', () => {
    const seed = 'test-web-seed';
    let state: GameState = createGame(seed);

    expect(state.day).toBe(1);
    expect(state.phase).toBe('normal');

    const actions: ActionMap = {
      P1: { playerId: 'P1', type: 'Hunt' },
      P2: { playerId: 'P2', type: 'FindWater' },
      P3: { playerId: 'P3', type: 'GatherWood' },
      P4: { playerId: 'P4', type: 'Rest' },
    };

    const { nextState, log } = resolveDay(state, actions);

    expect(nextState.day).toBe(2);
    expect(log.actionResults).toHaveLength(4);
    expect(log.day).toBe(1);
  });
});
