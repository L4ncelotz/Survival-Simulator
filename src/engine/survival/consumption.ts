import { DEFAULT_BALANCE_CONFIG, type BalanceConfig } from '../config/balance.js';
import { getCondition } from '../rules/condition.js';
import type { PlayerId, PlayerStatus, ResourcePool } from '../types.js';

export interface ConsumptionReport {
  readonly updatedPlayers: Record<PlayerId, PlayerStatus>;
  readonly remainingResources: ResourcePool;
  readonly fedPlayers: readonly PlayerId[];
  readonly starvedPlayers: readonly PlayerId[];
  readonly hydratedPlayers: readonly PlayerId[];
  readonly dehydratedPlayers: readonly PlayerId[];
  readonly hungerDamagedPlayers: readonly PlayerId[];
  readonly thirstDamagedPlayers: readonly PlayerId[];
  readonly newlyDownPlayers: readonly PlayerId[];
  readonly newDeaths: readonly PlayerId[];
}

const ALL_PLAYER_IDS: readonly PlayerId[] = ['P1', 'P2', 'P3', 'P4'] as const;

/**
 * Applies daily consumption triage, hunger/thirst updates, needs damage, and DOWN/Death progression.
 * - Food triage: Highest Hunger gets food first (tie-breaker lowest HP, then player ID).
 * - Water triage: Highest Thirst gets water first (tie-breaker lowest HP, then player ID).
 * - Partial rations supported continuously.
 * - Needs damage applied when hunger > 80 (-5 HP) and thirst > 80 (-8 HP).
 */
export function applyDailyConsumption(
  players: Record<PlayerId, PlayerStatus>,
  resources: ResourcePool,
  day: number,
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
): ConsumptionReport {
  let remainingFood = Math.max(0, resources.food);
  let remainingWater = Math.max(0, resources.water);

  const isEmergency = day > config.timeline.rescueDay;
  const emergencyMultiplier = isEmergency ? config.dailyConsumption.emergencyMultiplier : 1.0;

  // Identify living players
  const livingPlayerIds = ALL_PLAYER_IDS.filter(
    (id) => getCondition(players[id], config) !== 'Dead',
  );

  // 1. Food Triage: Highest Hunger first
  const foodTriageOrder = [...livingPlayerIds]
    .map((id) => players[id])
    .sort((a, b) => {
      if (a.hunger !== b.hunger) {
        return b.hunger - a.hunger; // descending hunger
      }
      if (a.hp !== b.hp) {
        return a.hp - b.hp; // lowest HP tie-breaker
      }
      return a.id.localeCompare(b.id);
    });

  const foodRationRatios: Partial<Record<PlayerId, number>> = {};
  const fedPlayers: PlayerId[] = [];
  const starvedPlayers: PlayerId[] = [];

  for (const player of foodTriageOrder) {
    const foodDemand =
      config.dailyConsumption.foodPerPlayer *
      emergencyMultiplier *
      (player.trait === 'Hunter' ? config.dailyConsumption.hunterFoodMultiplier : 1.0);

    if (remainingFood >= foodDemand) {
      remainingFood -= foodDemand;
      foodRationRatios[player.id] = 1.0;
      fedPlayers.push(player.id);
    } else if (remainingFood > 0) {
      foodRationRatios[player.id] = remainingFood / foodDemand;
      remainingFood = 0;
      fedPlayers.push(player.id);
    } else {
      foodRationRatios[player.id] = 0.0;
      starvedPlayers.push(player.id);
    }
  }

  // 2. Water Triage: Highest Thirst first
  const waterTriageOrder = [...livingPlayerIds]
    .map((id) => players[id])
    .sort((a, b) => {
      if (a.thirst !== b.thirst) {
        return b.thirst - a.thirst; // descending thirst
      }
      if (a.hp !== b.hp) {
        return a.hp - b.hp; // lowest HP tie-breaker
      }
      return a.id.localeCompare(b.id);
    });

  const waterRationRatios: Partial<Record<PlayerId, number>> = {};
  const hydratedPlayers: PlayerId[] = [];
  const dehydratedPlayers: PlayerId[] = [];

  for (const player of waterTriageOrder) {
    const waterDemand = config.dailyConsumption.waterPerPlayer * emergencyMultiplier;

    if (remainingWater >= waterDemand) {
      remainingWater -= waterDemand;
      waterRationRatios[player.id] = 1.0;
      hydratedPlayers.push(player.id);
    } else if (remainingWater > 0) {
      waterRationRatios[player.id] = remainingWater / waterDemand;
      remainingWater = 0;
      hydratedPlayers.push(player.id);
    } else {
      waterRationRatios[player.id] = 0.0;
      dehydratedPlayers.push(player.id);
    }
  }

  // 3. Needs Progression & Damage for all living players
  const hungerDamagedPlayers: PlayerId[] = [];
  const thirstDamagedPlayers: PlayerId[] = [];
  const newlyDownPlayers: PlayerId[] = [];
  const newDeaths: PlayerId[] = [];

  const updatedPlayers: Record<PlayerId, PlayerStatus> = { ...players };

  for (const id of livingPlayerIds) {
    const player = players[id];
    const wasDown = getCondition(player, config) === 'DOWN';

    const foodRatio = foodRationRatios[id] ?? 0.0;
    const waterRatio = waterRationRatios[id] ?? 0.0;

    // Hunger delta: -30 when ratio=1.0, +25 when ratio=0.0
    const hungerDelta =
      -config.dailyConsumption.hungerReliefFed * foodRatio +
      config.dailyConsumption.hungerGainUnfed * (1.0 - foodRatio);
    const newHunger = Math.max(0, Math.min(100, Math.round(player.hunger + hungerDelta)));

    // Thirst delta: -30 when ratio=1.0, +25 when ratio=0.0
    const thirstDelta =
      -config.dailyConsumption.thirstReliefHydrated * waterRatio +
      config.dailyConsumption.thirstGainUnhydrated * (1.0 - waterRatio);
    const newThirst = Math.max(0, Math.min(100, Math.round(player.thirst + thirstDelta)));

    // Needs damage: hunger > 80 => -5 HP, thirst > 80 => -8 HP
    let damage = 0;
    if (newHunger > config.needsDamage.hungerThreshold) {
      damage += config.needsDamage.hungerHpDamage;
      hungerDamagedPlayers.push(id);
    }
    if (newThirst > config.needsDamage.thirstThreshold) {
      damage += config.needsDamage.thirstHpDamage;
      thirstDamagedPlayers.push(id);
    }

    let newHp = Math.max(0, player.hp - damage);
    let newDownDays = player.downDays;

    if (wasDown) {
      newDownDays = player.downDays + 1;
      if (newHp <= 0 || newDownDays >= config.player.downMaxDays) {
        newHp = 0;
        newDeaths.push(id);
      }
    } else {
      // Previously Healthy or Injured
      if (newHp <= 0) {
        newHp = 0;
        newDeaths.push(id);
      } else if (newHp <= config.player.downHpThreshold) {
        newDownDays = 0;
        newlyDownPlayers.push(id);
      } else {
        newDownDays = 0;
      }
    }

    updatedPlayers[id] = {
      ...player,
      hp: newHp,
      hunger: newHunger,
      thirst: newThirst,
      downDays: newDownDays,
    };
  }

  const remainingResources: ResourcePool = {
    ...resources,
    food: remainingFood,
    water: remainingWater,
  };

  return {
    updatedPlayers: Object.freeze(updatedPlayers),
    remainingResources: Object.freeze(remainingResources),
    fedPlayers: Object.freeze(fedPlayers),
    starvedPlayers: Object.freeze(starvedPlayers),
    hydratedPlayers: Object.freeze(hydratedPlayers),
    dehydratedPlayers: Object.freeze(dehydratedPlayers),
    hungerDamagedPlayers: Object.freeze(hungerDamagedPlayers),
    thirstDamagedPlayers: Object.freeze(thirstDamagedPlayers),
    newlyDownPlayers: Object.freeze(newlyDownPlayers),
    newDeaths: Object.freeze(newDeaths),
  };
}
