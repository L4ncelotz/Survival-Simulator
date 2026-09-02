import { useCallback, useState } from 'react';
import { GreedyBot, PlannerBot, RandomBot, type BotStrategy } from '../../bots/index.js';
import { DEFAULT_BALANCE_CONFIG, type BalanceConfig } from '../../engine/config/balance.js';
import { createGame } from '../../engine/create-game.js';
import type { GhostInterventionRequest } from '../../engine/ghost/ghost-types.js';
import { resolveDay } from '../../engine/resolver/resolve-day.js';
import type { DayLog } from '../../engine/resolver/types.js';
import { isPlayerAbleToAct } from '../../engine/rules/condition.js';
import type {
  ActionMap,
  GameState,
  PlayerAction,
  PlayerId,
} from '../../engine/types.js';

export type ControllerType = 'human' | 'RandomBot' | 'GreedyBot' | 'PlannerBot';

const ALL_PLAYER_IDS: readonly PlayerId[] = ['P1', 'P2', 'P3', 'P4'] as const;

const BOT_MAP: Record<Exclude<ControllerType, 'human'>, BotStrategy> = {
  RandomBot: new RandomBot(),
  GreedyBot: new GreedyBot(),
  PlannerBot: new PlannerBot(),
};

export interface GameSession {
  readonly state: GameState | null;
  readonly history: readonly DayLog[];
  readonly lastLog: DayLog | null;
  readonly controllers: Record<PlayerId, ControllerType>;
  readonly selectedActions: Record<PlayerId, PlayerAction | undefined>;
  readonly ghostIntervention: GhostInterventionRequest | undefined;
  readonly isResolving: boolean;
  readonly currentSeed: string | number;
  readonly startNewGame: (
    seed: string | number,
    newControllers?: Record<PlayerId, ControllerType>,
  ) => void;
  readonly setAction: (playerId: PlayerId, action: PlayerAction) => void;
  readonly setGhostIntervention: (req?: GhostInterventionRequest) => void;
  readonly resolveCurrentDay: () => void;
  readonly restartGame: () => void;
}

export function useGameSession(
  config: BalanceConfig = DEFAULT_BALANCE_CONFIG,
): GameSession {
  const [state, setState] = useState<GameState | null>(null);
  const [history, setHistory] = useState<DayLog[]>([]);
  const [lastLog, setLastLog] = useState<DayLog | null>(null);
  const [controllers, setControllers] = useState<Record<PlayerId, ControllerType>>({
    P1: 'human',
    P2: 'human',
    P3: 'PlannerBot',
    P4: 'PlannerBot',
  });
  const [selectedActions, setSelectedActions] = useState<
    Record<PlayerId, PlayerAction | undefined>
  >({
    P1: undefined,
    P2: undefined,
    P3: undefined,
    P4: undefined,
  });
  const [ghostIntervention, setGhostIntervention] = useState<
    GhostInterventionRequest | undefined
  >(undefined);
  const [isResolving, setIsResolving] = useState(false);
  const [currentSeed, setCurrentSeed] = useState<string | number>('survival-1');

  // Compute bot actions for current state
  const computeBotActions = useCallback(
    (
      currentState: GameState,
      currentControllers: Record<PlayerId, ControllerType>,
    ): Record<PlayerId, PlayerAction | undefined> => {
      const actions: Record<PlayerId, PlayerAction | undefined> = {
        P1: undefined,
        P2: undefined,
        P3: undefined,
        P4: undefined,
      };

      for (const id of ALL_PLAYER_IDS) {
        const ctrl = currentControllers[id];
        if (ctrl !== 'human') {
          const bot = BOT_MAP[ctrl];
          const botDecisions = bot.decideActions(currentState, config);
          if (botDecisions[id]) {
            actions[id] = botDecisions[id];
          }
        } else {
          // Default human fallback action if able
          const player = currentState.players[id];
          if (!isPlayerAbleToAct(player, config)) {
            actions[id] = { playerId: id, type: 'Rest' };
          } else if (player.trait === 'Hunter' && player.energy >= config.actions.hunt.energyCost) {
            actions[id] = { playerId: id, type: 'Hunt' };
          } else if (
            player.trait === 'Builder' &&
            player.energy >= config.actions.gatherWood.energyCost
          ) {
            actions[id] = { playerId: id, type: 'GatherWood' };
          } else if (
            player.trait === 'Scout' &&
            player.energy >= config.actions.explore.energyCost
          ) {
            actions[id] = { playerId: id, type: 'Explore' };
          } else {
            actions[id] = { playerId: id, type: 'Rest' };
          }
        }
      }

      return actions;
    },
    [config],
  );

  const startNewGame = useCallback(
    (seed: string | number, newControllers?: Record<PlayerId, ControllerType>) => {
      const activeControllers = newControllers ?? controllers;
      setControllers(activeControllers);
      setCurrentSeed(seed);

      const initialState = createGame(seed, config);
      setState(initialState);
      setHistory([]);
      setLastLog(null);
      setGhostIntervention(undefined);

      const initialActions = computeBotActions(initialState, activeControllers);
      setSelectedActions(initialActions);
    },
    [controllers, config, computeBotActions],
  );

  const setAction = useCallback((playerId: PlayerId, action: PlayerAction) => {
    setSelectedActions((prev) => ({
      ...prev,
      [playerId]: action,
    }));
  }, []);

  const resolveCurrentDay = useCallback(() => {
    if (!state || state.phase === 'ended' || isResolving) {
      return;
    }

    setIsResolving(true);

    try {
      // Assemble full ActionMap with fallbacks for missing slots
      const fullActionMap: ActionMap = {
        P1: selectedActions.P1 ?? { playerId: 'P1', type: 'Rest' },
        P2: selectedActions.P2 ?? { playerId: 'P2', type: 'Rest' },
        P3: selectedActions.P3 ?? { playerId: 'P3', type: 'Rest' },
        P4: selectedActions.P4 ?? { playerId: 'P4', type: 'Rest' },
      };

      const { nextState, log } = resolveDay(
        state,
        fullActionMap,
        ghostIntervention,
        config,
      );

      setState(nextState);
      setLastLog(log);
      setHistory((prev) => [...prev, log]);
      setGhostIntervention(undefined);

      if (nextState.phase !== 'ended') {
        const nextActions = computeBotActions(nextState, controllers);
        setSelectedActions(nextActions);
      }
    } finally {
      setIsResolving(false);
    }
  }, [state, selectedActions, ghostIntervention, config, isResolving, controllers, computeBotActions]);

  const restartGame = useCallback(() => {
    startNewGame(currentSeed, controllers);
  }, [startNewGame, currentSeed, controllers]);

  return {
    state,
    history,
    lastLog,
    controllers,
    selectedActions,
    ghostIntervention,
    isResolving,
    currentSeed,
    startNewGame,
    setAction,
    setGhostIntervention,
    resolveCurrentDay,
    restartGame,
  };
}
