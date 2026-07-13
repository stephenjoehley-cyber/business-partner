import type { MorningBriefResult } from '@/lib/cognition/types';
import { describeSignalPlainly } from '@/lib/signals/describe';
import type { Signal } from '@/lib/signals/types';
import { confidenceRegisterFor } from './confidenceRegister';
import type { NarrativeInput } from './types';

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
    confidenceRegister: confidenceRegisterFor(brief.tier, brief.confidence),
    supportingSignalSummaries: supportingSignals.map((signal) => describeSignalPlainly(signal)),
  };
}

