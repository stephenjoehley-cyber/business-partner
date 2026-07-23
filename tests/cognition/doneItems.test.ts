import { describe, expect, it } from 'vitest';
import { computeDoneItems } from '@/lib/cognition/doneItems';
import type { Signal } from '@/lib/signals/types';

function makeSignal(overrides: Partial<Signal> = {}): Signal {
  return {
    id: 'sig-1',
    businessId: 'biz-1',
    domain: 'email',
    type: 'email_awaiting_reply',
    occurredAt: new Date(),
    relatedEntities: {},
    payload: { subject: 'test', fromName: 'x', preview: '', requiresReply: true, daysSinceReceived: 1 },
    sourceProviderId: 'seeded-email',
    externalRef: 'ref-1',
    confidence: 1,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('computeDoneItems', () => {
  it('excludes signals that were surfaced as part of Due', () => {
    const surfaced = makeSignal({ id: 'sig-surfaced' });
    const notSurfaced = makeSignal({ id: 'sig-quiet', externalRef: 'ref-2' });

    const items = computeDoneItems([surfaced, notSurfaced], ['sig-surfaced']);

    expect(items).toEqual(['1 email reviewed — nothing required your attention.']);
  });

  it('groups by domain and uses the plural form for more than one', () => {
    const signals = [
      makeSignal({ id: 'e1', externalRef: 'r1' }),
      makeSignal({ id: 'e2', externalRef: 'r2' }),
      makeSignal({
        id: 'c1',
        externalRef: 'r3',
        domain: 'calendar',
        type: 'meeting_upcoming',
        payload: { title: 'x', startTime: new Date().toISOString(), durationMinutes: 30, attendees: [], isFirstMeetingWithPerson: false },
        occurredAt: new Date(Date.now() + 86400000),
      }),
    ];

    const items = computeDoneItems(signals, []);

    expect(items).toContain('2 emails reviewed — nothing required your attention.');
    expect(items).toContain('1 calendar item reviewed — nothing required your attention.');
  });

  it('returns an empty list when everything observed was surfaced — a legitimate, honest empty state, never padded', () => {
    const only = makeSignal({ id: 'sig-1' });
    expect(computeDoneItems([only], ['sig-1'])).toEqual([]);
  });

  it('returns an empty list when there are no signals at all', () => {
    expect(computeDoneItems([], [])).toEqual([]);
  });

  it('never uses language implying an action was taken — only ever "reviewed," matching Product Truth (Asset 021 §5, Asset 024)', () => {
    const items = computeDoneItems([makeSignal()], []);
    const joined = items.join(' ');
    expect(joined).not.toMatch(/followed up|confirmed|contacted|resolved|organised/i);
  });
});
