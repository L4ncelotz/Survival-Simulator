import { DEFAULT_BALANCE_CONFIG, type BalanceConfig } from '../config/balance.js';
import { getCondition } from '../rules/condition.js';
import type { RNGStream } from '../rng/rng-stream.js';
import type { GameState, PlayerId, PlayerStatus, ResourcePool } from '../types.js';
import type { EventCategory, EventResult } from './event-types.js';

interface CategoryWeights {
  readonly positive: number;
  readonly neutral: number;
  readonly negative: number;
}

const NORMAL_WEIGHTS: CategoryWeights = {
  positive: 35,
  neutral: 35,
  negative: 30,
};

const POSITIVE_EVENT_IDS = [
  'SupplyCrate',
  'ClearSkies',
  'MedicalCache',
  'WildlifeBounty',
] as const;

const NEUTRAL_EVENT_IDS = ['PeacefulDay', 'PassingFlock'] as const;

const NEGATIVE_EVENT_IDS = [
  'FoodSpoilage',
  'WaterContamination',
  'CampInfestation',
  'SevereCold',
  'PredatorProwl',
  'SignalDamage',
] as const;

const ALL_PLAYER_IDS: readonly PlayerId[] = ['P1', 'P2', 'P3', 'P4'] as const;

/**
 * Resolves a daily event using the event RNG stream.
 * Crisis state is telemetry only and does NOT alter event probabilities.
 */
export function resolveDailyEvent(
  state: GameState,
  eventStream: RNGStream,
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
): EventResult {
  const weights = NORMAL_WEIGHTS;
  const totalWeight = weights.positive + weights.neutral + weights.negative;
  const roll = eventStream.next() * totalWeight;

  let category: EventCategory;
  if (roll < weights.positive) {
    category = 'positive';
  } else if (roll < weights.positive + weights.neutral) {
    category = 'neutral';
  } else {
    category = 'negative';
  }

  const livingPlayerIds = ALL_PLAYER_IDS.filter(
    (id) => getCondition(state.players[id], config) !== 'Dead',
  );

  switch (category) {
    case 'positive': {
      const eventId = eventStream.pick(POSITIVE_EVENT_IDS);
      switch (eventId) {
        case 'SupplyCrate':
          return {
            eventId,
            name: 'Supply Crate',
            description: 'A supply crate washed ashore with preserved rations and fresh water.',
            category: 'positive',
            resourceDelta: { food: 4, water: 4 },
            hpDelta: {},
            energyDelta: {},
          };
        case 'ClearSkies': {
          const energyDelta: Partial<Record<PlayerId, number>> = {};
          for (const id of livingPlayerIds) {
            energyDelta[id] = 15;
          }
          return {
            eventId,
            name: 'Clear Skies',
            description: 'Gentle breeze and clear skies invigorate all survivors (+15 Energy).',
            category: 'positive',
            resourceDelta: {},
            hpDelta: {},
            energyDelta,
          };
        }
        case 'MedicalCache':
          return {
            eventId,
            name: 'Medical Cache',
            description: 'Survivors discovered a sealed first-aid cache (+1 Medicine).',
            category: 'positive',
            resourceDelta: { medicine: 1 },
            hpDelta: {},
            energyDelta: {},
          };
        case 'WildlifeBounty':
          return {
            eventId,
            name: 'Wildlife Bounty',
            description: 'A herd of wild game passed close to camp (+6 Food).',
            category: 'positive',
            resourceDelta: { food: 6 },
            hpDelta: {},
            energyDelta: {},
          };
      }
      break;
    }

    case 'neutral': {
      const eventId = eventStream.pick(NEUTRAL_EVENT_IDS);
      switch (eventId) {
        case 'PeacefulDay':
          return {
            eventId,
            name: 'Peaceful Day',
            description: 'The island remains calm and quiet. No notable events occurred today.',
            category: 'neutral',
            resourceDelta: {},
            hpDelta: {},
            energyDelta: {},
          };
        case 'PassingFlock':
          return {
            eventId,
            name: 'Passing Flock',
            description: 'A flock of sea birds flew overhead heading toward the open ocean.',
            category: 'neutral',
            resourceDelta: {},
            hpDelta: {},
            energyDelta: {},
          };
      }
      break;
    }

    case 'negative': {
      const eventId = eventStream.pick(NEGATIVE_EVENT_IDS);
      switch (eventId) {
        case 'FoodSpoilage':
          return {
            eventId,
            name: 'Food Spoilage',
            description: 'Humid air and vermin spoiled some preserved food (-3 Food).',
            category: 'negative',
            resourceDelta: { food: -3 },
            hpDelta: {},
            energyDelta: {},
          };
        case 'WaterContamination':
          return {
            eventId,
            name: 'Water Contamination',
            description: 'Debris fouled the fresh water cache (-3 Water).',
            category: 'negative',
            resourceDelta: { water: -3 },
            hpDelta: {},
            energyDelta: {},
          };
        case 'CampInfestation': {
          const energyDelta: Partial<Record<PlayerId, number>> = {};
          for (const id of livingPlayerIds) {
            energyDelta[id] = -10;
          }
          return {
            eventId,
            name: 'Camp Infestation',
            description: 'Biting insects disturbed sleep, causing exhaustion (-10 Energy to all).',
            category: 'negative',
            resourceDelta: {},
            hpDelta: {},
            energyDelta,
          };
        }
        case 'SevereCold': {
          const hpDelta: Partial<Record<PlayerId, number>> = {};
          for (const id of livingPlayerIds) {
            hpDelta[id] = -10;
          }
          return {
            eventId,
            name: 'Severe Cold',
            description: 'A sudden chilling drop in temperature harmed all survivors (-10 HP).',
            category: 'negative',
            resourceDelta: {},
            hpDelta,
            energyDelta: {},
          };
        }
        case 'PredatorProwl': {
          const hpDelta: Partial<Record<PlayerId, number>> = {};
          if (livingPlayerIds.length > 0) {
            const victimId = eventStream.pick(livingPlayerIds);
            hpDelta[victimId] = -15;
          }
          return {
            eventId,
            name: 'Predator Prowl',
            description: 'A nocturnal predator attacked a survivor (-15 HP).',
            category: 'negative',
            resourceDelta: {},
            hpDelta,
            energyDelta: {},
          };
        }
        case 'SignalDamage':
          return {
            eventId,
            name: 'Signal Damage',
            description: 'Strong coastal gusts damaged part of the signal structure (-2 Wood).',
            category: 'negative',
            resourceDelta: { wood: -2 },
            hpDelta: {},
            energyDelta: {},
          };
      }
      break;
    }
  }
}

/**
 * Purely applies an EventResult to the player status list and resource pool.
 * Clamps resources at 0 and caps medicine at maxMedicine.
 */
export function applyEventResult(
  players: Record<PlayerId, PlayerStatus>,
  resources: ResourcePool,
  eventResult: EventResult,
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
): { updatedPlayers: Record<PlayerId, PlayerStatus>; updatedResources: ResourcePool } {
  const updatedResources: ResourcePool = {
    food: Math.max(0, resources.food + (eventResult.resourceDelta.food ?? 0)),
    water: Math.max(0, resources.water + (eventResult.resourceDelta.water ?? 0)),
    wood: Math.max(0, resources.wood + (eventResult.resourceDelta.wood ?? 0)),
    medicine: Math.max(
      0,
      Math.min(config.maxMedicine, resources.medicine + (eventResult.resourceDelta.medicine ?? 0)),
    ),
  };

  const updatedPlayers: Record<PlayerId, PlayerStatus> = { ...players };

  for (const id of ALL_PLAYER_IDS) {
    const player = players[id];
    if (getCondition(player, config) === 'Dead') {
      continue;
    }

    const hpChange = eventResult.hpDelta[id] ?? 0;
    const energyChange = eventResult.energyDelta[id] ?? 0;

    const newHp = Math.max(0, Math.min(player.maxHp, player.hp + hpChange));
    const newEnergy = Math.max(0, Math.min(player.maxEnergy, player.energy + energyChange));

    updatedPlayers[id] = {
      ...player,
      hp: newHp,
      energy: newEnergy,
    };
  }

  return {
    updatedPlayers: Object.freeze(updatedPlayers),
    updatedResources: Object.freeze(updatedResources),
  };
}
