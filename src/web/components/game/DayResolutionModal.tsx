import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  XCircle,
} from 'lucide-react';
import React from 'react';
import type { DayLog } from '../../../engine/resolver/types.js';

interface DayResolutionModalProps {
  readonly log: DayLog;
  readonly onDismiss: () => void;
}

export const DayResolutionModal: React.FC<DayResolutionModalProps> = ({
  log,
  onDismiss,
}) => {
  const {
    day,
    weather,
    actionResults,
    eventResult,
    ghostInterventionUsed,
    ghostInterventionMessage,
    resourceDeltas,
    deaths,
    downRecoveries,
  } = log;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-100">
              Day {day} Recap
            </h2>
            <p className="text-xs text-slate-400">
              Weather was <strong>{weather}</strong>. Here is what transpired on the island:
            </p>
          </div>
          <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold rounded-lg">
            Day {day} Complete
          </span>
        </div>

        {/* Ghost Intervention Note if used */}
        {ghostInterventionUsed && ghostInterventionMessage && (
          <div className="p-3 bg-purple-950/40 border border-purple-800/60 rounded-xl text-xs text-purple-300 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <strong>Ghost Intervention Activated:</strong> {ghostInterventionMessage}
            </div>
          </div>
        )}

        {/* Daily Event Card */}
        {eventResult && (
          <div
            className={`p-4 rounded-xl border flex flex-col gap-1.5 ${
              eventResult.category === 'positive'
                ? 'bg-emerald-950/30 border-emerald-800/60'
                : eventResult.category === 'negative'
                ? 'bg-rose-950/30 border-rose-800/60'
                : 'bg-slate-800/50 border-slate-700/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Island Event
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded capitalize ${
                  eventResult.category === 'positive'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                    : eventResult.category === 'negative'
                    ? 'bg-rose-950 text-rose-400 border border-rose-700'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {eventResult.category}
              </span>
            </div>
            <h4 className="font-bold text-slate-100 text-base">{eventResult.name}</h4>
            <p className="text-xs text-slate-300">{eventResult.description}</p>
          </div>
        )}

        {/* Action Results List */}
        <div className="flex flex-col gap-2">
          <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400">
            Survivor Actions
          </h3>
          <div className="flex flex-col gap-2">
            {actionResults.map((result, idx) => (
              <div
                key={`${result.playerId}-${idx}`}
                className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  {result.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold font-mono text-amber-400 mr-2">
                      [{result.playerId}]
                    </span>
                    <span className="text-slate-200">{result.message}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Casualties and Revivals */}
        {(deaths.length > 0 || downRecoveries.length > 0) && (
          <div className="flex flex-col gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            {deaths.length > 0 && (
              <div className="flex items-center gap-2 text-rose-400 font-semibold">
                <AlertCircle className="w-4 h-4" />
                <span>Casualties Reported: {deaths.join(', ')} succumbed to the island.</span>
              </div>
            )}
            {downRecoveries.length > 0 && (
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Medical Revival: {downRecoveries.join(', ')} recovered from DOWN state!</span>
              </div>
            )}
          </div>
        )}

        {/* Net Resource Deltas */}
        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Net Resource Change:</span>
          <div className="flex items-center gap-3 font-mono">
            <span className={resourceDeltas.food >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              Food: {resourceDeltas.food >= 0 ? `+${resourceDeltas.food}` : resourceDeltas.food}
            </span>
            <span className={resourceDeltas.water >= 0 ? 'text-sky-400' : 'text-rose-400'}>
              Water: {resourceDeltas.water >= 0 ? `+${resourceDeltas.water}` : resourceDeltas.water}
            </span>
            <span className={resourceDeltas.wood >= 0 ? 'text-amber-500' : 'text-rose-400'}>
              Wood: {resourceDeltas.wood >= 0 ? `+${resourceDeltas.wood}` : resourceDeltas.wood}
            </span>
            <span className={resourceDeltas.medicine >= 0 ? 'text-emerald-300' : 'text-rose-400'}>
              Med: {resourceDeltas.medicine >= 0 ? `+${resourceDeltas.medicine}` : resourceDeltas.medicine}
            </span>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onDismiss}
          className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Continue Expedition</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
