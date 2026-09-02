import type { BalanceConfig } from '../engine/config/balance.js';
import type { GhostInterventionRequest } from '../engine/ghost/ghost-types.js';
import type { ActionMap, GameState } from '../engine/types.js';

export interface BotStrategy {
  readonly name: string;
  decideActions(state: GameState, config?: BalanceConfig): ActionMap;
  decideGhostIntervention?(
    state: GameState,
    config?: BalanceConfig,
  ): GhostInterventionRequest | undefined;
}
