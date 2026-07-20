import { describe, expect, it } from 'vitest';
import { interpretSignal } from '@/lib/cognition/interpreters/registry';
import type { BusinessContext } from '@/lib/signals/provider';
import type { EmailSignalPayload, CalendarSignalPayload, Signal } from '@/lib/signals/types';

/**
 * Found live, 19 July 2026: the email interpreter now computes days-since
 * fresh from signal.occurredAt vs the real current time (matching the
 * calendar interpreter), rather than trusting a frozen payload field. So
 * these tests construct occurredAt relative to Date.now(), not a fixed
 * historical date paired with a payload.daysSinceReceived override that
 * the interpreter no longer reads.
 */
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

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
    occurredAt: daysAgo(1),
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
  it('never produces a confident recommendation to reply to an automated sender address, even if it was already persisted before the provider-level fix existed — found live, 19 July 2026: Business Partner recommended "Reply to noreply@mail.app.supabase.io about Reset your password"', () => {
    const context = makeContext();
    const result = interpretSignal(
      makeEmailSignal({
        relatedEntities: {}, // unmatched — fromName is the raw address
        payload: { ...makeEmailSignal().payload, fromName: 'noreply@mail.app.supabase.io', subject: 'Reset your password' },
      }),
      context
    );

    expect(result.dimensions.confidence).toBeLessThan(0.6); // below CONFIDENCE_THRESHOLD
    expect(result.dimensions.urgency).toBe(0);
  });

  it('does not treat a known, matched person as automated even if their display name happens to be unusual', () => {
    const context = makeContext(); // Jane Cooper, matched
    const result = interpretSignal(makeEmailSignal(), context); // relatedEntities.personId set by default
    expect(result.dimensions.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('rises then decays to zero for low significance (unknown sender, no goal match) — "should decay quickly... quietly disappear," per the 19 July 2026 product decision', () => {
    const context = makeContext({ goals: [] });
    const day0 = interpretSignal(makeEmailSignal({ relatedEntities: {}, occurredAt: daysAgo(0) }), context);
    const day2 = interpretSignal(makeEmailSignal({ relatedEntities: {}, occurredAt: daysAgo(2) }), context);
    const day7 = interpretSignal(makeEmailSignal({ relatedEntities: {}, occurredAt: daysAgo(7) }), context);
    expect(day2.dimensions.urgency).toBe(1); // peaks quickly
    expect(day7.dimensions.urgency).toBe(0); // fully decayed — "quietly disappears"
    expect(day0.dimensions.urgency).toBeLessThan(day2.dimensions.urgency);
  });

  it('rises then decays gradually for medium significance (known OR goal-touching, not both) — "should decay more gradually"', () => {
    const context = makeContext(); // known person, no goals — medium
    const day5 = interpretSignal(makeEmailSignal({ occurredAt: daysAgo(5) }), context);
    const day12 = interpretSignal(makeEmailSignal({ occurredAt: daysAgo(12) }), context);
    const day20 = interpretSignal(makeEmailSignal({ occurredAt: daysAgo(20) }), context);
    expect(day5.dimensions.urgency).toBe(1); // peaks at day 5
    expect(day12.dimensions.urgency).toBeGreaterThan(0);
    expect(day12.dimensions.urgency).toBeLessThan(1); // decaying
    expect(day20.dimensions.urgency).toBe(0); // fully decayed by day 20
  });

  it('rises then holds indefinitely for high significance (known AND goal-touching) — "may persist substantially longer, provided they remain actionable"', () => {
    const context = makeContext({
      goals: [{ id: 'g1', businessId: 'biz-1', description: 'Improve customer response times', priority: 1, createdAt: new Date() }],
    });
    const subject = 'Re: customer service follow-up';
    const day5 = interpretSignal(makeEmailSignal({ occurredAt: daysAgo(5), payload: { ...makeEmailSignal().payload, subject } }), context);
    const day30 = interpretSignal(makeEmailSignal({ occurredAt: daysAgo(30), payload: { ...makeEmailSignal().payload, subject } }), context);
    expect(day5.dimensions.urgency).toBe(1);
    expect(day30.dimensions.urgency).toBe(1); // never decays
  });

  it('ignores a stale payload.daysSinceReceived and computes fresh from occurredAt instead — found live, 19 July 2026: an email frozen at "unanswered for 7 days" in its stored payload kept scoring as if still 7 days old, days after it was actually first ingested, because Gmail only re-fetches recently-active threads and this one had fallen out of that window', () => {
    const context = makeContext({ goals: [] }); // low significance
    const staleSignal = makeEmailSignal({
      relatedEntities: {},
      occurredAt: daysAgo(9), // the real, current age
      payload: { ...makeEmailSignal().payload, daysSinceReceived: 7 }, // frozen at ingestion, now wrong
    });

    const result = interpretSignal(staleSignal, context);

    // Low significance fully decays to zero urgency by day 7 — if the
    // interpreter were still trusting the frozen "7" from the payload,
    // this would incorrectly still show some residual urgency instead
    // of being fully decayed at the real age of 9 days.
    expect(result.dimensions.urgency).toBe(0);
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

  it('boosts strategic importance when the email\'s own subject relates to a matching goal', () => {
    const withGoal = makeContext({
      goals: [{ id: 'g1', businessId: 'biz-1', description: 'Improve customer response times', priority: 1, createdAt: new Date() }],
    });
    const withoutGoal = makeContext({ goals: [] });

    const subject = 'Re: customer service follow-up';
    const withGoalResult = interpretSignal(
      makeEmailSignal({ payload: { ...makeEmailSignal().payload, subject } }),
      withGoal
    );
    const withoutGoalResult = interpretSignal(
      makeEmailSignal({ payload: { ...makeEmailSignal().payload, subject } }),
      withoutGoal
    );

    expect(withGoalResult.dimensions.strategicImportance).toBeGreaterThan(withoutGoalResult.dimensions.strategicImportance);
    expect(withGoalResult.insight.relatedGoalDescriptions).toContain('Improve customer response times');
  });

  it('does NOT boost strategic importance just because a goal happens to mention a keyword, if the email itself is unrelated — found live, 18/19 July 2026: a WordPress job-application notification was being marked as "touching" a goal called "Win our first client" purely because that goal contains the word "client"', () => {
    const context = makeContext({
      goals: [{ id: 'g1', businessId: 'biz-1', description: 'Win our first client', priority: 1, createdAt: new Date() }],
    });

    const result = interpretSignal(
      makeEmailSignal({
        payload: { ...makeEmailSignal().payload, subject: 'Your job application for Marketing Operations Assistant' },
      }),
      context
    );

    expect(result.insight.relatedGoalDescriptions).toEqual([]);
    expect(result.dimensions.strategicImportance).toBe(0.4);
  });

  it('produces a concrete recommended action referencing the sender and subject', () => {
    const result = interpretSignal(makeEmailSignal(), makeContext());
    expect(result.recommendedAction).toContain('Jane Cooper');
    expect(result.recommendedAction).toContain('Re: quotation');
  });

  it('includes the known person\'s company in reasoning when present — Recommendation 2, approved 19 July 2026, Business Memory the owner provided', () => {
    const context = makeContext({
      people: [{ id: 'person-1', name: 'Jane Cooper', relationship: 'customer', company: 'Acme Corp' } as BusinessContext['people'][number]],
    });
    const result = interpretSignal(makeEmailSignal(), context);
    expect(result.reasoning).toContain('Acme Corp');
  });

  it('never fabricates a company mention when none is on file', () => {
    const context = makeContext({
      people: [{ id: 'person-1', name: 'Jane Cooper', relationship: 'customer' } as BusinessContext['people'][number]],
    });
    const result = interpretSignal(makeEmailSignal(), context);
    expect(result.reasoning).not.toContain(' at ,');
    expect(result.reasoning).toContain('Jane Cooper is a known customer —');
  });
});

describe('calendar interpreter', () => {
  it('shows a real, grounded email domain for an unmatched attendee — Recommendation 1, approved 19 July 2026, never a guessed company name', () => {
    const context = makeContext({ people: [] });
    const result = interpretSignal(
      makeCalendarSignal({ payload: { ...makeCalendarSignal().payload, attendees: ['hello@mzansichat.co.za'] } }),
      context
    );
    expect(result.recommendedAction).toContain('a new contact at mzansichat.co.za');
    expect(result.recommendedAction).not.toContain('hello@mzansichat.co.za');
  });

  it('shows no domain hint for a generic consumer email provider — a domain there carries no genuine organisational signal', () => {
    const context = makeContext({ people: [] });
    const result = interpretSignal(
      makeCalendarSignal({ payload: { ...makeCalendarSignal().payload, attendees: ['someone@gmail.com'] } }),
      context
    );
    expect(result.recommendedAction).toContain('someone@gmail.com');
    expect(result.recommendedAction).not.toContain('a new contact at');
  });

  it('never overrides a genuine display name Google Calendar already provided with a domain hint', () => {
    const context = makeContext({ people: [] });
    const result = interpretSignal(
      makeCalendarSignal({ payload: { ...makeCalendarSignal().payload, attendees: ['Sam Rivera'] } }),
      context
    );
    expect(result.recommendedAction).toContain('Sam Rivera');
  });

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

  it('includes the known person\'s company in reasoning when present — Recommendation 2, approved 19 July 2026', () => {
    const context = makeContext({
      people: [{ id: 'person-1', name: 'Jane Cooper', relationship: 'customer', company: 'Acme Corp' } as BusinessContext['people'][number]],
    });
    const result = interpretSignal(
      makeCalendarSignal({ payload: { ...makeCalendarSignal().payload, isFirstMeetingWithPerson: false } }),
      context
    );
    expect(result.reasoning).toContain('Acme Corp');
  });

  it('never produces the grammatically broken "your today meeting" / "your tomorrow meeting" phrasing — found live, 19 July 2026', () => {
    const context = makeContext();
    const meetingToday = interpretSignal(makeCalendarSignal({ occurredAt: new Date() }), context);
    expect(meetingToday.recommendedAction).not.toMatch(/your (today|tomorrow) meeting/);
    expect(meetingToday.recommendedAction).toContain('meeting with');
  });
});

describe('fallback interpreter', () => {
  it('handles an unregistered (domain, type) with low confidence rather than throwing', () => {
    const context = makeContext();
    const signal = makeEmailSignal({
      domain: 'finance',
      type: 'invoice_overdue',
      payload: { invoiceId: 'INV-1', amount: 500, daysOverdue: 12, customerName: 'Acme Co' } as never,
    } as never);
    const result = interpretSignal(signal, context);

    expect(result.dimensions.confidence).toBeLessThan(0.5);
    expect(result.dimensions.businessImpact).toBeLessThan(0.5);
    // Plain language, not a raw domain/type or the banned word "interpreter"
    // (Editorial Style Guide §4) — this text can reach the owner verbatim
    // as the deterministic fallback if the Narrative Layer is unavailable.
    expect(result.insight.summary).toContain('Acme Co');
    expect(result.insight.summary).not.toContain('invoice_overdue');
    expect(result.reasoning).not.toMatch(/\binterpreter\b/i);
  });
});
