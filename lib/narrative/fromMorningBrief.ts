import type { MorningBriefResult } from '@/lib/cognition/types';
import type { Signal } from '@/lib/signals/types';
import type { NarrativeInput } from './types';

/** Short, human-readable description of a signal — the only form of a signal the Narrative Layer is ever shown, never the raw payload. */
function summariseSignal(signal: Signal): string {
  return `${signal.domain} signal (${signal.type.replaceAll('_', ' ')}) on ${signal.occurredAt.toDateString()}`;
}

/**
 * Narrows a MorningBriefResult to the two tiers the Narrative Layer runs
 * for, and assembles the closed input it's allowed to see. `supportingSignals`
 * should already be resolved via `brief.supportingSignalIds` — this
 * function never fetches anything itself.
 */
export function buildNarrativeInput(
  brief: Extract<MorningBriefResult, { tier: 'confident_recommendation' | 'low_confidence_insight' }>,
  supportingSignals: Signal[]
): NarrativeInput {
  return {
    tier: brief.tier,
    executiveSummary: brief.executiveSummary,
    reasoning: brief.reasoning,
    recommendedAction: brief.tier === 'confident_recommendation' ? brief.recommendedAction : undefined,
    confidence: brief.confidence,
    supportingSignalSummaries: supportingSignals.map(summariseSignal),
  };
}
