import { resolveExplore, resolveFindWater, resolveGatherWood, resolveHunt } from '../actions/core-actions.js';
import type { ActionResult } from '../actions/types.js';
import { DEFAULT_BALANCE_CONFIG, type BalanceConfig } from '../config/balance.js';
import { resolveDailyEvent } from '../events/event-resolver.js';
import type { MultiStreamRNG } from '../rng/multi-stream.js';
import { getCondition } from '../rules/condition.js';
import type { ActionMap, GameState, WeatherType } from '../types.js';
import type { GhostInterventionRequest, GhostInterventionResult } from './ghost-types.js';

/**
 * Resolves a ghost intervention reroll request, advancing the original RNG sub-stream.
 */
export function resolveGhostIntervention(
  state: GameState,
  request: GhostInterventionRequest,
  actions: ActionMap,
  weather: WeatherType,
  multiStreamRng: MultiStreamRNG,
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
): GhostInterventionResult {
  // Validation 1: Ghost intervention must be available
  if (!state.ghostInterventionAvailable) {
    return {
      applied: false,
      targetRollType: request.targetRollType,
      message: 'Ghost intervention has already been used today.',
    };
  }

  // Validation 2: Requesting player must be dead
  const requester = state.players[request.requestingPlayerId];
  if (!requester || getCondition(requester, config) !== 'Dead') {
    return {
      applied: false,
      targetRollType: request.targetRollType,
      message: 'Only dead players (ghosts) can perform an intervention.',
    };
  }

  switch (request.targetRollType) {
    case 'event': {
      const eventStream = multiStreamRng.getStream('event');
      const updatedEventResult = resolveDailyEvent(state, eventStream, config);
      return {
        applied: true,
        targetRollType: 'event',
        message: `${requester.name} used Ghost Intervention to reroll the daily event -> ${updatedEventResult.name}!`,
        updatedEventResult,
      };
    }

    case 'action':
    case 'injury':
    case 'explore': {
      if (!request.targetPlayerId) {
        return {
          applied: false,
          targetRollType: request.targetRollType,
          message: 'Target player must be specified for action reroll.',
        };
      }

      const targetPlayer = state.players[request.targetPlayerId];
      if (!targetPlayer || getCondition(targetPlayer, config) === 'Dead') {
        return {
          applied: false,
          targetRollType: request.targetRollType,
          message: 'Cannot reroll action for invalid or dead player.',
        };
      }

      const playerAction = actions[request.targetPlayerId];
      if (!playerAction) {
        return {
          applied: false,
          targetRollType: request.targetRollType,
          message: `Player ${request.targetPlayerId} did not submit an action to reroll.`,
        };
      }

      const actionStream = multiStreamRng.getStream('action');
      const injuryStream = multiStreamRng.getStream('injury');
      const exploreStream = multiStreamRng.getStream('explore');

      const hasMedic = Object.values(state.players).some(
        (p) => p.trait === 'Medic' && getCondition(p, config) !== 'Dead',
      );

      let updatedActionResult: ActionResult | undefined;

      switch (playerAction.type) {
        case 'Hunt':
          updatedActionResult = resolveHunt(
            targetPlayer,
            actionStream,
            injuryStream,
            weather,
            hasMedic,
            config,
          );
          break;
        case 'FindWater':
          updatedActionResult = resolveFindWater(targetPlayer, actionStream, weather, config);
          break;
        case 'GatherWood':
          updatedActionResult = resolveGatherWood(targetPlayer, actionStream, weather, config);
          break;
        case 'Explore':
          updatedActionResult = resolveExplore(
            targetPlayer,
            exploreStream,
            injuryStream,
            weather,
            hasMedic,
            config,
          );
          break;
        default:
          return {
            applied: false,
            targetRollType: request.targetRollType,
            message: `Action ${playerAction.type} does not support RNG reroll.`,
          };
      }

      return {
        applied: true,
        targetRollType: request.targetRollType,
        message: `${requester.name} used Ghost Intervention to reroll ${targetPlayer.name}'s ${playerAction.type} outcome!`,
        updatedActionResult,
      };
    }
  }
}
