import { describe, expect, it } from 'bun:test';
import { createGame, rollWeather } from '../../src/engine/create-game.js';
import { DEFAULT_BALANCE_CONFIG } from '../../src/engine/config/index.js';
import type { PlayerId, Trait, WeatherType } from '../../src/engine/types.js';

describe('createGame', () => {
  it('produces identical state across repeated calls with identical seed', () => {
    const gameA = createGame('seed-alpha-12345');
    const gameB = createGame('seed-alpha-12345');

    expect(JSON.stringify(gameA)).toBe(JSON.stringify(gameB));
    expect(gameA.seed).toBe(gameB.seed);
    expect(gameA.weather).toBe(gameB.weather);
    expect(gameA.players).toEqual(gameB.players);
    expect(gameA.resources).toEqual(gameB.resources);
    expect(gameA.rngState).toEqual(gameB.rngState);
  });

  it('produces different state for different seeds', () => {
    const game1 = createGame('seed-1');
    const game2 = createGame('seed-2');

    expect(game1.seed).not.toBe(game2.seed);
    expect(game1.rngState).not.toEqual(game2.rngState);
  });

  it('distributes all 4 canonical traits uniquely without duplicates', () => {
    const game = createGame('test-trait-seed');
    const playerIds: PlayerId[] = ['P1', 'P2', 'P3', 'P4'];
    const traits = playerIds.map((id) => game.players[id].trait);

    const uniqueTraits = new Set(traits);
    expect(uniqueTraits.size).toBe(4);

    const expectedTraits: Trait[] = ['Hunter', 'Medic', 'Builder', 'Scout'];
    for (const expected of expectedTraits) {
      expect(uniqueTraits.has(expected)).toBe(true);
    }
  });

  it('initializes all players with single source of truth stats (no derived condition/isGhost)', () => {
    const game = createGame(42);
    const playerIds: PlayerId[] = ['P1', 'P2', 'P3', 'P4'];

    for (const id of playerIds) {
      const player = game.players[id];
      expect(player.id).toBe(id);
      expect(player.hp).toBe(100);
      expect(player.maxHp).toBe(100);
      expect(player.energy).toBe(100);
      expect(player.maxEnergy).toBe(100);
      expect(player.hunger).toBe(20);
      expect(player.thirst).toBe(20);
      expect(player.downDays).toBe(0);

      // Verify Single Source of Truth: condition and isGhost are not stored on player
      expect((player as unknown as Record<string, unknown>).condition).toBeUndefined();
      expect((player as unknown as Record<string, unknown>).isGhost).toBeUndefined();
    }
  });

  it('sets initial resources matching canonical DEFAULT_BALANCE_CONFIG', () => {
    const game = createGame('resource-check-seed');
    expect(game.resources).toEqual(DEFAULT_BALANCE_CONFIG.startingResources);
    expect(game.resources.food).toBe(20);
    expect(game.resources.water).toBe(20);
    expect(game.resources.wood).toBe(10);
    expect(game.resources.medicine).toBe(2);
  });

  it('initializes Day 1, phase normal, valid V1 weather, and zero signal progress', () => {
    const game = createGame('state-check-seed');
    expect(game.day).toBe(1);
    expect(game.phase).toBe('normal');
    expect(['Clear', 'Rain', 'Storm']).toContain(game.weather);
    expect(game.signal.progress).toBe(0);
    expect(game.signal.maxProgress).toBe(100);
    expect(game.signal.rescuePending).toBe(false);
    expect(game.crisis.foodCrisis).toBe(false);
    expect(game.crisis.waterCrisis).toBe(false);
    expect(game.crisis.hpCrisis).toBe(false);
    expect(game.ghostInterventionAvailable).toBe(false);
  });

  it('accepts custom balance configurations', () => {
    const customConfig = {
      ...DEFAULT_BALANCE_CONFIG,
      startingResources: {
        food: 50,
        water: 50,
        wood: 25,
        medicine: 5,
      },
      player: {
        ...DEFAULT_BALANCE_CONFIG.player,
        maxHp: 80,
        startingHunger: 10,
        startingThirst: 10,
      },
    };

    const game = createGame('custom-config-seed', customConfig);
    expect(game.resources.food).toBe(50);
    expect(game.resources.water).toBe(50);
    expect(game.players.P1.hp).toBe(80);
    expect(game.players.P1.maxHp).toBe(80);
    expect(game.players.P1.hunger).toBe(10);
    expect(game.players.P1.thirst).toBe(10);
  });
});
