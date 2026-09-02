import { describe, expect, it } from 'bun:test';
import { createGame } from '../../src/engine/create-game.js';
import { resolveDay } from '../../src/engine/resolver/resolve-day.js';
import type { ActionMap, GameState } from '../../src/engine/types.js';

describe('Turn Pipeline Order & Spec Invariants', () => {
  it('makes wood gathered by GatherWood immediately available to BuildSignal on the same day', () => {
    const initialState = createGame(1001);
    // Start with 0 wood
    const state: GameState = {
      ...initialState,
      resources: { ...initialState.resources, wood: 0, food: 30, water: 30 },
      players: {
        ...initialState.players,
        P1: { ...initialState.players.P1, trait: 'Builder', energy: 100 },
        P2: { ...initialState.players.P2, trait: 'Builder', energy: 100 },
      },
      weather: 'Clear',
    };

    // P1 gathers wood (yields 5-7 wood), P2 builds signal (requires 4 wood for Builder)
    const actions: ActionMap = {
      P1: { playerId: 'P1', type: 'GatherWood' },
      P2: { playerId: 'P2', type: 'BuildSignal' },
      P3: { playerId: 'P3', type: 'Rest' },
      P4: { playerId: 'P4', type: 'Rest' },
    };

    const { nextState, log } = resolveDay(state, actions);

    const p1Result = log.actionResults.find((r) => r.playerId === 'P1');
    const p2Result = log.actionResults.find((r) => r.playerId === 'P2');

    expect(p1Result?.success).toBe(true);
    expect(p1Result?.woodGained).toBeGreaterThanOrEqual(2);
    // P1 must gather ≥3 wood for P2 Builder to afford BuildSignal (3 wood cost)

    // P2 BuildSignal must succeed using the wood gathered by P1 today!
    expect(p2Result?.success).toBe(true);
    expect(p2Result?.woodSpent).toBe(3);
    expect(p2Result?.signalGained).toBe(8);
    expect(nextState.signal.progress).toBe(8);
  });

  it('makes medicine found by Explore immediately available to Heal on the same day', () => {
    // Search for a seed where P1 Explore finds medicine on ExploreStream
    let foundSeed = 0;
    for (let seed = 1; seed < 50; seed++) {
      const g = createGame(seed);
      // P1 Scout
      const st: GameState = {
        ...g,
        resources: { ...g.resources, medicine: 0, food: 30, water: 30 },
        players: {
          ...g.players,
          P1: { ...g.players.P1, trait: 'Scout', energy: 100 },
          P2: { ...g.players.P2, trait: 'Medic', energy: 100 },
          P3: { ...g.players.P3, hp: 40, maxHp: 100 },
        },
        weather: 'Clear',
      };
      const acts: ActionMap = {
        P1: { playerId: 'P1', type: 'Explore' },
        P2: { playerId: 'P2', type: 'Heal', targetPlayerId: 'P3' },
        P3: { playerId: 'P3', type: 'Rest' },
        P4: { playerId: 'P4', type: 'Rest' },
      };
      const res = resolveDay(st, acts);
      const p1Res = res.log.actionResults.find((r) => r.playerId === 'P1');
      if (p1Res?.medicineGained === 1) {
        foundSeed = seed;
        const p2Res = res.log.actionResults.find((r) => r.playerId === 'P2');
        expect(p2Res?.success).toBe(true);
        expect(p2Res?.medicineSpent).toBe(1);
        expect(p2Res?.hpRestored).toBeGreaterThan(0);
        break;
      }
    }
    expect(foundSeed).toBeGreaterThan(0);
  });

  it('enforces heal collision: duplicate heal on same target spends energy but 0 medicine and 0 HP', () => {
    const initialState = createGame(3000);
    const state: GameState = {
      ...initialState,
      resources: { ...initialState.resources, medicine: 3, food: 30, water: 30 },
      players: {
        ...initialState.players,
        P1: { ...initialState.players.P1, trait: 'Medic', energy: 100 },
        P2: { ...initialState.players.P2, trait: 'Hunter', energy: 100 },
        P3: { ...initialState.players.P3, hp: 30, maxHp: 100 },
      },
      weather: 'Clear',
    };

    // Both P1 and P2 heal P3 on the same day
    const actions: ActionMap = {
      P1: { playerId: 'P1', type: 'Heal', targetPlayerId: 'P3' },
      P2: { playerId: 'P2', type: 'Heal', targetPlayerId: 'P3' },
      P3: { playerId: 'P3', type: 'Rest' },
      P4: { playerId: 'P4', type: 'Rest' },
    };

    const { nextState, log } = resolveDay(state, actions);

    const p1Result = log.actionResults.find((r) => r.playerId === 'P1');
    const p2Result = log.actionResults.find((r) => r.playerId === 'P2');

    // P1 (1st healer) succeeds and spends 1 medicine
    expect(p1Result?.success).toBe(true);
    expect(p1Result?.medicineSpent).toBe(1);
    expect(p1Result?.hpRestored).toBe(60); // 40 base + 20 Medic bonus

    // P2 (2nd healer) fails due to target already treated today: spends 20 energy, 0 medicine, 0 HP
    expect(p2Result?.success).toBe(false);
    expect(p2Result?.medicineSpent).toBe(0);
    expect(p2Result?.hpRestored).toBe(0);
    expect(p2Result?.energySpent).toBe(20);
    expect(p2Result?.message).toContain('already treated');

    // Total medicine consumed is exactly 1 (not 2)
    expect(nextState.resources.medicine).toBe(2);
    // P2 energy is deducted (100 - 20 = 80)
    expect(nextState.players.P2.energy).toBe(80);
  });

  it('handles wood downgrade when 2 non-builders build with only 7 wood available', () => {
    const initialState = createGame(4004);
    const state: GameState = {
      ...initialState,
      resources: { ...initialState.resources, wood: 7, food: 30, water: 30 },
      players: {
        ...initialState.players,
        P1: { ...initialState.players.P1, trait: 'Scout', energy: 100 }, // costs 4
        P2: { ...initialState.players.P2, trait: 'Hunter', energy: 100 }, // costs 4
      },
      weather: 'Clear',
    };

    const actions: ActionMap = {
      P1: { playerId: 'P1', type: 'BuildSignal' },
      P2: { playerId: 'P2', type: 'BuildSignal' },
      P3: { playerId: 'P3', type: 'Rest' },
      P4: { playerId: 'P4', type: 'Rest' },
    };

    const { nextState, log } = resolveDay(state, actions);

    const p1Result = log.actionResults.find((r) => r.playerId === 'P1');
    const p2Result = log.actionResults.find((r) => r.playerId === 'P2');

    expect(p1Result?.success).toBe(true);
    expect(p1Result?.woodSpent).toBe(4);
    expect(p1Result?.signalGained).toBe(8);

    expect(p2Result?.success).toBe(false);
    expect(p2Result?.woodSpent).toBe(0);
    expect(p2Result?.signalGained).toBe(0);
    expect(p2Result?.message).toContain('insufficient wood');

    expect(nextState.resources.wood).toBe(3);
    expect(nextState.signal.progress).toBe(8);
  });

  it('blocks BuildSignal during Storm weather without consuming wood', () => {
    const initialState = createGame(5005);
    const state: GameState = {
      ...initialState,
      resources: { ...initialState.resources, wood: 20, food: 30, water: 30 },
      weather: 'Storm',
    };

    const actions: ActionMap = {
      P1: { playerId: 'P1', type: 'BuildSignal' },
      P2: { playerId: 'P2', type: 'Rest' },
      P3: { playerId: 'P3', type: 'Rest' },
      P4: { playerId: 'P4', type: 'Rest' },
    };

    const { nextState, log } = resolveDay(state, actions);

    const p1Result = log.actionResults.find((r) => r.playerId === 'P1');
    expect(p1Result?.success).toBe(false);
    expect(p1Result?.woodSpent).toBe(0);
    expect(p1Result?.signalGained).toBe(0);
    expect(p1Result?.energySpent).toBe(30);
    expect(nextState.resources.wood).toBe(20);
  });

  it('replaces Hunt action result when Ghost Intervention is used', () => {
    const initialState = createGame(6006);
    const state: GameState = {
      ...initialState,
      resources: { ...initialState.resources, food: 20, water: 20 },
      players: {
        ...initialState.players,
        P1: { ...initialState.players.P1, hp: 0, downDays: 2 }, // Dead
        P2: { ...initialState.players.P2, trait: 'Hunter', energy: 100 },
      },
      ghostInterventionAvailable: true,
      weather: 'Clear',
    };

    const actions: ActionMap = {
      P1: { playerId: 'P1', type: 'Rest' },
      P2: { playerId: 'P2', type: 'Hunt' },
      P3: { playerId: 'P3', type: 'Rest' },
      P4: { playerId: 'P4', type: 'Rest' },
    };

    const { nextState, log } = resolveDay(state, actions, {
      requestingPlayerId: 'P1',
      targetRollType: 'action',
      targetPlayerId: 'P2',
    });

    expect(log.ghostInterventionUsed).toBe(true);
    const p2Result = log.actionResults.find((r) => r.playerId === 'P2');
    expect(p2Result?.success).toBe(true);
    expect(p2Result?.actionType).toBe('Hunt');
  });
});
