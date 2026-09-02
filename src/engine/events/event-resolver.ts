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

const PITY_WEIGHTS: CategoryWeights = {
  positive: 65,
  neutral: 25,
  negative: 10,
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
  'ColdSnap',
  'PredatorProwl',
] as const;

const ALL_PLAYER_IDS: readonly PlayerId[] = ['P1', 'P2', 'P3', 'P4'] as const;

/**
 * Resolves a daily event using the event RNG stream and current crisis state.
 */
export function resolveDailyEvent(state: GameState, eventStream: RNGStream): EventResult {
  const isCrisisActive =
    state.crisis.foodCrisis || state.crisis.waterCrisis || state.crisis.hpCrisis;

  const weights = isCrisisActive ? PITY_WEIGHTS : NORMAL_WEIGHTS;
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
    (id) => getCondition(state.players[id]) !== 'Dead',
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
            description: 'The island remains calm and uneventful.',
            category: 'neutral',
            resourceDelta: {},
            hpDelta: {},
            energyDelta: {},
          };
        case 'PassingFlock': {
          const energyDelta: Partial<Record<PlayerId, number>> = {};
          // Give bonus energy to living Scout, or all living players if no Scout
          const scoutId = livingPlayerIds.find((id) => state.players[id].trait === 'Scout');
          if (scoutId) {
            energyDelta[scoutId] = 10;
          } else {
            for (const id of livingPlayerIds) {
              energyDelta[id] = 5;
            }
          }
          return {
            eventId,
            name: 'Passing Flock',
            description: 'A flock of birds provided valuable navigation insights (+Energy).',
            category: 'neutral',
            resourceDelta: {},
            hpDelta: {},
            energyDelta,
          };
        }
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
            description: 'Tropical heat spoiled some food stores (-3 Food).',
            category: 'negative',
            resourceDelta: { food: -3 },
            hpDelta: {},
            energyDelta: {},
          };
        case 'WaterContamination':
          return {
            eventId,
            name: 'Water Contamination',
            description: 'Sediment fouled part of the water reserve (-3 Water).',
            category: 'negative',
            resourceDelta: { water: -3 },
            hpDelta: {},
            energyDelta: {},
          };
        case 'ColdSnap': {
          const energyDelta: Partial<Record<PlayerId, number>> = {};
          for (const id of livingPlayerIds) {
            energyDelta[id] = -15;
          }
          return {
            eventId,
            name: 'Cold Snap',
            description: 'A bitter nocturnal chill drained the survivors (-15 Energy).',
            category: 'negative',
            resourceDelta: {},
            hpDelta: {},
            energyDelta,
          };
        }
        case 'PredatorProwl': {
          const hpDelta: Partial<Record<PlayerId, number>> = {};
          if (livingPlayerIds.length > 0) {
            const targetId = eventStream.pick(livingPlayerIds);
            hpDelta[targetId] = -15;
          }
          return {
            eventId,
            name: 'Predator Prowl',
            description: 'A stalking predator struck a survivor (-15 HP).',
            category: 'negative',
            resourceDelta: {},
            hpDelta,
            energyDelta: {},
          };
        }
      }
      break;
    }
  }
}

/**
 * Purely applies an EventResult to the player status list and resource pool.
 */
export function applyEventResult(
  players: Record<PlayerId, PlayerStatus>,
  resources: ResourcePool,
  eventResult: EventResult,
): { updatedPlayers: Record<PlayerId, PlayerStatus>; updatedResources: ResourcePool } {
  const updatedResources: ResourcePool = {
    food: Math.max(0, resources.food + (eventResult.resourceDelta.food ?? 0)),
    water: Math.max(0, resources.water + (eventResult.resourceDelta.water ?? 0)),
    wood: Math.max(0, resources.wood + (eventResult.resourceDelta.wood ?? 0)),
    medicine: Math.max(0, resources.medicine + (eventResult.resourceDelta.medicine ?? 0)),
  };

  const updatedPlayers: Record<PlayerId, PlayerStatus> = { ...players };

  for (const id of ALL_PLAYER_IDS) {
    const player = players[id];
    if (getCondition(player) === 'Dead') {
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
