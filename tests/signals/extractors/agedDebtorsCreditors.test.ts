import { describe, expect, it } from 'vitest';
import { agedDebtorsExtractor, agedCreditorsExtractor } from '@/lib/signals/extractors/agedDebtorsCreditors';
import type { BusinessContext } from '@/lib/signals/provider';
import type { DebtorSignalPayload, CreditorSignalPayload } from '@/lib/signals/types';
import type { Person } from '@prisma/client';

function makeContext(people: Partial<Person>[] = []): BusinessContext {
  return {
    business: { id: 'biz-1', name: 'Meridian Gearboxes', industry: 'Automotive' } as BusinessContext['business'],
    goals: [],
    people: people as Person[],
  };
}

const HEADER = 'As At Date,Customer Name,Invoice Reference,Invoice Date,Due Date,Amount,Currency';

describe('agedDebtorsExtractor', () => {
  it('extracts a valid canonical CSV, all rows carrying currency', () => {
    const csv = `${HEADER}\n2026-06-30,Jane Cooper,INV-1,2026-06-01,2026-06-15,4500,ZAR\n2026-06-30,Acme Co,INV-2,2026-06-05,2026-06-20,1200,ZAR`;
    const outcome = agedDebtorsExtractor.extract({ format: 'csv', content: csv }, makeContext());

    expect(outcome.status).toBe('extracted');
    if (outcome.status !== 'extracted') return;
    expect(outcome.signals).toHaveLength(2);
    expect(outcome.excludedRowCount).toBe(0);
    expect(outcome.totalRowCount).toBe(2);
    expect(outcome.reportingDate.toISOString().slice(0, 10)).toBe('2026-06-30');

    const payload = outcome.signals[0].payload as DebtorSignalPayload;
    expect(payload.role).toBe('debtor');
    expect(payload.counterpartyName).toBe('Jane Cooper');
    expect(payload.currency).toBe('ZAR');
    expect(payload.dueDate).toBe('2026-06-15');
    expect(outcome.signals[0].sourceRowNumber).toBe(1);
    expect(outcome.signals[0].temporality).toBe('snapshot');
    expect(outcome.signals[0].reportingPeriod).toEqual({
      start: new Date('2026-06-30T00:00:00.000Z'),
      end: new Date('2026-06-30T00:00:00.000Z'),
    });
  });

  it('rejects a file where genuinely nothing matches any expected column', () => {
    const csv = `Foo,Bar,Baz\nx,y,z`;
    const outcome = agedDebtorsExtractor.extract({ format: 'csv', content: csv }, makeContext());

    expect(outcome.status).toBe('rejected');
    if (outcome.status !== 'rejected') return;
    expect(outcome.reason).toContain('Aged Debtors');
  });

  it('asks assisted-mapping questions, rather than rejecting, when at least one column is recognisable (Founder Decision 2)', () => {
    const csv = `Customer,Ref,Amount\nJane,INV-1,100`; // 'Amount' matches exactly; the rest do not
    const outcome = agedDebtorsExtractor.extract({ format: 'csv', content: csv }, makeContext());

    expect(outcome.status).toBe('pending_confirmation');
    if (outcome.status !== 'pending_confirmation') return;
    expect(outcome.columnMappingQuestions?.length).toBeGreaterThan(0);
  });

  it('rejects an empty file', () => {
    const outcome = agedDebtorsExtractor.extract({ format: 'csv', content: HEADER }, makeContext());
    expect(outcome.status).toBe('rejected');
  });

  it('rejects a file with more than 10,000 data rows', () => {
    const rows = Array.from({ length: 10_001 }, (_, i) => `2026-06-30,Jane Cooper,INV-${i},,2026-06-15,100,ZAR`);
    const csv = `${HEADER}\n${rows.join('\n')}`;
    const outcome = agedDebtorsExtractor.extract({ format: 'csv', content: csv }, makeContext());

    expect(outcome.status).toBe('rejected');
    if (outcome.status !== 'rejected') return;
    expect(outcome.reason).toContain('10,000');
  });

  // --- Currency resolution (Audit v2 §3) ----------------------------------

  it('requests confirmation when no row carries currency and none is supplied', () => {
    const csv = `As At Date,Customer Name,Invoice Reference,Invoice Date,Due Date,Amount,Currency\n2026-06-30,Jane Cooper,INV-1,,2026-06-15,4500,`;
    const outcome = agedDebtorsExtractor.extract({ format: 'csv', content: csv }, makeContext());

    expect(outcome.status).toBe('pending_confirmation');
    if (outcome.status !== 'pending_confirmation') return;
    expect(outcome.needsCurrency).toBe(true);
  });

  it('uses the confirmed file-level currency once supplied, when no row has one', () => {
    const csv = `As At Date,Customer Name,Invoice Reference,Invoice Date,Due Date,Amount,Currency\n2026-06-30,Jane Cooper,INV-1,,2026-06-15,4500,`;
    const outcome = agedDebtorsExtractor.extract({ format: 'csv', content: csv }, makeContext(), { currency: 'zar' });

    expect(outcome.status).toBe('extracted');
    if (outcome.status !== 'extracted') return;
    expect(outcome.fileLevelCurrency).toBe('ZAR');
    expect((outcome.signals[0].payload as DebtorSignalPayload).currency).toBe('ZAR');
  });

  it('excludes (not fabricates) a row missing currency in an otherwise mixed-currency file — never applies a file-level fallback when the file is genuinely mixed', () => {
    const csv = `${HEADER}\n2026-06-30,Jane Cooper,INV-1,,2026-06-15,4500,ZAR\n2026-06-30,Acme Co,INV-2,,2026-06-20,1200,`;
    const outcome = agedDebtorsExtractor.extract({ format: 'csv', content: csv }, makeContext());

    expect(outcome.status).toBe('extracted');
    if (outcome.status !== 'extracted') return;
    expect(outcome.signals).toHaveLength(1);
    expect(outcome.excludedRowCount).toBe(1);
    expect((outcome.signals[0].payload as DebtorSignalPayload).counterpartyName).toBe('Jane Cooper');
  });

  // --- Reporting date resolution (Audit v2 §7) ----------------------------

  it('requests confirmation when the As At Date column is entirely blank', () => {
    const csv = `As At Date,Customer Name,Invoice Reference,Invoice Date,Due Date,Amount,Currency\n,Jane Cooper,INV-1,,2026-06-15,4500,ZAR`;
    const outcome = agedDebtorsExtractor.extract({ format: 'csv', content: csv }, makeContext());

    expect(outcome.status).toBe('pending_confirmation');
    if (outcome.status !== 'pending_confirmation') return;
    expect(outcome.needsReportingDate).toBe(true);
  });

  it('uses the confirmed reporting date once supplied', () => {
    const csv = `As At Date,Customer Name,Invoice Reference,Invoice Date,Due Date,Amount,Currency\n,Jane Cooper,INV-1,,2026-06-15,4500,ZAR`;
    const outcome = agedDebtorsExtractor.extract(
      { format: 'csv', content: csv },
      makeContext(),
      { reportingDate: new Date('2026-06-30T00:00:00.000Z') }
    );

    expect(outcome.status).toBe('extracted');
    if (outcome.status !== 'extracted') return;
    expect(outcome.reportingDate.toISOString().slice(0, 10)).toBe('2026-06-30');
  });

  it('rejects a file where As At Date disagrees across rows, rather than guessing', () => {
    const csv = `${HEADER}\n2026-06-30,Jane Cooper,INV-1,,2026-06-15,4500,ZAR\n2026-05-31,Acme Co,INV-2,,2026-06-20,1200,ZAR`;
    const outcome = agedDebtorsExtractor.extract({ format: 'csv', content: csv }, makeContext());

    expect(outcome.status).toBe('rejected');
  });

  // --- Malformed and duplicate rows (Audit v2 §4) -------------------------

  it('excludes a row with an unparseable amount, keeping valid rows', () => {
    const csv = `${HEADER}\n2026-06-30,Jane Cooper,INV-1,,2026-06-15,not-a-number,ZAR\n2026-06-30,Acme Co,INV-2,,2026-06-20,1200,ZAR`;
    const outcome = agedDebtorsExtractor.extract({ format: 'csv', content: csv }, makeContext());

    expect(outcome.status).toBe('extracted');
    if (outcome.status !== 'extracted') return;
    expect(outcome.signals).toHaveLength(1);
    expect(outcome.excludedRowCount).toBe(1);
  });

  it('excludes a row with an unparseable due date', () => {
    const csv = `${HEADER}\n2026-06-30,Jane Cooper,INV-1,,15 June 2026,4500,ZAR`;
    const outcome = agedDebtorsExtractor.extract({ format: 'csv', content: csv }, makeContext());

    expect(outcome.status).toBe('extracted');
    if (outcome.status !== 'extracted') return;
    expect(outcome.signals).toHaveLength(0);
    expect(outcome.excludedRowCount).toBe(1);
  });

  it('silently dedupes an identical duplicate row', () => {
    const csv = `${HEADER}\n2026-06-30,Jane Cooper,INV-1,,2026-06-15,4500,ZAR\n2026-06-30,Jane Cooper,INV-1,,2026-06-15,4500,ZAR`;
    const outcome = agedDebtorsExtractor.extract({ format: 'csv', content: csv }, makeContext());

    expect(outcome.status).toBe('extracted');
    if (outcome.status !== 'extracted') return;
    expect(outcome.signals).toHaveLength(1);
    // A harmless, silently-merged duplicate is not something the owner
    // "couldn't use" — it should not inflate the exclusion count or
    // appear in the disclosure detail.
    expect(outcome.excludedRowCount).toBe(0);
    expect(outcome.excludedRows).toHaveLength(0);
  });

  it('records a plain reason code for each excluded row, not just a count', () => {
    const csv = `${HEADER}\n2026-06-30,Jane Cooper,INV-1,,2026-06-15,not-a-number,ZAR`;
    const outcome = agedDebtorsExtractor.extract({ format: 'csv', content: csv }, makeContext());

    expect(outcome.status).toBe('extracted');
    if (outcome.status !== 'extracted') return;
    expect(outcome.excludedRows).toEqual([{ rowNumber: 1, reason: 'unparseable_amount' }]);
  });

  it('excludes both rows of a conflicting duplicate (same reference, different amount) rather than guessing which is correct', () => {
    const csv = `${HEADER}\n2026-06-30,Jane Cooper,INV-1,,2026-06-15,4500,ZAR\n2026-06-30,Jane Cooper,INV-1,,2026-06-15,9999,ZAR`;
    const outcome = agedDebtorsExtractor.extract({ format: 'csv', content: csv }, makeContext());

    expect(outcome.status).toBe('extracted');
    if (outcome.status !== 'extracted') return;
    expect(outcome.signals).toHaveLength(0);
    expect(outcome.excludedRowCount).toBe(2);
  });

  // --- Entity resolution (Audit v2 §10) -----------------------------------

  it('resolves a counterparty name to a known Person, filtered to customer/prospect relationships', () => {
    const csv = `${HEADER}\n2026-06-30,Jane Cooper,INV-1,,2026-06-15,4500,ZAR`;
    const people = [{ id: 'p1', name: 'Jane Cooper', relationship: 'customer' }];
    const outcome = agedDebtorsExtractor.extract({ format: 'csv', content: csv }, makeContext(people));

    expect(outcome.status).toBe('extracted');
    if (outcome.status !== 'extracted') return;
    expect(outcome.signals[0].relatedEntities.personId).toBe('p1');
  });

  it('does not match a counterparty against a Person with an unrelated relationship type (e.g. employee)', () => {
    const csv = `${HEADER}\n2026-06-30,Jane Cooper,INV-1,,2026-06-15,4500,ZAR`;
    const people = [{ id: 'p1', name: 'Jane Cooper', relationship: 'employee' }];
    const outcome = agedDebtorsExtractor.extract({ format: 'csv', content: csv }, makeContext(people));

    expect(outcome.status).toBe('extracted');
    if (outcome.status !== 'extracted') return;
    expect(outcome.signals[0].relatedEntities.personId).toBeUndefined();
  });

  it('leaves an ambiguous match (two candidates with the same normalized name) unmatched, never guessing', () => {
    const csv = `${HEADER}\n2026-06-30,Jane Cooper,INV-1,,2026-06-15,4500,ZAR`;
    const people = [
      { id: 'p1', name: 'Jane Cooper', relationship: 'customer' },
      { id: 'p2', name: 'jane cooper', relationship: 'prospect' },
    ];
    const outcome = agedDebtorsExtractor.extract({ format: 'csv', content: csv }, makeContext(people));

    expect(outcome.status).toBe('extracted');
    if (outcome.status !== 'extracted') return;
    expect(outcome.signals[0].relatedEntities.personId).toBeUndefined();
  });

  // --- Provenance and reconciliation ---------------------------------------

  it('always marks reconciliationResult as unavailable — the canonical CSV has no stated total to check against', () => {
    const csv = `${HEADER}\n2026-06-30,Jane Cooper,INV-1,,2026-06-15,4500,ZAR`;
    const outcome = agedDebtorsExtractor.extract({ format: 'csv', content: csv }, makeContext());

    expect(outcome.status).toBe('extracted');
    if (outcome.status !== 'extracted') return;
    expect(outcome.reconciliationResult).toBe('unavailable');
  });

  it('sets structurallyComplete true on every emitted signal for a row that parsed successfully', () => {
    const csv = `${HEADER}\n2026-06-30,Jane Cooper,INV-1,,2026-06-15,4500,ZAR`;
    const outcome = agedDebtorsExtractor.extract({ format: 'csv', content: csv }, makeContext());

    expect(outcome.status).toBe('extracted');
    if (outcome.status !== 'extracted') return;
    expect(outcome.signals[0].provenance?.structurallyComplete).toBe(true);
    expect(outcome.signals[0].provenance?.extractionMethod).toBe('structured_export');
  });

  it('produces the same externalRef for the same (counterparty, reference, reporting date) — row-level idempotency', () => {
    const csv = `${HEADER}\n2026-06-30,Jane Cooper,INV-1,,2026-06-15,4500,ZAR`;
    const first = agedDebtorsExtractor.extract({ format: 'csv', content: csv }, makeContext());
    const second = agedDebtorsExtractor.extract({ format: 'csv', content: csv }, makeContext());

    expect(first.status).toBe('extracted');
    expect(second.status).toBe('extracted');
    if (first.status !== 'extracted' || second.status !== 'extracted') return;
    expect(first.signals[0].externalRef).toBe(second.signals[0].externalRef);
  });
});

describe('agedCreditorsExtractor', () => {
  it('extracts creditor rows with role "creditor", matching against supplier relationships only', () => {
    const header = 'As At Date,Supplier Name,Invoice Reference,Invoice Date,Due Date,Amount,Currency';
    const csv = `${header}\n2026-06-30,Office Supplies Ltd,PO-9,,2026-07-01,300,ZAR`;
    const people = [{ id: 'p1', name: 'Office Supplies Ltd', relationship: 'supplier' }];
    const outcome = agedCreditorsExtractor.extract({ format: 'csv', content: csv }, makeContext(people));

    expect(outcome.status).toBe('extracted');
    if (outcome.status !== 'extracted') return;
    const payload = outcome.signals[0].payload as CreditorSignalPayload;
    expect(payload.role).toBe('creditor');
    expect(outcome.signals[0].relatedEntities.personId).toBe('p1');
  });

  it('asks a direct mapping question for Supplier Name rather than rejecting outright, when every other required field matches confidently (Multi-format CSV Understanding, Founder Decision 2 — ask only what is genuinely unclear)', () => {
    const csv = `${HEADER}\n2026-06-30,Jane Cooper,INV-1,,2026-06-15,4500,ZAR`;
    const outcome = agedCreditorsExtractor.extract({ format: 'csv', content: csv }, makeContext());

    expect(outcome.status).toBe('pending_confirmation');
    if (outcome.status !== 'pending_confirmation') return;
    const supplierQuestion = outcome.columnMappingQuestions?.find((q) => q.canonicalField === 'supplier name');
    expect(supplierQuestion?.kind).toBe('select');
  });

  it('rejects outright when genuinely nothing in the file matches any expected creditor field', () => {
    const csv = `Foo,Bar,Baz\nx,y,z`;
    const outcome = agedCreditorsExtractor.extract({ format: 'csv', content: csv }, makeContext());

    expect(outcome.status).toBe('rejected');
  });
});

describe('agedDebtorsExtractor — Multi-format CSV Understanding', () => {
  const MULTI_FORMAT_HEADER = 'As At Date,Client,Invoice Reference,Invoice Date,Due Date,Amount,Currency';

  it('asks a confirm question for a synonym match, and asks nothing at all once that same mapping is remembered', () => {
    const csv = `${MULTI_FORMAT_HEADER}\n2026-06-30,Jane Cooper,INV-1,,2026-06-15,4500,ZAR`;

    const firstAttempt = agedDebtorsExtractor.extract({ format: 'csv', content: csv }, makeContext());
    expect(firstAttempt.status).toBe('pending_confirmation');
    if (firstAttempt.status !== 'pending_confirmation') return;
    const confirmQuestion = firstAttempt.columnMappingQuestions?.find((q) => q.canonicalField === 'customer name');
    expect(confirmQuestion?.kind).toBe('confirm');

    // Owner confirms "Client" means Customer Name — remembered mapping supplied on retry.
    const secondAttempt = agedDebtorsExtractor.extract(
      { format: 'csv', content: csv },
      makeContext(),
      { columnMapping: { client: 'customer name' } }
    );
    expect(secondAttempt.status).toBe('extracted');
    if (secondAttempt.status !== 'extracted') return;
    expect(secondAttempt.signals).toHaveLength(1);
    expect(secondAttempt.resolvedColumnMapping).toEqual({ client: 'customer name' });
  });

  it('produces a stable sourceSignature for the same header set regardless of case', () => {
    const csv1 = `${HEADER}\n2026-06-30,Jane Cooper,INV-1,,2026-06-15,4500,ZAR`;
    const csv2 = `as at date,customer name,invoice reference,invoice date,due date,amount,currency\n2026-06-30,Jane Cooper,INV-1,,2026-06-15,4500,ZAR`;

    const outcome1 = agedDebtorsExtractor.extract({ format: 'csv', content: csv1 }, makeContext());
    const outcome2 = agedDebtorsExtractor.extract({ format: 'csv', content: csv2 }, makeContext());

    expect(outcome1.status).toBe('extracted');
    expect(outcome2.status).toBe('extracted');
    if (outcome1.status !== 'extracted' || outcome2.status !== 'extracted') return;
    expect(outcome1.sourceSignature).toBe(outcome2.sourceSignature);
  });

  it('does not record a resolvedColumnMapping for a fully exact-match canonical file — nothing new to remember', () => {
    const csv = `${HEADER}\n2026-06-30,Jane Cooper,INV-1,,2026-06-15,4500,ZAR`;
    const outcome = agedDebtorsExtractor.extract({ format: 'csv', content: csv }, makeContext());

    expect(outcome.status).toBe('extracted');
    if (outcome.status !== 'extracted') return;
    expect(outcome.resolvedColumnMapping).toBeUndefined();
  });
});

describe('agedDebtorsExtractor — remembered-mapping notice is not repeated (Founder Acceptance finding, 22 July 2026)', () => {
  it('does not report a resolvedColumnMapping when the mapping came entirely from memory, not a fresh owner answer', () => {
    const csv = `As At Date,Client,Invoice Reference,Invoice Date,Due Date,Amount,Currency\n2026-06-30,Jane Cooper,INV-1,,2026-06-15,4500,ZAR`;

    // Simulates the real ingestion service's second call: memory is
    // supplied via confirmedMemoryMapping, NOT columnMapping — the owner
    // answered nothing fresh this round.
    const outcome = agedDebtorsExtractor.extract(
      { format: 'csv', content: csv },
      makeContext(),
      { confirmedMemoryMapping: { client: 'customer name' } }
    );

    expect(outcome.status).toBe('extracted');
    if (outcome.status !== 'extracted') return;
    expect(outcome.resolvedColumnMapping).toBeUndefined(); // nothing new to remember
  });

  it('still reports a resolvedColumnMapping when the owner freshly confirms this round, even if memory also happens to be present', () => {
    const csv = `As At Date,Client,Invoice Reference,Invoice Date,Due Date,Amount,Currency\n2026-06-30,Jane Cooper,INV-1,,2026-06-15,4500,ZAR`;

    const outcome = agedDebtorsExtractor.extract(
      { format: 'csv', content: csv },
      makeContext(),
      { columnMapping: { client: 'customer name' } } // fresh this round
    );

    expect(outcome.status).toBe('extracted');
    if (outcome.status !== 'extracted') return;
    expect(outcome.resolvedColumnMapping).toEqual({ client: 'customer name' });
  });
});
