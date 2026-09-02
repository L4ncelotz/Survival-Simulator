import { Droplets, Pill, Trees, UtensilsCrossed } from 'lucide-react';
import React from 'react';
import type { ResourcePool } from '../../../engine/types.js';

interface ResourcePoolBarProps {
  readonly resources: ResourcePool;
}

export const ResourcePoolBar: React.FC<ResourcePoolBarProps> = ({ resources }) => {
  const { food, water, wood, medicine } = resources;

  const isFoodCrisis = food < 6;
  const isWaterCrisis = water < 6;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
      {/* Food */}
      <div
        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
          isFoodCrisis
            ? 'bg-rose-950/40 border-rose-800/80 shadow-rose-950/50 shadow-md'
            : 'bg-slate-900/80 border-slate-800'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Food Reserve</div>
            <div className="text-xl font-bold font-mono text-slate-100">{food}</div>
          </div>
        </div>
        {isFoodCrisis && (
          <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-950 px-1.5 py-0.5 rounded border border-rose-800 animate-pulse">
            Low
          </span>
        )}
      </div>

      {/* Water */}
      <div
        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
          isWaterCrisis
            ? 'bg-rose-950/40 border-rose-800/80 shadow-rose-950/50 shadow-md'
            : 'bg-slate-900/80 border-slate-800'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Fresh Water</div>
            <div className="text-xl font-bold font-mono text-slate-100">{water}</div>
          </div>
        </div>
        {isWaterCrisis && (
          <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-950 px-1.5 py-0.5 rounded border border-rose-800 animate-pulse">
            Low
          </span>
        )}
      </div>

      {/* Wood */}
      <div className="flex items-center justify-between p-3.5 rounded-xl border bg-slate-900/80 border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-700/10 text-amber-600 border border-amber-700/20">
            <Trees className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Lumber (Wood)</div>
            <div className="text-xl font-bold font-mono text-slate-100">{wood}</div>
          </div>
        </div>
      </div>

      {/* Medicine */}
      <div className="flex items-center justify-between p-3.5 rounded-xl border bg-slate-900/80 border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Medicine</div>
            <div className="text-xl font-bold font-mono text-slate-100">{medicine}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
