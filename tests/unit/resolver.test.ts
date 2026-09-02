import { describe, expect, it } from 'bun:test';
import { createGame } from '../../src/engine/create-game.js';
import { resolveDay } from '../../src/engine/resolver/index.js';
import type { ActionMap, GameState } from '../../src/engine/types.js';

describe('Day Resolver Orchestrator', () => {
  it('purely transforms state without mutating the original state object', () => {
    const initialState = createGame(12345);
    const actions: ActionMap = {
      P1: { playerId: 'P1', type: 'Hunt' },
      P2: { playerId: 'P2', type: 'FindWater' },
      P3: { playerId: 'P3', type: 'GatherWood' },
      P4: { playerId: 'P4', type: 'Rest' },
    };

    const initialSnapshot = JSON.stringify(initialState);
    const { nextState, log } = resolveDay(initialState, actions);

    expect(JSON.stringify(initialState)).toBe(initialSnapshot);
    expect(nextState).not.toBe(initialState);
    expect(nextState.day).toBe(2);
    expect(log.actionResults).toHaveLength(4);
    expect(log.day).toBe(1);
  });

  it('blocks exhausted players from performing costly actions', () => {
    const initialState = createGame(999);
    // Set P1 energy to 10 (< 25 for Hunt)
    const state: GameState = {
      ...initialState,
      players: {
        ...initialState.players,
        P1: { ...initialState.players.P1, energy: 10 },
      },
    };

    const actions: ActionMap = {
      P1: { playerId: 'P1', type: 'Hunt' },
      P2: { playerId: 'P2', type: 'Rest' },
      P3: { playerId: 'P3', type: 'Rest' },
      P4: { playerId: 'P4', type: 'Rest' },
    };

    const { nextState, log } = resolveDay(state, actions);
    const p1Result = log.actionResults.find((r) => r.playerId === 'P1');

    expect(p1Result?.success).toBe(false);
    expect(p1Result?.message).toContain('exhausted');
    // P1 energy remains 10 (not negative)
    expect(nextState.players.P1.energy).toBe(10);
  });

  it('triggers early rescue flow (rescue_pending -> win) before Day 20', () => {
    const initialState = createGame(777);
    // Start with 90% signal and plenty of wood
    const state: GameState = {
      ...initialState,
      day: 5,
      resources: { ...initialState.resources, wood: 20 },
      signal: { progress: 90, maxProgress: 100, rescuePending: false },
    };

    const actions: ActionMap = {
      P1: { playerId: 'P1', type: 'BuildSignal' },
      P2: { playerId: 'P2', type: 'BuildSignal' },
      P3: { playerId: 'P3', type: 'Rest' },
      P4: { playerId: 'P4', type: 'Rest' },
    };

    const day1Result = resolveDay(state, actions);
    expect(day1Result.nextState.phase).toBe('rescue_pending');
    expect(day1Result.nextState.signal.progress).toBe(100);

    // Survive the next day
    const day2Result = resolveDay(day1Result.nextState, actions);
    expect(day2Result.nextState.phase).toBe('ended');
    expect(day2Result.nextState.winner).toBe(true);
    expect(day2Result.nextState.endReason).toContain('Early rescue achieved');
  });

  it('triggers normal rescue on Day 20 with >= 80% signal (takes priority over rescue_pending even if signal reaches 100%)', () => {
    const initialState = createGame(888);
    const state: GameState = {
      ...initialState,
      day: 20,
      resources: { ...initialState.resources, wood: 20 },
      signal: { progress: 95, maxProgress: 100, rescuePending: false },
    };

    const actions: ActionMap = {
      P1: { playerId: 'P1', type: 'BuildSignal' },
      P2: { playerId: 'P2', type: 'Rest' },
      P3: { playerId: 'P3', type: 'Rest' },
      P4: { playerId: 'P4', type: 'Rest' },
    };

    const { nextState } = resolveDay(state, actions);
    expect(nextState.phase).toBe('ended');
    expect(nextState.winner).toBe(true);
    expect(nextState.signal.progress).toBe(100);
    expect(nextState.endReason).toContain('Normal rescue achieved on Day 20');
  });

  it('ends game with loss if all players die', () => {
    const initialState = createGame(444);
    // Set all players to 1 HP and high hunger/thirst with no resources
    const state: GameState = {
      ...initialState,
      resources: { food: 0, water: 0, wood: 0, medicine: 0 },
      players: {
        P1: { ...initialState.players.P1, hp: 1, downDays: 1, hunger: 80, thirst: 80 },
        P2: { ...initialState.players.P2, hp: 1, downDays: 1, hunger: 80, thirst: 80 },
        P3: { ...initialState.players.P3, hp: 1, downDays: 1, hunger: 80, thirst: 80 },
        P4: { ...initialState.players.P4, hp: 1, downDays: 1, hunger: 80, thirst: 80 },
      },
    };

    const actions: ActionMap = {
      P1: { playerId: 'P1', type: 'Rest' },
      P2: { playerId: 'P2', type: 'Rest' },
      P3: { playerId: 'P3', type: 'Rest' },
      P4: { playerId: 'P4', type: 'Rest' },
    };

    const { nextState } = resolveDay(state, actions);
    expect(nextState.phase).toBe('ended');
    expect(nextState.winner).toBe(false);
    expect(nextState.endReason).toContain('All survivors have perished');
  });
});
