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

  it('shifts distribution toward positive events when crisis is active (Pity weighting)', () => {
    const normalState = createGame(100);
    const crisisState: GameState = {
      ...normalState,
      crisis: { foodCrisis: true, waterCrisis: false, hpCrisis: false },
    };

    let normalPositives = 0;
    let crisisPositives = 0;
    const trials = 1000;

    for (let i = 0; i < trials; i++) {
      const stream1 = new RNGStream(i + 1);
      const res1 = resolveDailyEvent(normalState, stream1);
      if (res1.category === 'positive') normalPositives++;

      const stream2 = new RNGStream(i + 1);
      const res2 = resolveDailyEvent(crisisState, stream2);
      if (res2.category === 'positive') crisisPositives++;
    }

    // Normal positive weight is 35%, crisis positive weight is 65%
    expect(crisisPositives).toBeGreaterThan(normalPositives);
    expect(crisisPositives / trials).toBeGreaterThan(0.55);
    expect(normalPositives / trials).toBeLessThan(0.45);
  });

  it('correctly applies event resource and player deltas without dropping resources below 0', () => {
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
