import type { BusinessContext } from '@/lib/signals/provider';
import type { Signal } from '@/lib/signals/types';
import type { InterpretedSignal } from './types';

/**
 * Used when a Signal's (domain, type) has no registered interpreter — e.g.
 * a future Tasks/CRM/Finance/Proposals signal type shipped before its
 * interpreter. Rather than crash or silently drop the signal, it's
 * acknowledged with low confidence and low priority across the board.
 *
 * Constitution Principle 10 / Cognitive Engine "Confidence Model": Business
 * Partner never hides uncertainty. An unrecognised signal should never win
 * the recommendation slot, but it should still be visible in the pipeline
 * rather than silently discarded — this keeps failure modes honest and
 * debuggable instead of quietly wrong.
 */
export function interpretUnknown(signal: Signal, _context: BusinessContext): InterpretedSignal {
  return {
    insight: {
      summary: `A ${signal.domain} signal (${signal.type}) was observed but is not yet understood by the Cognitive Engine.`,
      isKnownRelationship: false,
      relatedGoalDescriptions: [],
    },
    dimensions: {
      businessImpact: 0.2,
      urgency: 0.2,
      strategicImportance: 0.2,
      confidence: 0.3,
      ownerPreference: 0.5,
    },
    reasoning: `No interpreter is registered yet for domain "${signal.domain}" / type "${signal.type}" — this signal is deliberately deprioritised rather than reasoned about incorrectly.`,
    recommendedAction: `Review this ${signal.domain} signal manually.`,
  };
}
