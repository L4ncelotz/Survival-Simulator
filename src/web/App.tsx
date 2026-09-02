import {
  BarChart3,
  Gamepad2,
  Palmtree,
  ShieldCheck,
} from 'lucide-react';
import React, { useState } from 'react';
import { GameView } from './components/game/GameView.js';
import { LobbyView } from './components/game/LobbyView.js';
import { SimulatorDashboard } from './components/simulator/SimulatorDashboard.js';
import { useGameSession } from './hooks/use-game-session.js';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'game' | 'simulator'>('game');
  const session = useGameSession();

  const handleStartGame = (
    seed: string,
    controllers: Parameters<typeof session.startNewGame>[1],
  ) => {
    session.startNewGame(seed, controllers);
  };

  const handleExitToLobby = () => {
    // Setting state to null returns to lobby
    session.startNewGame(session.currentSeed);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Main Navigation */}
      <header className="w-full bg-slate-900/80 border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Palmtree className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-slate-100 flex items-center gap-1.5">
                <span>4-Man Survival Simulator</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  v1.0
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Pure Deterministic Engine & Multi-Stream PRNG
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('game')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'game'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Gamepad2 className="w-4 h-4" />
              <span>Game Mode</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'simulator'
                  ? 'bg-sky-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Batch Simulator</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto py-6">
        {activeTab === 'game' ? (
          !session.state ? (
            <LobbyView onStartGame={handleStartGame} />
          ) : (
            <GameView session={session} onExitToLobby={handleExitToLobby} />
          )
        ) : (
          <SimulatorDashboard />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full bg-slate-950 border-t border-slate-900 py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Deterministic State Engine • 100% Client-Side Simulation</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Rescue Day 20 • 4-Player Survival</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
