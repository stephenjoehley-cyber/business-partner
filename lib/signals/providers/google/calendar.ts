import type { Person } from '@prisma/client';
import type { SignalProvider, BusinessContext, TimeWindow } from '../../provider';
import type { CalendarSignalPayload, DraftSignal } from '../../types';
import { getProviderConfigData, setProviderConfigData } from '../../config-repository';
import { hasPriorInteractionForPerson } from '../../repository';
import { encryptToken, decryptToken } from './tokenStorage';
import { refreshAccessToken } from './oauth';

const CALENDAR_API_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

interface StoredGoogleConfig {
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  accessTokenExpiresAt: string;
  lastSyncedAt: string | null;
  lastError: string | null;
}

interface GoogleEvent {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: { email?: string; displayName?: string }[];
}

export class GoogleCalendarProvider implements SignalProvider {
  readonly domain = 'calendar' as const;
  readonly providerId = 'google-calendar';

  async fetchSignals(context: BusinessContext, window: TimeWindow): Promise<DraftSignal[]> {
    const { business, people } = context;

    const stored = (await getProviderConfigData(business.id, 'calendar')) as StoredGoogleConfig | null;
    if (!stored) {
      return [];
    }

    try {
      const accessToken = await this.getValidAccessToken(business.id, stored);
      const events = await this.fetchEvents(accessToken, window);
      const signals = await Promise.all(
        events.map((event) => this.toDraftSignal(event, business.id, people))
      );

      await setProviderConfigData(business.id, 'calendar', this.providerId, {
        ...stored,
        lastSyncedAt: new Date().toISOString(),
        lastError: null,
      });

      return signals;
    } catch (error) {
      await setProviderConfigData(business.id, 'calendar', this.providerId, {
        ...stored,
        lastError: error instanceof Error ? error.message : 'Unknown Google Calendar sync error.',
      });
      return [];
    }
  }

  private async getValidAccessToken(businessId: string, stored: StoredGoogleConfig): Promise<string> {
    const expiresAt = new Date(stored.accessTokenExpiresAt);
    const stillValid = expiresAt.getTime() - Date.now() > 60_000;

    if (stillValid) {
      return decryptToken(stored.encryptedAccessToken);
    }

    const refreshToken = decryptToken(stored.encryptedRefreshToken);
    const refreshed = await refreshAccessToken(refreshToken);

    await setProviderConfigData(businessId, 'calendar', this.providerId, {
      ...stored,
      encryptedAccessToken: encryptToken(refreshed.accessToken),
      accessTokenExpiresAt: refreshed.expiresAt.toISOString(),
    });

    return refreshed.accessToken;
  }

  private async fetchEvents(accessToken: string, window: TimeWindow): Promise<GoogleEvent[]> {
    const params = new URLSearchParams({
      timeMin: window.from.toISOString(),
      timeMax: window.to.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    const response = await fetch(`${CALENDAR_API_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Google Calendar API returned ${response.status}`);
    }

    const data = await response.json();
    return data.items ?? [];
  }

  /**
   * Matches an event's attendees against existing Person records for this
   * business, by email (case-insensitive, trimmed). Returns the first
   * match found, in attendee order.
   *
   * Known, declared limitation (schema constraint, not an oversight):
   * `RelatedEntities.personId` holds a single id, so an event with several
   * attendees who are all existing contacts links to only the first match.
   * Supporting multiple related people per signal would need a schema
   * change to `RelatedEntities`, out of scope here.
   */
  private matchAttendeeToPerson(
    attendees: GoogleEvent['attendees'],
    people: Person[]
  ): Person | undefined {
    if (!attendees) return undefined;
    for (const attendee of attendees) {
      const email = attendee.email?.trim().toLowerCase();
      if (!email) continue;
      const match = people.find((p) => p.email?.trim().toLowerCase() === email);
      if (match) return match;
    }
    return undefined;
  }

  private async toDraftSignal(
    event: GoogleEvent,
    businessId: string,
    people: Person[]
  ): Promise<DraftSignal<CalendarSignalPayload>> {
    const startTime = event.start?.dateTime ?? event.start?.date ?? new Date().toISOString();
    const endTime = event.end?.dateTime ?? event.end?.date ?? startTime;
    const durationMinutes = Math.max(
      0,
      Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60_000)
    );
    const attendees = (event.attendees ?? [])
      .map((a) => a.displayName ?? a.email)
      .filter((name): name is string => Boolean(name));

    const matchedPerson = this.matchAttendeeToPerson(event.attendees, people);
    const personId = matchedPerson?.id;

    // No matched Person at all means Business Partner has no record of this
    // contact whatsoever — first meeting by definition. A matched Person is
    // only a "first meeting" if no earlier Calendar signal on file already
    // connects the two, checked against real persisted history (not a
    // provider-invented guess) — see the approved Implementation Plan,
    // Phase B Item 5 Calendar gaps, 2026-07-15.
    const isFirstMeetingWithPerson = personId
      ? !(await hasPriorInteractionForPerson(
          businessId,
          personId,
          'calendar',
          'meeting_upcoming',
          new Date(startTime),
          event.id
        ))
      : true;

    return {
      domain: 'calendar',
      type: 'meeting_upcoming',
      occurredAt: new Date(startTime),
      relatedEntities: { personId },
      payload: {
        title: event.summary ?? 'Untitled event',
        startTime,
        durationMinutes,
        attendees,
        isFirstMeetingWithPerson,
      },
      sourceProviderId: this.providerId,
      externalRef: event.id,
      confidence: 1.0,
    };
  }
}
