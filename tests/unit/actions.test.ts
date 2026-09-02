import { describe, expect, it } from 'bun:test';
import {
  resolveBuildSignal,
  resolveExplore,
  resolveFindWater,
  resolveGatherWood,
  resolveHeal,
  resolveHunt,
  resolveRest,
} from '../../src/engine/actions/index.js';
import { DEFAULT_BALANCE_CONFIG } from '../../src/engine/config/balance.js';
import { RNGStream } from '../../src/engine/rng/rng-stream.js';
import type { PlayerStatus } from '../../src/engine/types.js';

function createMockPlayer(overrides: Partial<PlayerStatus> = {}): PlayerStatus {
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

describe('Core Actions', () => {
  describe('resolveHunt', () => {
    it('applies energy cost and grants food within range with Hunter trait bonus', () => {
      const hunter = createMockPlayer({ trait: 'Hunter' });
      const actionStream = new RNGStream(12345);
      const injuryStream = new RNGStream(99999);

      const result = resolveHunt(hunter, actionStream, injuryStream);

      expect(result.actionType).toBe('Hunt');
      expect(result.energySpent).toBe(DEFAULT_BALANCE_CONFIG.actions.hunt.energyCost);
      // Min food is 4 + 2 (Hunter bonus) = 6, Max is 8 + 2 = 10
      expect(result.foodGained).toBeGreaterThanOrEqual(6);
      expect(result.foodGained).toBeLessThanOrEqual(10);
      expect(result.success).toBe(true);
    });

    it('does not give trait bonus to non-hunters', () => {
      const scout = createMockPlayer({ trait: 'Scout' });
      const actionStream = new RNGStream(12345);
      const injuryStream = new RNGStream(99999);

      const result = resolveHunt(scout, actionStream, injuryStream);

      expect(result.foodGained).toBeGreaterThanOrEqual(4);
      expect(result.foodGained).toBeLessThanOrEqual(8);
    });

    it('applies injury damage when injury roll passes', () => {
      const player = createMockPlayer();
      const actionStream = new RNGStream(1);
      // Force injury stream to succeed (next() returns 0 which is < 0.15)
      const injuryStream = new RNGStream(1);
      const originalNext = injuryStream.next.bind(injuryStream);
      injuryStream.next = () => 0.05; // Force chance true

      const result = resolveHunt(player, actionStream, injuryStream);
      expect(result.hpDamage).toBe(15);
    });
  });

  describe('resolveFindWater', () => {
    it('gives standard water on Clear weather', () => {
      const player = createMockPlayer();
      const actionStream = new RNGStream(42);

      const result = resolveFindWater(player, actionStream, 'Clear');

      expect(result.energySpent).toBe(DEFAULT_BALANCE_CONFIG.actions.findWater.energyCost);
      expect(result.waterGained).toBeGreaterThanOrEqual(6);
      expect(result.waterGained).toBeLessThanOrEqual(10);
    });

    it('adds rain bonus water when weather is Rain', () => {
      const player = createMockPlayer();
      const actionStream = new RNGStream(42);

      const result = resolveFindWater(player, actionStream, 'Rain');

      expect(result.waterGained).toBeGreaterThanOrEqual(10); // 6 + 4
      expect(result.waterGained).toBeLessThanOrEqual(14); // 10 + 4
    });
  });

  describe('resolveGatherWood', () => {
    it('applies Builder trait bonus', () => {
      const builder = createMockPlayer({ trait: 'Builder' });
      const actionStream = new RNGStream(777);

      const result = resolveGatherWood(builder, actionStream);

      expect(result.energySpent).toBe(DEFAULT_BALANCE_CONFIG.actions.gatherWood.energyCost);
      expect(result.woodGained).toBeGreaterThanOrEqual(5); // 3 + 2
      expect(result.woodGained).toBeLessThanOrEqual(7); // 5 + 2
    });

    it('gives base wood to non-builders', () => {
      const medic = createMockPlayer({ trait: 'Medic' });
      const actionStream = new RNGStream(777);

      const result = resolveGatherWood(medic, actionStream);

      expect(result.woodGained).toBeGreaterThanOrEqual(3);
      expect(result.woodGained).toBeLessThanOrEqual(5);
    });
  });

  describe('resolveExplore', () => {
    it('generates resources and checks scout injury reduction', () => {
      const scout = createMockPlayer({ trait: 'Scout' });
      const exploreStream = new RNGStream(101);
      const injuryStream = new RNGStream(202);

      const result = resolveExplore(scout, exploreStream, injuryStream);

      expect(result.energySpent).toBe(DEFAULT_BALANCE_CONFIG.actions.explore.energyCost);
      expect(result.foodGained).toBeGreaterThanOrEqual(1);
      expect(result.waterGained).toBeGreaterThanOrEqual(1);
      expect(result.woodGained).toBeGreaterThanOrEqual(0);
      expect(result.medicineGained).toBeGreaterThanOrEqual(0);
    });
  });

  describe('resolveRest', () => {
    it('recovers HP when injured and caps at maxHp', () => {
      const injuredPlayer = createMockPlayer({ hp: 50, maxHp: 100, energy: 40 });

      const result = resolveRest(injuredPlayer);

      expect(result.energySpent).toBe(0);
      expect(result.hpRestored).toBe(10);
    });

    it('does not restore HP if player is in DOWN state', () => {
      const downPlayer = createMockPlayer({ hp: 15, maxHp: 100, downDays: 1 });

      const result = resolveRest(downPlayer);

      expect(result.hpRestored).toBe(0);
    });
  });
});

describe('Support Actions', () => {
  describe('resolveHeal', () => {
    it('fails if available medicine is 0', () => {
      const healer = createMockPlayer({ trait: 'Medic' });
      const target = createMockPlayer({ id: 'P2', hp: 40 });

      const result = resolveHeal(healer, target, 0);

      expect(result.success).toBe(false);
      expect(result.medicineSpent).toBe(0);
      expect(result.hpRestored).toBe(0);
    });

    it('fails if target is Dead', () => {
      const healer = createMockPlayer({ trait: 'Medic' });
      const deadTarget = createMockPlayer({ id: 'P2', hp: 0, downDays: 2 });

      const result = resolveHeal(healer, deadTarget, 2);

      expect(result.success).toBe(false);
      expect(result.medicineSpent).toBe(0);
    });

    it('revives a DOWN player to 30 HP', () => {
      const healer = createMockPlayer({ trait: 'Hunter' });
      const downTarget = createMockPlayer({ id: 'P2', hp: 10, downDays: 1 });

      const result = resolveHeal(healer, downTarget, 2);

      expect(result.success).toBe(true);
      expect(result.medicineSpent).toBe(1);
      expect(result.hpRestored).toBe(20); // 30 - 10 = 20
      expect(result.targetPlayerId).toBe('P2');
    });

    it('heals with Medic trait bonus (40 + 20 = 60 HP)', () => {
      const medic = createMockPlayer({ trait: 'Medic' });
      const target = createMockPlayer({ id: 'P2', hp: 30, maxHp: 100 });

      const result = resolveHeal(medic, target, 2);

      expect(result.success).toBe(true);
      expect(result.medicineSpent).toBe(1);
      expect(result.hpRestored).toBe(60); // 40 base + 20 medic bonus
    });
  });

  describe('resolveBuildSignal', () => {
    it('is blocked by Storm weather without spending wood', () => {
      const builder = createMockPlayer({ trait: 'Builder' });
      const results = resolveBuildSignal([{ player: builder }], 'Storm', 10);

      expect(results).toHaveLength(1);
      expect(results[0]?.success).toBe(false);
      expect(results[0]?.woodSpent).toBe(0);
      expect(results[0]?.signalGained).toBe(0);
      expect(results[0]?.energySpent).toBe(DEFAULT_BALANCE_CONFIG.actions.buildSignal.energyCost);
    });

    it('charges builder discount (3 wood instead of 5)', () => {
      const builder = createMockPlayer({ trait: 'Builder' });
      const results = resolveBuildSignal([{ player: builder }], 'Clear', 10);

      expect(results).toHaveLength(1);
      expect(results[0]?.success).toBe(true);
      expect(results[0]?.woodSpent).toBe(3);
      expect(results[0]?.signalGained).toBe(10);
    });

    it('charges standard wood (5 wood) for non-builder', () => {
      const scout = createMockPlayer({ trait: 'Scout' });
      const results = resolveBuildSignal([{ player: scout }], 'Clear', 10);

      expect(results).toHaveLength(1);
      expect(results[0]?.success).toBe(true);
      expect(results[0]?.woodSpent).toBe(5);
      expect(results[0]?.signalGained).toBe(10);
    });

    it('applies cooperative synergy (25 signal) when 2 builders construct on same day', () => {
      const b1 = createMockPlayer({ id: 'P1', trait: 'Builder' });
      const b2 = createMockPlayer({ id: 'P2', trait: 'Scout' });

      const results = resolveBuildSignal([{ player: b1 }, { player: b2 }], 'Clear', 10);

      expect(results).toHaveLength(2);
      expect(results[0]?.success).toBe(true);
      expect(results[1]?.success).toBe(true);
      const totalSignal = (results[0]?.signalGained ?? 0) + (results[1]?.signalGained ?? 0);
      expect(totalSignal).toBe(25);
      // Total wood spent: 3 (Builder) + 5 (Scout) = 8
      const totalWood = (results[0]?.woodSpent ?? 0) + (results[1]?.woodSpent ?? 0);
      expect(totalWood).toBe(8);
    });

    it('fails second builder when insufficient wood for both', () => {
      const b1 = createMockPlayer({ id: 'P1', trait: 'Scout' }); // costs 5
      const b2 = createMockPlayer({ id: 'P2', trait: 'Scout' }); // costs 5

      const results = resolveBuildSignal([{ player: b1 }, { player: b2 }], 'Clear', 6);

      expect(results).toHaveLength(2);
      expect(results[0]?.success).toBe(true);
      expect(results[0]?.woodSpent).toBe(5);
      expect(results[0]?.signalGained).toBe(10);

      expect(results[1]?.success).toBe(false);
      expect(results[1]?.woodSpent).toBe(0);
      expect(results[1]?.signalGained).toBe(0);
    });
  });
});
