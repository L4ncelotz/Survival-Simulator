import {
  AlertTriangle,
  CloudRain,
  Radio,
  Sun,
  Zap,
} from 'lucide-react';
import React from 'react';
import type { GameState } from '../../../engine/types.js';

interface TopBarProps {
  readonly state: GameState;
}

export const TopBar: React.FC<TopBarProps> = ({ state }) => {
  const { day, weather, phase, signal, crisis } = state;

  const weatherConfig = {
    Clear: { label: 'Clear Skies', icon: Sun, color: 'text-amber-400 bg-amber-950/40 border-amber-800/50' },
    Rain: { label: 'Heavy Rain (+Water)', icon: CloudRain, color: 'text-sky-400 bg-sky-950/40 border-sky-800/50' },
    Storm: { label: 'Violent Storm (Builds Blocked)', icon: Zap, color: 'text-rose-400 bg-rose-950/40 border-rose-800/50' },
  }[weather];

  const phaseConfig = {
    normal: { label: 'Normal Phase', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50' },
    emergency: { label: 'EMERGENCY WINDOW (1.5x Consumption)', color: 'text-rose-400 bg-rose-950/50 border-rose-800/60 animate-pulse' },
    rescue_pending: { label: 'RESCUE INCOMING (Survive Today!)', color: 'text-amber-300 bg-amber-950/50 border-amber-500/60 animate-bounce' },
    ended: { label: 'Expedition Ended', color: 'text-slate-400 bg-slate-900 border-slate-700' },
  }[phase];

  const WeatherIcon = weatherConfig.icon;
  const signalPercent = Math.min(100, Math.max(0, signal.progress));

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md flex flex-col gap-4">
      {/* Upper row: Day, Weather, Phase */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm font-semibold text-slate-200 shadow-inner">
            <span className="text-slate-400 text-xs uppercase tracking-wider mr-1">Day</span>
            <span className="text-lg font-bold text-amber-400">{day}</span>
            <span className="text-slate-500 text-xs ml-1">/ 20</span>
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${weatherConfig.color}`}>
            <WeatherIcon className="w-4 h-4" />
            <span>{weatherConfig.label}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${phaseConfig.color}`}>
            {phaseConfig.label}
          </span>
        </div>
      </div>

      {/* Signal Progress Bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Rescue Signal Progress</span>
          </div>
          <span className="font-bold text-emerald-400 font-mono text-sm">{signalPercent}%</span>
        </div>

        <div className="relative w-full h-3.5 bg-slate-950 border border-slate-800 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500 rounded-full"
            style={{ width: `${signalPercent}%` }}
          />

          {/* 80% Marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400/80 z-10"
            style={{ left: '80%' }}
            title="80% Day 20 Normal Rescue Threshold"
          />
          {/* 100% Marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-emerald-300 z-10"
            style={{ left: '99%' }}
            title="100% Early Rescue Threshold"
          />
        </div>

        <div className="flex justify-between text-[10px] text-slate-500 px-0.5 font-mono">
          <span>0%</span>
          <span className="text-amber-400/90 font-medium">80% (Day 20 Goal)</span>
          <span className="text-emerald-400 font-medium">100% (Instant Rescue)</span>
        </div>
      </div>

      {/* Crisis Warning Banner if active */}
      {(crisis.foodCrisis || crisis.waterCrisis || crisis.hpCrisis) && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs animate-pulse">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>
            <strong>Crisis Alert:</strong>{' '}
            {[
              crisis.foodCrisis && 'Critical Food Shortage (<6)',
              crisis.waterCrisis && 'Severe Dehydration Risk (<6)',
              crisis.hpCrisis && 'Survivor Near Death (HP <= 20)',
            ]
              .filter(Boolean)
              .join(' • ')}
          </span>
        </div>
      )}
    </div>
  );
};
