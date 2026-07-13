import { describe, expect, it } from 'vitest';
import {
  HIGH_CONFIDENCE_THRESHOLD,
  INSUFFICIENT_EVIDENCE_THRESHOLD,
  confidenceRegisterFor,
  confidenceRegisterLabel,
} from '@/lib/narrative/confidenceRegister';

describe('confidenceRegisterFor', () => {
  it('maps a confident_recommendation at or above the high-confidence threshold to confident_now', () => {
    expect(confidenceRegisterFor('confident_recommendation', HIGH_CONFIDENCE_THRESHOLD)).toBe('confident_now');
    expect(confidenceRegisterFor('confident_recommendation', 0.9)).toBe('confident_now');
  });

  it('maps a confident_recommendation below the high-confidence threshold to confident_soon', () => {
    expect(confidenceRegisterFor('confident_recommendation', 0.7)).toBe('confident_soon');
  });

  it('maps a low_confidence_insight above the insufficient-evidence floor to cautious', () => {
    expect(confidenceRegisterFor('low_confidence_insight', 0.5)).toBe('cautious');
  });

  it('maps a low_confidence_insight at or below the insufficient-evidence floor to insufficient_evidence', () => {
    expect(confidenceRegisterFor('low_confidence_insight', INSUFFICIENT_EVIDENCE_THRESHOLD)).toBe('insufficient_evidence');
    // The fallback interpreter's own floor (interpretUnknown, 0.3).
    expect(confidenceRegisterFor('low_confidence_insight', 0.3)).toBe('insufficient_evidence');
  });
});

describe('confidenceRegisterLabel', () => {
  it('never returns a percentage or number', () => {
    const registers = ['confident_now', 'confident_soon', 'cautious', 'insufficient_evidence'] as const;
    for (const register of registers) {
      expect(confidenceRegisterLabel(register)).not.toMatch(/\d/);
    }
  });
});
