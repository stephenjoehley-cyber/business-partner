import type { SignalProvider, BusinessContext, TimeWindow } from '../../provider';
import type { CalendarSignalPayload, DraftSignal } from '../../types';
import { dayKey, pick, seededExternalRef, seededRandom } from './util';

const MEETING_TITLES = [
  'Discovery call',
  'Quote follow-up',
  'Site visit',
  'Onboarding check-in',
  'Renewal conversation',
  'Scope review',
] as const;

const GENERIC_PROSPECT_NAMES = ['A new enquiry', 'A prospective customer', 'A referral contact'] as const;

/**
 * Seeded Calendar provider — Increment 2.
 *
 * Produces plausible upcoming meetings for the business, preferring real
 * People already on file (so the Morning Brief later references someone the
 * owner recognises) and falling back to generic prospects otherwise.
 *
 * Replaced by a Google Calendar provider post-MVP without any change to
 * this file's callers — see Blueprint §6.
 */
export class SeededCalendarProvider implements SignalProvider {
  readonly domain = 'calendar' as const;
  readonly providerId = 'seeded-calendar';

  async fetchSignals(context: BusinessContext, window: TimeWindow): Promise<DraftSignal[]> {
    const { business, people } = context;
    const rng = seededRandom(`${business.id}:calendar:${dayKey(window.from)}`);

    const meetingCount = 1 + Math.floor(rng() * 3); // 1–3 meetings in the window
    const candidatePeople = people.filter((p) => p.relationship === 'customer' || p.relationship === 'prospect');
    const windowSpanMs = window.to.getTime() - window.from.getTime();

    const signals: DraftSignal<CalendarSignalPayload>[] = [];

    for (let i = 0; i < meetingCount; i++) {
      const person = candidatePeople.length > 0 ? pick(rng, candidatePeople) : null;
      const startTime = new Date(window.from.getTime() + rng() * windowSpanMs);
      const title = person
        ? `${pick(rng, MEETING_TITLES)} — ${person.name}`
        : `${pick(rng, MEETING_TITLES)} — ${pick(rng, GENERIC_PROSPECT_NAMES)}`;

      signals.push({
        domain: 'calendar',
        type: 'meeting_upcoming',
        occurredAt: startTime,
        relatedEntities: { personId: person?.id },
        payload: {
          title,
          startTime: startTime.toISOString(),
          durationMinutes: pick(rng, [30, 45, 60]),
          attendees: person ? [person.name] : [],
          isFirstMeetingWithPerson: person ? rng() > 0.6 : true,
        },
        sourceProviderId: this.providerId,
        externalRef: seededExternalRef([this.providerId, business.id, dayKey(window.from), i]),
        confidence: 1.0,
      });
    }

    return signals;
  }
}
