import type { BusinessContext } from '@/lib/signals/provider';
import type { Signal } from '@/lib/signals/types';
import type { Insight, PriorityDimensions } from '../types';

/**
 * A SignalInterpreter owns the domain-specific knowledge needed to turn one
 * Signal into an Insight (Understand) plus a scored, reasoned candidate
 * (Prioritise + Recommend draft).
 *
 * Keeping this as one small interpreter per (domain, type) — rather than a
 * single growing function — is the same seam pattern as `SignalProvider`
 * (Increment 2, Blueprint §6): adding Tasks/CRM/Finance/Proposals signal
 * types in a future increment means registering new interpreters, never
 * touching observe.ts, understand.ts, prioritise.ts, or recommend.ts.
 */
export interface SignalInterpreter {
  readonly domain: string;
  readonly type: string;
  interpret(signal: Signal, context: BusinessContext): InterpretedSignal;
}

export interface InterpretedSignal {
  insight: Omit<Insight, 'signal'>;
  dimensions: PriorityDimensions;
  reasoning: string;
  recommendedAction: string;
}
