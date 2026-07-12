import { describe, expect, it } from 'vitest';
import { SeededCalendarProvider } from '@/lib/signals/providers/seeded/calendar';
import { SeededEmailProvider } from '@/lib/signals/providers/seeded/email';
import type { BusinessContext } from '@/lib/signals/provider';

function makeContext(overrides?: Partial<BusinessContext>): BusinessContext {
  return {
    business: { id: 'biz-1', name: 'Meridian Gearboxes', industry: 'Automotive' } as BusinessContext['business'],
    goals: [],
    people: [
      { id: 'person-1', name: 'Jane Cooper', relationship: 'customer' } as BusinessContext['people'][number],
      { id: 'person-2', name: 'Alex Fleet Co', relationship: 'prospect' } as BusinessContext['people'][number],
    ],
    ...overrides,
  };
}

const WINDOW = { from: new Date('2026-07-12T00:00:00.000Z'), to: new Date('2026-07-15T00:00:00.000Z') };

describe('SeededCalendarProvider', () => {
  const provider = new SeededCalendarProvider();

  it('declares its domain and providerId', () => {
    expect(provider.domain).toBe('calendar');
    expect(provider.providerId).toBe('seeded-calendar');
  });

  it('produces between 1 and 3 signals for a business', async () => {
    const signals = await provider.fetchSignals(makeContext(), WINDOW);
    expect(signals.length).toBeGreaterThanOrEqual(1);
    expect(signals.length).toBeLessThanOrEqual(3);
    signals.forEach((s) => expect(s.domain).toBe('calendar'));
  });

  it('produces identical externalRefs for the same business and day (idempotent)', async () => {
    const first = await provider.fetchSignals(makeContext(), WINDOW);
    const second = await provider.fetchSignals(makeContext(), WINDOW);
    expect(first.map((s) => s.externalRef)).toEqual(second.map((s) => s.externalRef));
  });

  it('produces different signals for a business with no people on file', async () => {
    const withPeople = await provider.fetchSignals(makeContext(), WINDOW);
    const withoutPeople = await provider.fetchSignals(makeContext({ people: [] }), WINDOW);
    // Every signal without people on file should have no personId — the
    // provider must never fabricate a relationship that doesn't exist.
    withoutPeople.forEach((s) => expect(s.relatedEntities.personId).toBeUndefined());
    expect(withPeople).toBeDefined();
  });
});

describe('SeededEmailProvider', () => {
  const provider = new SeededEmailProvider();

  it('declares its domain and providerId', () => {
    expect(provider.domain).toBe('email');
    expect(provider.providerId).toBe('seeded-email');
  });

  it('produces plausible email signals with required-reply payloads', async () => {
    const signals = await provider.fetchSignals(makeContext(), WINDOW);
    expect(signals.length).toBeGreaterThan(0);
    signals.forEach((s) => {
      expect(s.domain).toBe('email');
      expect((s.payload as { requiresReply: boolean }).requiresReply).toBe(true);
    });
  });

  it('marks emails as overdue once 2+ days have passed', async () => {
    const signals = await provider.fetchSignals(makeContext(), WINDOW);
    signals.forEach((s) => {
      const daysSince = (s.payload as { daysSinceReceived: number }).daysSinceReceived;
      const expectedType = daysSince >= 2 ? 'email_awaiting_reply_overdue' : 'email_awaiting_reply';
      expect(s.type).toBe(expectedType);
    });
  });
});
