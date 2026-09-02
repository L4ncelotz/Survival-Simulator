import {
  Bot,
  Compass,
  Crosshair,
  Dices,
  Flame,
  Hammer,
  Pill,
  Play,
  Shield,
  User,
  Users,
} from 'lucide-react';
import React, { useState } from 'react';
import type { PlayerId } from '../../../engine/types.js';
import type { ControllerType } from '../../hooks/use-game-session.js';

interface LobbyViewProps {
  readonly onStartGame: (
    seed: string,
    controllers: Record<PlayerId, ControllerType>,
  ) => void;
}

const PLAYER_SLOTS: readonly { id: PlayerId; label: string; defaultTraitHint: string }[] = [
  { id: 'P1', label: 'Slot 1', defaultTraitHint: 'Survivor 1' },
  { id: 'P2', label: 'Slot 2', defaultTraitHint: 'Survivor 2' },
  { id: 'P3', label: 'Slot 3', defaultTraitHint: 'Survivor 3' },
  { id: 'P4', label: 'Slot 4', defaultTraitHint: 'Survivor 4' },
] as const;

export const LobbyView: React.FC<LobbyViewProps> = ({ onStartGame }) => {
  const [seed, setSeed] = useState<string>(() => `island-${Math.floor(Math.random() * 10000)}`);
  const [controllers, setControllers] = useState<Record<PlayerId, ControllerType>>({
    P1: 'human',
    P2: 'human',
    P3: 'PlannerBot',
    P4: 'PlannerBot',
  });

  const randomizeSeed = () => {
    setSeed(`island-${Math.floor(Math.random() * 90000 + 10000)}`);
  };

  const applyPreset = (preset: 'all-human' | 'co-op' | 'spectate') => {
    if (preset === 'all-human') {
      setControllers({ P1: 'human', P2: 'human', P3: 'human', P4: 'human' });
    } else if (preset === 'co-op') {
      setControllers({ P1: 'human', P2: 'human', P3: 'PlannerBot', P4: 'PlannerBot' });
    } else {
      setControllers({ P1: 'PlannerBot', P2: 'PlannerBot', P3: 'PlannerBot', P4: 'PlannerBot' });
    }
  };

  const handleStart = () => {
    onStartGame(seed.trim() || 'default-seed', controllers);
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 p-4 animate-in fade-in duration-300">
      {/* Title & Introduction */}
      <div className="flex flex-col items-center text-center gap-2 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-semibold uppercase tracking-wider">
          <Flame className="w-3.5 h-3.5" /> Pure Deterministic Survival Simulation
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
          4-Man Survival Simulator
        </h1>
        <p className="text-sm text-slate-400 max-w-lg">
          Manage 4 stranded survivors. Balance energy, forage food & water, triage critical injuries,
          and construct the rescue signal to survive until extraction on Day 20.
        </p>
      </div>

      {/* Seed Configuration Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label htmlFor="seed-input" className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Island Generation Seed (RNG Seed)
          </label>
          <span className="text-[11px] text-slate-500">Same seed = Bit-for-bit identical weather & traits</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="seed-input"
            type="text"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="e.g. island-42"
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="button"
            onClick={randomizeSeed}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Dices className="w-4 h-4 text-amber-400" />
            <span>Randomize</span>
          </button>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
          Player Assignment Presets:
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => applyPreset('all-human')}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium text-slate-300 transition-all cursor-pointer"
          >
            Solo (4 Humans)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('co-op')}
            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-xs font-medium text-amber-400 transition-all cursor-pointer"
          >
            Co-op (2 Humans + 2 Bots)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('spectate')}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium text-sky-400 transition-all cursor-pointer"
          >
            Spectate (4 PlannerBots)
          </button>
        </div>
      </div>

      {/* Player Slots Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLAYER_SLOTS.map(({ id, label }) => {
          const currentCtrl = controllers[id];
          return (
            <div
              key={id}
              className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col gap-3 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-400">{id}</span>
                <div className="flex items-center gap-1 text-[11px] font-medium text-slate-300">
                  {currentCtrl === 'human' ? (
                    <User className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Bot className="w-3.5 h-3.5 text-sky-400" />
                  )}
                  <span>{label}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-400">Controller:</label>
                <select
                  value={currentCtrl}
                  onChange={(e) =>
                    setControllers((prev) => ({
                      ...prev,
                      [id]: e.target.value as ControllerType,
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="human">👤 Human Player</option>
                  <option value="PlannerBot">🤖 PlannerBot (Cooperative AI)</option>
                  <option value="GreedyBot">🤖 GreedyBot (Needs Triage)</option>
                  <option value="RandomBot">🤖 RandomBot (Chaotic)</option>
                </select>
              </div>

              <div className="text-[10px] text-slate-500 pt-1">
                {currentCtrl === 'human'
                  ? 'Controlled manually each day turn.'
                  : currentCtrl === 'PlannerBot'
                  ? 'Calculates optimal food, medicine & signal synergy.'
                  : currentCtrl === 'GreedyBot'
                  ? 'Solves immediate health and starvation needs.'
                  : 'Picks random valid actions.'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Launch Button */}
      <button
        type="button"
        onClick={handleStart}
        className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-base rounded-2xl transition-all shadow-xl shadow-amber-950/30 flex items-center justify-center gap-2 cursor-pointer"
      >
        <Play className="w-5 h-5 fill-slate-950" />
        <span>Launch Survival Expedition</span>
      </button>

      {/* Rules Summary Card */}
      <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4 text-xs text-slate-400">
        <div className="flex items-start gap-2.5">
          <Crosshair className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-200">Hunter:</strong> Gathers +2 extra food; consumes 1.25x food daily.
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Pill className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-200">Medic:</strong> Heals +20 bonus HP when treating wounds.
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Hammer className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-200">Builder:</strong> Gathers +2 wood; builds signal for 3 wood (vs 5).
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Compass className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-200">Scout:</strong> 50% injury hazard reduction on exploration.
          </div>
        </div>
      </div>
    </div>
  );
};
