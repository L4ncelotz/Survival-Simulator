import { DEFAULT_BALANCE_CONFIG, type BalanceConfig } from '../engine/config/balance.js';
import { RNGStream } from '../engine/rng/rng-stream.js';
import { getCondition, isPlayerAbleToAct } from '../engine/rules/condition.js';
import type { ActionMap, ActionType, GameState, PlayerAction, PlayerId } from '../engine/types.js';
import type { BotStrategy } from './bot-interface.js';

const ALL_PLAYER_IDS: readonly PlayerId[] = ['P1', 'P2', 'P3', 'P4'] as const;

export class RandomBot implements BotStrategy {
  public readonly name = 'RandomBot';

  public decideActions(
    state: GameState,
    config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
  ): ActionMap {
    const rng = new RNGStream(state.seed ^ (state.day * 1337));
    const actions: Partial<Record<PlayerId, PlayerAction>> = {};

    const livingPlayers = ALL_PLAYER_IDS.map((id) => state.players[id]).filter(
      (p) => getCondition(p, config) !== 'Dead',
    );

    for (const id of ALL_PLAYER_IDS) {
      const player = state.players[id];
      if (!isPlayerAbleToAct(player, config)) {
        actions[id] = { playerId: id, type: 'Rest' };
        continue;
      }

      const possibleActions: ActionType[] = ['Rest'];

      if (player.energy >= config.actions.hunt.energyCost) {
        possibleActions.push('Hunt');
      }
      if (player.energy >= config.actions.findWater.energyCost) {
        possibleActions.push('FindWater');
      }
      if (player.energy >= config.actions.gatherWood.energyCost) {
        possibleActions.push('GatherWood');
      }
      if (player.energy >= config.actions.explore.energyCost) {
        possibleActions.push('Explore');
      }
      if (
        player.energy >= config.actions.heal.energyCost &&
        state.resources.medicine >= config.actions.heal.medicineCost
      ) {
        possibleActions.push('Heal');
      }
      if (
        state.weather !== 'Storm' &&
        player.energy >= config.actions.buildSignal.energyCost &&
        state.resources.wood >=
          (player.trait === 'Builder'
            ? config.actions.buildSignal.builderWoodCost
            : config.actions.buildSignal.woodCost)
      ) {
        possibleActions.push('BuildSignal');
      }

      const chosenAction = rng.pick(possibleActions);

      let targetPlayerId: PlayerId | undefined;
      if (chosenAction === 'Heal' && livingPlayers.length > 0) {
        const target = rng.pick(livingPlayers);
        targetPlayerId = target.id;
      }

      actions[id] = {
        playerId: id,
        type: chosenAction,
        targetPlayerId,
      };
    }

    return actions as ActionMap;
  }
}
