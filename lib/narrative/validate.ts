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
 *
 * Confidence is deliberately *not* added to `knownNumbers` here (v1 did,
 * via a computed percentage) — recommendation-narrative.v2 never hands the
 * model a confidence percentage to echo, so any percentage the model
 * produces is a violation regardless of accuracy; see
 * `assertNoBannedLanguage` below.
 */
function assertNoFabrication(narrative: { headline: string; whyItMatters: string; actionText?: string | null }, input: NarrativeInput): void {
  const knownText = [
    input.executiveSummary,
    input.reasoning,
    input.recommendedAction ?? '',
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
 * Words and patterns the Editorial Style Guide §4 ("Banned Language")
 * names explicitly as never appropriate in owner-facing copy. This is the
 * enforcement mechanism that section calls for: "so they cannot recur by
 * accident." Matched as whole words, case-insensitively — substring
 * matching would false-positive on ordinary prose (e.g. "processing a
 * refund" contains "process" as a substring but not as the banned verb
 * form in isolation; whole-word matching still catches "processed",
 * "processing" etc. since the boundary is on the bare stem where it
 * matters most: this list intentionally uses the exact stems the guide
 * names).
 */
const BANNED_TERMS = [
  // Programming and system terminology (§4)
  'signal',
  'payload',
  'pipeline',
  'endpoint',
  'session',
  'cache',
  'sync',
  'enum',
  'schema',
  'provider',
  'interpreter',
  'orchestrator',
  // Debugging and error language (§4)
  'error',
  'exception',
  'undefined',
  'timeout',
  'retrying',
  // Language of a system reporting on itself (§3, "Avoided verbs")
  'analyse',
  'analyze',
  'detect',
  'calculate',
  'trigger',
  'compute',
  // Marketing clichés (§4)
  'game-changing',
  'unlock',
  'empower',
  'seamless',
  'revolutionize',
  'revolutionise',
  'next-level',
  'supercharge',
  // AI self-reference (§4)
  'as an ai',
  'our algorithm',
  'our ai',
] as const;

/** The register keys and tier names themselves must never leak into owner-facing copy — the register is a mechanism the owner should never see named (Editorial Style Guide §8, "which register applies is a Cognitive Engine decision"). */
const INTERNAL_ENUM_LEAKS = [
  'confident_recommendation',
  'low_confidence_insight',
  'all_clear',
  'confident_now',
  'confident_soon',
  'cautious',
  'insufficient_evidence',
] as const;

function containsWholeWord(haystack: string, needle: string): boolean {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(haystack);
}

/**
 * Operationalizes Editorial Style Guide §4 (banned vocabulary) and §5
 * (confidence must never be stated as a percentage or raw number) as a
 * hard validation failure rather than a style guideline the model might
 * drift from. Runs alongside `assertNoFabrication` — a narrative can be
 * perfectly faithful to the facts and still fail this check if it slips
 * into engineering register or states a number for confidence.
 */
function assertNoBannedLanguage(narrative: { headline: string; whyItMatters: string; actionText?: string | null }): void {
  const generatedText = [narrative.headline, narrative.whyItMatters, narrative.actionText ?? ''].join(' ');

  for (const term of BANNED_TERMS) {
    if (containsWholeWord(generatedText, term)) {
      throw new NarrativeValidationError(`Narrative used banned engineering/marketing language: "${term}".`);
    }
  }

  for (const leak of INTERNAL_ENUM_LEAKS) {
    if (generatedText.includes(leak)) {
      throw new NarrativeValidationError(`Narrative leaked an internal tier/register value: "${leak}".`);
    }
  }

  // Confidence must never be stated as a percentage — Editorial Style
  // Guide §5: "Percentages ask the owner to do arithmetic on trust."
  // Unlike other numbers, this is banned outright regardless of accuracy;
  // recommendation-narrative.v2 never gives the model a percentage to
  // echo, so any percentage found here is always a violation.
  if (/\d+(?:\.\d+)?%/.test(generatedText)) {
    throw new NarrativeValidationError('Narrative stated confidence as a percentage — must speak only within the given confidence register.');
  }
}

/**
 * Parses, shape-validates, and fabrication/register-checks raw provider
 * output against the NarrativeInput it was generated from. Throws
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

  assertNoBannedLanguage({ headline, whyItMatters, actionText: safeActionText });
  assertNoFabrication({ headline, whyItMatters, actionText: safeActionText }, input);

  return {
    headline,
    whyItMatters,
    actionText: safeActionText ?? undefined,
    isGenerated: true,
  };
}
