import { DEFAULT_BALANCE_CONFIG, type BalanceConfig } from '../engine/config/balance.js';
import { getCondition, isPlayerAbleToAct } from '../engine/rules/condition.js';
import type { ActionMap, GameState, PlayerAction, PlayerId } from '../engine/types.js';
import type { BotStrategy } from './bot-interface.js';

const ALL_PLAYER_IDS: readonly PlayerId[] = ['P1', 'P2', 'P3', 'P4'] as const;

export class GreedyBot implements BotStrategy {
  public readonly name = 'GreedyBot';

  public decideActions(
    state: GameState,
    config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
  ): ActionMap {
    const actions: Partial<Record<PlayerId, PlayerAction>> = {};
    let simulatedMedicine = state.resources.medicine;
    let simulatedWood = state.resources.wood;

    const livingPlayers = ALL_PLAYER_IDS.map((id) => state.players[id]).filter(
      (p) => getCondition(p, config) !== 'Dead',
    );

    // Step 1: Detect critical health emergencies (DOWN first, then lowest HP <= 40)
    const criticalTargets = [...livingPlayers]
      .filter((p) => getCondition(p, config) === 'DOWN' || p.hp <= 40)
      .sort((a, b) => a.hp - b.hp);

    const assignedHealers = new Set<PlayerId>();

    // Try to heal critical targets with available medicine
    for (const target of criticalTargets) {
      if (simulatedMedicine < config.actions.heal.medicineCost) {
        break;
      }

      // Find best available healer (Medic first, then highest energy able player)
      const potentialHealers = livingPlayers
        .filter(
          (p) =>
            !assignedHealers.has(p.id) &&
            isPlayerAbleToAct(p, config) &&
            p.energy >= config.actions.heal.energyCost,
        )
        .sort((a, b) => {
          if (a.trait === 'Medic' && b.trait !== 'Medic') return -1;
          if (b.trait === 'Medic' && a.trait !== 'Medic') return 1;
          return b.energy - a.energy;
        });

      if (potentialHealers.length > 0) {
        const healer = potentialHealers[0];
        if (healer) {
          actions[healer.id] = {
            playerId: healer.id,
            type: 'Heal',
            targetPlayerId: target.id,
          };
          assignedHealers.add(healer.id);
          simulatedMedicine -= config.actions.heal.medicineCost;
        }
      }
    }

    // Step 2: Assign remaining players based on immediate greedy survival priorities
    for (const id of ALL_PLAYER_IDS) {
      if (actions[id]) {
        continue;
      }

      const player = state.players[id];
      if (!isPlayerAbleToAct(player, config)) {
        actions[id] = { playerId: id, type: 'Rest' };
        continue;
      }

      // If low on energy, rest
      if (player.energy < 30) {
        actions[id] = { playerId: id, type: 'Rest' };
        continue;
      }

      // Urgent Food
      if (state.resources.food < 6 && player.energy >= config.actions.hunt.energyCost) {
        actions[id] = { playerId: id, type: 'Hunt' };
        continue;
      }

      // Urgent Water
      if (state.resources.water < 6 && player.energy >= config.actions.findWater.energyCost) {
        actions[id] = { playerId: id, type: 'FindWater' };
        continue;
      }

      // Signal building if weather permits and wood available
      const woodCost =
        player.trait === 'Builder'
          ? config.actions.buildSignal.builderWoodCost
          : config.actions.buildSignal.woodCost;

      if (
        state.weather !== 'Storm' &&
        state.signal.progress < 100 &&
        simulatedWood >= woodCost &&
        player.energy >= config.actions.buildSignal.energyCost
      ) {
        actions[id] = { playerId: id, type: 'BuildSignal' };
        simulatedWood -= woodCost;
        continue;
      }

      // Gather wood if reserves are low
      if (simulatedWood < 10 && player.energy >= config.actions.gatherWood.energyCost) {
        actions[id] = { playerId: id, type: 'GatherWood' };
        continue;
      }

      // Trait-specific default or Rest
      if (player.trait === 'Hunter' && player.energy >= config.actions.hunt.energyCost) {
        actions[id] = { playerId: id, type: 'Hunt' };
      } else if (
        player.trait === 'Scout' &&
        player.energy >= config.actions.explore.energyCost
      ) {
        actions[id] = { playerId: id, type: 'Explore' };
      } else if (
        state.weather === 'Rain' &&
        player.energy >= config.actions.findWater.energyCost
      ) {
        actions[id] = { playerId: id, type: 'FindWater' };
      } else if (player.energy >= config.actions.gatherWood.energyCost) {
        actions[id] = { playerId: id, type: 'GatherWood' };
      } else {
        actions[id] = { playerId: id, type: 'Rest' };
      }
    }

    return actions as ActionMap;
  }
}
