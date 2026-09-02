import {
  BarChart3,
  Bot,
  Play,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import React, { useState } from 'react';
import { GreedyBot, PlannerBot, RandomBot, type BotStrategy } from '../../../bots/index.js';
import type { SimulationMetrics } from '../../../simulator/metrics.js';
import { runSimulation } from '../../../simulator/simulator.js';
import { ActionDistributionChart } from './ActionDistributionChart.js';
import { EndingResourcesCard } from './EndingResourcesCard.js';
import { MetricsSummaryGrid } from './MetricsSummaryGrid.js';

const STRATEGIES: Record<string, { label: string; instance: BotStrategy; desc: string }> = {
  PlannerBot: {
    label: 'PlannerBot (Cooperative AI)',
    instance: new PlannerBot(),
    desc: 'Cooperative coordinator maintaining food/water buffers, wood reserves, and 2-builder signal synergy.',
  },
  GreedyBot: {
    label: 'GreedyBot (Needs Triage)',
    instance: new GreedyBot(),
    desc: 'Heals critical players, forages on immediate starvation/thirst, and constructs signal when able.',
  },
  RandomBot: {
    label: 'RandomBot (Baseline / Stress)',
    instance: new RandomBot(),
    desc: 'Selects valid random actions. Used for edge-case, crash, and regression testing.',
  },
};

export const SimulatorDashboard: React.FC = () => {
  const [selectedStrategyKey, setSelectedStrategyKey] = useState<string>('PlannerBot');
  const [batchSize, setBatchSize] = useState<number>(100);
  const [seedPrefix, setSeedPrefix] = useState<string>('batch');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<SimulationMetrics | null>(null);

  const handleRun = () => {
    setIsRunning(true);
    // Allow React state render cycle before executing synchronous batch
    setTimeout(() => {
      try {
        const strategy = STRATEGIES[selectedStrategyKey]?.instance ?? new PlannerBot();
        const results = runSimulation(batchSize, strategy, seedPrefix);
        setMetrics(results);
      } finally {
        setIsRunning(false);
      }
    }, 50);
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 p-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-500/10 border border-sky-500/30 rounded-full text-sky-400 text-xs font-semibold w-fit">
          <BarChart3 className="w-3.5 h-3.5" /> High-Performance Batch Simulator
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
          Telemetry & Simulation Dashboard
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
          Execute hundreds of headless games through deterministic bot strategies to analyze balance,
          win distributions, casualty rates, and resource dynamics.
        </p>
      </div>

      {/* Simulation Configuration Bar */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col lg:flex-row items-stretch lg:items-end justify-between gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
          {/* Strategy Picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Bot Strategy
            </label>
            <select
              value={selectedStrategyKey}
              onChange={(e) => setSelectedStrategyKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="PlannerBot">PlannerBot (Cooperative AI)</option>
              <option value="GreedyBot">GreedyBot (Needs Solver)</option>
              <option value="RandomBot">RandomBot (Stress Test)</option>
            </select>
          </div>

          {/* Batch Size */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Game Batch Size
            </label>
            <select
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="50">50 Games (Fast)</option>
              <option value="100">100 Games (Standard)</option>
              <option value="250">250 Games (Deep)</option>
              <option value="500">500 Games (Thorough)</option>
              <option value="1000">1,000 Games (Statistical Balance)</option>
            </select>
          </div>

          {/* Seed Prefix */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Seed Prefix
            </label>
            <input
              type="text"
              value={seedPrefix}
              onChange={(e) => setSeedPrefix(e.target.value)}
              placeholder="e.g. sim-run"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Run Button */}
        <button
          type="button"
          onClick={handleRun}
          disabled={isRunning}
          className="py-3.5 px-8 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-slate-950 font-extrabold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
        >
          {isRunning ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin" />
              <span>Simulating {batchSize} Games...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Run {batchSize} Games</span>
            </>
          )}
        </button>
      </div>

      {/* Selected Strategy Description */}
      <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs text-slate-400 flex items-center gap-2">
        <Bot className="w-4 h-4 text-sky-400 shrink-0" />
        <span>
          <strong>Strategy Profile:</strong> {STRATEGIES[selectedStrategyKey]?.desc}
        </span>
      </div>

      {/* Results View */}
      {metrics ? (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          <MetricsSummaryGrid metrics={metrics} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ActionDistributionChart metrics={metrics} />
            <EndingResourcesCard metrics={metrics} />
          </div>
        </div>
      ) : (
        <div className="p-12 bg-slate-900/40 border border-slate-800/60 border-dashed rounded-3xl flex flex-col items-center justify-center text-center gap-3">
          <Sparkles className="w-8 h-8 text-slate-600" />
          <h3 className="font-bold text-slate-300 text-base">No Simulation Data Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            Select a bot strategy and click "Run Simulation" above to generate full telemetry metrics.
          </p>
        </div>
      )}
    </div>
  );
};
