/**
 * Converts a string or number seed into a 32-bit unsigned integer using FNV-1a.
 */
export function hashSeed(seed: string | number): number {
  if (typeof seed === 'number') {
    return (seed >>> 0) || 1;
  }
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h >>> 0) || 1;
}

/**
 * Creates a raw Mulberry32 generator function yielding floats in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return function next(): number {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
