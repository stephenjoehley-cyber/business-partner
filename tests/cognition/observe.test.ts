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

  it('never time-filters email signals — an unanswered email stays relevant', () => {
    const signal = makeSignal({
      id: 'sig-2',
      domain: 'email',
      type: 'email_awaiting_reply_overdue',
      occurredAt: new Date('2026-07-01T00:00:00.000Z'),
    });
    expect(observe([signal], NOW)).toEqual([signal]);
  });

  it('returns an empty array unchanged', () => {
    expect(observe([], NOW)).toEqual([]);
  });
});
