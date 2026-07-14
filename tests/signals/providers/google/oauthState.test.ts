import { describe, expect, it, beforeAll, vi } from 'vitest';
import { createOAuthState, verifyOAuthState } from '@/lib/signals/providers/google/oauthState';

describe('oauthState', () => {
  beforeAll(() => {
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = 'test-encryption-key-do-not-use-in-production';
  });

  it('a freshly created state verifies successfully against its own cookie and business', () => {
    const { state, cookieValue } = createOAuthState('biz-1');
    const result = verifyOAuthState(state, cookieValue, 'biz-1');
    expect(result).toBe('biz-1');
  });

  it('rejects when the cookie nonce does not match', () => {
    const { state } = createOAuthState('biz-1');
    const result = verifyOAuthState(state, 'a-completely-different-nonce', 'biz-1');
    expect(result).toBeNull();
  });

  it('rejects when the businessId does not match the currently authenticated business', () => {
    const { state, cookieValue } = createOAuthState('biz-1');
    const result = verifyOAuthState(state, cookieValue, 'biz-2');
    expect(result).toBeNull();
  });

  it('rejects when no cookie is present at all', () => {
    const { state } = createOAuthState('biz-1');
    const result = verifyOAuthState(state, undefined, 'biz-1');
    expect(result).toBeNull();
  });

  it('rejects a tampered state (signature no longer matches)', () => {
    const { state, cookieValue } = createOAuthState('biz-1');
    const tampered = Buffer.from(
      Buffer.from(state, 'base64url').toString('utf8').replace('biz-1', 'biz-9')
    ).toString('base64url');
    const result = verifyOAuthState(tampered, cookieValue, 'biz-9');
    expect(result).toBeNull();
  });

  it('rejects an expired state', () => {
    vi.useFakeTimers();
    const { state, cookieValue } = createOAuthState('biz-1');
    vi.advanceTimersByTime(11 * 60 * 1000);
    const result = verifyOAuthState(state, cookieValue, 'biz-1');
    expect(result).toBeNull();
    vi.useRealTimers();
  });

  it('rejects malformed state input', () => {
    const result = verifyOAuthState('not-valid-base64url-content-!!!', 'some-nonce', 'biz-1');
    expect(result).toBeNull();
  });
});
