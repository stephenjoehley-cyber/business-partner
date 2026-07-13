import type { NarrativeableTier } from './types';

/**
 * The four confidence registers, verbatim from the Editorial Style Guide
 * §5 ("Confidence Language System"). Fixed set — a fifth register is
 * explicitly disallowed by that document ("never introduce a fifth
 * register"), so this is a closed union, not an open string.
 */
export type ConfidenceRegister = 'confident_now' | 'confident_soon' | 'cautious' | 'insufficient_evidence';

/**
 * Splits the `confident_recommendation` tier into "confident_now" (upper
 * range) vs "confident_soon" (lower range) — both are still a real
 * recommendation at the type level, the register only changes how much
 * urgency the phrasing carries. Comfortably separates the two real
 * confidence bands the registered interpreters actually produce: known
 * relationships (0.85–0.9) land above this line, unknown-relationship
 * recommendations (0.7–0.75) land below it — see email.ts / calendar.ts.
 */
export const HIGH_CONFIDENCE_THRESHOLD = 0.8;

/**
 * Below this, a `low_confidence_insight` is treated as "insufficient
 * evidence" rather than merely "cautious" — this is what stops the
 * fallback interpreter's floor (0.3, `interpretUnknown`) from being
 * phrased as a soft-but-real observation it never earned. Sits just
 * above that floor and comfortably below the confident_recommendation
 * threshold (0.6), so it only ever affects the specific case the
 * Editorial Style Guide calls out: "the fallback interpreter's floor."
 */
export const INSUFFICIENT_EVIDENCE_THRESHOLD = 0.35;

/**
 * The single, deterministic mapping from what the Cognitive Engine already
 * decided (tier + confidence) to the register the Narrative Layer and the
 * UI are both allowed to speak in. This is a Cognitive Engine-shaped
 * decision — not a Narrative Layer judgement call — so it lives in exactly
 * one place and both `fromMorningBrief.ts` (LLM input) and
 * `MorningBriefCard` (deterministic UI fallback / badge) call this same
 * function rather than each inferring a register independently. Two
 * callers deciding "how confident does this sound" differently would be a
 * Narrative Fidelity violation in the making.
 */
export function confidenceRegisterFor(tier: NarrativeableTier, confidence: number): ConfidenceRegister {
  if (tier === 'confident_recommendation') {
    return confidence >= HIGH_CONFIDENCE_THRESHOLD ? 'confident_now' : 'confident_soon';
  }
  return confidence <= INSUFFICIENT_EVIDENCE_THRESHOLD ? 'insufficient_evidence' : 'cautious';
}

/**
 * Deterministic, non-LLM label for each register — this is what the UI
 * shows even with zero LLM calls (DECISIONS.md, "The Morning Brief must
 * work perfectly with zero LLM calls"). Drawn directly from the Editorial
 * Style Guide §5's approved phrases. Never a percentage.
 */
export function confidenceRegisterLabel(register: ConfidenceRegister): string {
  switch (register) {
    case 'confident_now':
      return 'Worth acting on today';
    case 'confident_soon':
      return 'Worth your attention';
    case 'cautious':
      return "I'm not fully confident yet";
    case 'insufficient_evidence':
      return "Not enough here yet to form a view";
  }
}
