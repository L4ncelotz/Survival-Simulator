import React from 'react';
import type { GameState, PlayerAction, PlayerId } from '../../../engine/types.js';
import type { ControllerType } from '../../hooks/use-game-session.js';
import { PlayerCard } from './PlayerCard.js';

interface PlayerCardGridProps {
  readonly gameState: GameState;
  readonly controllers: Record<PlayerId, ControllerType>;
  readonly selectedActions: Record<PlayerId, PlayerAction | undefined>;
  readonly onSelectAction: (playerId: PlayerId, action: PlayerAction) => void;
}

const ALL_PLAYER_IDS: readonly PlayerId[] = ['P1', 'P2', 'P3', 'P4'] as const;

export const PlayerCardGrid: React.FC<PlayerCardGridProps> = ({
  gameState,
  controllers,
  selectedActions,
  onSelectAction,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 w-full">
      {ALL_PLAYER_IDS.map((id) => {
        const player = gameState.players[id];
        return (
          <PlayerCard
            key={id}
            player={player}
            gameState={gameState}
            controller={controllers[id]}
            selectedAction={selectedActions[id]}
            onSelectAction={(action) => onSelectAction(id, action)}
          />
        );
      })}
    </div>
  );
};
