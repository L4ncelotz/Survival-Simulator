import { describe, expect, it } from 'bun:test';
import { DEFAULT_BALANCE_CONFIG } from '../../src/engine/config/balance.js';
import { getCondition } from '../../src/engine/rules/condition.js';
import { applyDailyConsumption } from '../../src/engine/survival/index.js';
import type { PlayerId, PlayerStatus, ResourcePool } from '../../src/engine/types.js';

function createMockPlayers(): Record<PlayerId, PlayerStatus> {
  return {
    P1: {
      id: 'P1',
      name: 'Player 1',
      trait: 'Hunter',
      hp: 100,
      maxHp: 100,
      energy: 100,
      maxEnergy: 100,
      hunger: 20,
      thirst: 20,
      downDays: 0,
    },
    P2: {
      id: 'P2',
      name: 'Player 2',
      trait: 'Medic',
      hp: 100,
      maxHp: 100,
      energy: 100,
      maxEnergy: 100,
      hunger: 20,
      thirst: 20,
      downDays: 0,
    },
    P3: {
      id: 'P3',
      name: 'Player 3',
      trait: 'Builder',
      hp: 100,
      maxHp: 100,
      energy: 100,
      maxEnergy: 100,
      hunger: 20,
      thirst: 20,
      downDays: 0,
    },
    P4: {
      id: 'P4',
      name: 'Player 4',
      trait: 'Scout',
      hp: 100,
      maxHp: 100,
      energy: 100,
      maxEnergy: 100,
      hunger: 20,
      thirst: 20,
      downDays: 0,
    },
  };
}

describe('Survival & Consumption Engine', () => {
  it('deducts standard food and water for all 4 players on normal days', () => {
    const players = createMockPlayers();
    const resources: ResourcePool = { food: 20, water: 20, wood: 10, medicine: 2 };

    const report = applyDailyConsumption(players, resources, 1);

    // Food consumption: P1 (Hunter) = 3 * 1.25 = 3.75, P2 = 3, P3 = 3, P4 = 3 -> Total = 12.75
    // Water consumption: 3 * 4 = 12
    expect(report.fedPlayers).toHaveLength(4);
    expect(report.hydratedPlayers).toHaveLength(4);
    expect(report.remainingResources.food).toBeCloseTo(20 - 12.75, 4);
    expect(report.remainingResources.water).toBe(20 - 12);
  });

  it('triages resources to lowest HP player first when food is scarce', () => {
    const players = createMockPlayers();
    // P3 is low HP, P1 is high HP
    players.P3 = { ...players.P3, hp: 30 };
    players.P1 = { ...players.P1, hp: 90 };
    players.P2 = { ...players.P2, hp: 80 };
    players.P4 = { ...players.P4, hp: 70 };

    // Only enough food for 1 person (3 food)
    const resources: ResourcePool = { food: 3, water: 20, wood: 0, medicine: 0 };

    const report = applyDailyConsumption(players, resources, 1);

    // P3 has lowest HP (30), so P3 should be fed first!
    expect(report.fedPlayers).toContain('P3');
    expect(report.fedPlayers).toHaveLength(1);
    expect(report.starvedPlayers).toEqual(expect.arrayContaining(['P1', 'P2', 'P4']));
  });

  it('advances hunger and thirst and applies damage when thresholds are crossed', () => {
    const players = createMockPlayers();
    // Set P1 already at hunger 50 and thirst 50
    players.P1 = { ...players.P1, hunger: 50, thirst: 50, hp: 100 };
    // No food or water
    const resources: ResourcePool = { food: 0, water: 0, wood: 0, medicine: 0 };

    const report = applyDailyConsumption(players, resources, 1);

    // P1 starved: hunger becomes 50 + 20 = 70 (>= 60 threshold) -> 15 HP damage
    // P1 dehydrated: thirst becomes 50 + 30 = 80 (>= 60 threshold) -> 25 HP damage
    // Total damage: 40 HP -> HP becomes 60
    const updatedP1 = report.updatedPlayers.P1;
    expect(updatedP1.hunger).toBe(70);
    expect(updatedP1.thirst).toBe(80);
    expect(updatedP1.hp).toBe(60);
    expect(report.hungerDamagedPlayers).toContain('P1');
    expect(report.thirstDamagedPlayers).toContain('P1');
  });

  it('transitions player to DOWN when HP drops to <= 20', () => {
    const players = createMockPlayers();
    players.P1 = { ...players.P1, hp: 40, hunger: 50, thirst: 50 }; // takes 40 damage -> 0 HP or 20 HP
    players.P2 = { ...players.P2, hp: 50, hunger: 50, thirst: 50 }; // takes 40 damage -> 10 HP (DOWN)
    const resources: ResourcePool = { food: 0, water: 0, wood: 0, medicine: 0 };

    const report = applyDailyConsumption(players, resources, 1);

    expect(report.updatedPlayers.P2.hp).toBe(10);
    expect(getCondition(report.updatedPlayers.P2)).toBe('DOWN');
    expect(report.newlyDownPlayers).toContain('P2');
  });

  it('kills a player who stays in DOWN for downMaxDays (2 days)', () => {
    const players = createMockPlayers();
    // P1 has been DOWN for 1 day already
    players.P1 = { ...players.P1, hp: 15, downDays: 1, hunger: 10, thirst: 10 };
    // Provide food/water so they do not take extra damage
    const resources: ResourcePool = { food: 20, water: 20, wood: 0, medicine: 0 };

    const report = applyDailyConsumption(players, resources, 1);

    // DOWN days advances to 2 >= downMaxDays (2) -> Dies
    expect(report.updatedPlayers.P1.hp).toBe(0);
    expect(getCondition(report.updatedPlayers.P1)).toBe('Dead');
    expect(report.newDeaths).toContain('P1');
  });

  it('applies 1.5x consumption multiplier during emergency window (Day 21+)', () => {
    const players = createMockPlayers();
    const resources: ResourcePool = { food: 50, water: 50, wood: 0, medicine: 0 };

    const report = applyDailyConsumption(players, resources, 21);

    // Water: 3 * 1.5 = 4.5 per player * 4 players = 18 water consumed
    expect(report.remainingResources.water).toBe(50 - 18);
  });
});
