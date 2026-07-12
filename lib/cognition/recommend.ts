import type { PrioritisedInsight, Recommendation } from './types';

/**
 * Stage 4 — Recommend (Asset 013A / Product Principle 3, "One Screen. One
 * Decision."). Business Partner surfaces exactly one recommendation, never
 * a ranked list — clarity over information density.
 *
 * Supporting evidence is not limited to the single winning signal: any
 * other prioritised insight concerning the same known person is included,
 * because "why this matters" is stronger when the owner can see the full
 * picture of that relationship (e.g. an overdue email *and* an upcoming
 * meeting with the same customer), not just the one signal that happened
 * to score highest.
 */
export function recommend(prioritised: PrioritisedInsight[]): Recommendation | null {
  if (prioritised.length === 0) {
    return null;
  }

  const [winner, ...rest] = prioritised;
  const winningPersonName = winner.insight.relatedPersonName;

  const relatedSignalIds = winningPersonName
    ? rest
        .filter((candidate) => candidate.insight.relatedPersonName === winningPersonName)
        .map((candidate) => candidate.insight.signal.id)
    : [];

  const supportingSignalIds = [winner.insight.signal.id, ...relatedSignalIds];

  return {
    executiveSummary: winner.insight.summary,
    reasoning: winner.reasoning,
    recommendedAction: winner.recommendedAction,
    confidence: winner.dimensions.confidence,
    supportingSignalIds,
    generatedAt: new Date(),
  };
}
