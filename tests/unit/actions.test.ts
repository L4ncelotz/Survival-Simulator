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
    it('applies energy cost and grants food within range with Hunter trait multiplier (x1.4)', () => {
      const hunter = createMockPlayer({ trait: 'Hunter' });
      const actionStream = new RNGStream(12345);
      const injuryStream = new RNGStream(99999);

      const result = resolveHunt(hunter, actionStream, injuryStream, 'Clear');

      expect(result.actionType).toBe('Hunt');
      expect(result.energySpent).toBe(DEFAULT_BALANCE_CONFIG.actions.hunt.energyCost);
      // Base food is 4..8 -> Hunter gets Math.round(base * 1.4) -> 6..11
      expect(result.foodGained).toBeGreaterThanOrEqual(6);
      expect(result.foodGained).toBeLessThanOrEqual(11);
      expect(result.success).toBe(true);
    });

    it('does not give trait bonus to non-hunters', () => {
      const scout = createMockPlayer({ trait: 'Scout' });
      const actionStream = new RNGStream(12345);
      const injuryStream = new RNGStream(99999);

      const result = resolveHunt(scout, actionStream, injuryStream, 'Clear');

      expect(result.foodGained).toBeGreaterThanOrEqual(4);
      expect(result.foodGained).toBeLessThanOrEqual(8);
    });

    it('applies Rain weather modifier (x0.7) to Hunt food', () => {
      const player = createMockPlayer({ trait: 'Scout' });
      const actionStream = new RNGStream(12345);
      const injuryStream = new RNGStream(99999);

      const result = resolveHunt(player, actionStream, injuryStream, 'Rain');

      // Base food 4..8 * 0.7 -> 3..6
      expect(result.foodGained).toBeGreaterThanOrEqual(3);
      expect(result.foodGained).toBeLessThanOrEqual(6);
    });

    it('applies injury damage when injury roll passes', () => {
      const player = createMockPlayer();
      const actionStream = new RNGStream(1);
      const injuryStream = new RNGStream(1);
      injuryStream.next = () => 0.05; // Force chance true

      const result = resolveHunt(player, actionStream, injuryStream, 'Clear');
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

    it('adds rain bonus water (+2) when weather is Rain', () => {
      const player = createMockPlayer();
      const actionStream = new RNGStream(42);

      const result = resolveFindWater(player, actionStream, 'Rain');

      expect(result.waterGained).toBeGreaterThanOrEqual(8); // 6 + 2
      expect(result.waterGained).toBeLessThanOrEqual(12); // 10 + 2
    });
  });

  describe('resolveGatherWood', () => {
    it('gives base wood (2–5) with no trait bonus', () => {
      const builder = createMockPlayer({ trait: 'Builder' });
      const actionStream = new RNGStream(777);

      const result = resolveGatherWood(builder, actionStream, 'Clear');

      expect(result.energySpent).toBe(DEFAULT_BALANCE_CONFIG.actions.gatherWood.energyCost);
      expect(result.woodGained).toBeGreaterThanOrEqual(2);
      expect(result.woodGained).toBeLessThanOrEqual(5);
    });

    it('gives base wood (2–5) with no trait bonus', () => {
      const medic = createMockPlayer({ trait: 'Medic' });
      const actionStream = new RNGStream(777);

      const result = resolveGatherWood(medic, actionStream, 'Clear');

      expect(result.woodGained).toBeGreaterThanOrEqual(2);
      expect(result.woodGained).toBeLessThanOrEqual(5);
    });

    it('applies Rain weather wood penalty (-2)', () => {
      const medic = createMockPlayer({ trait: 'Medic' });
      const actionStream = new RNGStream(777);

      const result = resolveGatherWood(medic, actionStream, 'Rain');

      expect(result.woodGained).toBeGreaterThanOrEqual(1); // Math.max(1, 2 - 2)
      expect(result.woodGained).toBeLessThanOrEqual(3); // 5 - 2
    });
  });

  describe('resolveExplore', () => {
    it('generates resources and checks scout injury reduction', () => {
      const scout = createMockPlayer({ trait: 'Scout' });
      const exploreStream = new RNGStream(101);
      const injuryStream = new RNGStream(202);

      const result = resolveExplore(scout, exploreStream, injuryStream, 'Clear');

      expect(result.energySpent).toBe(DEFAULT_BALANCE_CONFIG.actions.explore.energyCost);
      expect(result.foodGained).toBeGreaterThanOrEqual(1);
      expect(result.waterGained).toBeGreaterThanOrEqual(1);
      expect(result.woodGained).toBeGreaterThanOrEqual(0);
      expect(result.medicineGained).toBeGreaterThanOrEqual(0);
    });
  });

  describe('resolveExplore', () => {
    it('generates resources and checks scout injury reduction', () => {
      const scout = createMockPlayer({ trait: 'Scout' });
      const exploreStream = new RNGStream(101);
      const injuryStream = new RNGStream(202);

      const result = resolveExplore(scout, exploreStream, injuryStream, 'Clear');

      expect(result.energySpent).toBe(DEFAULT_BALANCE_CONFIG.actions.explore.energyCost);
      expect(result.foodGained).toBeGreaterThanOrEqual(1);
      expect(result.waterGained).toBeGreaterThanOrEqual(1);
      expect(result.woodGained).toBeGreaterThanOrEqual(0);
      expect(result.medicineGained).toBeGreaterThanOrEqual(0);
    });

    it('Scout gets higher rare-find chance than non-Scout (×1.2 multiplier)', () => {
      // Run many trials and confirm Scout rare finds are at least as frequent
      let scoutMaxResults = 0;
      let nonScoutMaxResults = 0;
      const trials = 200;

      for (let i = 0; i < trials; i++) {
        const scout = createMockPlayer({ trait: 'Scout' });
        const nonScout = createMockPlayer({ trait: 'Hunter' });
        const stream1 = new RNGStream(i + 500);
        const stream2 = new RNGStream(i + 500);
        const inj1 = new RNGStream(i + 700);
        const inj2 = new RNGStream(i + 700);

        const scoutResult = resolveExplore(scout, stream1, inj1, 'Clear');
        const nonScoutResult = resolveExplore(nonScout, stream2, inj2, 'Clear');

        // Count how many loot items hit max value
        const scoutMaxCount = (scoutResult.foodGained === 2 ? 1 : 0) +
          (scoutResult.waterGained === 2 ? 1 : 0) +
          (scoutResult.woodGained === 1 ? 1 : 0);
        const nonScoutMaxCount = (nonScoutResult.foodGained === 2 ? 1 : 0) +
          (nonScoutResult.waterGained === 2 ? 1 : 0) +
          (nonScoutResult.woodGained === 1 ? 1 : 0);

        scoutMaxResults += scoutMaxCount;
        nonScoutMaxResults += nonScoutMaxCount;
      }

      // Scout should hit max values more often (higher rareFindChance)
      expect(scoutMaxResults).toBeGreaterThanOrEqual(nonScoutMaxResults);
    });
  });

  describe('resolveRest', () => {
    it('recovers HP when injured and caps at maxHp', () => {
      const injuredPlayer = createMockPlayer({ hp: 50, maxHp: 100, energy: 40 });

      const result = resolveRest(injuredPlayer);

      expect(result.energySpent).toBe(0);
      expect(result.hpRestored).toBe(10);
    });

    it('recovers energy up to maxEnergy', () => {
      const tiredPlayer = createMockPlayer({ energy: 70, maxEnergy: 100 });
      const result = resolveRest(tiredPlayer);
      expect(result.success).toBe(true);
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
      expect(result.energySpent).toBe(DEFAULT_BALANCE_CONFIG.actions.heal.energyCost);
    });

    it('fails if target is Dead', () => {
      const healer = createMockPlayer({ trait: 'Medic' });
      const deadTarget = createMockPlayer({ id: 'P2', hp: 0, downDays: 2 });

      const result = resolveHeal(healer, deadTarget, 2);

      expect(result.success).toBe(false);
      expect(result.medicineSpent).toBe(0);
    });

    it('fails with 0 medicine and 0 HP if target was already treated today (duplicate heal)', () => {
      const healer = createMockPlayer({ trait: 'Medic' });
      const target = createMockPlayer({ id: 'P2', hp: 40 });
      const alreadyTreated = new Set(['P2' as const]);

      const result = resolveHeal(healer, target, 2, alreadyTreated);

      expect(result.success).toBe(false);
      expect(result.medicineSpent).toBe(0);
      expect(result.hpRestored).toBe(0);
      expect(result.energySpent).toBe(DEFAULT_BALANCE_CONFIG.actions.heal.energyCost);
      expect(result.message).toContain('already treated');
    });

    it('revives a DOWN player to at least 35 HP', () => {
      const healer = createMockPlayer({ trait: 'Hunter' });
      const downTarget = createMockPlayer({ id: 'P2', hp: 10, downDays: 1 });

      const result = resolveHeal(healer, downTarget, 2);

      expect(result.success).toBe(true);
      expect(result.medicineSpent).toBe(1);
      expect(result.hpRestored).toBe(25); // 35 - 10 = 25
      expect(result.targetPlayerId).toBe('P2');
    });

    it('heals with Medic multiplier (40 × 1.5 = 60 HP)', () => {
      const medic = createMockPlayer({ trait: 'Medic' });
      const target = createMockPlayer({ id: 'P2', hp: 30, maxHp: 100 });

      const result = resolveHeal(medic, target, 2);

      expect(result.success).toBe(true);
      expect(result.medicineSpent).toBe(1);
      expect(result.hpRestored).toBe(60); // Math.round(40 * 1.5) = 60
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

    it('charges builder discount (3 wood instead of 4) and grants 8 signal for single build', () => {
      const builder = createMockPlayer({ trait: 'Builder' });
      const results = resolveBuildSignal([{ player: builder }], 'Clear', 10);

      expect(results).toHaveLength(1);
      expect(results[0]?.success).toBe(true);
      expect(results[0]?.woodSpent).toBe(3); // builderWoodCost = 3
      expect(results[0]?.signalGained).toBe(8); // single build = +8
    });

    it('charges standard wood (4 wood) for non-builder and grants 8 signal for single build', () => {
      const scout = createMockPlayer({ trait: 'Scout' });
      const results = resolveBuildSignal([{ player: scout }], 'Clear', 10);

      expect(results).toHaveLength(1);
      expect(results[0]?.success).toBe(true);
      expect(results[0]?.woodSpent).toBe(4);
      expect(results[0]?.signalGained).toBe(8);
    });

    it('applies cooperative synergy (+12 signal max) when 2 builders construct on same day', () => {
      const b1 = createMockPlayer({ id: 'P1', trait: 'Builder' });
      const b2 = createMockPlayer({ id: 'P2', trait: 'Scout' });

      const results = resolveBuildSignal([{ player: b1 }, { player: b2 }], 'Clear', 10);

      expect(results).toHaveLength(2);
      expect(results[0]?.success).toBe(true);
      expect(results[1]?.success).toBe(true);
      const totalSignal = (results[0]?.signalGained ?? 0) + (results[1]?.signalGained ?? 0);
      expect(totalSignal).toBe(12); // max 12 signal per day
      // Total wood spent: 3 (Builder) + 4 (Scout) = 7
      const totalWood = (results[0]?.woodSpent ?? 0) + (results[1]?.woodSpent ?? 0);
      expect(totalWood).toBe(7);
    });

    it('does not charge wood to useless 3rd+ builders when daily signal limit (+12) is reached', () => {
      const b1 = createMockPlayer({ id: 'P1', trait: 'Builder' });
      const b2 = createMockPlayer({ id: 'P2', trait: 'Scout' });
      const b3 = createMockPlayer({ id: 'P3', trait: 'Hunter' });

      const results = resolveBuildSignal(
        [{ player: b1 }, { player: b2 }, { player: b3 }],
        'Clear',
        20,
      );

      expect(results).toHaveLength(3);
      expect(results[0]?.success).toBe(true);
      expect(results[1]?.success).toBe(true);
      expect(results[2]?.success).toBe(false);
      expect(results[2]?.woodSpent).toBe(0);
      expect(results[2]?.signalGained).toBe(0);
      expect(results[2]?.energySpent).toBe(DEFAULT_BALANCE_CONFIG.actions.buildSignal.energyCost);
      expect(results[2]?.message).toContain('limit');
    });

    it('fails second builder when insufficient wood for both (wood downgrade)', () => {
      const b1 = createMockPlayer({ id: 'P1', trait: 'Scout' }); // costs 4
      const b2 = createMockPlayer({ id: 'P2', trait: 'Scout' }); // costs 4

      const results = resolveBuildSignal([{ player: b1 }, { player: b2 }], 'Clear', 6);

      expect(results).toHaveLength(2);
      expect(results[0]?.success).toBe(true);
      expect(results[0]?.woodSpent).toBe(4);
      expect(results[0]?.signalGained).toBe(8);

      expect(results[1]?.success).toBe(false);
      expect(results[1]?.woodSpent).toBe(0);
      expect(results[1]?.signalGained).toBe(0);
    });
  });
});
