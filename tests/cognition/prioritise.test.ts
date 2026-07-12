import { describe, expect, it } from 'vitest';
import { prioritise } from '@/lib/cognition/prioritise';
import type { UnderstoodSignal } from '@/lib/cognition/types';
import type { Signal } from '@/lib/signals/types';

function makeUnderstood(id: string, overrides: Partial<UnderstoodSignal['dimensions']>): UnderstoodSignal {
  const signal: Signal = {
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
  return {
    insight: {
      signal,
      summary: `Summary for ${id}`,
      isKnownRelationship: false,
      relatedGoalDescriptions: [],
    },
    dimensions: {
      businessImpact: 0.5,
      urgency: 0.5,
      strategicImportance: 0.5,
      confidence: 0.5,
      ownerPreference: 0.5,
      ...overrides,
    },
    reasoning: `Reasoning for ${id}`,
    recommendedAction: `Action for ${id}`,
  };
}

describe('prioritise', () => {
  it('computes the documented weighted composite score', () => {
    const understood = makeUnderstood('a', {
      businessImpact: 1,
      urgency: 1,
      strategicImportance: 1,
      confidence: 1,
      ownerPreference: 1,
    });
    const [result] = prioritise([understood]);
    expect(result.priorityScore).toBeCloseTo(1.0, 5);
  });

  it('ranks a high-urgency, high-impact insight above a low-scoring one', () => {
    const high = makeUnderstood('high', { businessImpact: 0.9, urgency: 0.9 });
    const low = makeUnderstood('low', { businessImpact: 0.1, urgency: 0.1 });

    const [first, second] = prioritise([low, high]);

    expect(first.insight.signal.id).toBe('high');
    expect(second.insight.signal.id).toBe('low');
    expect(first.priorityScore).toBeGreaterThan(second.priorityScore);
  });

  it('returns an empty array unchanged', () => {
    expect(prioritise([])).toEqual([]);
  });
});
