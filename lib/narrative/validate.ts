import { z } from 'zod';
import type { Narrative, NarrativeInput } from './types';

export class NarrativeValidationError extends Error {}

const RawNarrativeSchema = z.object({
  headline: z.string().min(1).max(160),
  whyItMatters: z.string().min(1).max(600),
  actionText: z.string().min(1).max(200).nullable().optional(),
});

/** All standalone numeric tokens in a string, including a trailing "%" if present (e.g. "3", "42%", "3.5"). */
function extractNumbers(text: string): string[] {
  return text.match(/\d+(?:\.\d+)?%?/g) ?? [];
}

/**
 * Multi-word capitalised sequences — candidate full names (e.g. "Jane
 * Cooper"). Deliberately requires two or more consecutive capitalised
 * words: a single capitalised word is indistinguishable from ordinary
 * sentence-initial capitalisation ("Send Jane Cooper a reply") and would
 * make this check noisy to the point of being useless. A fabricated full
 * name is the failure mode worth guarding against here — a rephrased verb
 * at the start of a sentence is not.
 */
function extractProperNounCandidates(text: string): string[] {
  return text.match(/\b[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)+\b/g) ?? [];
}

/**
 * Guards against fabrication (Executive Intelligence Platform, "The LLM
 * must not invent supporting evidence"). This is a heuristic safety net,
 * not a proof of faithfulness — documented explicitly as an accepted v1
 * limitation in DECISIONS.md. It catches the failure modes an LLM is
 * actually prone to (inventing a number, inventing a name) without trying
 * to fully parse natural language equivalence, which is a much larger
 * problem than this increment needs to solve. The raw deterministic
 * evidence remains visible to the owner underneath every narrative
 * (progressive disclosure), which is the structural backstop if a subtle
 * fabrication slips past this check.
 */
function assertNoFabrication(narrative: { headline: string; whyItMatters: string; actionText?: string | null }, input: NarrativeInput): void {
  const knownText = [
    input.executiveSummary,
    input.reasoning,
    input.recommendedAction ?? '',
    `${Math.round(input.confidence * 100)}%`,
    ...input.supportingSignalSummaries,
  ].join(' ');

  const knownNumbers = new Set(extractNumbers(knownText));
  const knownNouns = new Set(extractProperNounCandidates(knownText));

  const generatedText = [narrative.headline, narrative.whyItMatters, narrative.actionText ?? ''].join(' ');

  for (const number of extractNumbers(generatedText)) {
    if (!knownNumbers.has(number)) {
      throw new NarrativeValidationError(`Narrative introduced a number not present in the input: "${number}".`);
    }
  }

  for (const noun of extractProperNounCandidates(generatedText)) {
    if (knownNouns.has(noun)) continue;
    // A candidate that is itself a substring of a known noun (or vice
    // versa) is very likely the same entity phrased differently ("Jane"
    // within "Jane Cooper") rather than a new one.
    const isSubstringOfKnown = [...knownNouns].some((known) => known.includes(noun) || noun.includes(known));
    if (!isSubstringOfKnown) {
      throw new NarrativeValidationError(`Narrative introduced a name/entity not present in the input: "${noun}".`);
    }
  }
}

/**
 * Parses, shape-validates, and fabrication-checks raw provider output
 * against the NarrativeInput it was generated from. Throws
 * NarrativeValidationError on any failure — the caller (generate.ts) is
 * responsible for catching this and falling back to the deterministic
 * output. This function never returns a partially-trusted result.
 */
export function validateNarrative(raw: unknown, input: NarrativeInput): Narrative {
  const parsed = RawNarrativeSchema.safeParse(raw);
  if (!parsed.success) {
    throw new NarrativeValidationError(`Narrative output did not match the expected shape: ${parsed.error.message}`);
  }

  const { headline, whyItMatters, actionText } = parsed.data;

  // The LLM may not introduce an action where the Cognitive Engine gave it
  // none — even if the model (incorrectly) supplied one, it's dropped
  // rather than trusted.
  const safeActionText = input.recommendedAction ? actionText ?? undefined : undefined;

  assertNoFabrication({ headline, whyItMatters, actionText: safeActionText }, input);

  return {
    headline,
    whyItMatters,
    actionText: safeActionText ?? undefined,
    isGenerated: true,
  };
}
