import { describe, expect, it } from 'bun:test';
import { GreedyBot, PlannerBot, RandomBot } from '../../src/bots/index.js';
import { runGame } from '../../src/headless/index.js';

describe('Headless Game Integration', () => {
  it('runs complete games with RandomBot to valid terminal states without crashes', () => {
    const bot = new RandomBot();
    for (let seed = 1; seed <= 5; seed++) {
      const result = runGame(seed * 1000, bot);

      expect(result.finalState.phase).toBe('ended');
      expect(typeof result.win).toBe('boolean');
      expect(result.totalDays).toBeGreaterThanOrEqual(1);
      expect(result.totalDays).toBeLessThanOrEqual(25);
      expect(result.logs.length).toBe(result.totalDays);

      // Verify no negative resources
      expect(result.finalState.resources.food).toBeGreaterThanOrEqual(0);
      expect(result.finalState.resources.water).toBeGreaterThanOrEqual(0);
      expect(result.finalState.resources.wood).toBeGreaterThanOrEqual(0);
      expect(result.finalState.resources.medicine).toBeGreaterThanOrEqual(0);
    }
  });

  it('runs complete games with GreedyBot to valid terminal states', () => {
    const bot = new GreedyBot();
    for (let seed = 1; seed <= 5; seed++) {
      const result = runGame(seed * 2000, bot);

      expect(result.finalState.phase).toBe('ended');
      expect(result.totalDays).toBeGreaterThanOrEqual(1);
      expect(result.logs.length).toBe(result.totalDays);
    }
  });

  it('runs complete games with PlannerBot achieving victories', () => {
    const bot = new PlannerBot();
    let wins = 0;
    const gameCount = 10;

    for (let seed = 1; seed <= gameCount; seed++) {
      const result = runGame(seed * 3000, bot);

      expect(result.finalState.phase).toBe('ended');
      expect(result.totalDays).toBeGreaterThanOrEqual(1);
      if (result.win) {
        wins++;
      }
    }

    // PlannerBot should achieve solid win rate
    expect(wins).toBeGreaterThan(0);
  });
});
