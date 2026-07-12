import { describe, expect, it } from 'vitest';
import { interpretSignal } from '@/lib/cognition/interpreters/registry';
import type { BusinessContext } from '@/lib/signals/provider';
import type { EmailSignalPayload, CalendarSignalPayload, Signal } from '@/lib/signals/types';

function makeContext(overrides?: Partial<BusinessContext>): BusinessContext {
  return {
    business: { id: 'biz-1', name: 'Meridian Gearboxes', industry: 'Automotive' } as BusinessContext['business'],
    goals: [],
    people: [
      { id: 'person-1', name: 'Jane Cooper', relationship: 'customer' } as BusinessContext['people'][number],
    ],
    ...overrides,
  };
}

function makeEmailSignal(overrides: Partial<Signal<EmailSignalPayload>> = {}): Signal<EmailSignalPayload> {
  return {
    id: 'sig-email-1',
    businessId: 'biz-1',
    domain: 'email',
    type: 'email_awaiting_reply',
    occurredAt: new Date('2026-07-11T00:00:00.000Z'),
    relatedEntities: { personId: 'person-1' },
    payload: {
      subject: 'Re: quotation',
      fromName: 'Jane Cooper',
      preview: 'Checking in',
      requiresReply: true,
      daysSinceReceived: 1,
    },
    sourceProviderId: 'seeded-email',
    externalRef: 'ref-email-1',
    confidence: 1.0,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    ...overrides,
  };
}

function makeCalendarSignal(
  overrides: Partial<Signal<CalendarSignalPayload>> = {}
): Signal<CalendarSignalPayload> {
  return {
    id: 'sig-cal-1',
    businessId: 'biz-1',
    domain: 'calendar',
    type: 'meeting_upcoming',
    occurredAt: new Date('2026-07-14T09:00:00.000Z'),
    relatedEntities: { personId: 'person-1' },
    payload: {
      title: 'Discovery call — Jane Cooper',
      startTime: '2026-07-14T09:00:00.000Z',
      durationMinutes: 30,
      attendees: ['Jane Cooper'],
      isFirstMeetingWithPerson: true,
    },
    sourceProviderId: 'seeded-calendar',
    externalRef: 'ref-cal-1',
    confidence: 1.0,
    createdAt: new Date('2026-07-12T00:00:00.000Z'),
    ...overrides,
  };
}

describe('email interpreter', () => {
  it('raises urgency with days since received, saturating at 5 days', () => {
    const context = makeContext();
    const fresh = interpretSignal(makeEmailSignal({ payload: { ...makeEmailSignal().payload, daysSinceReceived: 0 } }), context);
    const stale = interpretSignal(
      makeEmailSignal({ type: 'email_awaiting_reply_overdue', payload: { ...makeEmailSignal().payload, daysSinceReceived: 7 } }),
      context
    );
    expect(stale.dimensions.urgency).toBeGreaterThan(fresh.dimensions.urgency);
    expect(stale.dimensions.urgency).toBe(1);
  });

  it('gives higher business impact and confidence to a known person than an unrecognised sender', () => {
    const context = makeContext();
    const known = interpretSignal(makeEmailSignal(), context);
    const unknown = interpretSignal(
      makeEmailSignal({ relatedEntities: {}, payload: { ...makeEmailSignal().payload, fromName: 'A stranger' } }),
      context
    );
    expect(known.dimensions.businessImpact).toBeGreaterThan(unknown.dimensions.businessImpact);
    expect(known.dimensions.confidence).toBeGreaterThan(unknown.dimensions.confidence);
    expect(known.insight.isKnownRelationship).toBe(true);
    expect(unknown.insight.isKnownRelationship).toBe(false);
  });

  it('boosts strategic importance when a goal matches by keyword', () => {
    const withGoal = makeContext({
      goals: [{ id: 'g1', businessId: 'biz-1', description: 'Improve customer response times', priority: 1, createdAt: new Date() }],
    });
    const withoutGoal = makeContext({ goals: [] });

    const withGoalResult = interpretSignal(makeEmailSignal(), withGoal);
    const withoutGoalResult = interpretSignal(makeEmailSignal(), withoutGoal);

    expect(withGoalResult.dimensions.strategicImportance).toBeGreaterThan(withoutGoalResult.dimensions.strategicImportance);
    expect(withGoalResult.insight.relatedGoalDescriptions).toContain('Improve customer response times');
  });

  it('produces a concrete recommended action referencing the sender and subject', () => {
    const result = interpretSignal(makeEmailSignal(), makeContext());
    expect(result.recommendedAction).toContain('Jane Cooper');
    expect(result.recommendedAction).toContain('Re: quotation');
  });
});

describe('calendar interpreter', () => {
  it('gives higher business impact to a first meeting with a prospect than a returning customer meeting', () => {
    const context = makeContext({
      people: [{ id: 'person-1', name: 'Jane Cooper', relationship: 'prospect' } as BusinessContext['people'][number]],
    });
    const firstMeeting = interpretSignal(makeCalendarSignal(), context);
    const returningMeeting = interpretSignal(
      makeCalendarSignal({ payload: { ...makeCalendarSignal().payload, isFirstMeetingWithPerson: false } }),
      makeContext({
        people: [{ id: 'person-1', name: 'Jane Cooper', relationship: 'customer' } as BusinessContext['people'][number]],
      })
    );
    expect(firstMeeting.dimensions.businessImpact).toBeGreaterThan(returningMeeting.dimensions.businessImpact);
  });

  it('raises urgency the sooner the meeting is', () => {
    const context = makeContext();
    const soon = interpretSignal(makeCalendarSignal({ occurredAt: new Date('2026-07-12T01:00:00.000Z') }), context);
    // Note: interpreter uses `new Date()` as "now" internally; we only assert relative ordering via hoursUntil implicitly through two far-apart times.
    const far = interpretSignal(makeCalendarSignal({ occurredAt: new Date('2099-01-01T00:00:00.000Z') }), context);
    expect(far.dimensions.urgency).toBeLessThanOrEqual(soon.dimensions.urgency);
  });

  it('produces a recommended action to prepare briefing notes', () => {
    const result = interpretSignal(makeCalendarSignal(), makeContext());
    expect(result.recommendedAction).toContain('Prepare briefing notes');
    expect(result.recommendedAction).toContain('Jane Cooper');
  });
});

describe('fallback interpreter', () => {
  it('handles an unregistered (domain, type) with low confidence rather than throwing', () => {
    const context = makeContext();
    const signal = makeEmailSignal({ domain: 'finance', type: 'invoice_overdue' } as never);
    const result = interpretSignal(signal, context);

    expect(result.dimensions.confidence).toBeLessThan(0.5);
    expect(result.dimensions.businessImpact).toBeLessThan(0.5);
    expect(result.insight.summary).toContain('not yet understood');
  });
});
