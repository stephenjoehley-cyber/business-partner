import { describe, expect, it } from 'vitest';
import { isSnapshotProvenanceTrustworthy } from '@/lib/cognition/provenance';

describe('isSnapshotProvenanceTrustworthy', () => {
  it('returns false when provenance is entirely absent', () => {
    expect(isSnapshotProvenanceTrustworthy(undefined)).toBe(false);
  });

  it('returns false when structurallyComplete is false', () => {
    expect(
      isSnapshotProvenanceTrustworthy({
        extractionMethod: 'structured_export',
        sourceDocumentType: 'aged_debtors',
        structurallyComplete: false,
      })
    ).toBe(false);
  });

  it('returns true when structurallyComplete is true', () => {
    expect(
      isSnapshotProvenanceTrustworthy({
        extractionMethod: 'structured_export',
        sourceDocumentType: 'aged_debtors',
        structurallyComplete: true,
      })
    ).toBe(true);
  });
});
