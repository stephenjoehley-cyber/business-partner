import { describe, expect, it } from 'vitest';
import { generateNarrative } from '@/lib/narrative/generate';
import type { NarrativeProvider } from '@/lib/narrative/provider';
import type { NarrativeInput } from '@/lib/narrative/types';

const input: NarrativeInput = {
  tier: 'confident_recommendation',
  executiveSummary: 'An email from Jane Cooper has gone unanswered for 3 days.',
  reasoning: '"Re: quotation" was received 3 days ago and still requires a reply.',
  recommendedAction: 'Reply to Jane Cooper about "Re: quotation".',
  confidence: 0.9,
  supportingSignalSummaries: ['email signal (email awaiting reply overdue) on Sun Jul 12 2026'],
};

function fakeProvider(generate: NarrativeProvider['generate']): NarrativeProvider {
  return { id: 'fake', generate };
}

describe('generateNarrative', () => {
  it('returns the validated LLM narrative when the provider succeeds', async () => {
    const provider = fakeProvider(async () => ({
      headline: 'Jane Cooper is still waiting on a reply after 3 days.',
      whyItMatters: 'This concerns "Re: quotation" and matters because the relationship is at risk.',
      actionText: 'Reply to Jane Cooper about the quotation.',
    }));

    const narrative = await generateNarrative(input, provider);

    expect(narrative.isGenerated).toBe(true);
    expect(narrative.headline).toContain('Jane Cooper');
  });

  it('falls back to the deterministic Cognitive Engine strings when the provider throws (e.g. network failure)', async () => {
    const provider = fakeProvider(async () => {
      throw new Error('network unreachable');
    });

    const narrative = await generateNarrative(input, provider);

    expect(narrative.isGenerated).toBe(false);
    expect(narrative.headline).toBe(input.executiveSummary);
    expect(narrative.whyItMatters).toBe(input.reasoning);
    expect(narrative.actionText).toBe(input.recommendedAction);
  });

  it('falls back to the deterministic strings when the provider returns malformed JSON-shaped output', async () => {
    const provider = fakeProvider(async () => ({ notTheRightShape: true }));

    const narrative = await generateNarrative(input, provider);

    expect(narrative.isGenerated).toBe(false);
    expect(narrative.headline).toBe(input.executiveSummary);
  });

  it('falls back to the deterministic strings when the provider fabricates a fact that fails validation', async () => {
    const provider = fakeProvider(async () => ({
      headline: 'Jane Cooper has been waiting 9 days for a reply.', // input says 3 days
      whyItMatters: input.reasoning,
      actionText: input.recommendedAction,
    }));

    const narrative = await generateNarrative(input, provider);

    expect(narrative.isGenerated).toBe(false);
    expect(narrative.headline).toBe(input.executiveSummary);
  });

  it('never surfaces a recommendedAction in the fallback for a low_confidence_insight input', async () => {
    const lowConfidenceInput: NarrativeInput = {
      ...input,
      tier: 'low_confidence_insight',
      recommendedAction: undefined,
    };
    const provider = fakeProvider(async () => {
      throw new Error('unavailable');
    });

    const narrative = await generateNarrative(lowConfidenceInput, provider);

    expect(narrative.actionText).toBeUndefined();
  });
});
