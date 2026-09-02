import {
  resolveExplore,
  resolveFindWater,
  resolveGatherWood,
  resolveHunt,
  resolveRest,
} from '../actions/core-actions.js';
import { resolveBuildSignal, resolveHeal } from '../actions/support-actions.js';
import type { ActionResult } from '../actions/types.js';
import { DEFAULT_BALANCE_CONFIG, type BalanceConfig } from '../config/balance.js';
import { rollWeather } from '../create-game.js';
import { applyEventResult, resolveDailyEvent } from '../events/event-resolver.js';
import type { EventResult } from '../events/event-types.js';
import { resolveGhostIntervention } from '../ghost/ghost-resolver.js';
import type { GhostInterventionRequest } from '../ghost/ghost-types.js';
import { MultiStreamRNG } from '../rng/multi-stream.js';
import { getCondition, isPlayerAbleToAct } from '../rules/condition.js';
import { applyDailyConsumption } from '../survival/consumption.js';
import type {
  ActionMap,
  ActionType,
  GamePhase,
  GameState,
  PlayerId,
  PlayerStatus,
  ResourcePool,
  WeatherType,
} from '../types.js';
import type { DayLog, DayResolutionResult } from './types.js';

const ALL_PLAYER_IDS: readonly PlayerId[] = ['P1', 'P2', 'P3', 'P4'] as const;

function getActionEnergyCost(actionType: ActionType, config: BalanceConfig): number {
  switch (actionType) {
    case 'Hunt':
      return config.actions.hunt.energyCost;
    case 'FindWater':
      return config.actions.findWater.energyCost;
    case 'GatherWood':
      return config.actions.gatherWood.energyCost;
    case 'Explore':
      return config.actions.explore.energyCost;
    case 'Rest':
      return 0;
    case 'Heal':
      return config.actions.heal.energyCost;
    case 'BuildSignal':
      return config.actions.buildSignal.energyCost;
  }
}

/**
 * Pure orchestrator function that executes a full daily game turn.
 */
export function resolveDay(
  state: GameState,
  actions: ActionMap,
  ghostIntervention?: GhostInterventionRequest,
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
): DayResolutionResult {
  if (state.phase === 'ended') {
    throw new Error('Cannot resolve day for a game that has already ended.');
  }

  const rng = MultiStreamRNG.restore(state.rngState);
  const actionStream = rng.getStream('action');
  const injuryStream = rng.getStream('injury');
  const exploreStream = rng.getStream('explore');
  const eventStream = rng.getStream('event');
  const weatherStream = rng.getStream('weather');

  let workingResources: ResourcePool = { ...state.resources };
  let workingPlayers: Record<PlayerId, PlayerStatus> = { ...state.players };
  const actionResults: ActionResult[] = [];
  const downRecoveries: PlayerId[] = [];

  // Phase 1: Action Execution
  const buildSignalParticipants: { player: PlayerStatus }[] = [];

  for (const id of ALL_PLAYER_IDS) {
    const player = workingPlayers[id];
    const action = actions[id];

    if (!action) {
      continue;
    }

    // Check if player is able to act (Healthy / Injured)
    if (!isPlayerAbleToAct(player, config)) {
      actionResults.push({
        playerId: id,
        actionType: action.type,
        success: false,
        energySpent: 0,
        foodGained: 0,
        waterGained: 0,
        woodGained: 0,
        medicineGained: 0,
        woodSpent: 0,
        medicineSpent: 0,
        hpRestored: 0,
        hpDamage: 0,
        signalGained: 0,
        message: `${player.name} is ${getCondition(player, config)} and cannot act.`,
      });
      continue;
    }

    const energyCost = getActionEnergyCost(action.type, config);
    if (player.energy < energyCost) {
      actionResults.push({
        playerId: id,
        actionType: action.type,
        success: false,
        energySpent: 0,
        foodGained: 0,
        waterGained: 0,
        woodGained: 0,
        medicineGained: 0,
        woodSpent: 0,
        medicineSpent: 0,
        hpRestored: 0,
        hpDamage: 0,
        signalGained: 0,
        message: `${player.name} was exhausted (${player.energy}/${energyCost} Energy) and could not perform ${action.type}.`,
      });
      continue;
    }

    // Core actions
    switch (action.type) {
      case 'Hunt': {
        const result = resolveHunt(player, actionStream, injuryStream, config);
        actionResults.push(result);
        break;
      }
      case 'FindWater': {
        const result = resolveFindWater(player, actionStream, state.weather, config);
        actionResults.push(result);
        break;
      }
      case 'GatherWood': {
        const result = resolveGatherWood(player, actionStream, config);
        actionResults.push(result);
        break;
      }
      case 'Explore': {
        const result = resolveExplore(player, exploreStream, injuryStream, config);
        actionResults.push(result);
        break;
      }
      case 'Rest': {
        const result = resolveRest(player, config);
        actionResults.push(result);
        break;
      }
      case 'Heal': {
        const targetId = action.targetPlayerId ?? id;
        const target = workingPlayers[targetId];
        const result = resolveHeal(player, target, workingResources.medicine, config);
        actionResults.push(result);
        if (result.success && result.medicineSpent > 0) {
          workingResources = {
            ...workingResources,
            medicine: workingResources.medicine - result.medicineSpent,
          };
          // Apply heal to target
          const targetWasDown = getCondition(target, config) === 'DOWN';
          const newTargetHp = targetWasDown
            ? config.actions.heal.downRecoveryHp
            : Math.min(target.maxHp, target.hp + result.hpRestored);

          workingPlayers[targetId] = {
            ...target,
            hp: newTargetHp,
            downDays: targetWasDown ? 0 : target.downDays,
          };

          if (targetWasDown) {
            downRecoveries.push(targetId);
          }
        }
        break;
      }
      case 'BuildSignal': {
        buildSignalParticipants.push({ player });
        break;
      }
    }
  }

  // Resolve BuildSignal actions together for synergy and wood pool collision
  if (buildSignalParticipants.length > 0) {
    const buildResults = resolveBuildSignal(
      buildSignalParticipants,
      state.weather,
      workingResources.wood,
      config,
    );
    for (const bResult of buildResults) {
      actionResults.push(bResult);
      if (bResult.success && bResult.woodSpent > 0) {
        workingResources = {
          ...workingResources,
          wood: Math.max(0, workingResources.wood - bResult.woodSpent),
        };
      }
    }
  }

  // Phase 2: Apply Action Resource & Player Status Updates
  let totalSignalGained = 0;
  for (const res of actionResults) {
    if (res.actionType !== 'Heal') {
      workingResources = {
        food: workingResources.food + res.foodGained,
        water: workingResources.water + res.waterGained,
        wood: workingResources.wood + res.woodGained,
        medicine: workingResources.medicine + res.medicineGained,
      };
    }
    totalSignalGained += res.signalGained;

    const player = workingPlayers[res.playerId];
    let newEnergy = Math.max(0, player.energy - res.energySpent);
    if (res.actionType === 'Rest') {
      newEnergy = Math.min(player.maxEnergy, newEnergy + config.actions.rest.energyRecovery);
    }
    let newHp = Math.max(0, Math.min(player.maxHp, player.hp - res.hpDamage + res.hpRestored));

    workingPlayers[res.playerId] = {
      ...player,
      energy: newEnergy,
      hp: newHp,
    };
  }

  // Phase 3: Ghost Intervention (if requested)
  let ghostUsed = false;
  let ghostMessage: string | undefined;
  let ghostUpdatedEvent: EventResult | undefined;

  if (ghostIntervention && state.ghostInterventionAvailable) {
    const ghostRes = resolveGhostIntervention(
      state,
      ghostIntervention,
      actions,
      state.weather,
      rng,
      config,
    );
    if (ghostRes.applied) {
      ghostUsed = true;
      ghostMessage = ghostRes.message;
      if (ghostRes.updatedEventResult) {
        ghostUpdatedEvent = ghostRes.updatedEventResult;
      }
    }
  }

  // Phase 4: Daily Event
  const eventResult = ghostUpdatedEvent ?? resolveDailyEvent(state, eventStream);
  const eventApplication = applyEventResult(workingPlayers, workingResources, eventResult);
  workingPlayers = eventApplication.updatedPlayers;
  workingResources = eventApplication.updatedResources;

  // Phase 5: Consumption & Needs Triage
  const consumptionReport = applyDailyConsumption(
    workingPlayers,
    workingResources,
    state.day,
    config,
  );
  workingPlayers = consumptionReport.updatedPlayers;
  workingResources = consumptionReport.remainingResources;

  // Phase 6: Crisis Telemetry
  const livingPlayers = ALL_PLAYER_IDS.map((id) => workingPlayers[id]).filter(
    (p) => getCondition(p, config) !== 'Dead',
  );

  const crisis = {
    foodCrisis: workingResources.food < 6,
    waterCrisis: workingResources.water < 6,
    hpCrisis: livingPlayers.some((p) => p.hp <= config.player.downHpThreshold),
  };

  // Phase 7: Signal & Win/Lose Evaluation
  const currentSignal = state.signal.progress;
  const newSignalProgress = Math.min(100, currentSignal + totalSignalGained);

  let nextPhase: GamePhase = state.phase;
  let winner: boolean | undefined;
  let endReason: string | undefined;
  let rescuePending = state.signal.rescuePending;

  // Win/Lose state machine
  if (livingPlayers.length === 0) {
    // Condition A: All players died
    nextPhase = 'ended';
    winner = false;
    endReason = 'All survivors have perished.';
  } else if (state.phase === 'rescue_pending') {
    // Condition B: Survived final day after reaching 100% signal
    nextPhase = 'ended';
    winner = true;
    endReason = 'Early rescue achieved! Rescue helicopter extracted all remaining survivors.';
  } else if (newSignalProgress >= config.timeline.earlyRescueSignal && state.phase === 'normal') {
    // Reached 100% signal -> Rescue pending for next day
    nextPhase = 'rescue_pending';
    rescuePending = true;
  } else if (
    state.day === config.timeline.rescueDay &&
    newSignalProgress >= config.timeline.normalRescueSignal &&
    state.phase === 'normal'
  ) {
    // Condition C: Normal rescue on Day 20 with signal >= 80%
    nextPhase = 'ended';
    winner = true;
    endReason = `Normal rescue achieved on Day ${config.timeline.rescueDay} with ${newSignalProgress}% signal progress.`;
  } else if (
    state.day >= config.timeline.rescueDay &&
    state.day < config.timeline.emergencyMaxDay &&
    newSignalProgress < config.timeline.normalRescueSignal &&
    state.phase === 'normal'
  ) {
    // Transition to emergency window
    nextPhase = 'emergency';
  } else if (state.phase === 'emergency' && newSignalProgress >= config.timeline.earlyRescueSignal) {
    // Reached 100% during emergency
    nextPhase = 'ended';
    winner = true;
    endReason = 'Emergency rescue achieved with 100% signal progress!';
  } else if (
    state.day === config.timeline.emergencyMaxDay &&
    state.phase === 'emergency' &&
    newSignalProgress < config.timeline.earlyRescueSignal
  ) {
    // Emergency window expired without reaching 100%
    nextPhase = 'ended';
    winner = false;
    endReason = `Emergency rescue window expired on Day ${config.timeline.emergencyMaxDay} without completing the signal.`;
  }

  // Phase 8: Next Weather & Next State Assembly
  const nextWeather =
    nextPhase === 'ended'
      ? state.weather
      : rollWeather(weatherStream, config.weatherWeights);

  const hasDeadPlayers = Object.values(workingPlayers).some(
    (p) => getCondition(p, config) === 'Dead',
  );

  const nextState: GameState = {
    day: nextPhase === 'ended' ? state.day : state.day + 1,
    phase: nextPhase,
    seed: state.seed,
    players: Object.freeze(workingPlayers),
    resources: Object.freeze(workingResources),
    weather: nextWeather,
    signal: Object.freeze({
      progress: newSignalProgress,
      maxProgress: 100,
      rescuePending,
    }),
    rngState: Object.freeze(rng.snapshot()),
    crisis: Object.freeze(crisis),
    ghostInterventionAvailable: nextPhase === 'ended' ? false : hasDeadPlayers,
    winner,
    endReason,
  };

  const resourceDeltas: ResourcePool = {
    food: workingResources.food - state.resources.food,
    water: workingResources.water - state.resources.water,
    wood: workingResources.wood - state.resources.wood,
    medicine: workingResources.medicine - state.resources.medicine,
  };

  const log: DayLog = {
    day: state.day,
    weather: state.weather,
    actionResults: Object.freeze(actionResults),
    eventResult,
    ghostInterventionUsed: ghostUsed,
    ghostInterventionMessage: ghostMessage,
    resourceDeltas: Object.freeze(resourceDeltas),
    deaths: consumptionReport.newDeaths,
    downRecoveries: Object.freeze(downRecoveries),
  };

  return {
    nextState: Object.freeze(nextState),
    log: Object.freeze(log),
  };
}
