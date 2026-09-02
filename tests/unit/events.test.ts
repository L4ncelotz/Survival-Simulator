import { describe, expect, it } from 'bun:test';
import { createGame } from '../../src/engine/create-game.js';
import { applyEventResult, resolveDailyEvent } from '../../src/engine/events/index.js';
import { RNGStream } from '../../src/engine/rng/rng-stream.js';
import type { GameState, ResourcePool } from '../../src/engine/types.js';

describe('Event System', () => {
  it('resolves deterministic events with valid result structures', () => {
    const state = createGame(12345);
    const eventStream = new RNGStream(999);

    const result = resolveDailyEvent(state, eventStream);

    expect(result.eventId).toBeDefined();
    expect(result.name).toBeDefined();
    expect(result.description).toBeDefined();
    expect(['positive', 'neutral', 'negative']).toContain(result.category);
  });

  it('pity: food < 20 shifts event distribution toward positive', () => {
    const baseState = createGame(100);
    const lowFoodState: GameState = {
      ...baseState,
      resources: { ...baseState.resources, food: 5, water: 30 },
    };
    const normalFoodState: GameState = {
      ...baseState,
      resources: { ...baseState.resources, food: 25, water: 30 },
    };

    let lowFoodPositives = 0;
    let normalPositives = 0;
    const trials = 500;

    for (let i = 0; i < trials; i++) {
      const stream1 = new RNGStream(i + 1);
      const res1 = resolveDailyEvent(lowFoodState, stream1);
      if (res1.category === 'positive') lowFoodPositives++;

      const stream2 = new RNGStream(i + 1);
      const res2 = resolveDailyEvent(normalFoodState, stream2);
      if (res2.category === 'positive') normalPositives++;
    }

    expect(lowFoodPositives).toBeGreaterThan(normalPositives);
  });

  it('pity: crisis flags alone do NOT alter event probabilities (only raw levels matter)', () => {
    const baseState = createGame(100);
    const noCrisisState: GameState = {
      ...baseState,
      resources: { ...baseState.resources, food: 30, water: 30 },
      crisis: { foodCrisis: false, waterCrisis: false, hpCrisis: false },
    };
    const crisisFlagState: GameState = {
      ...baseState,
      resources: { ...baseState.resources, food: 30, water: 30 },
      crisis: { foodCrisis: true, waterCrisis: true, hpCrisis: true },
    };

    let noCrisisPositives = 0;
    let crisisFlagPositives = 0;
    const trials = 500;

    for (let i = 0; i < trials; i++) {
      const stream1 = new RNGStream(i + 1);
      const res1 = resolveDailyEvent(noCrisisState, stream1);
      if (res1.category === 'positive') noCrisisPositives++;

      const stream2 = new RNGStream(i + 1);
      const res2 = resolveDailyEvent(crisisFlagState, stream2);
      if (res2.category === 'positive') crisisFlagPositives++;
    }

    expect(crisisFlagPositives).toBe(noCrisisPositives);
  });

  it('correctly applies event resource deltas and caps medicine at maxMedicine (3)', () => {
    const state = createGame(555);
    const resources: ResourcePool = { food: 10, water: 10, wood: 5, medicine: 3 };

    const medicalCacheResult = {
      eventId: 'MedicalCache',
      name: 'Medical Cache',
      description: 'Medical cache',
      category: 'positive' as const,
      resourceDelta: { medicine: 1 },
      hpDelta: {},
      energyDelta: {},
    };

    const { updatedResources } = applyEventResult(
      state.players,
      resources,
      medicalCacheResult,
    );

    // Should cap at 3
    expect(updatedResources.medicine).toBe(3);
  });

  it('correctly applies negative event deltas without dropping resources below 0', () => {
    const state = createGame(555);
    const lowResources: ResourcePool = { food: 1, water: 1, wood: 0, medicine: 0 };

    const foodSpoilageResult = {
      eventId: 'FoodSpoilage',
      name: 'Food Spoilage',
      description: 'Spoilage',
      category: 'negative' as const,
      resourceDelta: { food: -3 },
      hpDelta: {},
      energyDelta: {},
    };

    const { updatedResources } = applyEventResult(
      state.players,
      lowResources,
      foodSpoilageResult,
    );

    // Should clamp to 0, not -2
    expect(updatedResources.food).toBe(0);
  });
});
