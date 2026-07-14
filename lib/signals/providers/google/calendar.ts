import type { SignalProvider, BusinessContext, TimeWindow } from '../../provider';
import type { CalendarSignalPayload, DraftSignal } from '../../types';
import { getProviderConfigData, setProviderConfigData } from '../../config-repository';
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
    const { business } = context;

    const stored = (await getProviderConfigData(business.id, 'calendar')) as StoredGoogleConfig | null;
    if (!stored) {
      return [];
    }

    try {
      const accessToken = await this.getValidAccessToken(business.id, stored);
      const events = await this.fetchEvents(accessToken, window);
      const signals = events.map((event) => this.toDraftSignal(event, business.id));

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

  private toDraftSignal(event: GoogleEvent, businessId: string): DraftSignal<CalendarSignalPayload> {
    const startTime = event.start?.dateTime ?? event.start?.date ?? new Date().toISOString();
    const endTime = event.end?.dateTime ?? event.end?.date ?? startTime;
    const durationMinutes = Math.max(
      0,
      Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60_000)
    );
    const attendees = (event.attendees ?? [])
      .map((a) => a.displayName ?? a.email)
      .filter((name): name is string => Boolean(name));

    return {
      domain: 'calendar',
      type: 'meeting_upcoming',
      occurredAt: new Date(startTime),
      relatedEntities: {},
      payload: {
        title: event.summary ?? 'Untitled event',
        startTime,
        durationMinutes,
        attendees,
        isFirstMeetingWithPerson: false,
      },
      sourceProviderId: this.providerId,
      externalRef: event.id,
      confidence: 1.0,
    };
  }
}
