import { DEFAULT_BALANCE_CONFIG, type BalanceConfig } from './config/balance.js';
import { hashSeed } from './rng/mulberry32.js';
import { MultiStreamRNG } from './rng/multi-stream.js';
import type { RNGStream } from './rng/rng-stream.js';
import type {
  GameState,
  PlayerId,
  PlayerStatus,
  Trait,
  WeatherType,
} from './types.js';

const PLAYER_IDS: readonly PlayerId[] = ['P1', 'P2', 'P3', 'P4'] as const;
const BASE_TRAITS: readonly Trait[] = [
  'Hunter',
  'Medic',
  'Builder',
  'Scout',
] as const;

/**
 * Rolls weather using weighted random selection on the provided RNG stream.
 */
export function rollWeather(
  rngStream: RNGStream,
  weatherWeights: Record<WeatherType, number>,
): WeatherType {
  const entries = Object.entries(weatherWeights) as [WeatherType, number][];
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
  const roll = rngStream.next() * totalWeight;

  let cumulative = 0;
  for (const [weather, weight] of entries) {
    cumulative += weight;
    if (roll < cumulative) {
      return weather;
    }
  }

  return entries[0] ? entries[0][0] : 'Clear';
}

/**
 * Creates a new deterministic GameState from a seed and optional balance configuration.
 */
export function createGame(
  seed: number | string,
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
): GameState {
  const numericSeed = hashSeed(seed);
  const rng = MultiStreamRNG.fromMasterSeed(numericSeed);

  // Roll Day 1 weather from weather stream
  const weatherStream = rng.getStream('weather');
  const initialWeather = rollWeather(weatherStream, config.weatherWeights);

  // Shuffle traits from init stream
  const initStream = rng.getStream('init');
  const shuffledTraits = initStream.shuffle(BASE_TRAITS);

  // Create 4 initial players with Single Source of Truth status (no derived condition/isGhost)
  const players: Record<PlayerId, PlayerStatus> = {
    P1: {
      id: 'P1',
      name: 'Player 1',
      trait: shuffledTraits[0] ?? 'Hunter',
      hp: config.player.maxHp,
      maxHp: config.player.maxHp,
      energy: config.player.maxEnergy,
      maxEnergy: config.player.maxEnergy,
      hunger: config.player.startingHunger,
      thirst: config.player.startingThirst,
      downDays: 0,
    },
    P2: {
      id: 'P2',
      name: 'Player 2',
      trait: shuffledTraits[1] ?? 'Medic',
      hp: config.player.maxHp,
      maxHp: config.player.maxHp,
      energy: config.player.maxEnergy,
      maxEnergy: config.player.maxEnergy,
      hunger: config.player.startingHunger,
      thirst: config.player.startingThirst,
      downDays: 0,
    },
    P3: {
      id: 'P3',
      name: 'Player 3',
      trait: shuffledTraits[2] ?? 'Builder',
      hp: config.player.maxHp,
      maxHp: config.player.maxHp,
      energy: config.player.maxEnergy,
      maxEnergy: config.player.maxEnergy,
      hunger: config.player.startingHunger,
      thirst: config.player.startingThirst,
      downDays: 0,
    },
    P4: {
      id: 'P4',
      name: 'Player 4',
      trait: shuffledTraits[3] ?? 'Scout',
      hp: config.player.maxHp,
      maxHp: config.player.maxHp,
      energy: config.player.maxEnergy,
      maxEnergy: config.player.maxEnergy,
      hunger: config.player.startingHunger,
      thirst: config.player.startingThirst,
      downDays: 0,
    },
  };

  const initialGameState: GameState = {
    day: 1,
    phase: 'normal',
    seed: numericSeed,
    players: Object.freeze(players),
    resources: Object.freeze({ ...config.startingResources }),
    weather: initialWeather,
    signal: Object.freeze({
      progress: 0,
      maxProgress: 100,
      rescuePending: false,
    }),
    rngState: Object.freeze(rng.snapshot()),
    crisis: Object.freeze({
      foodCrisis: false,
      waterCrisis: false,
      hpCrisis: false,
    }),
    ghostInterventionAvailable: false,
  };

  return Object.freeze(initialGameState);
}
