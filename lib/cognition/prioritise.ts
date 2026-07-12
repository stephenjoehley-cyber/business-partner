import type { PrioritisedInsight, UnderstoodSignal } from './types';

/**
 * Stage 3 — Prioritise (Asset 013A).
 *
 * "Business Partner evaluates each observation against five dimensions:
 * business impact, urgency, strategic importance, confidence, owner
 * preference. These create a Priority Score."
 *
 * Weights (documented, not tuned by a model, so the score is always
 * explainable to the owner):
 *   businessImpact       0.30 — the dimension most directly tied to money/relationships
 *   urgency              0.30 — time-sensitivity matters just as much in a daily brief
 *   strategicImportance  0.20 — connects the recommendation to stated goals
 *   confidence           0.10 — a highly confident but minor signal shouldn't dominate
 *   ownerPreference       0.10 — currently neutral for every insight (no preference model
 *                                exists yet — see DECISIONS.md); kept as its own weighted
 *                                term so wiring in real preference learning later is a
 *                                one-line change, not a re-architecture.
 *
 * These weights are a starting point, not a claim of optimality — they are
 * intentionally simple enough that a disagreement with the Cognitive
 * Engine's ranking can be traced back to one of five named numbers instead
 * of an opaque model output.
 */
const WEIGHTS = {
  businessImpact: 0.3,
  urgency: 0.3,
  strategicImportance: 0.2,
  confidence: 0.1,
  ownerPreference: 0.1,
} as const;

function scoreOf(understood: UnderstoodSignal): number {
  const d = understood.dimensions;
  return (
    d.businessImpact * WEIGHTS.businessImpact +
    d.urgency * WEIGHTS.urgency +
    d.strategicImportance * WEIGHTS.strategicImportance +
    d.confidence * WEIGHTS.confidence +
    d.ownerPreference * WEIGHTS.ownerPreference
  );
}

/** Ranks understood signals highest-priority first. Ties break toward the earlier item (stable sort) rather than arbitrarily. */
export function prioritise(understood: UnderstoodSignal[]): PrioritisedInsight[] {
  return understood
    .map((u) => ({ ...u, priorityScore: scoreOf(u) }))
    .sort((a, b) => b.priorityScore - a.priorityScore);
}
