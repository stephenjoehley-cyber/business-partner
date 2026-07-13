import { claudeNarrativeProvider } from './providers/claude';
import type { NarrativeProvider } from './provider';
import type { Narrative, NarrativeInput } from './types';
import { validateNarrative } from './validate';

function deterministicFallback(input: NarrativeInput): Narrative {
  return {
    headline: input.executiveSummary,
    whyItMatters: input.reasoning,
    actionText: input.recommendedAction,
    isGenerated: false,
  };
}

/**
 * The Narrative Layer's only public entry point. Turns a deterministic
 * MorningBriefResult's language into executive-quality phrasing when
 * possible, and always degrades gracefully to the Cognitive Engine's own
 * (already human-readable) strings when it isn't — provider unavailable,
 * network failure, timeout, malformed output, or a failed fabrication
 * check all take the same path. The Morning Brief must function perfectly
 * with zero LLM calls; this function is the one place that guarantee is
 * enforced, so callers never need their own try/catch around it.
 */
export async function generateNarrative(
  input: NarrativeInput,
  provider: NarrativeProvider = claudeNarrativeProvider
): Promise<Narrative> {
  try {
    const raw = await provider.generate(input);
    return validateNarrative(raw, input);
  } catch (error) {
    console.error(`[narrative] falling back to deterministic output (provider: ${provider.id}):`, error);
    return deterministicFallback(input);
  }
}
