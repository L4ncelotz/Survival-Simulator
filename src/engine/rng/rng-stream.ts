/**
 * Represents a single deterministic pseudo-random stream backed by Mulberry32.
 */
export class RNGStream {
  private state: number;

  constructor(initialState: number) {
    this.state = (initialState >>> 0) || 1;
  }

  /**
   * Returns current internal 32-bit state for serialization/snapshotting.
   */
  public getState(): number {
    return this.state >>> 0;
  }

  /**
   * Advances the generator state and returns a float in [0, 1).
   */
  public next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a random integer in [min, max] inclusive.
   */
  public nextInt(min: number, max: number): number {
    if (min > max) {
      throw new Error(`min (${min}) must be <= max (${max})`);
    }
    const range = max - min + 1;
    return min + Math.floor(this.next() * range);
  }

  /**
   * Returns true with the given probability in [0, 1].
   */
  public chance(probability: number): boolean {
    return this.next() < probability;
  }

  /**
   * Picks a random element from a non-empty array.
   */
  public pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('Cannot pick from an empty array');
    }
    const index = this.nextInt(0, items.length - 1);
    const item = items[index];
    if (item === undefined) {
      throw new Error(`Item at index ${index} is undefined`);
    }
    return item;
  }

  /**
   * Returns a new array with elements shuffled using Fisher-Yates.
   */
  public shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      const current = result[i];
      const target = result[j];
      if (current !== undefined && target !== undefined) {
        result[i] = target;
        result[j] = current;
      }
    }
    return result;
  }
}
