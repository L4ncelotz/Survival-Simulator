import type { PlayerCondition, PlayerStatus } from '../types.js';
import { DEFAULT_BALANCE_CONFIG, type BalanceConfig } from '../config/balance.js';

/**
 * Derives player condition from HP and downDays counter.
 * Thresholds (default):
 * - 61..100 -> Healthy
 * - 21..60  -> Injured
 * - 1..20   -> DOWN (if downDays < 2)
 * - 0 or downDays >= 2 -> Dead
 */
export function getConditionFromHp(
  hp: number,
  downDays: number,
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
): PlayerCondition {
  if (hp <= 0 || downDays >= config.player.downMaxDays) {
    return 'Dead';
  }
  if (hp <= config.player.downHpThreshold) {
    return 'DOWN';
  }
  if (hp <= config.player.injuryHpThreshold) {
    return 'Injured';
  }
  return 'Healthy';
}

/**
 * Derives player condition from a PlayerStatus object.
 */
export function getCondition(
  player: PlayerStatus,
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
): PlayerCondition {
  return getConditionFromHp(player.hp, player.downDays, config);
}

/**
 * Returns true if player is not Dead.
 */
export function isPlayerAlive(
  playerOrCondition: PlayerStatus | PlayerCondition,
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
): boolean {
  const condition =
    typeof playerOrCondition === 'string'
      ? playerOrCondition
      : getCondition(playerOrCondition, config);
  return condition !== 'Dead';
}

/**
 * Returns true if player is capable of performing actions (Healthy or Injured).
 */
export function isPlayerAbleToAct(
  playerOrCondition: PlayerStatus | PlayerCondition,
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
): boolean {
  const condition =
    typeof playerOrCondition === 'string'
      ? playerOrCondition
      : getCondition(playerOrCondition, config);
  return condition === 'Healthy' || condition === 'Injured';
}

/**
 * Returns true if player is Dead (ghost state).
 */
export function isGhost(
  player: PlayerStatus,
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
): boolean {
  return getCondition(player, config) === 'Dead';
}
