import {
  Activity,
  Compass,
  Crosshair,
  Droplets,
  Hammer,
  Pill,
  Radio,
} from 'lucide-react';
import React from 'react';
import type { ActionType } from '../../../engine/types.js';
import type { SimulationMetrics } from '../../../simulator/metrics.js';

interface ActionDistributionChartProps {
  readonly metrics: SimulationMetrics;
}

const ACTION_CONFIG: Record<
  ActionType,
  { label: string; icon: React.FC<{ className?: string }>; color: string; barBg: string }
> = {
  Hunt: { label: 'Hunt', icon: Crosshair, color: 'text-amber-400', barBg: 'bg-amber-500' },
  FindWater: { label: 'Find Water', icon: Droplets, color: 'text-sky-400', barBg: 'bg-sky-500' },
  GatherWood: { label: 'Gather Wood', icon: Hammer, color: 'text-amber-600', barBg: 'bg-amber-600' },
  Explore: { label: 'Explore', icon: Compass, color: 'text-sky-300', barBg: 'bg-sky-400' },
  Rest: { label: 'Rest', icon: Activity, color: 'text-slate-400', barBg: 'bg-slate-500' },
  Heal: { label: 'Heal', icon: Pill, color: 'text-emerald-400', barBg: 'bg-emerald-500' },
  BuildSignal: { label: 'Build Signal', icon: Radio, color: 'text-emerald-300', barBg: 'bg-emerald-400' },
};

const ALL_ACTION_TYPES: readonly ActionType[] = [
  'Hunt',
  'FindWater',
  'GatherWood',
  'Explore',
  'Rest',
  'Heal',
  'BuildSignal',
] as const;

export const ActionDistributionChart: React.FC<ActionDistributionChartProps> = ({
  metrics,
}) => {
  const { actionDistribution, energyBlockCount } = metrics;

  const totalActions = Object.values(actionDistribution).reduce(
    (sum, count) => sum + count,
    0,
  );

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col gap-5 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-100">Action Distribution</h3>
          <p className="text-xs text-slate-400">
            Total action breakdown across all simulation days ({totalActions.toLocaleString()} actions)
          </p>
        </div>

        {energyBlockCount > 0 && (
          <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-xs font-mono">
            {energyBlockCount} Exhaustion Blocks
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {ALL_ACTION_TYPES.map((type) => {
          const count = actionDistribution[type] ?? 0;
          const percent = totalActions > 0 ? ((count / totalActions) * 100).toFixed(1) : '0.0';
          const config = ACTION_CONFIG[type];
          const Icon = config.icon;

          return (
            <div key={type} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                  <span className="font-semibold text-slate-200">{config.label}</span>
                </div>
                <div className="font-mono text-slate-400 text-[11px]">
                  <strong className="text-slate-200 mr-1">{count.toLocaleString()}</strong>
                  <span>({percent}%)</span>
                </div>
              </div>

              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full ${config.barBg} transition-all duration-500 rounded-full`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
