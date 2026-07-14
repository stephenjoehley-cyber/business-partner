import { describe, expect, it, beforeAll } from 'vitest';
import { encryptToken, decryptToken } from '@/lib/signals/providers/google/tokenStorage';

describe('tokenStorage', () => {
  beforeAll(() => {
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = 'test-encryption-key-do-not-use-in-production';
  });

  it('decrypts back to the original plain text', () => {
    const original = 'a-real-looking-refresh-token-value';
    const encrypted = encryptToken(original);
    expect(decryptToken(encrypted)).toBe(original);
  });

  it('produces different ciphertext for different inputs', () => {
    const a = encryptToken('token-a');
    const b = encryptToken('token-b');
    expect(a).not.toBe(b);
  });

  it('produces different ciphertext for the same input on repeated calls (random IV)', () => {
    const first = encryptToken('same-input');
    const second = encryptToken('same-input');
    expect(first).not.toBe(second);
    expect(decryptToken(first)).toBe('same-input');
    expect(decryptToken(second)).toBe('same-input');
  });

  it('throws if the encryption key is not set', () => {
    const original = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
    delete process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
    expect(() => encryptToken('anything')).toThrow('GOOGLE_TOKEN_ENCRYPTION_KEY');
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = original;
  });
});
