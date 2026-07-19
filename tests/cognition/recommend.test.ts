import { describe, expect, it } from 'vitest';
import { recommend } from '@/lib/cognition/recommend';
import type { PrioritisedInsight } from '@/lib/cognition/types';
import type { Signal } from '@/lib/signals/types';

function makeSignal(id: string): Signal {
  return {
    id,
    businessId: 'biz-1',
    domain: 'email',
    type: 'email_awaiting_reply',
    occurredAt: new Date('2026-07-12T00:00:00.000Z'),
    relatedEntities: {},
    payload: {},
    sourceProviderId: 'seeded-email',
    externalRef: `ref-${id}`,
    confidence: 1.0,
    createdAt: new Date('2026-07-12T00:00:00.000Z'),
  };
}

function makePrioritised(
  id: string,
  priorityScore: number,
  opts: { relatedPersonName?: string; confidence?: number } = {}
): PrioritisedInsight {
  return {
    insight: {
      signal: makeSignal(id),
      summary: `Summary ${id}`,
      relatedPersonName: opts.relatedPersonName,
      isKnownRelationship: Boolean(opts.relatedPersonName),
      relatedGoalDescriptions: [],
    },
    dimensions: {
      businessImpact: 0.5,
      urgency: 0.5,
      strategicImportance: 0.5,
      confidence: opts.confidence ?? 0.8,
      ownerPreference: 0.5,
    },
    priorityScore,
    reasoning: `Reasoning ${id}`,
    recommendedAction: `Action ${id}`,
  };
}

describe('recommend', () => {
  it('returns an all_clear tier — never null — when there is nothing to reason over', () => {
    const result = recommend([]);
    expect(result.tier).toBe('all_clear');
    if (result.tier === 'all_clear') {
      expect(result.message.length).toBeGreaterThan(0);
    }
    expect(result.generatedAt).toBeInstanceOf(Date);
  });

  it('returns a confident_recommendation when the winning insight clears the confidence threshold', () => {
    const winner = makePrioritised('winner', 0.9, { confidence: 0.9 });
    const loser = makePrioritised('loser', 0.2, { confidence: 0.9 });

    const result = recommend([winner, loser]);

    expect(result.tier).toBe('confident_recommendation');
    if (result.tier === 'confident_recommendation') {
      expect(result.executiveSummary).toBe('Summary winner');
      expect(result.recommendedAction).toBe('Action winner');
      expect(result.reasoning).toBe('Reasoning winner');
      expect(result.confidence).toBe(0.9);
    }
  });

  it('returns a low_confidence_insight — with no recommendedAction field — when the winner is below the confidence threshold', () => {
    const winner = makePrioritised('winner', 0.9, { confidence: 0.4 });

    const result = recommend([winner]);

    expect(result.tier).toBe('low_confidence_insight');
    if (result.tier === 'low_confidence_insight') {
      expect(result.executiveSummary).toBe('Summary winner');
      expect(result.confidence).toBe(0.4);
      expect('recommendedAction' in result).toBe(false);
    }
  });

  it('includes the winning signal plus any other signal about the same known person as supporting evidence', () => {
    const winner = makePrioritised('winner', 0.9, { relatedPersonName: 'Jane Cooper', confidence: 0.9 });
    const relatedContext = makePrioritised('related', 0.5, { relatedPersonName: 'Jane Cooper', confidence: 0.9 });
    const unrelated = makePrioritised('unrelated', 0.4, { relatedPersonName: 'Someone Else', confidence: 0.9 });

    const result = recommend([winner, relatedContext, unrelated]);

    expect(result.tier).toBe('confident_recommendation');
    if (result.tier === 'confident_recommendation') {
      // 'unrelated' now also appears — evidence widening (18/19 July
      // 2026) always includes a couple of other top-priority signals
      // regardless of shared person, not just same-person context.
      expect(result.supportingSignalIds).toEqual(['winner', 'related', 'unrelated']);
    }
  });

  it('includes up to 2 other top-priority signals as supporting evidence when no related person is known, so the owner can see Business Partner is tracking more than just the winning signal — found live, 18/19 July 2026', () => {
    const winner = makePrioritised('winner', 0.9, { confidence: 0.9 });
    const second = makePrioritised('second', 0.5, { confidence: 0.9 });
    const third = makePrioritised('third', 0.4, { confidence: 0.9 });
    const fourth = makePrioritised('fourth', 0.3, { confidence: 0.9 });

    const result = recommend([winner, second, third, fourth]);

    if (result.tier === 'confident_recommendation') {
      expect(result.supportingSignalIds).toEqual(['winner', 'second', 'third']);
    } else {
      throw new Error('expected confident_recommendation');
    }
  });

  it('deduplicates: an other-top-priority signal that already qualifies via shared person is never added twice', () => {
    const winner = makePrioritised('winner', 0.9, { relatedPersonName: 'Jane Cooper', confidence: 0.9 });
    const sameSecondHighest = makePrioritised('second', 0.5, { relatedPersonName: 'Jane Cooper', confidence: 0.9 });
    const third = makePrioritised('third', 0.4, { confidence: 0.9 });

    const result = recommend([winner, sameSecondHighest, third]);

    if (result.tier === 'confident_recommendation') {
      expect(result.supportingSignalIds).toEqual(['winner', 'second', 'third']);
      expect(result.supportingSignalIds.filter((id) => id === 'second')).toHaveLength(1);
    } else {
      throw new Error('expected confident_recommendation');
    }
  });
});
