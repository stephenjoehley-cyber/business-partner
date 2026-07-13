import { describe, expect, it } from 'vitest';
import { describeSignalPlainly } from '@/lib/signals/describe';
import type { Signal } from '@/lib/signals/types';

function baseSignal(overrides: Partial<Signal>): Signal {
  return {
    id: 'sig-1',
    businessId: 'biz-1',
    domain: 'email',
    type: 'email_awaiting_reply',
    occurredAt: new Date('2026-07-13T00:00:00.000Z'),
    relatedEntities: {},
    payload: {},
    sourceProviderId: 'seeded',
    externalRef: 'ref-1',
    confidence: 1,
    createdAt: new Date('2026-07-13T00:00:00.000Z'),
    ...overrides,
  } as Signal;
}

describe('describeSignalPlainly', () => {
  it('never includes the raw domain or type', () => {
    const signal = baseSignal({
      domain: 'email',
      type: 'email_awaiting_reply_overdue',
      payload: { fromName: 'Jane Cooper', daysSinceReceived: 3, subject: 'Re: quotation', preview: '', requiresReply: true },
    });

    const description = describeSignalPlainly(signal);

    expect(description).toContain('Jane Cooper');
    // Plain English "email" is exactly the approved phrasing (Editorial
    // Style Guide's own before/after example: "An email from Jane Cooper
    // has gone unanswered for 3 days.") — only the raw enum-style type must
    // never appear.
    expect(description).not.toContain('email_awaiting_reply');
    expect(description).not.toContain('_');
  });

  it('describes a first meeting distinctly from a returning one', () => {
    const now = new Date('2026-07-13T00:00:00.000Z');
    const first = baseSignal({
      domain: 'calendar',
      type: 'meeting_upcoming',
      occurredAt: new Date('2026-07-14T00:00:00.000Z'),
      payload: { title: 'Intro call', startTime: '', durationMinutes: 30, attendees: ['Sam Rivera'], isFirstMeetingWithPerson: true },
    });

    expect(describeSignalPlainly(first, now)).toContain('first meeting with Sam Rivera');
  });

  it('describes an overdue invoice without exposing raw payload structure', () => {
    const signal = baseSignal({
      domain: 'finance',
      type: 'invoice_overdue',
      payload: { invoiceId: 'INV-1', amount: 500, daysOverdue: 12, customerName: 'Acme Co' },
    });

    const description = describeSignalPlainly(signal);
    expect(description).toContain('Acme Co');
    expect(description).toContain('12 days overdue');
  });
});
