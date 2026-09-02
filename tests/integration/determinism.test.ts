import { describe, expect, it } from 'bun:test';
import { PlannerBot, RandomBot } from '../../src/bots/index.js';
import { runGame } from '../../src/headless/index.js';

describe('Engine & Headless Determinism', () => {
  it('produces identical state sequences and logs for identical seeds with RandomBot', () => {
    const seed = 'deterministic-seed-12345';
    const bot = new RandomBot();

    const run1 = runGame(seed, bot);
    const run2 = runGame(seed, bot);

    expect(run1.totalDays).toBe(run2.totalDays);
    expect(run1.win).toBe(run2.win);
    expect(run1.endReason).toBe(run2.endReason);
    expect(JSON.stringify(run1.finalState)).toBe(JSON.stringify(run2.finalState));
    expect(JSON.stringify(run1.logs)).toBe(JSON.stringify(run2.logs));
  });

  it('produces identical state sequences and logs for identical seeds with PlannerBot', () => {
    const seed = 987654321;
    const bot = new PlannerBot();

    const run1 = runGame(seed, bot);
    const run2 = runGame(seed, bot);

    expect(run1.totalDays).toBe(run2.totalDays);
    expect(run1.win).toBe(run2.win);
    expect(JSON.stringify(run1.finalState)).toBe(JSON.stringify(run2.finalState));
    expect(JSON.stringify(run1.logs)).toBe(JSON.stringify(run2.logs));
  });

  it('diverges when initialized with different seeds', () => {
    const bot = new PlannerBot();
    const runA = runGame('seed-alpha', bot);
    const runB = runGame('seed-beta', bot);

    // Initial weather, traits, or rolls should diverge
    expect(JSON.stringify(runA.logs[0])).not.toBe(JSON.stringify(runB.logs[0]));
  });
});
