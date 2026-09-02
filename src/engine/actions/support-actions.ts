import { DEFAULT_BALANCE_CONFIG, type BalanceConfig } from '../config/balance.js';
import { getCondition } from '../rules/condition.js';
import type { PlayerId, PlayerStatus, WeatherType } from '../types.js';
import type { ActionResult } from './types.js';

/**
 * Resolves a single Heal action targeting another player (or self).
 * Guarantees that only the first valid Heal on a target resolves; duplicate Heals on the same
 * target consume action energy but 0 additional medicine and 0 HP.
 */
export function resolveHeal(
  healer: PlayerStatus,
  target: PlayerStatus,
  availableMedicine: number,
  alreadyTreatedTargetIds: ReadonlySet<PlayerId> = new Set(),
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
): ActionResult {
  const targetCondition = getCondition(target, config);

  // Check collision: Target already treated by an earlier heal today
  if (alreadyTreatedTargetIds.has(target.id)) {
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
      message: `${healer.name} attempted to heal ${target.name}, but ${target.name} was already treated by another survivor today.`,
    };
  }

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
    // Revive DOWN player to designated downRecoveryHp (30 HP)
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
 * - Single build = +8 signal.
 * - 2+ builders = +12 MAX signal / day (1st gets 8, 2nd gets 4).
 * - Builder discount: wood cost 4 instead of 5.
 * - Downgrades when wood is only sufficient for 1 builder.
 * - Useless extra builders (> 2) do not spend wood.
 * - Storm disables build.
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
    // If we already have 2 qualified builders, daily construction limit is reached
    if (qualifiedBuilders.length >= 2) {
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
        message: `${player.name} attempted to build the rescue signal, but the daily construction limit (+12 max/day) was already reached. Wood was saved.`,
      });
      continue;
    }

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
      // 2 builders synergy: Total 12 signal (8 for first, 4 for second)
      signalGained =
        index === 0
          ? config.actions.buildSignal.singleSignalGain
          : config.actions.buildSignal.maxDailySignalGain -
            config.actions.buildSignal.singleSignalGain;
      synergyNote = ` (Cooperative Synergy! +${config.actions.buildSignal.maxDailySignalGain} total)`;
    } else {
      // 1 builder: standard 8 signal
      signalGained = config.actions.buildSignal.singleSignalGain;
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
