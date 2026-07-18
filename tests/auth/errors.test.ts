import { describe, expect, it } from 'vitest';
import { humanizeAuthError } from '@/lib/auth/errors';

describe('humanizeAuthError', () => {
  it('maps invalid credentials to calm, actionable language', () => {
    expect(humanizeAuthError('Invalid login credentials')).toBe(
      "We couldn't sign you in with those details. Check your email and password and try again."
    );
  });

  it('maps unconfirmed email to a distinct message, not the generic fallback', () => {
    const result = humanizeAuthError('Email not confirmed');
    expect(result).toContain('confirm your email');
  });

  it('maps duplicate registration to a distinct message pointing at sign in', () => {
    const result = humanizeAuthError('User already registered');
    expect(result).toContain('already exists');
  });

  it('maps a short-password error to the 8-character requirement', () => {
    const result = humanizeAuthError('Password should be at least 6 characters');
    expect(result).toContain('8 characters');
  });

  it('falls back to a generic, calm message for unrecognized errors, never raw provider text', () => {
    const result = humanizeAuthError('AuthApiError: some_internal_provider_code_xyz');
    expect(result).toBe('Something went wrong. Please try again in a moment.');
    expect(result).not.toContain('AuthApiError');
  });
});
