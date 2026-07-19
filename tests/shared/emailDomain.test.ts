import { describe, expect, it } from 'vitest';
import { companyDomainHint } from '@/lib/shared/emailDomain';

describe('companyDomainHint', () => {
  it('returns the literal domain for a real organisational email address', () => {
    expect(companyDomainHint('hello@mzansichat.co.za')).toBe('mzansichat.co.za');
  });

  it('never capitalises or guesses a company name from the domain — Executive Honesty constraint, CPO, 19 July 2026', () => {
    const result = companyDomainHint('hello@mzansichat.co.za');
    expect(result).toBe('mzansichat.co.za');
    expect(result).not.toBe('Mzansichat');
    expect(result).not.toBe('MzansiChat');
  });

  it('returns undefined for common generic consumer email providers', () => {
    expect(companyDomainHint('someone@gmail.com')).toBeUndefined();
    expect(companyDomainHint('someone@yahoo.com')).toBeUndefined();
    expect(companyDomainHint('someone@outlook.com')).toBeUndefined();
    expect(companyDomainHint('someone@icloud.com')).toBeUndefined();
  });

  it('returns undefined for a string that is not an email address at all (a real display name)', () => {
    expect(companyDomainHint('Sam Rivera')).toBeUndefined();
  });

  it('is case-insensitive when checking generic providers', () => {
    expect(companyDomainHint('Someone@Gmail.com')).toBeUndefined();
  });
});
