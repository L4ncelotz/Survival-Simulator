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
 * Pure orchestrator function that executes a full daily game turn following the canonical 10-step pipeline:
 * 1. Validate Actions (check ability to act & energy cost)
 * 2. Resource Actions (Hunt, FindWater, GatherWood, Explore, Rest) -> update resources & player stats immediately
 * 3. Support Actions (Heal, BuildSignal) -> utilize updated resource pool with today's gathered wood/medicine
 * 4. Ghost Intervention (if requested & available) -> replaces action or event result
 * 5. Daily Random Event (with standard category weights) -> applies resource/player deltas
 * 6. Consumption & Needs Triage (highest-Hunger/Thirst triage, partial rations, needs damage, DOWN/Death timers)
 * 7. Crisis Check (telemetry flags: foodCrisis, waterCrisis, hpCrisis)
 * 8. Win / Lose Evaluation (Day 20 Normal Win precedence, Early Rescue, Emergency Window, All Dead, Expired)
 * 9. Roll Next Weather & Assemble Next State
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
  const actionResultsMap = new Map<PlayerId, ActionResult>();
  const downRecoveries: PlayerId[] = [];

  const hasMedic = Object.values(workingPlayers).some(
    (p) => p.trait === 'Medic' && getCondition(p, config) !== 'Dead',
  );

  // Step 1: Validate Actions
  const validActionPlayerIds: PlayerId[] = [];

  for (const id of ALL_PLAYER_IDS) {
    const player = workingPlayers[id];
    const action = actions[id];

    if (!action) {
      continue;
    }

    if (!isPlayerAbleToAct(player, config)) {
      actionResultsMap.set(id, {
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
        targetPlayerId: action.targetPlayerId,
        message: `${player.name} is ${getCondition(player, config)} and cannot act.`,
      });
      continue;
    }

    const energyCost = getActionEnergyCost(action.type, config);
    if (player.energy < energyCost) {
      actionResultsMap.set(id, {
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
        targetPlayerId: action.targetPlayerId,
        message: `${player.name} was exhausted (${player.energy}/${energyCost} Energy) and could not perform ${action.type}.`,
      });
      continue;
    }

    validActionPlayerIds.push(id);
  }

  // Step 2: Resource Actions Execution (Hunt, FindWater, GatherWood, Explore, Rest)
  for (const id of validActionPlayerIds) {
    const player = workingPlayers[id];
    const action = actions[id]!;

    let result: ActionResult | undefined;

    switch (action.type) {
      case 'Hunt':
        result = resolveHunt(player, actionStream, injuryStream, state.weather, hasMedic, config);
        break;
      case 'FindWater':
        result = resolveFindWater(player, actionStream, state.weather, config);
        break;
      case 'GatherWood':
        result = resolveGatherWood(player, actionStream, state.weather, config);
        break;
      case 'Explore':
        result = resolveExplore(
          player,
          exploreStream,
          injuryStream,
          state.weather,
          hasMedic,
          config,
        );
        break;
      case 'Rest':
        result = resolveRest(player, config);
        break;
      default:
        // Support actions resolved in Step 3
        break;
    }

    if (result) {
      actionResultsMap.set(id, result);

      // Immediately deposit gained resources into workingResources
      workingResources = {
        food: workingResources.food + result.foodGained,
        water: workingResources.water + result.waterGained,
        wood: workingResources.wood + result.woodGained,
        medicine: Math.max(
          0,
          Math.min(config.maxMedicine, workingResources.medicine + result.medicineGained),
        ),
      };

      // Update acting player energy and HP
      let newEnergy = Math.max(0, player.energy - result.energySpent);
      if (result.actionType === 'Rest') {
        newEnergy = Math.min(player.maxEnergy, newEnergy + config.actions.rest.energyRecovery);
      }
      const newHp = Math.max(
        0,
        Math.min(player.maxHp, player.hp - result.hpDamage + result.hpRestored),
      );

      workingPlayers[id] = {
        ...player,
        energy: newEnergy,
        hp: newHp,
      };
    }
  }

  // Step 3: Support Actions Execution (Heal, BuildSignal)
  // Heal actions (sequential with collision detection)
  const alreadyTreatedTargetIds = new Set<PlayerId>();

  for (const id of validActionPlayerIds) {
    const action = actions[id]!;
    if (action.type !== 'Heal') {
      continue;
    }

    const healer = workingPlayers[id];
    const targetId = action.targetPlayerId ?? id;
    const target = workingPlayers[targetId];

    const result = resolveHeal(
      healer,
      target,
      workingResources.medicine,
      alreadyTreatedTargetIds,
      config,
    );
    actionResultsMap.set(id, result);

    if (result.success) {
      alreadyTreatedTargetIds.add(targetId);

      // Deduct medicine
      workingResources = {
        ...workingResources,
        medicine: Math.max(0, workingResources.medicine - result.medicineSpent),
      };

      // Update target player HP & condition
      const wasDown = getCondition(target, config) === 'DOWN';
      const newTargetHp = wasDown
        ? config.actions.heal.downRecoveryHp
        : Math.min(target.maxHp, target.hp + result.hpRestored);

      workingPlayers[targetId] = {
        ...target,
        hp: newTargetHp,
        downDays: wasDown ? 0 : target.downDays,
      };

      if (wasDown) {
        downRecoveries.push(targetId);
      }
    }

    // Deduct energy from healer
    workingPlayers[id] = {
      ...workingPlayers[id],
      energy: Math.max(0, workingPlayers[id].energy - result.energySpent),
    };
  }

  // BuildSignal actions (synergy, wood downgrade, useless extra builder handling)
  const buildSignalParticipants: { player: PlayerStatus }[] = [];
  for (const id of validActionPlayerIds) {
    const action = actions[id]!;
    if (action.type === 'BuildSignal') {
      buildSignalParticipants.push({ player: workingPlayers[id] });
    }
  }

  if (buildSignalParticipants.length > 0) {
    const buildResults = resolveBuildSignal(
      buildSignalParticipants,
      state.weather,
      workingResources.wood,
      config,
    );
    for (const bResult of buildResults) {
      actionResultsMap.set(bResult.playerId, bResult);

      if (bResult.success && bResult.woodSpent > 0) {
        workingResources = {
          ...workingResources,
          wood: Math.max(0, workingResources.wood - bResult.woodSpent),
        };
      }

      // Deduct energy from builder
      workingPlayers[bResult.playerId] = {
        ...workingPlayers[bResult.playerId],
        energy: Math.max(0, workingPlayers[bResult.playerId].energy - bResult.energySpent),
      };
    }
  }

  // Step 4: Ghost Intervention (if requested & available)
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
      if (ghostRes.updatedActionResult && ghostIntervention.targetPlayerId) {
        const targetId = ghostIntervention.targetPlayerId;
        const oldResult = actionResultsMap.get(targetId);
        const newResult = ghostRes.updatedActionResult;

        if (oldResult) {
          // Revert old resource/player deltas and apply new result deltas
          workingResources = {
            food: Math.max(0, workingResources.food - oldResult.foodGained + newResult.foodGained),
            water: Math.max(
              0,
              workingResources.water - oldResult.waterGained + newResult.waterGained,
            ),
            wood: Math.max(0, workingResources.wood - oldResult.woodGained + newResult.woodGained),
            medicine: Math.max(
              0,
              Math.min(
                config.maxMedicine,
                workingResources.medicine - oldResult.medicineGained + newResult.medicineGained,
              ),
            ),
          };

          const p = workingPlayers[targetId];
          const newHp = Math.max(
            0,
            Math.min(p.maxHp, p.hp + oldResult.hpDamage - newResult.hpDamage),
          );
          workingPlayers[targetId] = {
            ...p,
            hp: newHp,
          };

          actionResultsMap.set(targetId, newResult);
        }
      }
    }
  }

  // Assemble final ordered action results array
  const actionResults: ActionResult[] = [];
  for (const id of ALL_PLAYER_IDS) {
    const res = actionResultsMap.get(id);
    if (res) {
      actionResults.push(res);
    }
  }

  // Step 5: Daily Random Event
  const eventResult = ghostUpdatedEvent ?? resolveDailyEvent(state, eventStream, config);
  const eventApplication = applyEventResult(workingPlayers, workingResources, eventResult, config);
  workingPlayers = eventApplication.updatedPlayers;
  workingResources = eventApplication.updatedResources;

  // Step 6: Consumption & Needs Triage
  const consumptionReport = applyDailyConsumption(
    workingPlayers,
    workingResources,
    state.day,
    config,
  );
  workingPlayers = consumptionReport.updatedPlayers;
  workingResources = consumptionReport.remainingResources;

  // Step 7: Crisis Telemetry Check
  const livingPlayers = ALL_PLAYER_IDS.map((id) => workingPlayers[id]).filter(
    (p) => getCondition(p, config) !== 'Dead',
  );

  const crisis = {
    foodCrisis: workingResources.food < 6,
    waterCrisis: workingResources.water < 6,
    hpCrisis: livingPlayers.some((p) => p.hp <= config.player.downHpThreshold),
  };

  // Step 8: Signal & Win/Lose Evaluation
  const totalSignalGained = actionResults.reduce((sum, r) => sum + r.signalGained, 0);
  const currentSignal = state.signal.progress;
  const newSignalProgress = Math.min(100, currentSignal + totalSignalGained);

  let nextPhase: GamePhase = state.phase;
  let winner: boolean | undefined;
  let endReason: string | undefined;
  let rescuePending = state.signal.rescuePending;

  // Win/Lose state machine with Day 20 Normal Win precedence
  if (livingPlayers.length === 0) {
    // Condition A: All players died
    nextPhase = 'ended';
    winner = false;
    endReason = 'All survivors have perished.';
  } else if (
    state.day === config.timeline.rescueDay &&
    newSignalProgress >= config.timeline.normalRescueSignal &&
    state.phase === 'normal'
  ) {
    // Condition B (Priority): Normal rescue on Day 20 with signal >= 80%
    nextPhase = 'ended';
    winner = true;
    endReason = `Normal rescue achieved on Day ${config.timeline.rescueDay} with ${newSignalProgress}% signal progress.`;
  } else if (state.phase === 'rescue_pending') {
    // Condition C: Survived final day after reaching 100% signal before Day 20
    nextPhase = 'ended';
    winner = true;
    endReason = 'Early rescue achieved! Rescue helicopter extracted all remaining survivors.';
  } else if (newSignalProgress >= config.timeline.earlyRescueSignal && state.phase === 'normal') {
    // Reached 100% signal before Day 20 -> Rescue pending for next day
    nextPhase = 'rescue_pending';
    rescuePending = true;
  } else if (
    state.day >= config.timeline.rescueDay &&
    state.day < config.timeline.emergencyMaxDay &&
    newSignalProgress < config.timeline.normalRescueSignal &&
    state.phase === 'normal'
  ) {
    // Transition to emergency window on Day 21+
    nextPhase = 'emergency';
  } else if (state.phase === 'emergency' && newSignalProgress >= config.timeline.earlyRescueSignal) {
    // Reached 100% during emergency window
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

  // Step 9: Next Weather & Assembly
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
