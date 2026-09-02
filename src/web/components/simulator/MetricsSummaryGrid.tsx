import {
  AlertOctagon,
  BatteryWarning,
  CheckCircle2,
  Clock,
  Radio,
  Skull,
  Trophy,
  XCircle,
} from 'lucide-react';
import React from 'react';
import type { SimulationMetrics } from '../../../simulator/metrics.js';

interface MetricsSummaryGridProps {
  readonly metrics: SimulationMetrics;
}

export const MetricsSummaryGrid: React.FC<MetricsSummaryGridProps> = ({ metrics }) => {
  const {
    totalGames,
    wins,
    losses,
    winRate,
    averageEndDay,
    earlyRescueCount,
    normalRescueCount,
    emergencyRescueCount,
    allDeadCount,
    emergencyExpiredCount,
    totalDeaths,
    energyBlockCount,
  } = metrics;

  const winPercent = (winRate * 100).toFixed(1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {/* Win Rate Card */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between gap-3 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
            Survival Win Rate
          </span>
          <Trophy
            className={`w-5 h-5 ${
              winRate >= 0.5 ? 'text-emerald-400' : winRate >= 0.2 ? 'text-amber-400' : 'text-rose-400'
            }`}
          />
        </div>

        <div>
          <div
            className={`text-3xl font-extrabold font-mono ${
              winRate >= 0.5 ? 'text-emerald-400' : winRate >= 0.2 ? 'text-amber-400' : 'text-rose-400'
            }`}
          >
            {winPercent}%
          </div>
          <div className="text-xs text-slate-400 mt-1">
            <strong>{wins}</strong> Wins / <strong>{losses}</strong> Losses ({totalGames} Games)
          </div>
        </div>

        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all duration-500 ${
              winRate >= 0.5 ? 'bg-emerald-500' : winRate >= 0.2 ? 'bg-amber-500' : 'bg-rose-500'
            }`}
            style={{ width: `${winPercent}%` }}
          />
        </div>
      </div>

      {/* Average Survival Days Card */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between gap-3 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
            Avg Days Survived
          </span>
          <Clock className="w-5 h-5 text-sky-400" />
        </div>

        <div>
          <div className="text-3xl font-extrabold font-mono text-slate-100">
            {averageEndDay.toFixed(1)}
            <span className="text-sm font-normal text-slate-400 ml-1">days</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Rescue window opens on <strong>Day 20</strong>
          </div>
        </div>

        <div className="text-[11px] text-slate-500">
          Max game length capped at Day 23 (Emergency window).
        </div>
      </div>

      {/* Rescue Distribution Card */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col gap-2.5 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
            Victory Classification
          </span>
          <Radio className="w-5 h-5 text-emerald-400" />
        </div>

        <div className="flex flex-col gap-1.5 text-xs">
          <div className="flex items-center justify-between p-1.5 bg-slate-950/60 rounded border border-slate-800/80">
            <span className="text-slate-300">Early Rescue (100%):</span>
            <span className="font-mono font-bold text-emerald-400">
              {earlyRescueCount} ({((earlyRescueCount / totalGames) * 100).toFixed(1)}%)
            </span>
          </div>

          <div className="flex items-center justify-between p-1.5 bg-slate-950/60 rounded border border-slate-800/80">
            <span className="text-slate-300">Day 20 Rescue (80%+):</span>
            <span className="font-mono font-bold text-amber-400">
              {normalRescueCount} ({((normalRescueCount / totalGames) * 100).toFixed(1)}%)
            </span>
          </div>

          <div className="flex items-center justify-between p-1.5 bg-slate-950/60 rounded border border-slate-800/80">
            <span className="text-slate-300">Emergency Rescue:</span>
            <span className="font-mono font-bold text-sky-400">
              {emergencyRescueCount} ({((emergencyRescueCount / totalGames) * 100).toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Defeat & Casualties Card */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col gap-2.5 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
            Losses & Attrition
          </span>
          <Skull className="w-5 h-5 text-rose-400" />
        </div>

        <div className="flex flex-col gap-1.5 text-xs">
          <div className="flex items-center justify-between p-1.5 bg-slate-950/60 rounded border border-slate-800/80">
            <span className="text-slate-300">All Survivors Perished:</span>
            <span className="font-mono font-bold text-rose-400">{allDeadCount}</span>
          </div>

          <div className="flex items-center justify-between p-1.5 bg-slate-950/60 rounded border border-slate-800/80">
            <span className="text-slate-300">Emergency Window Expired:</span>
            <span className="font-mono font-bold text-amber-400">{emergencyExpiredCount}</span>
          </div>

          <div className="flex items-center justify-between p-1.5 bg-slate-950/60 rounded border border-slate-800/80">
            <span className="text-slate-300">Total Deaths (Across all):</span>
            <span className="font-mono font-bold text-slate-300">{totalDeaths}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
