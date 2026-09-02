import { DEFAULT_BALANCE_CONFIG, type BalanceConfig } from '../config/balance.js';
import type { RNGStream } from '../rng/rng-stream.js';
import { getCondition } from '../rules/condition.js';
import type { PlayerStatus, WeatherType } from '../types.js';
import type { ActionResult } from './types.js';

/**
 * Resolves the Hunt action.
 */
export function resolveHunt(
  player: PlayerStatus,
  actionStream: RNGStream,
  injuryStream: RNGStream,
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
): ActionResult {
  const energySpent = config.actions.hunt.energyCost;
  const baseFood = actionStream.nextInt(
    config.actions.hunt.minFood,
    config.actions.hunt.maxFood,
  );
  const traitBonus = player.trait === 'Hunter' ? config.actions.hunt.hunterFoodBonus : 0;
  const foodGained = baseFood + traitBonus;

  const injured = injuryStream.chance(config.actions.hunt.injuryChance);
  const hpDamage = injured ? 15 : 0;

  const message = `${player.name} (${player.trait}) hunted and secured ${foodGained} food${
    traitBonus > 0 ? ` (+${traitBonus} Hunter bonus)` : ''
  }${injured ? ' but suffered an injury (-15 HP)' : ''}.`;

  return {
    playerId: player.id,
    actionType: 'Hunt',
    success: true,
    energySpent,
    foodGained,
    waterGained: 0,
    woodGained: 0,
    medicineGained: 0,
    woodSpent: 0,
    medicineSpent: 0,
    hpRestored: 0,
    hpDamage,
    signalGained: 0,
    message,
  };
}

/**
 * Resolves the Find Water action.
 */
export function resolveFindWater(
  player: PlayerStatus,
  actionStream: RNGStream,
  weather: WeatherType,
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
): ActionResult {
  const energySpent = config.actions.findWater.energyCost;
  const baseWater = actionStream.nextInt(
    config.actions.findWater.minWater,
    config.actions.findWater.maxWater,
  );
  const weatherBonus = weather === 'Rain' ? config.actions.findWater.rainBonusWater : 0;
  const waterGained = baseWater + weatherBonus;

  const message = `${player.name} gathered ${waterGained} water${
    weatherBonus > 0 ? ` (+${weatherBonus} Rain bonus)` : ''
  }.`;

  return {
    playerId: player.id,
    actionType: 'FindWater',
    success: true,
    energySpent,
    foodGained: 0,
    waterGained,
    woodGained: 0,
    medicineGained: 0,
    woodSpent: 0,
    medicineSpent: 0,
    hpRestored: 0,
    hpDamage: 0,
    signalGained: 0,
    message,
  };
}

/**
 * Resolves the Gather Wood action.
 */
export function resolveGatherWood(
  player: PlayerStatus,
  actionStream: RNGStream,
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
): ActionResult {
  const energySpent = config.actions.gatherWood.energyCost;
  const baseWood = actionStream.nextInt(
    config.actions.gatherWood.minWood,
    config.actions.gatherWood.maxWood,
  );
  const traitBonus = player.trait === 'Builder' ? config.actions.gatherWood.builderBonusWood : 0;
  const woodGained = baseWood + traitBonus;

  const message = `${player.name} (${player.trait}) gathered ${woodGained} wood${
    traitBonus > 0 ? ` (+${traitBonus} Builder bonus)` : ''
  }.`;

  return {
    playerId: player.id,
    actionType: 'GatherWood',
    success: true,
    energySpent,
    foodGained: 0,
    waterGained: 0,
    woodGained,
    medicineGained: 0,
    woodSpent: 0,
    medicineSpent: 0,
    hpRestored: 0,
    hpDamage: 0,
    signalGained: 0,
    message,
  };
}

/**
 * Resolves the Explore action.
 */
export function resolveExplore(
  player: PlayerStatus,
  exploreStream: RNGStream,
  injuryStream: RNGStream,
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
): ActionResult {
  const energySpent = config.actions.explore.energyCost;

  // Medicine roll
  const medicineGained = exploreStream.chance(config.actions.explore.medicineChance) ? 1 : 0;
  // Resource loot rolls
  const foodGained = exploreStream.nextInt(1, 2);
  const waterGained = exploreStream.nextInt(1, 2);
  const woodGained = exploreStream.nextInt(0, 1);

  // Hazard roll
  const hazardChance =
    0.2 * (player.trait === 'Scout' ? config.actions.explore.scoutInjuryReduction : 1.0);
  const injured = injuryStream.chance(hazardChance);
  const hpDamage = injured ? 10 : 0;

  const message = `${player.name} explored the island, finding ${foodGained} food, ${waterGained} water, ${woodGained} wood${
    medicineGained > 0 ? ', and 1 medicine' : ''
  }${injured ? ' but encountered hazards (-10 HP)' : ''}.`;

  return {
    playerId: player.id,
    actionType: 'Explore',
    success: true,
    energySpent,
    foodGained,
    waterGained,
    woodGained,
    medicineGained,
    woodSpent: 0,
    medicineSpent: 0,
    hpRestored: 0,
    hpDamage,
    signalGained: 0,
    message,
  };
}

/**
 * Resolves the Rest action.
 */
export function resolveRest(
  player: PlayerStatus,
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
): ActionResult {
  const condition = getCondition(player, config);
  const isAbleToRestHp = condition === 'Healthy' || condition === 'Injured';
  const hpRestored = isAbleToRestHp
    ? Math.min(player.maxHp - player.hp, config.actions.rest.hpRecovery)
    : 0;

  const message = `${player.name} rested, recovering energy${
    hpRestored > 0 ? ` and ${hpRestored} HP` : ''
  }.`;

  return {
    playerId: player.id,
    actionType: 'Rest',
    success: true,
    energySpent: 0,
    foodGained: 0,
    waterGained: 0,
    woodGained: 0,
    medicineGained: 0,
    woodSpent: 0,
    medicineSpent: 0,
    hpRestored,
    hpDamage: 0,
    signalGained: 0,
    message,
  };
}
