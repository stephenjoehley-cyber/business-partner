import type { Business, Goal, Person } from '@prisma/client';
import type { DraftSignal, SignalDomain } from './types';

/**
 * The context a provider needs to produce plausible, business-specific
 * signals. Seeded providers use this to stay consistent with the business
 * profile; live providers will use the relevant subset (e.g. just enough to
 * map external accounts to People).
 */
export interface BusinessContext {
  business: Business;
  goals: Goal[];
  people: Person[];
}

export interface TimeWindow {
  from: Date;
  to: Date;
}

/**
 * Every Signal Provider — seeded or live — implements exactly this
 * interface. The Registry, Orchestrator, and Cognitive Engine depend only
 * on this contract, never on a concrete provider. Swapping seeded-calendar
 * for google-calendar means writing a new class that satisfies this
 * interface and updating one config row — nothing else changes.
 */
export interface SignalProvider {
  readonly domain: SignalDomain;
  readonly providerId: string;
  fetchSignals(context: BusinessContext, window: TimeWindow): Promise<DraftSignal[]>;
}
