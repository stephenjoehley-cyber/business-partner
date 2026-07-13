/**
 * Cognitive Engine domain model — Business Partner MVP Blueprint v1.0,
 * Section 7 (Cognitive Engine) / Asset 013A (Observe → Understand →
 * Prioritise → Recommend).
 *
 * Every stage of the pipeline has an explicit, typed output. Nothing skips
 * a stage: Prioritise only ever sees the Insights the Understand stage
 * produced, never a raw Signal directly. This is what keeps the pipeline
 * explainable — every MorningBriefResult can be traced back through the exact
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
  /** Why this scored the way it did — becomes the MorningBriefResult's "why this matters" if this Insight wins. */
  reasoning: string;
  /** The concrete next action this Insight implies — becomes the MorningBriefResult's action if this Insight wins (confident_recommendation tier only). */
  recommendedAction: string;
}

/**
 * Intermediate shape produced by the Understand stage: an Insight plus the
 * scoring dimensions, reasoning, and candidate action an interpreter
 * derived for it — everything Prioritise needs except the composite score,
 * which is Prioritise's own job to compute.
 */
export type UnderstoodSignal = Omit<PrioritisedInsight, 'priorityScore'>;

/**
 * Below this, the Cognitive Engine will not present something it found as
 * a confident recommendation — it will say so honestly instead (Executive
 * Honesty, DECISIONS.md). Chosen so that a fallback-interpreted signal
 * (confidence 0.3) never qualifies, while every registered interpreter's
 * "unknown relationship" floor (0.7) comfortably does — see calendar.ts /
 * email.ts. A number in between exists on purpose: it's easier to defend a
 * clear gap than a threshold sitting flush against real interpreter output.
 */
export const CONFIDENCE_THRESHOLD = 0.6;

export type MorningBriefTier = 'confident_recommendation' | 'low_confidence_insight' | 'all_clear';

/**
 * Stage 4 (Recommend) output — always exactly one of three tiers
 * ("Executive Honesty"). Business Partner never fabricates certainty and
 * never leaves the owner with nothing: it either recommends, honestly
 * flags its own uncertainty while still surfacing the most relevant
 * observation, or reports a genuine all-clear.
 *
 * A discriminated union (rather than nullable fields on one shape) so the
 * Narrative Layer and UI cannot accidentally read a `recommendedAction`
 * that a low-confidence or all-clear brief was never entitled to have.
 */
export type MorningBriefResult =
  | {
      tier: 'confident_recommendation';
      executiveSummary: string;
      reasoning: string;
      recommendedAction: string;
      confidence: number;
      /** Every Signal id that contributed, in order of relevance. Always non-empty — traceability is what makes this tier trustworthy. */
      supportingSignalIds: string[];
      generatedAt: Date;
    }
  | {
      tier: 'low_confidence_insight';
      /** The single most relevant observation, framed informationally — never phrased as a directive, since confidence didn't clear the bar for one. */
      executiveSummary: string;
      reasoning: string;
      confidence: number;
      supportingSignalIds: string[];
      generatedAt: Date;
    }
  | {
      tier: 'all_clear';
      /** Plain statement that nothing currently requires executive attention. "Nothing urgent" is itself useful information — never silence. */
      message: string;
      generatedAt: Date;
    };
