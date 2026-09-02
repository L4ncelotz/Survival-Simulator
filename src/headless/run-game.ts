import type { BotStrategy } from '../bots/bot-interface.js';
import { DEFAULT_BALANCE_CONFIG, type BalanceConfig } from '../engine/config/balance.js';
import { createGame } from '../engine/create-game.js';
import { resolveDay } from '../engine/resolver/resolve-day.js';
import type { DayLog } from '../engine/resolver/types.js';
import type { GameState } from '../engine/types.js';

export interface GameRunResult {
  readonly finalState: GameState;
  readonly logs: readonly DayLog[];
  readonly totalDays: number;
  readonly win: boolean;
  readonly endReason: string;
}

/**
 * Runs a complete headless survival simulation game from Day 1 to terminal win/lose state.
 */
export function runGame(
  seed: number | string,
  strategy: BotStrategy,
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
  maxDays: number = 30,
): GameRunResult {
  let state = createGame(seed, config);
  const logs: DayLog[] = [];

  while (state.phase !== 'ended' && state.day <= maxDays) {
    const actions = strategy.decideActions(state, config);
    const ghostIntervention = strategy.decideGhostIntervention?.(state, config);

    const { nextState, log } = resolveDay(state, actions, ghostIntervention, config);
    logs.push(log);
    state = nextState;
  }

  // Safety fallback if maxDays reached without terminal phase
  const win = state.winner ?? false;
  const endReason = state.endReason ?? (win ? 'Surviving' : 'Maximum days limit reached');

  return {
    finalState: state,
    logs: Object.freeze(logs),
    totalDays: logs.length,
    win,
    endReason,
  };
}
