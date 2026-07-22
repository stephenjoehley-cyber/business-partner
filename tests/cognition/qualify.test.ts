import { describe, expect, it } from 'vitest';
import { qualify } from '@/lib/cognition/qualify';
import type { BusinessContext } from '@/lib/signals/provider';
import type { EmailSignalPayload, CalendarSignalPayload, FinanceSignalPayload, Signal } from '@/lib/signals/types';

function makeContext(overrides?: Partial<BusinessContext>): BusinessContext {
  return {
    business: { id: 'biz-1', name: 'Meridian Gearboxes', industry: 'Automotive' } as BusinessContext['business'],
    goals: [],
    people: [{ id: 'person-1', name: 'Jane Cooper', relationship: 'customer' } as BusinessContext['people'][number]],
    ...overrides,
  };
}

function makeEmailSignal(overrides: Partial<Signal<EmailSignalPayload>> = {}): Signal<EmailSignalPayload> {
  return {
    id: 'sig-email-1',
    businessId: 'biz-1',
    domain: 'email',
    type: 'email_awaiting_reply',
    occurredAt: new Date(),
    relatedEntities: {},
    payload: { subject: 'Re: quotation', fromName: 'someone@example.com', preview: '', requiresReply: true, daysSinceReceived: 1 },
    sourceProviderId: 'seeded-email',
    externalRef: 'ref-email-1',
    confidence: 1.0,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeCalendarSignal(overrides: Partial<Signal<CalendarSignalPayload>> = {}): Signal<CalendarSignalPayload> {
  return {
    id: 'sig-cal-1',
    businessId: 'biz-1',
    domain: 'calendar',
    type: 'meeting_upcoming',
    occurredAt: new Date(),
    relatedEntities: {},
    payload: { title: 'Discovery call', startTime: '', durationMinutes: 30, attendees: ['stranger@example.com'], isFirstMeetingWithPerson: true },
    sourceProviderId: 'seeded-calendar',
    externalRef: 'ref-cal-1',
    confidence: 1.0,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeFinanceSignal(overrides: Partial<Signal<FinanceSignalPayload>> = {}): Signal<FinanceSignalPayload> {
  return {
    id: 'sig-finance-1',
    businessId: 'biz-1',
    domain: 'finance',
    type: 'invoice_overdue',
    occurredAt: new Date(),
    relatedEntities: {},
    payload: { invoiceId: 'INV-001', amount: 4500, daysOverdue: 12, customerName: 'Jane Cooper' },
    sourceProviderId: 'upload-csv',
    externalRef: 'ref-finance-1',
    confidence: 1.0,
    createdAt: new Date(),
    temporality: 'snapshot',
    reportingPeriod: { start: new Date('2026-06-01'), end: new Date('2026-06-30') },
    provenance: { extractionMethod: 'structured_export', sourceDocumentType: 'aged_debtors', structurallyComplete: true },
    ...overrides,
  };
}

describe('qualify', () => {
  it('always qualifies calendar signals as world-inherent, regardless of whether the attendee is a known Person — Product Audit, 20 July 2026: a meeting\'s time pressure is a structural fact, independent of Business Memory', () => {
    const context = makeContext({ people: [] }); // no known people at all
    const signal = makeCalendarSignal();

    const result = qualify([signal], context);

    expect(result.admitted).toEqual([signal]);
    expect(result.log[0].outcome).toEqual({ status: 'qualified', reason: 'world-inherent' });
  });

  it('qualifies an email as owner-declared when the sender is a known Person', () => {
    const context = makeContext();
    const signal = makeEmailSignal({ relatedEntities: { personId: 'person-1' } });

    const result = qualify([signal], context);

    expect(result.admitted).toEqual([signal]);
    expect(result.log[0].outcome).toEqual({
      status: 'qualified',
      reason: 'owner-declared',
      matchedPersonId: 'person-1',
      matchedGoalId: undefined,
    });
  });

  it('qualifies an email as owner-declared when its subject touches a stated Goal, even from an unmatched sender', () => {
    const context = makeContext({
      people: [],
      goals: [{ id: 'g1', businessId: 'biz-1', description: 'Improve customer response times', priority: 1, createdAt: new Date() }],
    });
    const signal = makeEmailSignal({ payload: { ...makeEmailSignal().payload, subject: 'Re: customer service follow-up' } });

    const result = qualify([signal], context);

    expect(result.admitted).toEqual([signal]);
    expect(result.log[0].outcome).toEqual({
      status: 'qualified',
      reason: 'owner-declared',
      matchedPersonId: undefined,
      matchedGoalId: 'g1',
    });
  });

  it('resolves an ungrounded email to not-yet-assessable, and excludes it from the admitted set entirely — found live, 20 July 2026: a genuinely irrelevant email should not enter the Brief at all, not merely be decayed toward the bottom', () => {
    const context = makeContext({ people: [], goals: [] });
    const signal = makeEmailSignal();

    const result = qualify([signal], context);

    expect(result.admitted).toEqual([]);
    expect(result.log[0].outcome).toEqual({ status: 'not-yet-assessable' });
  });

  it('never resolves an ungrounded email to "disqualified" — Level 1\'s metadata-only access cannot positively conclude irrelevance, only that Business Partner does not yet know', () => {
    const context = makeContext({ people: [], goals: [] });
    const signal = makeEmailSignal();

    const result = qualify([signal], context);

    expect(result.log[0].outcome.status).not.toBe('disqualified');
    expect(result.log[0].outcome.status).toBe('not-yet-assessable');
  });

  it('processes a mixed batch correctly: calendar and grounded email admitted, ungrounded email excluded', () => {
    const context = makeContext();
    const groundedEmail = makeEmailSignal({ id: 'sig-grounded', externalRef: 'ref-grounded', relatedEntities: { personId: 'person-1' } });
    const ungroundedEmail = makeEmailSignal({ id: 'sig-ungrounded', externalRef: 'ref-ungrounded' });
    const calendarSignal = makeCalendarSignal();

    const result = qualify([groundedEmail, ungroundedEmail, calendarSignal], context);

    expect(result.admitted).toHaveLength(2);
    expect(result.admitted.map((s) => s.id)).toEqual(['sig-grounded', 'sig-cal-1']);
    expect(result.log).toHaveLength(3);
  });

  // --- F0: Signal Temporality, 22 July 2026 (Founder + CPO) ---------------

  it('resolves a finance signal with untrustworthy provenance to not-yet-assessable, even when grounded to a known Person — Founder/CPO F0 correction: trustworthiness is checked before grounding, not instead of it', () => {
    const context = makeContext();
    const signal = makeFinanceSignal({
      relatedEntities: { personId: 'person-1' },
      provenance: { extractionMethod: 'structured_export', sourceDocumentType: 'aged_debtors', structurallyComplete: false },
    });

    const result = qualify([signal], context);

    expect(result.admitted).toEqual([]);
    expect(result.log[0].outcome).toEqual({ status: 'not-yet-assessable' });
  });

  it('resolves a finance signal with no provenance at all to not-yet-assessable', () => {
    const context = makeContext();
    const signal = makeFinanceSignal({ provenance: undefined });

    const result = qualify([signal], context);

    expect(result.admitted).toEqual([]);
    expect(result.log[0].outcome).toEqual({ status: 'not-yet-assessable' });
  });

  it('qualifies a finance signal as owner-declared when trustworthy and matched to a known Person', () => {
    const context = makeContext();
    const signal = makeFinanceSignal({ relatedEntities: { personId: 'person-1' } });

    const result = qualify([signal], context);

    expect(result.admitted).toEqual([signal]);
    expect(result.log[0].outcome).toEqual({
      status: 'qualified',
      reason: 'owner-declared',
      matchedPersonId: 'person-1',
    });
  });

  it('resolves a trustworthy but ungrounded finance signal to not-yet-assessable in F0 — no world-inherent-consequence rule has been approved for any finance document type yet (see financeQualificationPolicy.ts, F1 scope)', () => {
    const context = makeContext({ people: [] });
    const signal = makeFinanceSignal();

    const result = qualify([signal], context);

    expect(result.admitted).toEqual([]);
    expect(result.log[0].outcome).toEqual({ status: 'not-yet-assessable' });
  });

  it('fails closed for any domain without an explicitly approved qualification policy — Founder/CPO F0 correction: no domain is admitted merely because it lacks a domain-specific branch', () => {
    const context = makeContext();
    const signal = makeCalendarSignal({ id: 'sig-tasks-1', externalRef: 'ref-tasks-1', domain: 'tasks' });

    const result = qualify([signal], context);

    expect(result.admitted).toEqual([]);
    expect(result.log[0].outcome).toEqual({ status: 'not-yet-assessable' });
  });
});
