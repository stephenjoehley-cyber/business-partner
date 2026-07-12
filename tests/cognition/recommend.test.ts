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
  relatedPersonName?: string
): PrioritisedInsight {
  return {
    insight: {
      signal: makeSignal(id),
      summary: `Summary ${id}`,
      relatedPersonName,
      isKnownRelationship: Boolean(relatedPersonName),
      relatedGoalDescriptions: [],
    },
    dimensions: {
      businessImpact: 0.5,
      urgency: 0.5,
      strategicImportance: 0.5,
      confidence: 0.8,
      ownerPreference: 0.5,
    },
    priorityScore,
    reasoning: `Reasoning ${id}`,
    recommendedAction: `Action ${id}`,
  };
}

describe('recommend', () => {
  it('returns null when there is nothing to reason over', () => {
    expect(recommend([])).toBeNull();
  });

  it('picks the single highest-priority insight as the recommendation', () => {
    const winner = makePrioritised('winner', 0.9);
    const loser = makePrioritised('loser', 0.2);

    const result = recommend([winner, loser]);

    expect(result?.executiveSummary).toBe('Summary winner');
    expect(result?.recommendedAction).toBe('Action winner');
    expect(result?.reasoning).toBe('Reasoning winner');
    expect(result?.confidence).toBe(0.8);
  });

  it('includes the winning signal plus any other signal about the same known person as supporting evidence', () => {
    const winner = makePrioritised('winner', 0.9, 'Jane Cooper');
    const relatedContext = makePrioritised('related', 0.5, 'Jane Cooper');
    const unrelated = makePrioritised('unrelated', 0.4, 'Someone Else');

    const result = recommend([winner, relatedContext, unrelated]);

    expect(result?.supportingSignalIds).toEqual(['winner', 'related']);
  });

  it('supports only the winning signal when no related person is known', () => {
    const winner = makePrioritised('winner', 0.9);
    const other = makePrioritised('other', 0.3);

    const result = recommend([winner, other]);

    expect(result?.supportingSignalIds).toEqual(['winner']);
  });
});
