import { DEFAULT_BALANCE_CONFIG, type BalanceConfig } from '../config/balance.js';
import type { RNGStream } from '../rng/rng-stream.js';
import type { PlayerStatus, WeatherType } from '../types.js';
import type { ActionResult } from './types.js';

/**
 * Resolves the Hunt action.
 */
export function resolveHunt(
  player: PlayerStatus,
  actionStream: RNGStream,
  injuryStream: RNGStream,
  weather: WeatherType = 'Clear',
  hasMedic: boolean = false,
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
): ActionResult {
  const energySpent = config.actions.hunt.energyCost;
  const baseFood = actionStream.nextInt(
    config.actions.hunt.minFood,
    config.actions.hunt.maxFood,
  );

  const hunterMultiplier =
    player.trait === 'Hunter' ? config.actions.hunt.hunterMultiplier : 1.0;
  const rainMultiplier =
    weather === 'Rain' ? config.actions.hunt.rainMultiplier : 1.0;
  const foodGained = Math.round(baseFood * hunterMultiplier * rainMultiplier);

  const medicReduction = hasMedic ? config.medicTeamInjuryReduction : 1.0;
  const injuryChance = config.actions.hunt.injuryChance * medicReduction;
  const injured = injuryStream.chance(injuryChance);
  const hpDamage = injured ? 15 : 0;

  const notes: string[] = [];
  if (hunterMultiplier > 1.0) notes.push(`Hunter ×${hunterMultiplier}`);
  if (rainMultiplier < 1.0) notes.push(`Rain ×${rainMultiplier}`);
  const modifierStr = notes.length > 0 ? ` (${notes.join(', ')})` : '';

  const message = `${player.name} (${player.trait}) hunted and secured ${foodGained} food${modifierStr}${
    injured ? ' but suffered an injury (-15 HP)' : ''
  }.`;

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
  weather: WeatherType = 'Clear',
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
): ActionResult {
  const energySpent = config.actions.gatherWood.energyCost;
  const baseWood = actionStream.nextInt(
    config.actions.gatherWood.minWood,
    config.actions.gatherWood.maxWood,
  );
  const rainPenalty = weather === 'Rain' ? config.actions.gatherWood.rainWoodPenalty : 0;
  const woodGained = Math.max(1, baseWood - rainPenalty);

  const message =
    rainPenalty > 0
      ? `${player.name} (${player.trait}) gathered ${woodGained} wood (-${rainPenalty} Rain penalty).`
      : `${player.name} (${player.trait}) gathered ${woodGained} wood.`;

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
  weather: WeatherType = 'Clear',
  hasMedic: boolean = false,
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
): ActionResult {
  const energySpent = config.actions.explore.energyCost;

  // Medicine roll (Scout gets 1.2x chance multiplier)
  const scoutMedMultiplier =
    player.trait === 'Scout' ? config.actions.explore.scoutMedicineMultiplier : 1.0;
  const medicineChance = config.actions.explore.medicineChance * scoutMedMultiplier;
  const medicineGained = exploreStream.chance(medicineChance) ? 1 : 0;

  // Resource loot rolls (Scout gets ×1.2 rare-find chance)
  const scoutRareFactor = player.trait === 'Scout' ? config.actions.explore.scoutMedicineMultiplier : 1.0;
  const rareFindChance = config.actions.explore.rareFindChance * scoutRareFactor;
  const foodGained = exploreStream.chance(rareFindChance) ? 2 : exploreStream.nextInt(1, 2);
  const waterGained = exploreStream.chance(rareFindChance) ? 2 : exploreStream.nextInt(1, 2);
  const woodGained = exploreStream.chance(rareFindChance) ? 1 : exploreStream.nextInt(0, 1);

  // Hazard roll (Scout 0.5x, Storm 2.0x, Medic team passive 0.85x)
  const scoutInjuryFactor =
    player.trait === 'Scout' ? config.actions.explore.scoutInjuryReduction : 1.0;
  const stormFactor =
    weather === 'Storm' ? config.actions.explore.stormInjuryMultiplier : 1.0;
  const medicFactor = hasMedic ? config.medicTeamInjuryReduction : 1.0;

  const hazardChance =
    config.actions.explore.hazardChance * scoutInjuryFactor * stormFactor * medicFactor;
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
  const energyGained = config.actions.rest.energyRecovery;
  const hpRestored = Math.min(player.maxHp - player.hp, config.actions.rest.hpRecovery);

  const message = `${player.name} rested at camp (+${energyGained} Energy${
    hpRestored > 0 ? `, +${hpRestored} HP` : ''
  }).`;

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
