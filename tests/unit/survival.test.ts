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

  it('triages food to highest Hunger player first and water to highest Thirst player first', () => {
    const players = createMockPlayers();
    // P3 has highest hunger (60), P1 has lowest hunger (10)
    players.P3 = { ...players.P3, hunger: 60, thirst: 10, hp: 80 };
    players.P1 = { ...players.P1, hunger: 10, thirst: 60, hp: 80 };
    players.P2 = { ...players.P2, hunger: 30, thirst: 30, hp: 80 };
    players.P4 = { ...players.P4, hunger: 20, thirst: 20, hp: 80 };

    // Only enough food for 1 non-hunter (3 food) and water for 1 person (3 water)
    const resources: ResourcePool = { food: 3, water: 3, wood: 0, medicine: 0 };

    const report = applyDailyConsumption(players, resources, 1);

    // P3 has highest hunger (60) -> gets food first!
    expect(report.fedPlayers).toContain('P3');
    expect(report.fedPlayers).toHaveLength(1);

    // P1 has highest thirst (60) -> gets water first!
    expect(report.hydratedPlayers).toContain('P1');
    expect(report.hydratedPlayers).toHaveLength(1);
  });

  it('advances hunger (+25 unfed) and thirst (+25 unhydrated) and applies damage when > 80 threshold', () => {
    const players = createMockPlayers();
    // Set P1 already at hunger 70 and thirst 70
    players.P1 = { ...players.P1, hunger: 70, thirst: 70, hp: 100 };
    // No food or water
    const resources: ResourcePool = { food: 0, water: 0, wood: 0, medicine: 0 };

    const report = applyDailyConsumption(players, resources, 1);

    // P1 starved: hunger becomes 70 + 25 = 95 (> 80 threshold) -> 5 HP damage
    // P1 dehydrated: thirst becomes 70 + 25 = 95 (> 80 threshold) -> 8 HP damage
    // Total damage: 13 HP -> HP becomes 87
    const updatedP1 = report.updatedPlayers.P1;
    expect(updatedP1.hunger).toBe(95);
    expect(updatedP1.thirst).toBe(95);
    expect(updatedP1.hp).toBe(87);
    expect(report.hungerDamagedPlayers).toContain('P1');
    expect(report.thirstDamagedPlayers).toContain('P1');
  });

  it('applies partial rations continuously when resources are insufficient for full demand', () => {
    const players = createMockPlayers();
    // P2 has hunger 50
    players.P2 = { ...players.P2, hunger: 50, trait: 'Medic' }; // needs 3 food
    players.P1 = { ...players.P1, hunger: 10 };
    players.P3 = { ...players.P3, hunger: 10 };
    players.P4 = { ...players.P4, hunger: 10 };

    // 1.5 food available for P2 (demand 3.0 -> ratio 0.5)
    const resources: ResourcePool = { food: 1.5, water: 20, wood: 0, medicine: 0 };

    const report = applyDailyConsumption(players, resources, 1);

    // Ratio = 0.5 -> hungerDelta = -30 * 0.5 + 25 * 0.5 = -15 + 12.5 = -2.5 -> hunger 47.5 rounded to 48
    const updatedP2 = report.updatedPlayers.P2;
    expect(updatedP2.hunger).toBeLessThan(50);
    expect(report.remainingResources.food).toBe(0);
  });

  it('transitions player to DOWN when HP drops to <= 20', () => {
    const players = createMockPlayers();
    players.P1 = { ...players.P1, hp: 25, hunger: 70, thirst: 70 }; // takes 13 damage -> 12 HP (DOWN)
    const resources: ResourcePool = { food: 0, water: 0, wood: 0, medicine: 0 };

    const report = applyDailyConsumption(players, resources, 1);

    expect(report.updatedPlayers.P1.hp).toBe(12);
    expect(getCondition(report.updatedPlayers.P1)).toBe('DOWN');
    expect(report.newlyDownPlayers).toContain('P1');
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
