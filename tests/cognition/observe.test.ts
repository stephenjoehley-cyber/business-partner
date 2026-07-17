import { describe, expect, it } from 'vitest';
import { observe } from '@/lib/cognition/observe';
import type { Signal } from '@/lib/signals/types';

function makeSignal(overrides: Partial<Signal>): Signal {
  return {
    id: 'sig-1',
    businessId: 'biz-1',
    domain: 'calendar',
    type: 'meeting_upcoming',
    occurredAt: new Date('2026-07-15T00:00:00.000Z'),
    relatedEntities: {},
    payload: {},
    sourceProviderId: 'seeded-calendar',
    externalRef: 'ref-1',
    confidence: 1.0,
    createdAt: new Date('2026-07-12T00:00:00.000Z'),
    ...overrides,
  };
}

const NOW = new Date('2026-07-13T00:00:00.000Z');

describe('observe', () => {
  it('keeps future calendar signals', () => {
    const signal = makeSignal({ domain: 'calendar', occurredAt: new Date('2026-07-14T00:00:00.000Z') });
    expect(observe([signal], NOW)).toEqual([signal]);
  });

  it('drops calendar signals whose meeting has already happened', () => {
    const signal = makeSignal({ domain: 'calendar', occurredAt: new Date('2026-07-10T00:00:00.000Z') });
    expect(observe([signal], NOW)).toEqual([]);
  });

  it('keeps email signals within the 14-day staleness cutoff', () => {
    const signal = makeSignal({
      id: 'sig-2',
      domain: 'email',
      type: 'email_awaiting_reply_overdue',
      occurredAt: new Date('2026-07-01T00:00:00.000Z'), // 12 days before NOW
    });
    expect(observe([signal], NOW)).toEqual([signal]);
  });

  it('drops email signals older than the 14-day staleness cutoff — found live, 17 July 2026: a 165-day-old unanswered email kept resurfacing as the Morning Brief\'s top pick, since generateMorningBrief reads every signal ever persisted with no date filter', () => {
    const signal = makeSignal({
      id: 'sig-3',
      domain: 'email',
      type: 'email_awaiting_reply_overdue',
      occurredAt: new Date('2026-06-01T00:00:00.000Z'), // 42 days before NOW
    });
    expect(observe([signal], NOW)).toEqual([]);
  });

  it('returns an empty array unchanged', () => {
    expect(observe([], NOW)).toEqual([]);
  });
});
