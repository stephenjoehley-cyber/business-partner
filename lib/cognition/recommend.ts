import { CONFIDENCE_THRESHOLD } from './types';
import type { MorningBriefResult, PrioritisedInsight } from './types';

/**
 * Stage 4 — Recommend (Asset 013A / Product Principle 3, "One Screen. One
 * Decision."). Business Partner surfaces exactly one thing, never a ranked
 * list — clarity over information density.
 *
 * This always returns a MorningBriefResult — never null. "Nothing to
 * reason over" and "reasoned but not confident enough to direct" are both
 * honest, presentable outcomes (Executive Honesty), not the absence of
 * one. Three tiers, in order of how much the Cognitive Engine is willing
 * to assert:
 *
 *   confident_recommendation — winning insight's confidence >= threshold.
 *     Presented as a directive: what to do and why.
 *   low_confidence_insight    — there's a highest-priority insight, but the
 *     Engine isn't confident enough to direct action from it. Presented
 *     informationally, never as a recommendation.
 *   all_clear                 — no insights at all (Prioritise received
 *     nothing, which only happens when Observe found nothing to reason
 *     over).
 */
export function recommend(prioritised: PrioritisedInsight[]): MorningBriefResult {
  const generatedAt = new Date();

  if (prioritised.length === 0) {
    return {
      tier: 'all_clear',
      message: 'No signals currently require executive attention.',
      generatedAt,
    };
  }

  const [winner, ...rest] = prioritised;
  const winningPersonName = winner.insight.relatedPersonName;

  // Supporting evidence is not limited to the single winning signal: any
  // other prioritised insight concerning the same known person is
  // included, because "why this matters" is stronger when the owner can
  // see the full picture of that relationship — see DECISIONS.md.
  const relatedSignalIds = winningPersonName
    ? rest
        .filter((candidate) => candidate.insight.relatedPersonName === winningPersonName)
        .map((candidate) => candidate.insight.signal.id)
    : [];

  const supportingSignalIds = [winner.insight.signal.id, ...relatedSignalIds];
  const confidence = winner.dimensions.confidence;

  if (confidence >= CONFIDENCE_THRESHOLD) {
    return {
      tier: 'confident_recommendation',
      executiveSummary: winner.insight.summary,
      reasoning: winner.reasoning,
      recommendedAction: winner.recommendedAction,
      confidence,
      supportingSignalIds,
      generatedAt,
    };
  }

  return {
    tier: 'low_confidence_insight',
    executiveSummary: winner.insight.summary,
    reasoning: winner.reasoning,
    confidence,
    supportingSignalIds,
    generatedAt,
  };
}
