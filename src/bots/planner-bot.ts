import { DEFAULT_BALANCE_CONFIG, type BalanceConfig } from '../engine/config/balance.js';
import type { GhostInterventionRequest } from '../engine/ghost/ghost-types.js';
import { getCondition, isPlayerAbleToAct } from '../engine/rules/condition.js';
import type { ActionMap, GameState, PlayerAction, PlayerId, PlayerStatus } from '../engine/types.js';
import type { BotStrategy } from './bot-interface.js';

const ALL_PLAYER_IDS: readonly PlayerId[] = ['P1', 'P2', 'P3', 'P4'] as const;

export class PlannerBot implements BotStrategy {
  public readonly name = 'PlannerBot';

  public decideGhostIntervention(
    state: GameState,
    config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
  ): GhostInterventionRequest | undefined {
    if (!state.ghostInterventionAvailable) {
      return undefined;
    }

    const deadPlayer = ALL_PLAYER_IDS.map((id) => state.players[id]).find(
      (p) => getCondition(p, config) === 'Dead',
    );

    if (!deadPlayer) {
      return undefined;
    }

    // Always reroll event if ghost intervention is available to seek positive pity outcomes
    return {
      requestingPlayerId: deadPlayer.id,
      targetRollType: 'event',
    };
  }

  public decideActions(
    state: GameState,
    config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
  ): ActionMap {
    const actions: Partial<Record<PlayerId, PlayerAction>> = {};
    let simulatedMedicine = state.resources.medicine;
    let simulatedWood = state.resources.wood;
    let simulatedFood = state.resources.food;
    let simulatedWater = state.resources.water;

    const livingPlayers = ALL_PLAYER_IDS.map((id) => state.players[id]).filter(
      (p) => getCondition(p, config) !== 'Dead',
    );
    const livingCount = livingPlayers.length;

    const assignedPlayerIds = new Set<PlayerId>();

    // 1. Triage: DOWN recovery and critical healing (HP <= 40)
    const criticalPatients = [...livingPlayers]
      .filter((p) => getCondition(p, config) === 'DOWN' || p.hp <= 40)
      .sort((a, b) => a.hp - b.hp);

    for (const patient of criticalPatients) {
      if (simulatedMedicine < config.actions.heal.medicineCost) {
        break;
      }

      // Find best available healer
      const healer = livingPlayers
        .filter(
          (p) =>
            !assignedPlayerIds.has(p.id) &&
            isPlayerAbleToAct(p, config) &&
            p.energy >= config.actions.heal.energyCost,
        )
        .sort((a, b) => {
          if (a.trait === 'Medic' && b.trait !== 'Medic') return -1;
          if (b.trait === 'Medic' && a.trait !== 'Medic') return 1;
          return b.energy - a.energy;
        })[0];

      if (healer) {
        actions[healer.id] = {
          playerId: healer.id,
          type: 'Heal',
          targetPlayerId: patient.id,
        };
        assignedPlayerIds.add(healer.id);
        simulatedMedicine -= config.actions.heal.medicineCost;
      }
    }

    // 2. Resource buffers
    const targetFoodBuffer = Math.max(10, livingCount * 3.5 * 2);
    const targetWaterBuffer = Math.max(10, livingCount * 3 * 2);

    // Food emergency
    if (simulatedFood < targetFoodBuffer) {
      const hunter = livingPlayers.find(
        (p) =>
          !assignedPlayerIds.has(p.id) &&
          p.trait === 'Hunter' &&
          isPlayerAbleToAct(p, config) &&
          p.energy >= config.actions.hunt.energyCost,
      );
      if (hunter) {
        actions[hunter.id] = { playerId: hunter.id, type: 'Hunt' };
        assignedPlayerIds.add(hunter.id);
        simulatedFood += 6;
      }
    }

    // Water collection
    if (simulatedWater < targetWaterBuffer || state.weather === 'Rain') {
      const waterGatherer = livingPlayers.find(
        (p) =>
          !assignedPlayerIds.has(p.id) &&
          isPlayerAbleToAct(p, config) &&
          p.energy >= config.actions.findWater.energyCost,
      );
      if (waterGatherer) {
        actions[waterGatherer.id] = { playerId: waterGatherer.id, type: 'FindWater' };
        assignedPlayerIds.add(waterGatherer.id);
        simulatedWater += state.weather === 'Rain' ? 12 : 8;
      }
    }

    // 3. Signal Construction Synergy (2 builders on non-Storm days)
    if (state.weather !== 'Storm' && state.signal.progress < 100) {
      // Find Builder trait player first
      const builderPlayer = livingPlayers.find(
        (p) =>
          !assignedPlayerIds.has(p.id) &&
          p.trait === 'Builder' &&
          isPlayerAbleToAct(p, config) &&
          p.energy >= config.actions.buildSignal.energyCost,
      );

      const builderCost = config.actions.buildSignal.builderWoodCost;
      const standardCost = config.actions.buildSignal.woodCost;

      if (builderPlayer && simulatedWood >= builderCost) {
        actions[builderPlayer.id] = { playerId: builderPlayer.id, type: 'BuildSignal' };
        assignedPlayerIds.add(builderPlayer.id);
        simulatedWood -= builderCost;

        // Try to find a second builder for cooperative synergy (+12 max signal/day) if we have enough wood
        if (simulatedWood >= standardCost) {
          const secondBuilder = livingPlayers.find(
            (p) =>
              !assignedPlayerIds.has(p.id) &&
              isPlayerAbleToAct(p, config) &&
              p.energy >= config.actions.buildSignal.energyCost,
          );

          if (secondBuilder) {
            actions[secondBuilder.id] = { playerId: secondBuilder.id, type: 'BuildSignal' };
            assignedPlayerIds.add(secondBuilder.id);
            simulatedWood -= standardCost;
          }
        }
      } else if (simulatedWood >= standardCost) {
        // No builder, but can afford single standard build
        const standardBuilder = livingPlayers.find(
          (p) =>
            !assignedPlayerIds.has(p.id) &&
            isPlayerAbleToAct(p, config) &&
            p.energy >= config.actions.buildSignal.energyCost,
        );
        if (standardBuilder) {
          actions[standardBuilder.id] = {
            playerId: standardBuilder.id,
            type: 'BuildSignal',
          };
          assignedPlayerIds.add(standardBuilder.id);
          simulatedWood -= standardCost;
        }
      }
    }

    // 4. Scout exploration for medicine
    if (simulatedMedicine < 2) {
      const scout = livingPlayers.find(
        (p) =>
          !assignedPlayerIds.has(p.id) &&
          p.trait === 'Scout' &&
          isPlayerAbleToAct(p, config) &&
          p.energy >= config.actions.explore.energyCost,
      );
      if (scout) {
        actions[scout.id] = { playerId: scout.id, type: 'Explore' };
        assignedPlayerIds.add(scout.id);
        simulatedMedicine += 1;
      }
    }

    // 5. Wood gathering for future builds
    const woodGatherer = livingPlayers.find(
      (p) =>
        !assignedPlayerIds.has(p.id) &&
        isPlayerAbleToAct(p, config) &&
        p.energy >= config.actions.gatherWood.energyCost,
    );
    if (woodGatherer) {
      actions[woodGatherer.id] = { playerId: woodGatherer.id, type: 'GatherWood' };
      assignedPlayerIds.add(woodGatherer.id);
    }

    // 6. Remaining players: Rest if energy < 50, otherwise perform trait work
    for (const id of ALL_PLAYER_IDS) {
      if (actions[id]) continue;

      const player = state.players[id];
      if (!isPlayerAbleToAct(player, config)) {
        actions[id] = { playerId: id, type: 'Rest' };
        continue;
      }

      if (player.energy < 40) {
        actions[id] = { playerId: id, type: 'Rest' };
      } else if (player.trait === 'Hunter' && player.energy >= config.actions.hunt.energyCost) {
        actions[id] = { playerId: id, type: 'Hunt' };
      } else if (player.energy >= config.actions.gatherWood.energyCost) {
        actions[id] = { playerId: id, type: 'GatherWood' };
      } else {
        actions[id] = { playerId: id, type: 'Rest' };
      }
    }

    return actions as ActionMap;
  }
}
