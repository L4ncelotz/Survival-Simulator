import {
  ArrowRight,
  LogOut,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import React, { useState } from 'react';
import { getCondition } from '../../../engine/rules/condition.js';
import type { PlayerId } from '../../../engine/types.js';
import type { GameSession } from '../../hooks/use-game-session.js';
import { DayResolutionModal } from './DayResolutionModal.js';
import { GameOverScreen } from './GameOverScreen.js';
import { PlayerCardGrid } from './PlayerCardGrid.js';
import { ResourcePoolBar } from './ResourcePoolBar.js';
import { TopBar } from './TopBar.js';

interface GameViewProps {
  readonly session: GameSession;
  readonly onExitToLobby: () => void;
}

const ALL_PLAYER_IDS: readonly PlayerId[] = ['P1', 'P2', 'P3', 'P4'] as const;

export const GameView: React.FC<GameViewProps> = ({ session, onExitToLobby }) => {
  const {
    state,
    lastLog,
    controllers,
    selectedActions,
    isResolving,
    setAction,
    setGhostIntervention,
    ghostIntervention,
    resolveCurrentDay,
    restartGame,
  } = session;

  const [showRecapModal, setShowRecapModal] = useState(true);

  if (!state) {
    return null;
  }

  // Check dead players for ghost intervention option
  const deadPlayers = ALL_PLAYER_IDS.map((id) => state.players[id]).filter(
    (p) => getCondition(p) === 'Dead',
  );
  const canUseGhost = state.ghostInterventionAvailable && deadPlayers.length > 0;

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-5 p-4 animate-in fade-in duration-300">
      {/* Top Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExitToLobby}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Abandon Expedition</span>
          </button>
          <button
            type="button"
            onClick={restartGame}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Seed: <span className="text-amber-400 font-bold">{state.seed}</span>
        </div>
      </div>

      {/* Top Bar: Day, Weather, Signal Progress */}
      <TopBar state={state} />

      {/* Resource Pool Bar */}
      <ResourcePoolBar resources={state.resources} />

      {/* Ghost Intervention Trigger Card if Available */}
      {canUseGhost && (
        <div className="p-3 bg-purple-950/40 border border-purple-800/60 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-purple-300">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>
              <strong>Ghost Intervention Available:</strong> A fallen survivor can alter today's fate.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const requester = deadPlayers[0];
                if (requester) {
                  setGhostIntervention(
                    ghostIntervention
                      ? undefined
                      : { requestingPlayerId: requester.id, targetRollType: 'event' },
                  );
                }
              }}
              className={`px-3 py-1.5 rounded-lg border font-semibold text-xs transition-all cursor-pointer ${
                ghostIntervention
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-900/50'
                  : 'bg-purple-950/80 text-purple-300 border-purple-700 hover:bg-purple-900/60'
              }`}
            >
              {ghostIntervention ? '✓ Reroll Event Armed' : 'Arm Ghost Event Reroll'}
            </button>
          </div>
        </div>
      )}

      {/* 4 Survivor Status Cards */}
      <PlayerCardGrid
        gameState={state}
        controllers={controllers}
        selectedActions={selectedActions}
        onSelectAction={setAction}
      />

      {/* Turn Execution Control Banner */}
      {state.phase !== 'ended' && (
        <div className="sticky bottom-4 z-20 w-full p-4 bg-slate-900/95 border border-slate-700 rounded-2xl shadow-2xl backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-200">
              Day {state.day} Ready for Resolution
            </span>
            <span className="text-[11px] text-slate-400">
              All survivors have designated actions. Click to simulate the full day.
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              resolveCurrentDay();
              setShowRecapModal(true);
            }}
            disabled={isResolving}
            className="py-3.5 px-8 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>Execute Day {state.day}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Day Resolution Recap Modal */}
      {lastLog && showRecapModal && (
        <DayResolutionModal
          log={lastLog}
          onDismiss={() => setShowRecapModal(false)}
        />
      )}

      {/* Game Over Screen */}
      {state.phase === 'ended' && (
        <GameOverScreen
          state={state}
          onRestart={restartGame}
          onBackToLobby={onExitToLobby}
        />
      )}
    </div>
  );
};
