import { describe, expect, it } from 'bun:test';
import { GreedyBot, PlannerBot, RandomBot } from '../../src/bots/index.js';
import { runSimulation } from '../../src/simulator/index.js';

describe('Headless Batch Simulator & Telemetry', () => {
  it('runs batch simulation for RandomBot and collects valid mathematical metrics', () => {
    const totalGames = 50;
    const metrics = runSimulation(totalGames, new RandomBot(), 'random-test');

    expect(metrics.totalGames).toBe(totalGames);
    expect(metrics.wins + metrics.losses).toBe(totalGames);
    expect(metrics.winRate).toBe(metrics.wins / totalGames);
    expect(metrics.earlyRescueCount + metrics.normalRescueCount + metrics.emergencyRescueCount).toBe(
      metrics.wins,
    );
    expect(metrics.allDeadCount + metrics.emergencyExpiredCount).toBe(metrics.losses);

    // Verify finite numbers
    expect(Number.isFinite(metrics.averageEndDay)).toBe(true);
    expect(Number.isFinite(metrics.averageEndingFood)).toBe(true);
    expect(Number.isFinite(metrics.averageEndingWater)).toBe(true);
    expect(Number.isFinite(metrics.averageEndingWood)).toBe(true);
    expect(Number.isFinite(metrics.averageEndingMedicine)).toBe(true);
    expect(Number.isFinite(metrics.averageSignalProgress)).toBe(true);
  });

  it('runs batch simulation for GreedyBot', () => {
    const totalGames = 50;
    const metrics = runSimulation(totalGames, new GreedyBot(), 'greedy-test');

    expect(metrics.totalGames).toBe(totalGames);
    expect(metrics.wins + metrics.losses).toBe(totalGames);
    expect(metrics.averageEndDay).toBeGreaterThanOrEqual(1);
    expect(metrics.actionDistribution.Hunt).toBeGreaterThanOrEqual(0);
    expect(metrics.actionDistribution.FindWater).toBeGreaterThanOrEqual(0);
  });

  it('runs batch simulation for PlannerBot and achieves solid victory performance', () => {
    const totalGames = 100;
    const metrics = runSimulation(totalGames, new PlannerBot(), 'planner-test');

    expect(metrics.totalGames).toBe(totalGames);
    expect(metrics.wins + metrics.losses).toBe(totalGames);
    expect(metrics.winRate).toBeGreaterThan(0.5); // PlannerBot should be effective
    expect(metrics.averageSignalProgress).toBeGreaterThan(50);
    expect(metrics.actionDistribution.BuildSignal).toBeGreaterThan(0);
  });
});
