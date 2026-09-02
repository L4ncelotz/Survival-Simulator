import type { RNGStreamKey } from '../types.js';
import { hashSeed } from './mulberry32.js';
import { RNGStream } from './rng-stream.js';

export const STREAM_KEYS: readonly RNGStreamKey[] = [
  'init',
  'action',
  'weather',
  'event',
  'injury',
  'explore',
] as const;

export class MultiStreamRNG {
  private readonly streams: Record<RNGStreamKey, RNGStream>;

  constructor(streamStates: Record<RNGStreamKey, number>) {
    this.streams = {
      init: new RNGStream(streamStates.init),
      action: new RNGStream(streamStates.action),
      weather: new RNGStream(streamStates.weather),
      event: new RNGStream(streamStates.event),
      injury: new RNGStream(streamStates.injury),
      explore: new RNGStream(streamStates.explore),
    };
  }

  public static fromMasterSeed(seed: number | string): MultiStreamRNG {
    const masterNumericSeed = hashSeed(seed);
    const masterGen = new RNGStream(masterNumericSeed);
    const states = {
      init: (masterGen.next() * 4294967296) >>> 0 || 1,
      action: (masterGen.next() * 4294967296) >>> 0 || 1,
      weather: (masterGen.next() * 4294967296) >>> 0 || 1,
      event: (masterGen.next() * 4294967296) >>> 0 || 1,
      injury: (masterGen.next() * 4294967296) >>> 0 || 1,
      explore: (masterGen.next() * 4294967296) >>> 0 || 1,
    };
    return new MultiStreamRNG(states);
  }

  public getStream(key: RNGStreamKey): RNGStream {
    const stream = this.streams[key];
    if (!stream) {
      throw new Error(`Unknown RNG stream key: ${key}`);
    }
    return stream;
  }

  public snapshot(): Record<RNGStreamKey, number> {
    return {
      init: this.streams.init.getState(),
      action: this.streams.action.getState(),
      weather: this.streams.weather.getState(),
      event: this.streams.event.getState(),
      injury: this.streams.injury.getState(),
      explore: this.streams.explore.getState(),
    };
  }

  public static restore(snapshot: Record<RNGStreamKey, number>): MultiStreamRNG {
    return new MultiStreamRNG(snapshot);
  }

  public restore(snapshot: Record<RNGStreamKey, number>): MultiStreamRNG {
    return new MultiStreamRNG(snapshot);
  }
}
