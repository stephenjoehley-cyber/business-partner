import { describe, expect, it, beforeAll } from 'vitest';
import { getGoogleAuthUrl } from '@/lib/signals/providers/google/oauth';

describe('getGoogleAuthUrl', () => {
  beforeAll(() => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_OAUTH_REDIRECT_URI = 'https://example.com/api/integrations/google-calendar/callback';
    process.env.GOOGLE_OAUTH_GMAIL_REDIRECT_URI = 'https://example.com/api/integrations/gmail/callback';
  });

  it('always requests prompt=consent, so Google issues a fresh refresh token even on repeat authorization (Decision Backlog Q16)', () => {
    const url = new URL(getGoogleAuthUrl('some-state'));
    expect(url.searchParams.get('prompt')).toBe('consent');
  });

  it('requests offline access, needed to receive a refresh token at all', () => {
    const url = new URL(getGoogleAuthUrl('some-state'));
    expect(url.searchParams.get('access_type')).toBe('offline');
  });

  it('includes the provided state param unchanged, for CSRF verification on callback', () => {
    const url = new URL(getGoogleAuthUrl('a-specific-state-value'));
    expect(url.searchParams.get('state')).toBe('a-specific-state-value');
  });

  it('throws a clear error if any required client credential env var is missing', () => {
    const original = process.env.GOOGLE_OAUTH_CLIENT_ID;
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    expect(() => getGoogleAuthUrl('some-state')).toThrow(
      'Google OAuth client environment variables are not fully configured.'
    );
    process.env.GOOGLE_OAUTH_CLIENT_ID = original;
  });

  it("defaults to the Calendar scope and Calendar's registered redirect URI when no integration is specified", () => {
    const url = new URL(getGoogleAuthUrl('some-state'));
    expect(url.searchParams.get('scope')).toBe('https://www.googleapis.com/auth/calendar.readonly');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://example.com/api/integrations/google-calendar/callback'
    );
  });

  it('requests the gmail.metadata scope and Gmail\'s own registered redirect URI when integration is "gmail" (Gmail Product Audit, Decision Backlog Q23)', () => {
    const url = new URL(getGoogleAuthUrl('some-state', 'gmail'));
    expect(url.searchParams.get('scope')).toBe('https://www.googleapis.com/auth/gmail.metadata');
    expect(url.searchParams.get('redirect_uri')).toBe('https://example.com/api/integrations/gmail/callback');
  });

  it('never requests the broader gmail.readonly scope for Gmail — Level 1 never reads message content', () => {
    const url = new URL(getGoogleAuthUrl('some-state', 'gmail'));
    expect(url.searchParams.get('scope')).not.toContain('gmail.readonly');
  });
});
