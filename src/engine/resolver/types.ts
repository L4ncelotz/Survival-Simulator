import type { ActionResult } from '../actions/types.js';
import type { EventResult } from '../events/event-types.js';
import type { GameState, PlayerId, ResourcePool, WeatherType } from '../types.js';

export interface DayLog {
  readonly day: number;
  readonly weather: WeatherType;
  readonly actionResults: readonly ActionResult[];
  readonly eventResult?: EventResult | undefined;
  readonly ghostInterventionUsed?: boolean | undefined;
  readonly ghostInterventionMessage?: string | undefined;
  readonly resourceDeltas: Readonly<ResourcePool>;
  readonly deaths: readonly PlayerId[];
  readonly downRecoveries: readonly PlayerId[];
  readonly newlyDownPlayers: readonly PlayerId[];
}

export interface DayResolutionResult {
  readonly nextState: GameState;
  readonly log: DayLog;
}
