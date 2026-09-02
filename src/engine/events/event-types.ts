import type { PlayerId, ResourcePool } from '../types.js';

export type EventCategory = 'positive' | 'neutral' | 'negative';

export interface EventResult {
  readonly eventId: string;
  readonly name: string;
  readonly description: string;
  readonly category: EventCategory;
  readonly resourceDelta: Readonly<Partial<ResourcePool>>;
  readonly hpDelta: Readonly<Partial<Record<PlayerId, number>>>;
  readonly energyDelta: Readonly<Partial<Record<PlayerId, number>>>;
}

export interface EventDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: EventCategory;
  readonly weight: number;
}
