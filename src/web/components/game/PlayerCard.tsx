import {
  Activity,
  Battery,
  Bot,
  Compass,
  Crosshair,
  Droplets,
  Hammer,
  Heart,
  Pill,
  Shield,
  User,
  Utensils,
} from 'lucide-react';
import React from 'react';
import { DEFAULT_BALANCE_CONFIG } from '../../../engine/config/balance.js';
import { getCondition, isPlayerAbleToAct } from '../../../engine/rules/condition.js';
import type {
  ActionType,
  GameState,
  PlayerAction,
  PlayerId,
  PlayerStatus,
  Trait,
} from '../../../engine/types.js';
import type { ControllerType } from '../../hooks/use-game-session.js';

interface PlayerCardProps {
  readonly player: PlayerStatus;
  readonly gameState: GameState;
  readonly controller: ControllerType;
  readonly selectedAction?: PlayerAction | undefined;
  readonly onSelectAction: (action: PlayerAction) => void;
}

const TRAIT_CONFIG: Record<
  Trait,
  { label: string; icon: React.FC<{ className?: string }>; color: string; perk: string }
> = {
  Hunter: {
    label: 'Hunter',
    icon: Crosshair,
    color: 'text-amber-400 bg-amber-950/40 border-amber-700/50',
    perk: '+2 Food on Hunt, 1.25x food demand',
  },
  Medic: {
    label: 'Medic',
    icon: Pill,
    color: 'text-emerald-400 bg-emerald-950/40 border-emerald-700/50',
    perk: '+20 HP bonus on Heal action',
  },
  Builder: {
    label: 'Builder',
    icon: Hammer,
    color: 'text-amber-600 bg-amber-950/40 border-amber-800/50',
    perk: '+2 Wood on Gather, 3 Wood build cost (vs 5)',
  },
  Scout: {
    label: 'Scout',
    icon: Compass,
    color: 'text-sky-400 bg-sky-950/40 border-sky-700/50',
    perk: '50% hazard injury reduction on Explore',
  },
};

const ALL_PLAYER_IDS: readonly PlayerId[] = ['P1', 'P2', 'P3', 'P4'] as const;

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  gameState,
  controller,
  selectedAction,
  onSelectAction,
}) => {
  const { hp, maxHp, energy, maxEnergy, hunger, thirst, downDays, trait } = player;
  const condition = getCondition(player);
  const isAble = isPlayerAbleToAct(player);
  const isHuman = controller === 'human';

  const traitMeta = TRAIT_CONFIG[trait];
  const TraitIcon = traitMeta.icon;

  const hpPercent = Math.min(100, Math.max(0, (hp / maxHp) * 100));
  const energyPercent = Math.min(100, Math.max(0, (energy / maxEnergy) * 100));

  // Condition Badge Config
  const conditionBadge = {
    Healthy: { label: 'Healthy', color: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60' },
    Injured: { label: 'Injured', color: 'bg-amber-950/60 text-amber-400 border-amber-800/60' },
    DOWN: {
      label: `DOWN (Day ${downDays + 1}/${DEFAULT_BALANCE_CONFIG.player.downMaxDays})`,
      color: 'bg-rose-950/80 text-rose-300 border-rose-600 animate-pulse font-bold',
    },
    Dead: { label: 'DEAD (Ghost)', color: 'bg-slate-900 text-slate-500 border-slate-700 font-bold' },
  }[condition];

  // Action validation
  const canAfford = (type: ActionType): { allowed: boolean; reason?: string } => {
    if (!isAble) return { allowed: false, reason: `Player is ${condition}` };

    switch (type) {
      case 'Hunt':
        return energy >= 25 ? { allowed: true } : { allowed: false, reason: 'Requires 25 Energy' };
      case 'FindWater':
        return energy >= 20 ? { allowed: true } : { allowed: false, reason: 'Requires 20 Energy' };
      case 'GatherWood':
        return energy >= 20 ? { allowed: true } : { allowed: false, reason: 'Requires 20 Energy' };
      case 'Explore':
        return energy >= 30 ? { allowed: true } : { allowed: false, reason: 'Requires 30 Energy' };
      case 'Rest':
        return { allowed: true };
      case 'Heal':
        if (energy < 20) return { allowed: false, reason: 'Requires 20 Energy' };
        if (gameState.resources.medicine < 1) return { allowed: false, reason: 'No Medicine' };
        return { allowed: true };
      case 'BuildSignal': {
        if (gameState.weather === 'Storm') return { allowed: false, reason: 'Storm blocks builds' };
        if (energy < 30) return { allowed: false, reason: 'Requires 30 Energy' };
        const woodCost = trait === 'Builder' ? 3 : 5;
        if (gameState.resources.wood < woodCost) return { allowed: false, reason: `Requires ${woodCost} Wood` };
        return { allowed: true };
      }
    }
  };

  const livingTargets = ALL_PLAYER_IDS.map((id) => gameState.players[id]).filter(
    (p) => getCondition(p) !== 'Dead',
  );

  return (
    <div
      className={`flex flex-col justify-between p-4 rounded-xl border transition-all shadow-lg ${
        condition === 'Dead'
          ? 'bg-slate-950/60 border-slate-900 opacity-60'
          : condition === 'DOWN'
          ? 'bg-rose-950/20 border-rose-800/80 shadow-rose-950/40'
          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Header Info */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-500 font-bold">{player.id}</span>
              <h3 className="font-bold text-slate-100 text-base">{player.name}</h3>
            </div>
            {/* Trait Badge */}
            <div
              className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[11px] font-medium border ${traitMeta.color}`}
              title={traitMeta.perk}
            >
              <TraitIcon className="w-3.5 h-3.5" />
              <span>{traitMeta.label}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className={`px-2 py-0.5 rounded text-[11px] border font-medium ${conditionBadge.color}`}>
              {conditionBadge.label}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              {isHuman ? (
                <>
                  <User className="w-3 h-3 text-amber-400" />
                  <span>Human</span>
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-sky-400" />
                  <span>{controller}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Meters (HP, Energy, Hunger, Thirst) */}
        <div className="flex flex-col gap-2 pt-1">
          {/* HP Bar */}
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between text-xs font-medium">
              <span className="flex items-center gap-1 text-slate-400">
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> HP
              </span>
              <span className="font-mono text-slate-200">
                {hp} / {maxHp}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-300 ${
                  hp > 60 ? 'bg-emerald-500' : hp > 20 ? 'bg-amber-500' : 'bg-rose-600 animate-pulse'
                }`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          {/* Energy Bar */}
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between text-xs font-medium">
              <span className="flex items-center gap-1 text-slate-400">
                <Battery className="w-3.5 h-3.5 text-amber-400" /> Energy
              </span>
              <span className="font-mono text-slate-200">
                {energy} / {maxEnergy}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-amber-400 transition-all duration-300"
                style={{ width: `${energyPercent}%` }}
              />
            </div>
          </div>

          {/* Hunger & Thirst Indicators */}
          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
            <div className="flex items-center justify-between p-1.5 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="flex items-center gap-1 text-slate-400">
                <Utensils className="w-3 h-3 text-amber-500/80" /> Hunger
              </span>
              <span className={`font-mono font-medium ${hunger >= 60 ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                {hunger}%
              </span>
            </div>

            <div className="flex items-center justify-between p-1.5 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="flex items-center gap-1 text-slate-400">
                <Droplets className="w-3 h-3 text-sky-400/80" /> Thirst
              </span>
              <span className={`font-mono font-medium ${thirst >= 60 ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                {thirst}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Selection Box */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col gap-2">
        <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
          <span>Assigned Action</span>
          {!isAble && <span className="text-rose-400 text-[10px]">Cannot Act</span>}
        </div>

        {isHuman && isAble ? (
          <div className="flex flex-col gap-2">
            <select
              value={selectedAction?.type ?? 'Rest'}
              onChange={(e) => {
                const actionType = e.target.value as ActionType;
                onSelectAction({
                  playerId: player.id,
                  type: actionType,
                  targetPlayerId: actionType === 'Heal' ? (selectedAction?.targetPlayerId ?? player.id) : undefined,
                });
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="Hunt" disabled={!canAfford('Hunt').allowed}>
                Hunt (25 Energy){!canAfford('Hunt').allowed ? ` - ${canAfford('Hunt').reason}` : ''}
              </option>
              <option value="FindWater" disabled={!canAfford('FindWater').allowed}>
                Find Water (20 Energy){!canAfford('FindWater').allowed ? ` - ${canAfford('FindWater').reason}` : ''}
              </option>
              <option value="GatherWood" disabled={!canAfford('GatherWood').allowed}>
                Gather Wood (20 Energy){!canAfford('GatherWood').allowed ? ` - ${canAfford('GatherWood').reason}` : ''}
              </option>
              <option value="Explore" disabled={!canAfford('Explore').allowed}>
                Explore (30 Energy){!canAfford('Explore').allowed ? ` - ${canAfford('Explore').reason}` : ''}
              </option>
              <option value="Rest">Rest (+40 Energy, +10 HP)</option>
              <option value="Heal" disabled={!canAfford('Heal').allowed}>
                Heal (20 Energy, 1 Med){!canAfford('Heal').allowed ? ` - ${canAfford('Heal').reason}` : ''}
              </option>
              <option value="BuildSignal" disabled={!canAfford('BuildSignal').allowed}>
                Build Signal ({trait === 'Builder' ? '3' : '5'} Wood, 30 E)
                {!canAfford('BuildSignal').allowed ? ` - ${canAfford('BuildSignal').reason}` : ''}
              </option>
            </select>

            {/* Target selector if Heal is chosen */}
            {selectedAction?.type === 'Heal' && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 shrink-0">Target:</span>
                <select
                  value={selectedAction.targetPlayerId ?? player.id}
                  onChange={(e) =>
                    onSelectAction({
                      ...selectedAction,
                      targetPlayerId: e.target.value as PlayerId,
                    })
                  }
                  className="w-full bg-slate-950 border border-emerald-700/60 rounded px-2 py-1 text-xs text-emerald-300 font-medium"
                >
                  {livingTargets.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.name} ({target.hp} HP - {getCondition(target)})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ) : (
          <div className="p-2 bg-slate-950/70 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 flex items-center justify-between">
            <span className="font-semibold text-amber-300">{selectedAction?.type ?? 'Rest'}</span>
            {selectedAction?.targetPlayerId && (
              <span className="text-slate-400 text-[11px]">➔ {selectedAction.targetPlayerId}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
