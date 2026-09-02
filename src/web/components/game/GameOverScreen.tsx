import {
  Crown,
  RotateCcw,
  Skull,
  Trophy,
} from 'lucide-react';
import React from 'react';
import { getCondition } from '../../../engine/rules/condition.js';
import type { GameState, PlayerId } from '../../../engine/types.js';

interface GameOverScreenProps {
  readonly state: GameState;
  readonly onRestart: () => void;
  readonly onBackToLobby: () => void;
}

const ALL_PLAYER_IDS: readonly PlayerId[] = ['P1', 'P2', 'P3', 'P4'] as const;

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  state,
  onRestart,
  onBackToLobby,
}) => {
  const { winner, endReason, day, signal, resources, players } = state;

  const livingSurvivors = ALL_PLAYER_IDS.map((id) => players[id]).filter(
    (p) => getCondition(p) !== 'Dead',
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg animate-in fade-in zoom-in-95 duration-300">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center gap-6">
        {/* Victory/Defeat Icon */}
        <div
          className={`p-5 rounded-3xl border shadow-xl ${
            winner
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
          }`}
        >
          {winner ? (
            <Trophy className="w-16 h-16 animate-bounce" />
          ) : (
            <Skull className="w-16 h-16 animate-pulse" />
          )}
        </div>

        {/* Title and Reason */}
        <div className="flex flex-col gap-2">
          <h1
            className={`text-3xl font-extrabold tracking-tight ${
              winner ? 'text-amber-400' : 'text-rose-500'
            }`}
          >
            {winner ? 'EXPEDITION SURVIVED!' : 'EXPEDITION LOST'}
          </h1>
          <p className="text-sm text-slate-300 max-w-md mx-auto">
            {endReason ?? (winner ? 'Survivors were successfully rescued.' : 'All survivors perished on the island.')}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-0.5">
            <span className="text-[11px] text-slate-400">Total Days</span>
            <span className="text-xl font-bold font-mono text-slate-100">{day}</span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-0.5">
            <span className="text-[11px] text-slate-400">Signal Progress</span>
            <span className="text-xl font-bold font-mono text-emerald-400">{signal.progress}%</span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-0.5">
            <span className="text-[11px] text-slate-400">Survivors Alive</span>
            <span className="text-xl font-bold font-mono text-amber-300">
              {livingSurvivors.length} / 4
            </span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-0.5">
            <span className="text-[11px] text-slate-400">Ending Food</span>
            <span className="text-xl font-bold font-mono text-slate-200">{resources.food}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
          <button
            onClick={onRestart}
            className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Replay Seed</span>
          </button>

          <button
            onClick={onBackToLobby}
            className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Back to Lobby</span>
          </button>
        </div>
      </div>
    </div>
  );
};
