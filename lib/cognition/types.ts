/**
 * Cognitive Engine domain model — Business Partner MVP Blueprint v1.0,
 * Section 7 (Cognitive Engine) / Asset 013A (Observe → Understand →
 * Prioritise → Recommend).
 *
 * Every stage of the pipeline has an explicit, typed output. Nothing skips
 * a stage: Prioritise only ever sees the Insights the Understand stage
 * produced, never a raw Signal directly. This is what keeps the pipeline
 * explainable — every Recommendation can be traced back through the exact
 * dimensions and reasoning that produced it.
 */

import type { Signal } from '@/lib/signals/types';

/** Stage 1 (Observe) output — signals in the reasoning window, unchanged. */
export type Observation = Signal;

/**
 * Stage 2 (Understand) output: a Signal connected to Business Memory and
 * given plain-language meaning. This is where "a signal" becomes "a thing
 * that means something to this specific business" (Constitution Principle
 * 5 — "Context Is Everything").
 */
export interface Insight {
  signal: Observation;
  /** Plain-language statement of what this signal means, e.g. "An email from Jane Cooper has gone unanswered for 3 days." */
  summary: string;
  /** Name of the person this insight concerns, if the signal links to one on file. */
  relatedPersonName?: string;
  /** Whether the related person is recognised on file vs a generic/unidentified contact. Affects confidence, not priority directly — see prioritise.ts. */
  isKnownRelationship: boolean;
  /** Business goal(s) this insight appears to relate to, matched by keyword against Goal.description. Empty array if no goal matched. */
  relatedGoalDescriptions: string[];
}

export interface PriorityDimensions {
  /** 0–1: how much this affects revenue, delivery, or the customer relationship. */
  businessImpact: number;
  /** 0–1: how time-sensitive this is. */
  urgency: number;
  /** 0–1: how closely this connects to a stated business goal. */
  strategicImportance: number;
  /** 0–1: how much the Cognitive Engine trusts this observation and its own scoring of it. */
  confidence: number;
  /** 0–1: proxy for owner preference. No explicit preference model exists yet in v1 — defaults to neutral (0.5) for every insight. See DECISIONS.md. */
  ownerPreference: number;
}

/** Stage 3 (Prioritise) output: an Insight, scored and ranked. */
export interface PrioritisedInsight {
  insight: Insight;
  dimensions: PriorityDimensions;
  /** Weighted composite of the five dimensions — see prioritise.ts for the exact, documented formula. */
  priorityScore: number;
  /** Why this scored the way it did — becomes the Recommendation's "why this matters" if this Insight wins. */
  reasoning: string;
  /** The concrete next action this Insight implies — becomes the Recommendation's action if this Insight wins. */
  recommendedAction: string;
}

/**
 * Intermediate shape produced by the Understand stage: an Insight plus the
 * scoring dimensions, reasoning, and candidate action an interpreter
 * derived for it — everything Prioritise needs except the composite score,
 * which is Prioritise's own job to compute.
 */
export type UnderstoodSignal = Omit<PrioritisedInsight, 'priorityScore'>;

/** Stage 4 (Recommend) output — the single executive recommendation shown to the owner. */
export interface Recommendation {
  executiveSummary: string;
  reasoning: string;
  recommendedAction: string;
  confidence: number;
  /** Every Signal id that contributed to this recommendation, in order of relevance. Always non-empty — a Recommendation with no supporting signal is not traceable and should not exist. */
  supportingSignalIds: string[];
  generatedAt: Date;
}
