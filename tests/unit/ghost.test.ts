import { describe, expect, it } from 'bun:test';
import { createGame } from '../../src/engine/create-game.js';
import { resolveGhostIntervention } from '../../src/engine/ghost/index.js';
import { MultiStreamRNG } from '../../src/engine/rng/multi-stream.js';
import type { ActionMap, GameState } from '../../src/engine/types.js';

describe('Ghost Intervention', () => {
  it('rejects intervention if requester is alive', () => {
    const state = createGame(100);
    const rng = MultiStreamRNG.restore(state.rngState);
    const actions: ActionMap = {
      P1: { playerId: 'P1', type: 'Hunt' },
      P2: { playerId: 'P2', type: 'Rest' },
      P3: { playerId: 'P3', type: 'GatherWood' },
      P4: { playerId: 'P4', type: 'Explore' },
    };

    const result = resolveGhostIntervention(
      { ...state, ghostInterventionAvailable: true },
      { requestingPlayerId: 'P1', targetRollType: 'event' },
      actions,
      state.weather,
      rng,
    );

    expect(result.applied).toBe(false);
    expect(result.message).toContain('Only dead players');
  });

  it('allows dead player to reroll daily event using event stream', () => {
    const initialState = createGame(200);
    // Kill P1
    const state: GameState = {
      ...initialState,
      players: {
        ...initialState.players,
        P1: { ...initialState.players.P1, hp: 0, downDays: 2 },
      },
      ghostInterventionAvailable: true,
    };

    const rng = MultiStreamRNG.restore(state.rngState);
    const initialEventState = rng.getStream('event').getState();

    const actions: ActionMap = {
      P1: { playerId: 'P1', type: 'Rest' },
      P2: { playerId: 'P2', type: 'Rest' },
      P3: { playerId: 'P3', type: 'GatherWood' },
      P4: { playerId: 'P4', type: 'Explore' },
    };

    const result = resolveGhostIntervention(
      state,
      { requestingPlayerId: 'P1', targetRollType: 'event' },
      actions,
      state.weather,
      rng,
    );

    expect(result.applied).toBe(true);
    expect(result.updatedEventResult).toBeDefined();
    // Event stream should have advanced
    expect(rng.getStream('event').getState()).not.toBe(initialEventState);
  });

  it('allows dead player to reroll action result for living player', () => {
    const initialState = createGame(300);
    const state: GameState = {
      ...initialState,
      players: {
        ...initialState.players,
        P1: { ...initialState.players.P1, hp: 0, downDays: 2 },
      },
      ghostInterventionAvailable: true,
    };

    const rng = MultiStreamRNG.restore(state.rngState);
    const actions: ActionMap = {
      P1: { playerId: 'P1', type: 'Rest' },
      P2: { playerId: 'P2', type: 'Hunt' },
      P3: { playerId: 'P3', type: 'GatherWood' },
      P4: { playerId: 'P4', type: 'Explore' },
    };

    const result = resolveGhostIntervention(
      state,
      { requestingPlayerId: 'P1', targetRollType: 'action', targetPlayerId: 'P2' },
      actions,
      state.weather,
      rng,
    );

    expect(result.applied).toBe(true);
    expect(result.updatedActionResult).toBeDefined();
    expect(result.updatedActionResult?.actionType).toBe('Hunt');
  });
});
