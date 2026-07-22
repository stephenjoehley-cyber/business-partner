import { describe, expect, it, vi, afterEach } from 'vitest';
import { debtorOverdueInterpreter, creditorDueInterpreter } from '@/lib/cognition/interpreters/finance';
import type { BusinessContext } from '@/lib/signals/provider';
import type { DebtorSignalPayload, CreditorSignalPayload, Signal } from '@/lib/signals/types';
import type { Person } from '@prisma/client';

const FIXED_NOW = new Date('2026-07-20T09:00:00.000Z');

function makeContext(people: Partial<Person>[] = []): BusinessContext {
  return {
    business: { id: 'biz-1', name: 'Meridian Gearboxes', industry: 'Automotive' } as BusinessContext['business'],
    goals: [],
    people: people as Person[],
  };
}

function makeDebtorSignal(overrides: Partial<Signal<DebtorSignalPayload>> = {}): Signal<DebtorSignalPayload> {
  return {
    id: 'sig-1',
    businessId: 'biz-1',
    domain: 'finance',
    type: 'debtor_overdue',
    occurredAt: new Date('2026-06-30'),
    relatedEntities: {},
    payload: { role: 'debtor', counterpartyName: 'Jane Cooper', invoiceReference: 'INV-1', amount: 4500, currency: 'ZAR', dueDate: '2026-07-08' },
    sourceProviderId: 'csv_upload',
    externalRef: 'ref-1',
    confidence: 1,
    createdAt: new Date(),
    temporality: 'snapshot',
    reportingPeriod: { start: new Date('2026-06-30'), end: new Date('2026-06-30') },
    ...overrides,
  };
}

describe('debtorOverdueInterpreter', () => {
  afterEach(() => vi.useRealTimers());

  it('produces a plain-language summary with amount, currency, and days overdue', () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    const signal = makeDebtorSignal();

    const result = debtorOverdueInterpreter.interpret(signal, makeContext());

    expect(result.insight.summary).toContain('Jane Cooper');
    expect(result.insight.summary).toContain('ZAR');
    expect(result.insight.summary).toContain('4,500');
    expect(result.insight.summary).toContain('12 days overdue'); // 2026-07-08 to 2026-07-20
  });

  it('scales urgency toward 1.0 as days overdue approaches 30', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-07T09:00:00.000Z')); // 30 days after 2026-07-08
    const signal = makeDebtorSignal();

    const result = debtorOverdueInterpreter.interpret(signal, makeContext());
    expect(result.dimensions.urgency).toBe(1);
  });

  it('gives zero urgency for an invoice not yet due', () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    const signal = makeDebtorSignal({ payload: { ...makeDebtorSignal().payload, dueDate: '2026-08-01' } });

    const result = debtorOverdueInterpreter.interpret(signal, makeContext());
    expect(result.dimensions.urgency).toBe(0);
  });

  it('recognises a known customer and raises businessImpact/confidence accordingly', () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    const signal = makeDebtorSignal();
    const context = makeContext([{ id: 'p1', name: 'Jane Cooper', relationship: 'customer' }]);
    signal.relatedEntities = { personId: 'p1' };

    const result = debtorOverdueInterpreter.interpret(signal, context);

    expect(result.insight.isKnownRelationship).toBe(true);
    expect(result.dimensions.businessImpact).toBe(0.75);
    expect(result.dimensions.confidence).toBe(0.9);
    expect(result.reasoning).toContain('known customer');
  });

  it('degrades gracefully for an unmatched counterparty, never claiming a relationship that does not exist', () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    const signal = makeDebtorSignal();

    const result = debtorOverdueInterpreter.interpret(signal, makeContext());

    expect(result.insight.isKnownRelationship).toBe(false);
    expect(result.reasoning).toContain('not yet recorded in your Business Memory');
  });

  it('includes the reporting date in the reasoning', () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    const signal = makeDebtorSignal();

    const result = debtorOverdueInterpreter.interpret(signal, makeContext());
    expect(result.reasoning).toContain('Reported as at 2026-06-30');
  });
});

describe('creditorDueInterpreter', () => {
  afterEach(() => vi.useRealTimers());

  function makeCreditorSignal(dueDate: string): Signal<CreditorSignalPayload> {
    return {
      id: 'sig-2',
      businessId: 'biz-1',
      domain: 'finance',
      type: 'creditor_due',
      occurredAt: new Date('2026-06-30'),
      relatedEntities: {},
      payload: { role: 'creditor', counterpartyName: 'Office Supplies', invoiceReference: 'PO-1', amount: 300, currency: 'ZAR', dueDate },
      sourceProviderId: 'csv_upload',
      externalRef: 'ref-2',
      confidence: 1,
      createdAt: new Date(),
      temporality: 'snapshot',
      reportingPeriod: { start: new Date('2026-06-30'), end: new Date('2026-06-30') },
    };
  }

  it('gives maximum urgency to an overdue creditor obligation', () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    const result = creditorDueInterpreter.interpret(makeCreditorSignal('2026-07-01'), makeContext());
    expect(result.dimensions.urgency).toBe(1);
  });

  it('scales urgency as a not-yet-due obligation approaches its due date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    const dueTomorrow = creditorDueInterpreter.interpret(makeCreditorSignal('2026-07-21'), makeContext());
    const dueInAWeek = creditorDueInterpreter.interpret(makeCreditorSignal('2026-07-27'), makeContext());
    expect(dueTomorrow.dimensions.urgency).toBeGreaterThan(dueInAWeek.dimensions.urgency);
  });

  it('phrases a creditor obligation as owed to the counterparty, distinct from a debtor invoice', () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    const result = creditorDueInterpreter.interpret(makeCreditorSignal('2026-07-01'), makeContext());
    expect(result.insight.summary).toContain('owed to Office Supplies');
  });
});
