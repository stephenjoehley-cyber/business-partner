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

  it('keeps email signals well within the 90-day technical safety net', () => {
    const signal = makeSignal({
      id: 'sig-2',
      domain: 'email',
      type: 'email_awaiting_reply_overdue',
      occurredAt: new Date('2026-07-01T00:00:00.000Z'), // 12 days before NOW
    });
    expect(observe([signal], NOW)).toEqual([signal]);
  });

  it('keeps an email older than the old 14-day cutoff — that is no longer a relevance judgment made here, per the 19 July 2026 product decision ("persistence must be proportional to significance," not age alone). Real judgment now lives entirely in the email interpreter\'s decay curves', () => {
    const signal = makeSignal({
      id: 'sig-3',
      domain: 'email',
      type: 'email_awaiting_reply_overdue',
      occurredAt: new Date('2026-06-01T00:00:00.000Z'), // 42 days before NOW — beyond the old cutoff, well within the new 90-day safety net
    });
    expect(observe([signal], NOW)).toEqual([signal]);
  });

  it('drops an email signal beyond the 90-day technical safety net — a data-volume bound, not a relevance judgment', () => {
    const signal = makeSignal({
      id: 'sig-4',
      domain: 'email',
      type: 'email_awaiting_reply_overdue',
      occurredAt: new Date('2026-03-01T00:00:00.000Z'), // well over 90 days before NOW
    });
    expect(observe([signal], NOW)).toEqual([]);
  });

  it('returns an empty array unchanged', () => {
    expect(observe([], NOW)).toEqual([]);
  });
});
