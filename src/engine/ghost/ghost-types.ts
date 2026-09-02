import type { ActionResult } from '../actions/types.js';
import type { EventResult } from '../events/event-types.js';
import type { PlayerId, RNGStreamKey } from '../types.js';

export type GhostTargetRollType = 'action' | 'injury' | 'explore' | 'event';

export interface GhostInterventionRequest {
  readonly requestingPlayerId: PlayerId;
  readonly targetRollType: GhostTargetRollType;
  readonly targetPlayerId?: PlayerId;
}

export interface GhostInterventionResult {
  readonly applied: boolean;
  readonly targetRollType: GhostTargetRollType;
  readonly message: string;
  readonly updatedActionResult?: ActionResult;
  readonly updatedEventResult?: EventResult;
}
