import { describe, expect, it } from 'vitest';
import { filterSupersededSignals } from '@/lib/cognition/supersession';
import type { Observation } from '@/lib/cognition/types';
import type { DebtorSignalPayload } from '@/lib/signals/types';

function makeSnapshot(overrides: Partial<Observation> = {}): Observation {
  return {
    id: 'sig-1',
    businessId: 'biz-1',
    domain: 'finance',
    type: 'debtor_overdue',
    occurredAt: new Date('2026-06-30'),
    relatedEntities: {},
    payload: {
      role: 'debtor',
      counterpartyName: 'Jane Cooper',
      invoiceReference: 'INV-1',
      amount: 100,
      currency: 'ZAR',
      dueDate: '2026-06-15',
    } as DebtorSignalPayload,
    sourceProviderId: 'csv_upload',
    externalRef: 'ref-1',
    confidence: 1,
    createdAt: new Date(),
    temporality: 'snapshot',
    reportingPeriod: { start: new Date('2026-06-30'), end: new Date('2026-06-30') },
    ...overrides,
  };
}

function makeEmail(id = 'sig-email'): Observation {
  return {
    id,
    businessId: 'biz-1',
    domain: 'email',
    type: 'email_awaiting_reply',
    occurredAt: new Date(),
    relatedEntities: {},
    payload: { subject: 'Re: quotation', fromName: 'someone', preview: '', requiresReply: true, daysSinceReceived: 1 },
    sourceProviderId: 'seeded-email',
    externalRef: 'ref-email',
    confidence: 1,
    createdAt: new Date(),
  };
}

describe('filterSupersededSignals', () => {
  it('passes non-finance signals through completely unchanged', () => {
    const email = makeEmail();
    const result = filterSupersededSignals([email]);
    expect(result).toEqual([email]);
  });

  it('passes a single finance snapshot through unchanged — nothing to supersede', () => {
    const signal = makeSnapshot();
    const result = filterSupersededSignals([signal]);
    expect(result).toEqual([signal]);
  });

  it('keeps only the signal with the latest reportingPeriod.end when the same obligation appears twice', () => {
    const older = makeSnapshot({
      id: 'sig-older',
      externalRef: 'ref-older',
      reportingPeriod: { start: new Date('2026-05-31'), end: new Date('2026-05-31') },
    });
    const newer = makeSnapshot({
      id: 'sig-newer',
      externalRef: 'ref-newer',
      reportingPeriod: { start: new Date('2026-06-30'), end: new Date('2026-06-30') },
    });

    const result = filterSupersededSignals([older, newer]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('sig-newer');
  });

  it('groups by (role, counterpartyName, invoiceReference) — a different invoice reference is not superseded', () => {
    const invoice1 = makeSnapshot({ id: 'sig-1', externalRef: 'ref-1' });
    const invoice2 = makeSnapshot({
      id: 'sig-2',
      externalRef: 'ref-2',
      payload: { role: 'debtor', counterpartyName: 'Jane Cooper', invoiceReference: 'INV-2', amount: 200, currency: 'ZAR', dueDate: '2026-06-20' } as DebtorSignalPayload,
    });

    const result = filterSupersededSignals([invoice1, invoice2]);
    expect(result).toHaveLength(2);
  });

  it('does not group a debtor and creditor signal that happen to share a counterparty name and reference', () => {
    const debtor = makeSnapshot({ id: 'sig-debtor', externalRef: 'ref-d' });
    const creditor = makeSnapshot({
      id: 'sig-creditor',
      externalRef: 'ref-c',
      type: 'creditor_due',
      payload: { role: 'creditor', counterpartyName: 'Jane Cooper', invoiceReference: 'INV-1', amount: 100, currency: 'ZAR', dueDate: '2026-06-15' },
    });

    const result = filterSupersededSignals([debtor, creditor]);
    expect(result).toHaveLength(2);
  });

  it('leaves calendar and email signals untouched while superseding finance signals in the same batch', () => {
    const email = makeEmail();
    const older = makeSnapshot({
      id: 'sig-older',
      externalRef: 'ref-older',
      reportingPeriod: { start: new Date('2026-05-31'), end: new Date('2026-05-31') },
    });
    const newer = makeSnapshot({
      id: 'sig-newer',
      externalRef: 'ref-newer',
      reportingPeriod: { start: new Date('2026-06-30'), end: new Date('2026-06-30') },
    });

    const result = filterSupersededSignals([email, older, newer]);

    expect(result).toHaveLength(2);
    expect(result.map((s) => s.id).sort()).toEqual(['sig-email', 'sig-newer'].sort());
  });
});
