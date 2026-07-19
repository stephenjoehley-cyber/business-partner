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
import { GoogleGmailProvider } from '@/lib/signals/providers/google/gmail';
import type { BusinessContext } from '@/lib/signals/provider';
import type { Person } from '@prisma/client';

const getProviderConfigDataMock = getProviderConfigData as unknown as ReturnType<typeof vi.fn>;
const setProviderConfigDataMock = setProviderConfigData as unknown as ReturnType<typeof vi.fn>;
const refreshAccessTokenMock = refreshAccessToken as unknown as ReturnType<typeof vi.fn>;

const OWNER_EMAIL = 'stephen@meridiangearboxes.example';

const janeCooper = {
  id: 'person-jane',
  businessId: 'biz-1',
  name: 'Jane Cooper',
  relationship: 'customer',
  email: 'Jane@Example.com', // deliberately mixed case, to exercise case-insensitive matching
  notes: null,
} as Person;

const context: BusinessContext = {
  business: { id: 'biz-1', name: 'Meridian', industry: 'Automotive' } as BusinessContext['business'],
  goals: [],
  people: [],
};

const contextWithJane: BusinessContext = { ...context, people: [janeCooper] };

const window = { from: new Date('2026-07-14T00:00:00.000Z'), to: new Date('2026-07-17T00:00:00.000Z') };

const validStoredConfig = {
  encryptedAccessToken: 'encrypted:valid-access-token',
  encryptedRefreshToken: 'encrypted:valid-refresh-token',
  accessTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  lastSyncedAt: null,
  lastError: null,
};

function mockProfileAndThreads(threadsListBody: unknown, threadDetailBodies: unknown[]) {
  const fetchMock = vi.fn();
  fetchMock.mockImplementation((url: string) => {
    if (url.includes('/profile')) {
      return Promise.resolve({ ok: true, json: async () => ({ emailAddress: OWNER_EMAIL }) });
    }
    if (url.includes('/threads?')) {
      return Promise.resolve({ ok: true, json: async () => threadsListBody });
    }
    // threads/{id} detail calls, in the order threadStubs were listed
    const body = threadDetailBodies.shift();
    return Promise.resolve({ ok: true, json: async () => body });
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function inboundMessage(
  overrides: Partial<{
    from: string;
    subject: string;
    date: string;
    internalDate: string;
    listUnsubscribe: string;
    listId: string;
  }> = {}
) {
  const headers = [
    { name: 'From', value: overrides.from ?? 'Jane Cooper <jane@example.com>' },
    { name: 'To', value: OWNER_EMAIL },
    { name: 'Subject', value: overrides.subject ?? 'Re: quotation for gearbox rebuild' },
    { name: 'Date', value: overrides.date ?? 'Wed, 15 Jul 2026 10:00:00 +0000' },
  ];
  if (overrides.listUnsubscribe) {
    headers.push({ name: 'List-Unsubscribe', value: overrides.listUnsubscribe });
  }
  if (overrides.listId) {
    headers.push({ name: 'List-Id', value: overrides.listId });
  }
  return {
    id: 'msg-1',
    internalDate: overrides.internalDate,
    payload: { headers },
  };
}

function ownerMessage() {
  return {
    id: 'msg-owner',
    payload: {
      headers: [
        { name: 'From', value: OWNER_EMAIL },
        { name: 'To', value: 'jane@example.com' },
        { name: 'Subject', value: 'Re: quotation for gearbox rebuild' },
        { name: 'Date', value: 'Wed, 15 Jul 2026 09:00:00 +0000' },
      ],
    },
  };
}

describe('GoogleGmailProvider', () => {
  const provider = new GoogleGmailProvider();
  const originalFetch = global.fetch;

  beforeEach(() => {
    getProviderConfigDataMock.mockReset();
    setProviderConfigDataMock.mockReset();
    refreshAccessTokenMock.mockReset();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('declares its domain and providerId', () => {
    expect(provider.domain).toBe('email');
    expect(provider.providerId).toBe('google-gmail');
  });

  it('returns no signals, quietly, if no stored config exists at all', async () => {
    getProviderConfigDataMock.mockResolvedValue(null);
    const signals = await provider.fetchSignals(context, window);
    expect(signals).toEqual([]);
  });

  it('maps a thread awaiting the owner\'s reply into an EmailSignalPayload, with an empty preview (Level 1 never reads message content)', async () => {
    getProviderConfigDataMock.mockResolvedValue(validStoredConfig);
    mockProfileAndThreads({ threads: [{ id: 'thread-1' }] }, [
      { id: 'thread-1', messages: [inboundMessage({ internalDate: String(new Date('2026-07-15T10:00:00.000Z').getTime()) })] },
    ]);

    const signals = await provider.fetchSignals(contextWithJane, window);

    expect(signals).toHaveLength(1);
    expect(signals[0].domain).toBe('email');
    expect(signals[0].externalRef).toBe('thread-1');
    expect(signals[0].payload).toMatchObject({
      subject: 'Re: quotation for gearbox rebuild',
      preview: '',
      requiresReply: true,
    });

    expect(setProviderConfigDataMock).toHaveBeenCalledWith(
      'biz-1',
      'email',
      'google-gmail',
      expect.objectContaining({ lastError: null })
    );
  });

  it('excludes a thread entirely when the owner sent the most recent message — this only watches the owner\'s own action items', async () => {
    getProviderConfigDataMock.mockResolvedValue(validStoredConfig);
    mockProfileAndThreads({ threads: [{ id: 'thread-owner-replied' }] }, [
      { id: 'thread-owner-replied', messages: [inboundMessage(), ownerMessage()] },
    ]);

    const signals = await provider.fetchSignals(contextWithJane, window);

    expect(signals).toEqual([]);
  });

  it('matches the correspondent to an existing Person by email, case-insensitively', async () => {
    getProviderConfigDataMock.mockResolvedValue(validStoredConfig);
    mockProfileAndThreads({ threads: [{ id: 'thread-jane' }] }, [
      { id: 'thread-jane', messages: [inboundMessage({ from: 'Jane Cooper <jane@example.com>' })] },
    ]);

    const signals = await provider.fetchSignals(contextWithJane, window);

    expect(signals[0].relatedEntities.personId).toBe('person-jane');
    expect((signals[0].payload as { fromName: string }).fromName).toBe('Jane Cooper');
  });

  it('leaves relatedEntities.personId undefined when the correspondent matches no existing Person', async () => {
    getProviderConfigDataMock.mockResolvedValue(validStoredConfig);
    mockProfileAndThreads({ threads: [{ id: 'thread-unknown' }] }, [
      { id: 'thread-unknown', messages: [inboundMessage({ from: 'stranger@example.com' })] },
    ]);

    const signals = await provider.fetchSignals(context, window); // no people on file

    expect(signals[0].relatedEntities.personId).toBeUndefined();
  });

  it('marks a thread overdue once 2+ days have passed, matching the seeded provider\'s own threshold', async () => {
    getProviderConfigDataMock.mockResolvedValue(validStoredConfig);
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    mockProfileAndThreads({ threads: [{ id: 'thread-overdue' }] }, [
      { id: 'thread-overdue', messages: [inboundMessage({ internalDate: String(threeDaysAgo.getTime()) })] },
    ]);

    const signals = await provider.fetchSignals(contextWithJane, window);

    expect(signals[0].type).toBe('email_awaiting_reply_overdue');
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
    mockProfileAndThreads({ threads: [] }, []);

    await provider.fetchSignals(context, window);

    expect(refreshAccessTokenMock).toHaveBeenCalledWith('valid-refresh-token');
    const persistedCall = setProviderConfigDataMock.mock.calls.find(
      (call) => call[3].encryptedAccessToken === 'encrypted:new-access-token'
    );
    expect(persistedCall?.[3].encryptedRefreshToken).toBe(expiredConfig.encryptedRefreshToken);
  });

  it('never throws on a Gmail API failure — records lastError internally and returns no signals', async () => {
    getProviderConfigDataMock.mockResolvedValue(validStoredConfig);
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const signals = await provider.fetchSignals(context, window);

    expect(signals).toEqual([]);
    expect(setProviderConfigDataMock).toHaveBeenCalledWith(
      'biz-1',
      'email',
      'google-gmail',
      expect.objectContaining({ lastError: expect.stringContaining('500') })
    );
  });

  it('never requests message body content — only format=metadata with an explicit header allow-list', async () => {
    getProviderConfigDataMock.mockResolvedValue(validStoredConfig);
    const fetchMock = mockProfileAndThreads({ threads: [{ id: 'thread-1' }] }, [
      { id: 'thread-1', messages: [inboundMessage()] },
    ]);

    await provider.fetchSignals(contextWithJane, window);

    const threadDetailCall = fetchMock.mock.calls.find((call) => (call[0] as string).includes('/threads/thread-1'));
    const detailUrl = threadDetailCall?.[0] as string;
    expect(detailUrl).toContain('format=metadata');
    expect(detailUrl).toContain('metadataHeaders=From');
    expect(detailUrl).toContain('metadataHeaders=Subject');
  });

  it('restricts the thread listing to the inbox primary category via labelIds, never the disallowed q parameter under gmail.metadata scope', async () => {
    getProviderConfigDataMock.mockResolvedValue(validStoredConfig);
    const fetchMock = mockProfileAndThreads({ threads: [] }, []);

    await provider.fetchSignals(context, window);

    const listCall = fetchMock.mock.calls.find((call) => (call[0] as string).includes('/threads?'));
    const listUrl = listCall?.[0] as string;
    expect(listUrl).toContain('labelIds=INBOX');
    expect(listUrl).toContain('labelIds=CATEGORY_PERSONAL');
    expect(listUrl).not.toContain('q=');
  });

  it('includes a genuinely old, still-unanswered email rather than excluding it — the pipeline\'s forward-looking window (built for Calendar) must never suppress real backward-looking email history', async () => {
    getProviderConfigDataMock.mockResolvedValue(validStoredConfig);
    // 10 days old — well before window.from, and before window entirely.
    // A real unanswered email is always in the past; rejecting it for
    // being "before the window" (an earlier version of this provider did
    // exactly that) would silently exclude every real email, always.
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    mockProfileAndThreads({ threads: [{ id: 'thread-old-but-real' }] }, [
      { id: 'thread-old-but-real', messages: [inboundMessage({ internalDate: String(tenDaysAgo.getTime()) })] },
    ]);

    const signals = await provider.fetchSignals(contextWithJane, window);

    expect(signals).toHaveLength(1);
    expect(signals[0].type).toBe('email_awaiting_reply_overdue');
  });

  it('includes an email well past the old 14-day cutoff but within the new 90-day ingestion safety net — 19 July 2026 product decision: persistence must be proportional to significance, not age alone; the real relevance judgment now lives entirely in the email interpreter\'s decay curves, not at ingestion', async () => {
    getProviderConfigDataMock.mockResolvedValue(validStoredConfig);
    const fortyTwoDaysAgo = new Date(Date.now() - 42 * 24 * 60 * 60 * 1000);
    mockProfileAndThreads({ threads: [{ id: 'thread-42-days' }] }, [
      { id: 'thread-42-days', messages: [inboundMessage({ internalDate: String(fortyTwoDaysAgo.getTime()) })] },
    ]);

    const signals = await provider.fetchSignals(contextWithJane, window);

    expect(signals).toHaveLength(1);
  });

  it('excludes an email beyond the 90-day ingestion safety net — a data-volume bound, not a relevance judgment', async () => {
    getProviderConfigDataMock.mockResolvedValue(validStoredConfig);
    const wellOver90DaysAgo = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);
    mockProfileAndThreads({ threads: [{ id: 'thread-ancient' }] }, [
      { id: 'thread-ancient', messages: [inboundMessage({ internalDate: String(wellOver90DaysAgo.getTime()) })] },
    ]);

    const signals = await provider.fetchSignals(contextWithJane, window);

    expect(signals).toEqual([]);
  });

  it('excludes an automated notification address entirely — found live, 19 July 2026: recommending "Reply to noreply@..." is a false claim, not just noise, since a system-generated address can never receive a meaningful reply', async () => {
    getProviderConfigDataMock.mockResolvedValue(validStoredConfig);
    mockProfileAndThreads({ threads: [{ id: 'thread-noreply' }] }, [
      { id: 'thread-noreply', messages: [inboundMessage({ from: 'noreply@mail.app.supabase.io', subject: 'Reset your password' })] },
    ]);

    const signals = await provider.fetchSignals(contextWithJane, window);

    expect(signals).toEqual([]);
  });

  it('excludes a bulk/marketing email identified by a List-Unsubscribe header — a genuine structural fact (RFC 2369/8058), not an inference about content', async () => {
    getProviderConfigDataMock.mockResolvedValue(validStoredConfig);
    mockProfileAndThreads({ threads: [{ id: 'thread-marketing' }] }, [
      {
        id: 'thread-marketing',
        messages: [
          inboundMessage({
            from: 'hello@travelpayouts.com',
            subject: 'Last Chance — 50% Early Bird Enrollment',
            listUnsubscribe: '<mailto:unsubscribe@travelpayouts.com>',
          }),
        ],
      },
    ]);

    const signals = await provider.fetchSignals(contextWithJane, window);

    expect(signals).toEqual([]);
  });

  it('excludes a bulk/marketing email identified by a List-Id header instead — found live, 19 July 2026: a second Travelpayouts email had no List-Unsubscribe header at all, only List-Id (RFC 2919), which Gmail\'s own UI surfaces as "mailing list"', async () => {
    getProviderConfigDataMock.mockResolvedValue(validStoredConfig);
    mockProfileAndThreads({ threads: [{ id: 'thread-mailing-list' }] }, [
      {
        id: 'thread-mailing-list',
        messages: [
          inboundMessage({
            from: 'hello@travelpayouts.com',
            subject: 'Three ideas worth stealing from TBEX 2026',
            listId: '<batch303813.list-id.travelpayouts.com>',
          }),
        ],
      },
    ]);

    const signals = await provider.fetchSignals(contextWithJane, window);

    expect(signals).toEqual([]);
  });

  it('still includes a genuine, real correspondence email — neither an automated address nor bulk mail', async () => {
    getProviderConfigDataMock.mockResolvedValue(validStoredConfig);
    mockProfileAndThreads({ threads: [{ id: 'thread-real' }] }, [
      { id: 'thread-real', messages: [inboundMessage({ from: 'jane@example.com' })] },
    ]);

    const signals = await provider.fetchSignals(contextWithJane, window);

    expect(signals).toHaveLength(1);
  });
});
