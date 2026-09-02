import type { BotStrategy } from '../bots/bot-interface.js';
import { DEFAULT_BALANCE_CONFIG, type BalanceConfig } from '../engine/config/balance.js';
import { getCondition } from '../engine/rules/condition.js';
import type { ActionType, PlayerId } from '../engine/types.js';
import { runGame } from '../headless/run-game.js';
import type { SimulationMetrics } from './metrics.js';

const ALL_ACTION_TYPES: readonly ActionType[] = [
  'Hunt',
  'FindWater',
  'GatherWood',
  'Explore',
  'Rest',
  'Heal',
  'BuildSignal',
] as const;

const ALL_PLAYER_IDS: readonly PlayerId[] = ['P1', 'P2', 'P3', 'P4'] as const;

/**
 * Runs large-scale batch survival simulations and aggregates telemetry statistics.
 */
export function runSimulation(
  totalGames: number,
  strategy: BotStrategy,
  seedPrefix: string = 'sim',
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
): SimulationMetrics {
  if (totalGames <= 0) {
    throw new Error('totalGames must be greater than 0');
  }

  let wins = 0;
  let losses = 0;
  let totalEndDays = 0;
  let earlyRescueCount = 0;
  let normalRescueCount = 0;
  let emergencyRescueCount = 0;
  let allDeadCount = 0;
  let emergencyExpiredCount = 0;

  let totalEndingFood = 0;
  let totalEndingWater = 0;
  let totalEndingWood = 0;
  let totalEndingMedicine = 0;
  let totalSignalProgress = 0;
  let totalDeaths = 0;
  let energyBlockCount = 0;
  let totalWinDays = 0;
  let deathBeforeDay5Count = 0;
  let totalDownEvents = 0;
  let totalDownRecoveries = 0;
  let totalHealAttempts = 0;
  let totalMedicineStarvations = 0;
  const actionDistribution: Record<ActionType, number> = {
    Hunt: 0,
    FindWater: 0,
    GatherWood: 0,
    Explore: 0,
    Rest: 0,
    Heal: 0,
    BuildSignal: 0,
  };

  for (let i = 0; i < totalGames; i++) {
    const seed = `${seedPrefix}-${i}`;
    const result = runGame(seed, strategy, config);

    totalEndDays += result.totalDays;

    if (result.win) {
      wins++;
      totalWinDays += result.totalDays;
      if (result.endReason.includes('Early')) {
        earlyRescueCount++;
      } else if (result.endReason.includes('Normal')) {
        normalRescueCount++;
      } else {
        emergencyRescueCount++;
      }
    } else {
      losses++;
      if (result.endReason.includes('perished')) {
        allDeadCount++;
      } else {
        emergencyExpiredCount++;
      }
    }

    totalEndingFood += result.finalState.resources.food;
    totalEndingWater += result.finalState.resources.water;
    totalEndingWood += result.finalState.resources.wood;
    totalEndingMedicine += result.finalState.resources.medicine;
    totalSignalProgress += result.finalState.signal.progress;

    // Count dead players in final state
    for (const id of ALL_PLAYER_IDS) {
      if (getCondition(result.finalState.players[id], config) === 'Dead') {
        totalDeaths++;
      }
    }

    // Early death detection
    const hadEarlyDeath = result.logs.some(
      (log) => log.deaths.length > 0 && log.day <= 4,
    );
    if (hadEarlyDeath) deathBeforeDay5Count++;

    // Accumulate action logs
    for (const log of result.logs) {
      totalDownEvents += log.newlyDownPlayers.length;
      totalDownRecoveries += log.downRecoveries.length;
      for (const act of log.actionResults) {
        actionDistribution[act.actionType]++;
        if (!act.success && act.message.includes('exhausted')) {
          energyBlockCount++;
        }
        if (act.actionType === 'Heal') {
          totalHealAttempts++;
          if (!act.success && act.message.includes('no medicine')) {
            totalMedicineStarvations++;
          }
        }
      }
    }
  }

  return {
    totalGames,
    wins,
    losses,
    winRate: wins / totalGames,
    averageEndDay: totalEndDays / totalGames,
    earlyRescueCount,
    normalRescueCount,
    emergencyRescueCount,
    allDeadCount,
    emergencyExpiredCount,
    averageEndingFood: totalEndingFood / totalGames,
    averageEndingWater: totalEndingWater / totalGames,
    averageEndingWood: totalEndingWood / totalGames,
    averageEndingMedicine: totalEndingMedicine / totalGames,
    totalDeaths,
    averageSignalProgress: totalSignalProgress / totalGames,
    actionDistribution: Object.freeze(actionDistribution),
    energyBlockCount,
    averageRescueDay: wins > 0 ? totalWinDays / wins : 0,
    deathBeforeDay5Count,
    downRecoveryRate: totalDownEvents > 0 ? totalDownRecoveries / totalDownEvents : 0,
    medicineStarvationRate: totalHealAttempts > 0 ? totalMedicineStarvations / totalHealAttempts : 0,
    energyOpportunityBlockRate: totalGames > 0 ? energyBlockCount / (totalGames * 4 * 20) : 0,
  };
}
