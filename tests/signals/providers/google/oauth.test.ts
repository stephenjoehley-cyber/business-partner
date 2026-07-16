import { describe, expect, it, beforeAll } from 'vitest';
import { getGoogleAuthUrl } from '@/lib/signals/providers/google/oauth';

describe('getGoogleAuthUrl', () => {
  beforeAll(() => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_OAUTH_REDIRECT_URI = 'https://example.com/api/integrations/google-calendar/callback';
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
});
