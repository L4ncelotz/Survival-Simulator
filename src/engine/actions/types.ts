import type { ActionType, PlayerId } from '../types.js';

export interface ActionResult {
  readonly playerId: PlayerId;
  readonly actionType: ActionType;
  readonly success: boolean;
  readonly energySpent: number;
  readonly foodGained: number;
  readonly waterGained: number;
  readonly woodGained: number;
  readonly medicineGained: number;
  readonly woodSpent: number;
  readonly medicineSpent: number;
  readonly hpRestored: number;
  readonly hpDamage: number;
  readonly signalGained: number;
  readonly targetPlayerId?: PlayerId | undefined;
  readonly message: string;
}
