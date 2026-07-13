import type { BusinessContext } from '@/lib/signals/provider';
import { describeSignalPlainly } from '@/lib/signals/describe';
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
 *
 * The text below reaches the owner verbatim whenever this is the
 * highest-priority Insight (tier `low_confidence_insight`) *and* the
 * Narrative Layer is unavailable — `generate.ts`'s deterministic fallback
 * uses `executiveSummary`/`reasoning` as-is. It must therefore already
 * satisfy the Executive Presence Specification on its own, not rely on an
 * LLM rephrasing to make it presentable. (An earlier version of this
 * function didn't — it read "No interpreter is registered yet for domain
 * X" directly into `reasoning`, which is both a raw identifier and the
 * banned word "interpreter." Fixed here; see DECISIONS.md.)
 */
export function interpretUnknown(signal: Signal, _context: BusinessContext): InterpretedSignal {
  return {
    insight: {
      // describeSignalPlainly covers all six signal domains regardless of
      // interpreter registration status, so even a not-yet-understood
      // signal gets a plain-language description rather than a raw
      // domain/type string.
      summary: describeSignalPlainly(signal),
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
    reasoning: "There isn't enough here yet to form a view — Business Partner hasn't learned to reason about this kind of activity yet.",
    recommendedAction: 'Take a look at this when you have a moment.',
  };
}
