export type PlayerId = 'P1' | 'P2' | 'P3' | 'P4';

export type PlayerCondition = 'Healthy' | 'Injured' | 'DOWN' | 'Dead';

export type Trait = 'Hunter' | 'Medic' | 'Builder' | 'Scout';

export interface PlayerStatus {
  readonly id: PlayerId;
  readonly name: string;
  readonly trait: Trait;
  readonly hp: number;
  readonly maxHp: number;
  readonly energy: number;
  readonly maxEnergy: number;
  readonly hunger: number;
  readonly thirst: number;
  readonly downDays: number;
}

export interface ResourcePool {
  readonly food: number;
  readonly water: number;
  readonly wood: number;
  readonly medicine: number;
}

export type WeatherType = 'Clear' | 'Rain' | 'Storm';

export interface SignalState {
  readonly progress: number;
  readonly maxProgress: number;
  readonly rescuePending: boolean;
}

export type GamePhase =
  | 'normal'
  | 'emergency'
  | 'rescue_pending'
  | 'ended';

export type ActionType =
  | 'Hunt'
  | 'FindWater'
  | 'GatherWood'
  | 'Explore'
  | 'Rest'
  | 'Heal'
  | 'BuildSignal';

export interface PlayerAction {
  readonly playerId: PlayerId;
  readonly type: ActionType;
  readonly targetPlayerId?: PlayerId | undefined;
}

export type ActionMap = Readonly<Record<PlayerId, PlayerAction>>;

export type RNGStreamKey =
  | 'init'
  | 'action'
  | 'weather'
  | 'event'
  | 'injury'
  | 'explore';

export interface CrisisState {
  readonly foodCrisis: boolean;
  readonly waterCrisis: boolean;
  readonly hpCrisis: boolean;
}

export interface GameState {
  readonly day: number;
  readonly phase: GamePhase;
  readonly seed: number;
  readonly players: Readonly<Record<PlayerId, PlayerStatus>>;
  readonly resources: Readonly<ResourcePool>;
  readonly weather: WeatherType;
  readonly signal: Readonly<SignalState>;
  readonly rngState: Readonly<Record<RNGStreamKey, number>>;
  readonly crisis: Readonly<CrisisState>;
  readonly ghostInterventionAvailable: boolean;
  readonly winner?: boolean | undefined;
  readonly endReason?: string | undefined;
}
