import { describe, expect, it } from 'vitest';
import { NarrativeValidationError, validateNarrative } from '@/lib/narrative/validate';
import type { NarrativeInput } from '@/lib/narrative/types';

const baseInput: NarrativeInput = {
  tier: 'confident_recommendation',
  executiveSummary: 'An email from Jane Cooper has gone unanswered for 3 days.',
  reasoning: '"Re: quotation" was received 3 days ago and still requires a reply. Jane Cooper is a known customer.',
  recommendedAction: 'Reply to Jane Cooper about "Re: quotation".',
  confidence: 0.9,
  supportingSignalSummaries: ['email signal (email awaiting reply overdue) on Sun Jul 12 2026'],
};

describe('validateNarrative', () => {
  it('accepts well-formed output that only rephrases the given facts', () => {
    const narrative = validateNarrative(
      {
        headline: 'Jane Cooper is still waiting on a reply after 3 days.',
        whyItMatters: 'This concerns "Re: quotation" and Jane Cooper is an existing customer, so the relationship is at stake.',
        actionText: 'Send Jane Cooper a reply about the quotation.',
      },
      baseInput
    );

    expect(narrative.isGenerated).toBe(true);
    expect(narrative.headline).toContain('Jane Cooper');
    expect(narrative.actionText).toBeDefined();
  });

  it('rejects output that does not match the expected shape', () => {
    expect(() => validateNarrative({ headline: 'Only a headline' }, baseInput)).toThrow(NarrativeValidationError);
  });

  it('drops actionText rather than trusting it when the input carried no recommendedAction', () => {
    const lowConfidenceInput: NarrativeInput = {
      ...baseInput,
      tier: 'low_confidence_insight',
      recommendedAction: undefined,
    };

    const narrative = validateNarrative(
      {
        headline: 'A generic enquiry was received.',
        whyItMatters: 'Not enough context to be confident this needs urgent attention.',
        actionText: 'Reply to Jane Cooper immediately.', // the LLM should not have supplied this
      },
      lowConfidenceInput
    );

    expect(narrative.actionText).toBeUndefined();
  });

  it('rejects a fabricated number not present anywhere in the input', () => {
    expect(() =>
      validateNarrative(
        {
          headline: 'Jane Cooper has been waiting 9 days for a reply.', // input says 3 days, not 9
          whyItMatters: baseInput.reasoning,
          actionText: baseInput.recommendedAction,
        },
        baseInput
      )
    ).toThrow(/number/i);
  });

  it('rejects a fabricated name not present anywhere in the input', () => {
    expect(() =>
      validateNarrative(
        {
          headline: 'Michael Scott is still waiting on a reply.', // never mentioned in the input
          whyItMatters: baseInput.reasoning,
          actionText: baseInput.recommendedAction,
        },
        baseInput
      )
    ).toThrow(/name|entity/i);
  });

  it('does not flag a single capitalised word (e.g. a first name alone) — only multi-word names are checked', () => {
    // By design (see validate.ts): a lone capitalised word is
    // indistinguishable from ordinary sentence-initial capitalisation, so
    // it is never treated as a fabrication candidate.
    const narrative = validateNarrative(
      {
        headline: 'Jane is still waiting on a reply.',
        whyItMatters: baseInput.reasoning,
        actionText: baseInput.recommendedAction,
      },
      baseInput
    );

    expect(narrative.headline).toContain('Jane');
  });
});
