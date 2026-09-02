import { describe, expect, it } from 'bun:test';
import {
  getCondition,
  getConditionFromHp,
  isGhost,
  isPlayerAbleToAct,
  isPlayerAlive,
} from '../../src/engine/rules/index.js';
import { DEFAULT_BALANCE_CONFIG } from '../../src/engine/config/index.js';
import type { PlayerStatus } from '../../src/engine/types.js';

function createPlayerMock(overrides: Partial<PlayerStatus> = {}): PlayerStatus {
  return {
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
    ...overrides,
  };
}

describe('Condition Rules', () => {
  describe('getConditionFromHp', () => {
    it('returns Healthy when hp is 61..100', () => {
      expect(getConditionFromHp(100, 0)).toBe('Healthy');
      expect(getConditionFromHp(61, 0)).toBe('Healthy');
    });

    it('returns Injured when hp is 21..60', () => {
      expect(getConditionFromHp(60, 0)).toBe('Injured');
      expect(getConditionFromHp(21, 0)).toBe('Injured');
    });

    it('returns DOWN when hp is 1..20 and downDays < 2', () => {
      expect(getConditionFromHp(20, 0)).toBe('DOWN');
      expect(getConditionFromHp(1, 0)).toBe('DOWN');
      expect(getConditionFromHp(20, 1)).toBe('DOWN');
      expect(getConditionFromHp(1, 1)).toBe('DOWN');
    });

    it('returns Dead when hp is 1..20 and downDays >= 2', () => {
      expect(getConditionFromHp(20, 2)).toBe('Dead');
      expect(getConditionFromHp(1, 2)).toBe('Dead');
      expect(getConditionFromHp(10, 3)).toBe('Dead');
    });

    it('returns Dead when hp <= 0 regardless of downDays', () => {
      expect(getConditionFromHp(0, 0)).toBe('Dead');
      expect(getConditionFromHp(-10, 0)).toBe('Dead');
      expect(getConditionFromHp(0, 2)).toBe('Dead');
    });

    it('respects custom balance configuration thresholds', () => {
      const customConfig = {
        ...DEFAULT_BALANCE_CONFIG,
        player: {
          ...DEFAULT_BALANCE_CONFIG.player,
          healthyMinHp: 71,
          injuryHpThreshold: 70,
          downHpThreshold: 30,
          downMaxDays: 3,
        },
      };

      expect(getConditionFromHp(75, 0, customConfig)).toBe('Healthy');
      expect(getConditionFromHp(50, 0, customConfig)).toBe('Injured');
      expect(getConditionFromHp(25, 2, customConfig)).toBe('DOWN');
      expect(getConditionFromHp(25, 3, customConfig)).toBe('Dead');
    });
  });

  describe('getCondition', () => {
    it('derives condition from PlayerStatus object', () => {
      const healthy = createPlayerMock({ hp: 80 });
      const injured = createPlayerMock({ hp: 45 });
      const down = createPlayerMock({ hp: 15, downDays: 0 });
      const deadTimer = createPlayerMock({ hp: 15, downDays: 2 });
      const deadHp = createPlayerMock({ hp: 0 });

      expect(getCondition(healthy)).toBe('Healthy');
      expect(getCondition(injured)).toBe('Injured');
      expect(getCondition(down)).toBe('DOWN');
      expect(getCondition(deadTimer)).toBe('Dead');
      expect(getCondition(deadHp)).toBe('Dead');
    });
  });

  describe('isPlayerAlive', () => {
    it('returns true for Healthy, Injured, DOWN (both condition string and PlayerStatus)', () => {
      expect(isPlayerAlive('Healthy')).toBe(true);
      expect(isPlayerAlive('Injured')).toBe(true);
      expect(isPlayerAlive('DOWN')).toBe(true);

      expect(isPlayerAlive(createPlayerMock({ hp: 100 }))).toBe(true);
      expect(isPlayerAlive(createPlayerMock({ hp: 50 }))).toBe(true);
      expect(isPlayerAlive(createPlayerMock({ hp: 10, downDays: 0 }))).toBe(true);
    });

    it('returns false for Dead (condition string and PlayerStatus)', () => {
      expect(isPlayerAlive('Dead')).toBe(false);
      expect(isPlayerAlive(createPlayerMock({ hp: 0 }))).toBe(false);
      expect(isPlayerAlive(createPlayerMock({ hp: 10, downDays: 2 }))).toBe(false);
    });
  });

  describe('isPlayerAbleToAct', () => {
    it('returns true only for Healthy and Injured', () => {
      expect(isPlayerAbleToAct('Healthy')).toBe(true);
      expect(isPlayerAbleToAct('Injured')).toBe(true);

      expect(isPlayerAbleToAct(createPlayerMock({ hp: 90 }))).toBe(true);
      expect(isPlayerAbleToAct(createPlayerMock({ hp: 35 }))).toBe(true);
    });

    it('returns false for DOWN and Dead', () => {
      expect(isPlayerAbleToAct('DOWN')).toBe(false);
      expect(isPlayerAbleToAct('Dead')).toBe(false);

      expect(isPlayerAbleToAct(createPlayerMock({ hp: 10, downDays: 0 }))).toBe(false);
      expect(isPlayerAbleToAct(createPlayerMock({ hp: 0 }))).toBe(false);
    });
  });

  describe('isGhost', () => {
    it('returns true if and only if player condition is Dead', () => {
      expect(isGhost(createPlayerMock({ hp: 100 }))).toBe(false);
      expect(isGhost(createPlayerMock({ hp: 40 }))).toBe(false);
      expect(isGhost(createPlayerMock({ hp: 10, downDays: 0 }))).toBe(false);
      expect(isGhost(createPlayerMock({ hp: 10, downDays: 2 }))).toBe(true);
      expect(isGhost(createPlayerMock({ hp: 0 }))).toBe(true);
    });
  });
});
