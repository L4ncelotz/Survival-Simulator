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

  // Triage order: lowest HP first, tie-breaker by PlayerId alphabetical
  const sortedLivingPlayers = [...livingPlayerIds]
    .map((id) => players[id])
    .sort((a, b) => {
      if (a.hp !== b.hp) {
        return a.hp - b.hp;
      }
      return a.id.localeCompare(b.id);
    });

  const fedPlayers: PlayerId[] = [];
  const starvedPlayers: PlayerId[] = [];
  const hydratedPlayers: PlayerId[] = [];
  const dehydratedPlayers: PlayerId[] = [];
  const hungerDamagedPlayers: PlayerId[] = [];
  const thirstDamagedPlayers: PlayerId[] = [];
  const newlyDownPlayers: PlayerId[] = [];
  const newDeaths: PlayerId[] = [];

  const updatedPlayers: Record<PlayerId, PlayerStatus> = { ...players };

  for (const player of sortedLivingPlayers) {
    const wasDown = getCondition(player, config) === 'DOWN';

    // Calculate demands
    const foodDemand =
      config.dailyConsumption.foodPerPlayer *
      emergencyMultiplier *
      (player.trait === 'Hunter' ? config.dailyConsumption.hunterFoodMultiplier : 1.0);

    const waterDemand = config.dailyConsumption.waterPerPlayer * emergencyMultiplier;

    // Triage food
    let fed = false;
    if (remainingFood >= foodDemand) {
      remainingFood -= foodDemand;
      fed = true;
      fedPlayers.push(player.id);
    } else {
      starvedPlayers.push(player.id);
    }

    // Triage water
    let hydrated = false;
    if (remainingWater >= waterDemand) {
      remainingWater -= waterDemand;
      hydrated = true;
      hydratedPlayers.push(player.id);
    } else {
      dehydratedPlayers.push(player.id);
    }

    // Needs progression
    const newHunger = fed
      ? Math.max(0, player.hunger - 10)
      : Math.min(100, player.hunger + 20);

    const newThirst = hydrated
      ? Math.max(0, player.thirst - 15)
      : Math.min(100, player.thirst + 30);

    // Needs damage
    let damage = 0;
    if (newHunger >= config.needsDamage.hungerThreshold) {
      damage += config.needsDamage.hungerHpDamage;
      hungerDamagedPlayers.push(player.id);
    }

    if (newThirst >= config.needsDamage.thirstThreshold) {
      damage += config.needsDamage.thirstHpDamage;
      thirstDamagedPlayers.push(player.id);
    }

    let newHp = Math.max(0, player.hp - damage);
    let newDownDays = player.downDays;

    if (wasDown) {
      newDownDays = player.downDays + 1;
      if (newHp <= 0 || newDownDays >= config.player.downMaxDays) {
        newHp = 0;
        newDeaths.push(player.id);
      }
    } else {
      // Previously Healthy or Injured
      if (newHp <= 0) {
        newHp = 0;
        newDeaths.push(player.id);
      } else if (newHp <= config.player.downHpThreshold) {
        newDownDays = 0;
        newlyDownPlayers.push(player.id);
      } else {
        newDownDays = 0;
      }
    }

    updatedPlayers[player.id] = {
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
