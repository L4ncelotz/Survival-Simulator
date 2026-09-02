import { Droplets, Pill, Radio, Trees, UtensilsCrossed } from 'lucide-react';
import React from 'react';
import type { SimulationMetrics } from '../../../simulator/metrics.js';

interface EndingResourcesCardProps {
  readonly metrics: SimulationMetrics;
}

export const EndingResourcesCard: React.FC<EndingResourcesCardProps> = ({ metrics }) => {
  const {
    averageEndingFood,
    averageEndingWater,
    averageEndingWood,
    averageEndingMedicine,
    averageSignalProgress,
  } = metrics;

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col gap-4 shadow-xl">
      <div>
        <h3 className="text-base font-bold text-slate-100">Average Ending State</h3>
        <p className="text-xs text-slate-400">
          Resource reserves and signal completion at game conclusion across the entire batch.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Signal */}
        <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Radio className="w-4 h-4 text-emerald-400" />
            <span>Avg Signal</span>
          </div>
          <span className="text-xl font-bold font-mono text-emerald-400">
            {averageSignalProgress.toFixed(1)}%
          </span>
        </div>

        {/* Food */}
        <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <UtensilsCrossed className="w-4 h-4 text-amber-400" />
            <span>Avg Food</span>
          </div>
          <span className="text-xl font-bold font-mono text-slate-100">
            {averageEndingFood.toFixed(1)}
          </span>
        </div>

        {/* Water */}
        <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Droplets className="w-4 h-4 text-sky-400" />
            <span>Avg Water</span>
          </div>
          <span className="text-xl font-bold font-mono text-slate-100">
            {averageEndingWater.toFixed(1)}
          </span>
        </div>

        {/* Wood */}
        <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Trees className="w-4 h-4 text-amber-600" />
            <span>Avg Wood</span>
          </div>
          <span className="text-xl font-bold font-mono text-slate-100">
            {averageEndingWood.toFixed(1)}
          </span>
        </div>

        {/* Medicine */}
        <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Pill className="w-4 h-4 text-emerald-400" />
            <span>Avg Meds</span>
          </div>
          <span className="text-xl font-bold font-mono text-slate-100">
            {averageEndingMedicine.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
};
