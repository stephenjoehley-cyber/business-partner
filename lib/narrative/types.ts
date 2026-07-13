/**
 * Narrative Layer domain model — Increment 4.
 *
 * Architectural principle (DECISIONS.md): "The Cognitive Engine decides.
 * The LLM communicates." Everything upstream of this package (observe,
 * understand, prioritise, recommend) is deterministic and is where every
 * fact, number, priority, and confidence value is decided. This package's
 * only job is turning an already-decided MorningBriefResult into
 * executive-quality language. It has no access to Business Memory, no
 * access to raw Signals, and no ability to add a fact that isn't already
 * in its input — it is handed a closed set of strings and numbers and may
 * only rephrase them.
 */

import type { ConfidenceRegister } from './confidenceRegister';

/**
 * The Narrative Layer only ever runs for the two tiers that have language
 * worth improving. all_clear's message is already short and calm — running
 * it through an LLM would add latency and risk for no communication gain.
 */
export type NarrativeableTier = 'confident_recommendation' | 'low_confidence_insight';

/**
 * Closed input to the Narrative Layer. Every field the LLM is allowed to
 * know about — nothing else. `recommendedAction` is only present for the
 * confident_recommendation tier; its absence for low_confidence_insight is
 * what stops the LLM from inventing a directive the Cognitive Engine never
 * made.
 */
export interface NarrativeInput {
  tier: NarrativeableTier;
  executiveSummary: string;
  reasoning: string;
  recommendedAction?: string;
  /**
   * Kept for observability/logging and as the input to
   * `confidenceRegisterFor` — never handed to the model as a number to
   * phrase (v1 did this; v2 doesn't). The Editorial Style Guide is explicit
   * that a percentage must never be the primary way confidence is
   * communicated, so the only confidence information
   * recommendation-narrative.v2 gives the model is `confidenceRegister`
   * below.
   */
  confidence: number;
  /**
   * The Cognitive Engine-derived register (see `confidenceRegister.ts`)
   * the model is allowed to phrase within — never allowed to choose or
   * change. "tier in, register out" (Editorial Style Guide §8): which
   * register applies is decided once, deterministically, before the LLM
   * ever sees this input.
   */
  confidenceRegister: ConfidenceRegister;
  /** Short, human-readable descriptions of each supporting signal (e.g. "an email from Jane Cooper, unanswered for 3 days") — already-deterministic, plain-language text (see `lib/signals/describe.ts`), never a raw domain/type or payload. */
  supportingSignalSummaries: string[];
}

/**
 * The Narrative Layer's only allowed output shape. Every field is a
 * rephrasing of something already present in the matching NarrativeInput —
 * never a new fact, number, or entity.
 */
export interface Narrative {
  /** Rephrasing of executiveSummary. Short — one sentence, executive-brief register. */
  headline: string;
  /** Rephrasing of reasoning. One short paragraph explaining why this matters, grounded only in the supplied evidence. */
  whyItMatters: string;
  /** Rephrasing of recommendedAction. Present if and only if the input carried one. */
  actionText?: string;
  /** True when this came from the LLM; false when the deterministic fallback was used (provider unavailable, timed out, or failed validation). Never shown to the owner — model selection is invisible (Executive Intelligence Platform, "Model Selection") — but useful for our own observability/logs. */
  isGenerated: boolean;
}
