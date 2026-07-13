import { describe, expect, it } from 'vitest';
import { buildNarrativeInput } from '@/lib/narrative/fromMorningBrief';
import type { MorningBriefResult } from '@/lib/cognition/types';
import type { EmailSignalPayload, Signal } from '@/lib/signals/types';

function makeSignal(id: string): Signal<EmailSignalPayload> {
  return {
    id,
    businessId: 'biz-1',
    domain: 'email',
    type: 'email_awaiting_reply_overdue',
    occurredAt: new Date('2026-07-12T00:00:00.000Z'),
    relatedEntities: {},
    payload: {
      subject: 'Re: quotation',
      fromName: 'Jane Cooper',
      preview: 'Just checking in on this...',
      requiresReply: true,
      daysSinceReceived: 3,
    },
    sourceProviderId: 'seeded-email',
    externalRef: `ref-${id}`,
    confidence: 1.0,
    createdAt: new Date('2026-07-12T00:00:00.000Z'),
  };
}

describe('buildNarrativeInput', () => {
  it('carries recommendedAction through for a confident_recommendation', () => {
    const brief: Extract<MorningBriefResult, { tier: 'confident_recommendation' }> = {
      tier: 'confident_recommendation',
      executiveSummary: 'Summary',
      reasoning: 'Reasoning',
      recommendedAction: 'Do the thing',
      confidence: 0.9,
      supportingSignalIds: ['sig-1'],
      generatedAt: new Date(),
    };

    const input = buildNarrativeInput(brief, [makeSignal('sig-1')]);

    expect(input.recommendedAction).toBe('Do the thing');
    expect(input.supportingSignalSummaries).toHaveLength(1);
    // Plain language, not a raw domain/type — Editorial Style Guide §4.
    expect(input.supportingSignalSummaries[0]).toContain('Jane Cooper');
    expect(input.supportingSignalSummaries[0]).not.toContain('email_awaiting_reply');
    expect(input.confidenceRegister).toBe('confident_now');
  });

  it('never includes recommendedAction for a low_confidence_insight, even if one existed on a differently-typed object', () => {
    const brief: Extract<MorningBriefResult, { tier: 'low_confidence_insight' }> = {
      tier: 'low_confidence_insight',
      executiveSummary: 'Summary',
      reasoning: 'Reasoning',
      confidence: 0.4,
      supportingSignalIds: ['sig-1'],
      generatedAt: new Date(),
    };

    const input = buildNarrativeInput(brief, [makeSignal('sig-1')]);

    expect(input.recommendedAction).toBeUndefined();
    expect(input.confidenceRegister).toBe('cautious');
  });

  it('derives an insufficient_evidence register for a low_confidence_insight at the fallback interpreter floor', () => {
    const brief: Extract<MorningBriefResult, { tier: 'low_confidence_insight' }> = {
      tier: 'low_confidence_insight',
      executiveSummary: 'Summary',
      reasoning: 'Reasoning',
      confidence: 0.3,
      supportingSignalIds: [],
      generatedAt: new Date(),
    };

    const input = buildNarrativeInput(brief, []);

    expect(input.confidenceRegister).toBe('insufficient_evidence');
  });
});
