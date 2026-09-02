import type { ActionType } from '../engine/types.js';

export interface SimulationMetrics {
  readonly totalGames: number;
  readonly wins: number;
  readonly losses: number;
  readonly winRate: number;
  readonly averageEndDay: number;
  readonly earlyRescueCount: number;
  readonly normalRescueCount: number;
  readonly emergencyRescueCount: number;
  readonly allDeadCount: number;
  readonly emergencyExpiredCount: number;
  readonly averageEndingFood: number;
  readonly averageEndingWater: number;
  readonly averageEndingWood: number;
  readonly averageEndingMedicine: number;
  readonly averageSignalProgress: number;
  readonly totalDeaths: number;
  readonly actionDistribution: Record<ActionType, number>;
  readonly energyBlockCount: number;
  readonly averageRescueDay: number;
  readonly deathBeforeDay5Count: number;
  readonly downRecoveryRate: number;
  readonly medicineStarvationRate: number;
  readonly energyOpportunityBlockRate: number;
}
