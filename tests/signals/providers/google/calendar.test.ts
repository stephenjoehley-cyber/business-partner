import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/signals/config-repository', () => ({
  getProviderConfigData: vi.fn(),
  setProviderConfigData: vi.fn(),
}));

vi.mock('@/lib/signals/providers/google/tokenStorage', () => ({
  encryptToken: vi.fn((t: string) => `encrypted:${t}`),
  decryptToken: vi.fn((t: string) => t.replace('encrypted:', '')),
}));

vi.mock('@/lib/signals/providers/google/oauth', () => ({
  refreshAccessToken: vi.fn(),
}));

import { getProviderConfigData, setProviderConfigData } from '@/lib/signals/config-repository';
import { refreshAccessToken } from '@/lib/signals/providers/google/oauth';
import { GoogleCalendarProvider } from '@/lib/signals/providers/google/calendar';
import type { BusinessContext } from '@/lib/signals/provider';

const getProviderConfigDataMock = getProviderConfigData as unknown as ReturnType<typeof vi.fn>;
const setProviderConfigDataMock = setProviderConfigData as unknown as ReturnType<typeof vi.fn>;
const refreshAccessTokenMock = refreshAccessToken as unknown as ReturnType<typeof vi.fn>;

const context: BusinessContext = {
  business: { id: 'biz-1', name: 'Meridian', industry: 'Automotive' } as BusinessContext['business'],
  goals: [],
  people: [],
};
const window = { from: new Date('2026-07-14T00:00:00.000Z'), to: new Date('2026-07-17T00:00:00.000Z') };

const validStoredConfig = {
  encryptedAccessToken: 'encrypted:valid-access-token',
  encryptedRefreshToken: 'encrypted:valid-refresh-token',
  accessTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  lastSyncedAt: null,
  lastError: null,
};

describe('GoogleCalendarProvider', () => {
  const provider = new GoogleCalendarProvider();
  const originalFetch = global.fetch;

  beforeEach(() => {
    getProviderConfigDataMock.mockReset();
    setProviderConfigDataMock.mockReset();
    refreshAccessTokenMock.mockReset();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('declares its domain and providerId', () => {
    expect(provider.domain).toBe('calendar');
    expect(provider.providerId).toBe('google-calendar');
  });

  it('returns no signals, quietly, if no stored config exists at all', async () => {
    getProviderConfigDataMock.mockResolvedValue(null);
    const signals = await provider.fetchSignals(context, window);
    expect(signals).toEqual([]);
  });

  it('fetches events with singleEvents and chronological ordering, and maps them into CalendarSignalPayload', async () => {
    getProviderConfigDataMock.mockResolvedValue(validStoredConfig);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'event-1',
            summary: 'Scope review',
            start: { dateTime: '2026-07-15T10:00:00.000Z' },
            end: { dateTime: '2026-07-15T10:45:00.000Z' },
            attendees: [{ displayName: 'Jane Cooper' }],
          },
        ],
      }),
    });

    const signals = await provider.fetchSignals(context, window);

    expect(signals).toHaveLength(1);
    expect(signals[0].domain).toBe('calendar');
    expect(signals[0].externalRef).toBe('event-1');
    expect(signals[0].payload).toMatchObject({
      title: 'Scope review',
      durationMinutes: 45,
      attendees: ['Jane Cooper'],
    });

    const fetchUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(fetchUrl).toContain('singleEvents=true');
    expect(fetchUrl).toContain('orderBy=startTime');

    expect(setProviderConfigDataMock).toHaveBeenCalledWith(
      'biz-1',
      'calendar',
      'google-calendar',
      expect.objectContaining({ lastError: null })
    );
  });

  it('refreshes an expired access token and preserves the refresh token unchanged', async () => {
    const expiredConfig = {
      ...validStoredConfig,
      accessTokenExpiresAt: new Date(Date.now() - 60 * 1000).toISOString(),
    };
    getProviderConfigDataMock.mockResolvedValue(expiredConfig);
    refreshAccessTokenMock.mockResolvedValue({
      accessToken: 'new-access-token',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({ items: [] }) });

    await provider.fetchSignals(context, window);

    expect(refreshAccessTokenMock).toHaveBeenCalledWith('valid-refresh-token');
    const persistedCall = setProviderConfigDataMock.mock.calls.find(
      (call) => call[3].encryptedAccessToken === 'encrypted:new-access-token'
    );
    expect(persistedCall?.[3].encryptedRefreshToken).toBe(expiredConfig.encryptedRefreshToken);
  });

  it('never throws on a Calendar API failure — records lastError internally and returns no signals', async () => {
    getProviderConfigDataMock.mockResolvedValue(validStoredConfig);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 500 });

    const signals = await provider.fetchSignals(context, window);

    expect(signals).toEqual([]);
    expect(setProviderConfigDataMock).toHaveBeenCalledWith(
      'biz-1',
      'calendar',
      'google-calendar',
      expect.objectContaining({ lastError: expect.stringContaining('500') })
    );
  });
});
