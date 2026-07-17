import { describe, expect, it } from 'vitest';
import { normalizePreferredName } from '@/lib/settings/preferredName';

describe('normalizePreferredName', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizePreferredName('  Sarah  ')).toBe('Sarah');
  });

  it('returns null for an empty string, so saving blank reverts to the fallback', () => {
    expect(normalizePreferredName('')).toBeNull();
  });

  it('returns null for a whitespace-only string', () => {
    expect(normalizePreferredName('   ')).toBeNull();
  });

  it('caps length at 60 characters rather than rejecting the input', () => {
    const long = 'a'.repeat(100);
    const result = normalizePreferredName(long);
    expect(result).toHaveLength(60);
    expect(result).toBe('a'.repeat(60));
  });

  it('leaves a normal name unchanged', () => {
    expect(normalizePreferredName('Stephen')).toBe('Stephen');
  });
});
