import { describe, expect, it, vi, afterEach } from 'vitest';
import { hasWorldInherentConsequence } from '@/lib/cognition/financeQualificationPolicy';
import type { Signal, DebtorSignalPayload, CreditorSignalPayload } from '@/lib/signals/types';

function makeDebtorSignal(dueDate: string): Signal<DebtorSignalPayload> {
  return {
    id: 'sig-1',
    businessId: 'biz-1',
    domain: 'finance',
    type: 'debtor_overdue',
    occurredAt: new Date(),
    relatedEntities: {},
    payload: { role: 'debtor', counterpartyName: 'Jane Cooper', invoiceReference: 'INV-1', amount: 100, currency: 'ZAR', dueDate },
    sourceProviderId: 'csv_upload',
    externalRef: 'ref-1',
    confidence: 1,
    createdAt: new Date(),
  };
}

function makeCreditorSignal(dueDate: string): Signal<CreditorSignalPayload> {
  return {
    id: 'sig-2',
    businessId: 'biz-1',
    domain: 'finance',
    type: 'creditor_due',
    occurredAt: new Date(),
    relatedEntities: {},
    payload: { role: 'creditor', counterpartyName: 'Office Supplies', invoiceReference: 'PO-1', amount: 100, currency: 'ZAR', dueDate },
    sourceProviderId: 'csv_upload',
    externalRef: 'ref-2',
    confidence: 1,
    createdAt: new Date(),
  };
}

describe('hasWorldInherentConsequence', () => {
  const FIXED_NOW = new Date('2026-07-20T12:00:00.000Z');

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not qualify a debtor invoice due today (not yet overdue)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    expect(hasWorldInherentConsequence(makeDebtorSignal('2026-07-20'))).toBe(false);
  });

  it('qualifies a debtor invoice overdue by exactly one day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    expect(hasWorldInherentConsequence(makeDebtorSignal('2026-07-19'))).toBe(true);
  });

  it('does not qualify a debtor invoice not yet due', () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    expect(hasWorldInherentConsequence(makeDebtorSignal('2026-08-01'))).toBe(false);
  });

  it('qualifies a creditor obligation due in exactly 7 days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    expect(hasWorldInherentConsequence(makeCreditorSignal('2026-07-27'))).toBe(true);
  });

  it('does not qualify a creditor obligation due in 8 days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    expect(hasWorldInherentConsequence(makeCreditorSignal('2026-07-28'))).toBe(false);
  });

  it('qualifies an overdue creditor obligation', () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    expect(hasWorldInherentConsequence(makeCreditorSignal('2026-07-01'))).toBe(true);
  });

  it('returns false for a non-finance signal', () => {
    const signal = { ...makeDebtorSignal('2026-07-01'), domain: 'email' } as unknown as Signal;
    expect(hasWorldInherentConsequence(signal)).toBe(false);
  });
});
