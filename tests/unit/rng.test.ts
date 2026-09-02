import { describe, expect, it } from 'bun:test';
import {
  hashSeed,
  mulberry32,
  MultiStreamRNG,
  RNGStream,
  STREAM_KEYS,
} from '../../src/engine/rng/index.js';

describe('Mulberry32 & hashSeed', () => {
  it('produces identical sequences for identical numeric seeds', () => {
    const gen1 = mulberry32(12345);
    const gen2 = mulberry32(12345);

    const seq1 = Array.from({ length: 10 }, () => gen1());
    const seq2 = Array.from({ length: 10 }, () => gen2());

    expect(seq1).toEqual(seq2);
  });

  it('produces different sequences for different seeds', () => {
    const gen1 = mulberry32(12345);
    const gen2 = mulberry32(54321);

    const seq1 = Array.from({ length: 10 }, () => gen1());
    const seq2 = Array.from({ length: 10 }, () => gen2());

    expect(seq1).not.toEqual(seq2);
  });

  it('hashes strings deterministically to uint32', () => {
    const hash1 = hashSeed('survival-seed-abc');
    const hash2 = hashSeed('survival-seed-abc');
    const hash3 = hashSeed('survival-seed-xyz');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1).toBeGreaterThanOrEqual(0);
    expect(hash1).toBeLessThanOrEqual(0xffffffff);
  });
});

describe('RNGStream', () => {
  it('generates numbers within bounds for nextInt', () => {
    const stream = new RNGStream(9999);
    for (let i = 0; i < 100; i++) {
      const val = stream.nextInt(5, 15);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThanOrEqual(15);
      expect(Number.isInteger(val)).toBe(true);
    }
  });

  it('throws when nextInt min > max', () => {
    const stream = new RNGStream(9999);
    expect(() => stream.nextInt(10, 5)).toThrow();
  });

  it('evaluates chance probabilities correctly at boundaries', () => {
    const stream = new RNGStream(123);
    expect(stream.chance(1)).toBe(true);
    expect(stream.chance(0)).toBe(false);
  });

  it('picks elements uniformly from array', () => {
    const stream = new RNGStream(42);
    const items = ['apple', 'banana', 'cherry'] as const;
    const picked = stream.pick(items);
    expect(items).toContain(picked);
  });

  it('throws when picking from empty array', () => {
    const stream = new RNGStream(42);
    expect(() => stream.pick([])).toThrow();
  });

  it('shuffles arrays without mutating source and preserves elements', () => {
    const stream = new RNGStream(777);
    const original = [1, 2, 3, 4, 5];
    const shuffled = stream.shuffle(original);

    expect(shuffled).toHaveLength(original.length);
    expect(shuffled.slice().sort()).toEqual(original.slice().sort());
    expect(original).toEqual([1, 2, 3, 4, 5]); // Immutability
  });

  it('can snapshot and resume state', () => {
    const stream1 = new RNGStream(10101);
    stream1.next();
    stream1.next();
    const stateSnapshot = stream1.getState();

    const nextRoll1 = stream1.next();

    const stream2 = new RNGStream(stateSnapshot);
    const nextRoll2 = stream2.next();

    expect(nextRoll1).toBe(nextRoll2);
  });
});

describe('MultiStreamRNG', () => {
  it('provides all 6 canonical streams including explore', () => {
    const multi = MultiStreamRNG.fromMasterSeed('test-seed');
    expect(STREAM_KEYS).toEqual(['init', 'action', 'weather', 'event', 'injury', 'explore']);
    for (const key of STREAM_KEYS) {
      const stream = multi.getStream(key);
      expect(stream).toBeInstanceOf(RNGStream);
    }
  });

  it('ensures sub-streams are independent', () => {
    const multi1 = MultiStreamRNG.fromMasterSeed(5555);
    const multi2 = MultiStreamRNG.fromMasterSeed(5555);

    // Advance 'explore' stream 10 times in multi1
    for (let i = 0; i < 10; i++) {
      multi1.getStream('explore').next();
    }

    // 'weather' stream in both should remain in exact sync
    const weather1 = multi1.getStream('weather').next();
    const weather2 = multi2.getStream('weather').next();

    expect(weather1).toBe(weather2);
  });

  it('snapshots and restores entire multi-stream state', () => {
    const multi = MultiStreamRNG.fromMasterSeed('restore-seed');
    multi.getStream('action').next();
    multi.getStream('weather').nextInt(1, 10);
    multi.getStream('explore').chance(0.5);

    const snapshot = multi.snapshot();
    const restored = MultiStreamRNG.restore(snapshot);

    expect(multi.getStream('action').next()).toBe(restored.getStream('action').next());
    expect(multi.getStream('weather').next()).toBe(restored.getStream('weather').next());
    expect(multi.getStream('explore').next()).toBe(restored.getStream('explore').next());
    expect(multi.getStream('init').next()).toBe(restored.getStream('init').next());
  });
});
