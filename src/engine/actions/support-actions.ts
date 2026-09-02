import { DEFAULT_BALANCE_CONFIG, type BalanceConfig } from '../config/balance.js';
import { getCondition } from '../rules/condition.js';
import type { PlayerStatus, WeatherType } from '../types.js';
import type { ActionResult } from './types.js';

/**
 * Resolves a single Heal action targeting another player (or self).
 */
export function resolveHeal(
  healer: PlayerStatus,
  target: PlayerStatus,
  availableMedicine: number,
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
): ActionResult {
  const targetCondition = getCondition(target, config);

  // Validation: Target must not be dead and medicine must be available
  if (targetCondition === 'Dead' || availableMedicine < config.actions.heal.medicineCost) {
    const failReason =
      targetCondition === 'Dead'
        ? `${target.name} is dead and cannot be healed.`
        : `no medicine was available.`;

    return {
      playerId: healer.id,
      actionType: 'Heal',
      success: false,
      energySpent: config.actions.heal.energyCost,
      foodGained: 0,
      waterGained: 0,
      woodGained: 0,
      medicineGained: 0,
      woodSpent: 0,
      medicineSpent: 0,
      hpRestored: 0,
      hpDamage: 0,
      signalGained: 0,
      targetPlayerId: target.id,
      message: `${healer.name} attempted to heal ${target.name}, but ${failReason}`,
    };
  }

  const energySpent = config.actions.heal.energyCost;
  const medicineSpent = config.actions.heal.medicineCost;

  if (targetCondition === 'DOWN') {
    // Revive DOWN player to designated downRecoveryHp (e.g., 30 HP)
    const hpRestored = Math.max(0, config.actions.heal.downRecoveryHp - target.hp);

    return {
      playerId: healer.id,
      actionType: 'Heal',
      success: true,
      energySpent,
      foodGained: 0,
      waterGained: 0,
      woodGained: 0,
      medicineGained: 0,
      woodSpent: 0,
      medicineSpent,
      hpRestored,
      hpDamage: 0,
      signalGained: 0,
      targetPlayerId: target.id,
      message: `${healer.name} administered medicine to revive ${target.name} from DOWN state (+${hpRestored} HP to reach ${config.actions.heal.downRecoveryHp} HP)!`,
    };
  }

  // Healing Healthy or Injured target
  const medicBonus = healer.trait === 'Medic' ? config.actions.heal.medicHpBonus : 0;
  const potentialHeal = config.actions.heal.hpRestored + medicBonus;
  const hpRestored = Math.min(target.maxHp - target.hp, potentialHeal);

  return {
    playerId: healer.id,
    actionType: 'Heal',
    success: true,
    energySpent,
    foodGained: 0,
    waterGained: 0,
    woodGained: 0,
    medicineGained: 0,
    woodSpent: 0,
    medicineSpent,
    hpRestored,
    hpDamage: 0,
    signalGained: 0,
    targetPlayerId: target.id,
    message: `${healer.name} (${healer.trait}) treated ${target.name}'s wounds for ${hpRestored} HP${
      medicBonus > 0 ? ` (+${medicBonus} Medic bonus)` : ''
    }.`,
  };
}

export interface BuildSignalParticipant {
  readonly player: PlayerStatus;
}

/**
 * Resolves all Build Signal actions submitted on the same day with multi-builder collision & synergy handling.
 */
export function resolveBuildSignal(
  participants: readonly BuildSignalParticipant[],
  weather: WeatherType,
  availableWood: number,
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
): readonly ActionResult[] {
  if (participants.length === 0) {
    return [];
  }

  // Storm blocks all signal construction
  if (weather === 'Storm') {
    return participants.map(({ player }) => ({
      playerId: player.id,
      actionType: 'BuildSignal',
      success: false,
      energySpent: config.actions.buildSignal.energyCost,
      foodGained: 0,
      waterGained: 0,
      woodGained: 0,
      medicineGained: 0,
      woodSpent: 0,
      medicineSpent: 0,
      hpRestored: 0,
      hpDamage: 0,
      signalGained: 0,
      message: `${player.name} attempted to build the rescue signal, but the Storm blocked construction! Wood was saved.`,
    }));
  }

  let remainingWood = availableWood;
  const qualifiedBuilders: { player: PlayerStatus; woodCost: number }[] = [];
  const failedResults: ActionResult[] = [];

  for (const { player } of participants) {
    const woodCost =
      player.trait === 'Builder'
        ? config.actions.buildSignal.builderWoodCost
        : config.actions.buildSignal.woodCost;

    if (remainingWood >= woodCost) {
      remainingWood -= woodCost;
      qualifiedBuilders.push({ player, woodCost });
    } else {
      failedResults.push({
        playerId: player.id,
        actionType: 'BuildSignal',
        success: false,
        energySpent: config.actions.buildSignal.energyCost,
        foodGained: 0,
        waterGained: 0,
        woodGained: 0,
        medicineGained: 0,
        woodSpent: 0,
        medicineSpent: 0,
        hpRestored: 0,
        hpDamage: 0,
        signalGained: 0,
        message: `${player.name} could not build signal: insufficient wood (${remainingWood}/${woodCost}).`,
      });
    }
  }

  const successCount = qualifiedBuilders.length;
  const successfulResults: ActionResult[] = qualifiedBuilders.map(({ player, woodCost }, index) => {
    let signalGained: number;
    let synergyNote = '';

    if (successCount === 2) {
      // 2 builders synergy: Total 25 signal (15 for first, 10 for second)
      signalGained = index === 0 ? 15 : 10;
      synergyNote = ` (Cooperative Synergy! +25 total)`;
    } else if (successCount > 2) {
      // 3+ builders: First two get 15 & 10 (25), additional get 10 each
      signalGained = index === 0 ? 15 : 10;
      synergyNote = index < 2 ? ` (Cooperative Synergy!)` : '';
    } else {
      // 1 builder: standard 10 signal
      signalGained = config.actions.buildSignal.signalGain;
    }

    return {
      playerId: player.id,
      actionType: 'BuildSignal',
      success: true,
      energySpent: config.actions.buildSignal.energyCost,
      foodGained: 0,
      waterGained: 0,
      woodGained: 0,
      medicineGained: 0,
      woodSpent: woodCost,
      medicineSpent: 0,
      hpRestored: 0,
      hpDamage: 0,
      signalGained,
      message: `${player.name} (${player.trait}) built the rescue signal (+${signalGained} signal, spent ${woodCost} wood)${synergyNote}.`,
    };
  });

  return [...successfulResults, ...failedResults];
}
