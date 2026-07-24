import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/brain/repository', () => ({
  getBusinessById: vi.fn(),
}));

vi.mock('@/lib/signals/repository', () => ({
  persistSignals: vi.fn(),
}));

vi.mock('@/lib/signals/sourceRepository', () => ({
  createSignalSource: vi.fn(),
  findSignalSourceByChecksum: vi.fn(),
  updateSignalSource: vi.fn(),
}));

vi.mock('@/lib/signals/confirmedColumnMappingRepository', () => {
  class ConfirmedMappingConflictError extends Error {
    conflictingHeaders: string[];
    constructor(conflictingHeaders: string[]) {
      super(`Confirmed mapping conflict for headers: ${conflictingHeaders.join(', ')}`);
      this.name = 'ConfirmedMappingConflictError';
      this.conflictingHeaders = conflictingHeaders;
    }
  }
  return {
    findConfirmedColumnMapping: vi.fn(),
    upsertConfirmedColumnMapping: vi.fn(),
    ConfirmedMappingConflictError,
  };
});

import { getBusinessById } from '@/lib/brain/repository';
import { persistSignals } from '@/lib/signals/repository';
import { createSignalSource, findSignalSourceByChecksum, updateSignalSource } from '@/lib/signals/sourceRepository';
import { findConfirmedColumnMapping, upsertConfirmedColumnMapping, ConfirmedMappingConflictError } from '@/lib/signals/confirmedColumnMappingRepository';
import { ingestDocument } from '@/lib/orchestrator/signalIngestion';

const getBusinessByIdMock = getBusinessById as unknown as ReturnType<typeof vi.fn>;
const persistSignalsMock = persistSignals as unknown as ReturnType<typeof vi.fn>;
const createSignalSourceMock = createSignalSource as unknown as ReturnType<typeof vi.fn>;
const findSignalSourceByChecksumMock = findSignalSourceByChecksum as unknown as ReturnType<typeof vi.fn>;
const updateSignalSourceMock = updateSignalSource as unknown as ReturnType<typeof vi.fn>;
const findConfirmedColumnMappingMock = findConfirmedColumnMapping as unknown as ReturnType<typeof vi.fn>;
const upsertConfirmedColumnMappingMock = upsertConfirmedColumnMapping as unknown as ReturnType<typeof vi.fn>;

const BUSINESS = { id: 'biz-1', name: 'Meridian Gearboxes', industry: 'Automotive', goals: [], people: [] };

const VALID_CSV = `As At Date,Customer Name,Invoice Reference,Invoice Date,Due Date,Amount,Currency\n2026-06-30,Jane Cooper,INV-1,,2026-06-15,4500,ZAR`;

describe('ingestDocument', () => {
  beforeEach(() => {
    getBusinessByIdMock.mockReset();
    persistSignalsMock.mockReset();
    createSignalSourceMock.mockReset();
    findSignalSourceByChecksumMock.mockReset();
    updateSignalSourceMock.mockReset();
    findConfirmedColumnMappingMock.mockReset();
    upsertConfirmedColumnMappingMock.mockReset();

    getBusinessByIdMock.mockResolvedValue(BUSINESS);
    findSignalSourceByChecksumMock.mockResolvedValue(undefined);
    findConfirmedColumnMappingMock.mockResolvedValue(undefined);
    upsertConfirmedColumnMappingMock.mockResolvedValue(undefined);
    createSignalSourceMock.mockImplementation(async (input) => ({ id: 'source-1', ...input, createdAt: new Date() }));
    updateSignalSourceMock.mockImplementation(async (id, updates) => ({ id, ...updates }));
    persistSignalsMock.mockResolvedValue([]);
  });

  it('throws if the business does not exist', async () => {
    getBusinessByIdMock.mockResolvedValue(null);
    await expect(
      ingestDocument('missing-biz', 'aged_debtors', { filename: 'x.csv', content: VALID_CSV })
    ).rejects.toThrow('No business found');
  });

  it('returns duplicate for a byte-identical re-upload, without calling persistSignals again', async () => {
    findSignalSourceByChecksumMock.mockResolvedValue({ id: 'source-existing', status: 'completed' });

    const result = await ingestDocument('biz-1', 'aged_debtors', { filename: 'x.csv', content: VALID_CSV });

    expect(result.status).toBe('duplicate');
    expect(persistSignalsMock).not.toHaveBeenCalled();
    expect(createSignalSourceMock).not.toHaveBeenCalled();
  });

  it('creates a rejected SignalSource and returns the reason for a structurally mismatched file', async () => {
    const result = await ingestDocument('biz-1', 'aged_debtors', {
      filename: 'wrong.csv',
      content: 'Customer,Ref\nJane,INV-1',
    });

    expect(result.status).toBe('rejected');
    expect(createSignalSourceMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'rejected' }));
    expect(persistSignalsMock).not.toHaveBeenCalled();
  });

  it('returns pending_confirmation without persisting any signals when currency is absent file-wide', async () => {
    const csvMissingCurrency = `As At Date,Customer Name,Invoice Reference,Invoice Date,Due Date,Amount,Currency\n2026-06-30,Jane Cooper,INV-1,,2026-06-15,4500,`;

    const result = await ingestDocument('biz-1', 'aged_debtors', { filename: 'x.csv', content: csvMissingCurrency });

    expect(result.status).toBe('pending_confirmation');
    if (result.status !== 'pending_confirmation') return;
    expect(result.needsCurrency).toBe(true);
    expect(persistSignalsMock).not.toHaveBeenCalled();
    expect(createSignalSourceMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending_confirmation' }));
  });

  it('reuses the existing pending SignalSource on a follow-up confirmation call, rather than creating a second one', async () => {
    const csvMissingCurrency = `As At Date,Customer Name,Invoice Reference,Invoice Date,Due Date,Amount,Currency\n2026-06-30,Jane Cooper,INV-1,,2026-06-15,4500,`;
    findSignalSourceByChecksumMock.mockResolvedValue({ id: 'source-pending', status: 'pending_confirmation' });

    const result = await ingestDocument(
      'biz-1',
      'aged_debtors',
      { filename: 'x.csv', content: csvMissingCurrency },
      { currency: 'ZAR' }
    );

    expect(result.status).toBe('completed');
    expect(createSignalSourceMock).not.toHaveBeenCalled(); // reused, not recreated
  });

  it('persists signals tagged with the SignalSource id and marks the source completed on success', async () => {
    createSignalSourceMock.mockResolvedValue({ id: 'source-new', status: 'processing' });
    updateSignalSourceMock.mockResolvedValue({ id: 'source-new', status: 'completed' });

    const result = await ingestDocument('biz-1', 'aged_debtors', { filename: 'x.csv', content: VALID_CSV });

    expect(result.status).toBe('completed');
    expect(persistSignalsMock).toHaveBeenCalledTimes(1);
    const [, signals] = persistSignalsMock.mock.calls[0];
    expect(signals[0].sourceId).toBe('source-new');
    expect(updateSignalSourceMock).toHaveBeenCalledWith('source-new', { status: 'completed' });
  });

  it('passes excludedRows through to createSignalSource — Financial Evidence History, 23 July 2026', async () => {
    createSignalSourceMock.mockResolvedValue({ id: 'source-new', status: 'processing' });
    updateSignalSourceMock.mockResolvedValue({ id: 'source-new', status: 'completed' });

    await ingestDocument('biz-1', 'aged_debtors', { filename: 'x.csv', content: VALID_CSV });

    expect(createSignalSourceMock).toHaveBeenCalledWith(expect.objectContaining({ excludedRows: expect.any(Array) }));
  });

  it('computes qualifiedCount from real Qualification, not just how many signals were persisted', async () => {
    createSignalSourceMock.mockResolvedValue({ id: 'source-new', status: 'processing' });
    updateSignalSourceMock.mockResolvedValue({ id: 'source-new', status: 'completed' });
    // Overdue by well over a day as of any real test-run date — qualifies
    // as world-inherent regardless of grounding, per F1's real rule.
    persistSignalsMock.mockResolvedValue([
      {
        id: 'sig-1',
        businessId: 'biz-1',
        domain: 'finance',
        type: 'debtor_overdue',
        occurredAt: new Date('2026-06-30'),
        relatedEntities: {},
        payload: { role: 'debtor', counterpartyName: 'Jane Cooper', invoiceReference: 'INV-1', amount: 4500, currency: 'ZAR', dueDate: '2020-01-01' },
        sourceProviderId: 'csv_upload',
        externalRef: 'ref-1',
        confidence: 1,
        createdAt: new Date(),
        temporality: 'snapshot',
        reportingPeriod: { start: new Date('2026-06-30'), end: new Date('2026-06-30') },
        provenance: { extractionMethod: 'structured_export', sourceDocumentType: 'aged_debtors', structurallyComplete: true },
      },
    ]);

    const result = await ingestDocument('biz-1', 'aged_debtors', { filename: 'x.csv', content: VALID_CSV });

    expect(result.status).toBe('completed');
    if (result.status !== 'completed') return;
    expect(result.qualifiedCount).toBe(1);
  });

  it('short-circuits on an existing completed duplicate even before the extractor runs — checksum is content-based, not filename-based', async () => {
    findSignalSourceByChecksumMock.mockResolvedValue({ id: 'source-dup', status: 'completed' });

    // Different filename, identical content — still a duplicate.
    const result = await ingestDocument('biz-1', 'aged_debtors', { filename: 'different-name.csv', content: VALID_CSV });

    expect(result.status).toBe('duplicate');
  });

  it('looks up a Confirmed Mapping Memory record for this header set before extraction, and remembers a new mapping after a successful upload', async () => {
    const csvWithSynonym = `As At Date,Client,Invoice Reference,Invoice Date,Due Date,Amount,Currency\n2026-06-30,Jane Cooper,INV-1,,2026-06-15,4500,ZAR`;

    // Owner supplies the confirmation this round.
    const result = await ingestDocument(
      'biz-1',
      'aged_debtors',
      { filename: 'x.csv', content: csvWithSynonym },
      { columnMapping: { client: 'customer name' } }
    );

    expect(findConfirmedColumnMappingMock).toHaveBeenCalledWith('biz-1', 'aged_debtors', expect.any(String));
    expect(result.status).toBe('completed');
    expect(upsertConfirmedColumnMappingMock).toHaveBeenCalledWith('biz-1', 'aged_debtors', expect.any(String), { client: 'customer name' });
  });

  it('merges a remembered mapping into extraction without the owner supplying anything this round', async () => {
    const csvWithSynonym = `As At Date,Client,Invoice Reference,Invoice Date,Due Date,Amount,Currency\n2026-06-30,Jane Cooper,INV-1,,2026-06-15,4500,ZAR`;
    findConfirmedColumnMappingMock.mockResolvedValue({
      id: 'mapping-1',
      businessId: 'biz-1',
      documentType: 'aged_debtors',
      sourceSignature: 'whatever',
      columnMapping: { client: 'customer name' },
      confirmedAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await ingestDocument('biz-1', 'aged_debtors', { filename: 'x.csv', content: csvWithSynonym });

    expect(result.status).toBe('completed'); // no confirmation needed — memory already covers it
  });

  it('does not fail the upload when Confirmed Mapping Memory write hits a real conflict — the extraction the owner just completed still stands', async () => {
    upsertConfirmedColumnMappingMock.mockRejectedValue(new ConfirmedMappingConflictError(['client']));
    const csvWithSynonym = `As At Date,Client,Invoice Reference,Invoice Date,Due Date,Amount,Currency\n2026-06-30,Jane Cooper,INV-1,,2026-06-15,4500,ZAR`;

    const result = await ingestDocument(
      'biz-1',
      'aged_debtors',
      { filename: 'x.csv', content: csvWithSynonym },
      { columnMapping: { client: 'customer name' } }
    );

    expect(result.status).toBe('completed');
  });

  it('a rejected prior attempt does not block a corrected retry of the same file — the exact defect found live, 22 July 2026 (Founder Acceptance Test)', async () => {
    // The first attempt (wrong document type selected) was rejected and
    // recorded with this checksum.
    findSignalSourceByChecksumMock.mockResolvedValue({ id: 'source-rejected', status: 'rejected', checksum: 'whatever' });
    createSignalSourceMock.mockReset();
    updateSignalSourceMock.mockImplementation(async (id, updates) => ({ id, status: 'completed', ...updates }));

    // Retry with the correct document type — same file content.
    const result = await ingestDocument('biz-1', 'aged_debtors', { filename: 'x.csv', content: VALID_CSV });

    expect(result.status).toBe('completed');
    expect(persistSignalsMock).toHaveBeenCalledTimes(1);
    // Must reuse the existing rejected record (update), never create a
    // second row for the same checksum — that would violate the
    // (businessId, checksum) unique constraint in production.
    expect(createSignalSourceMock).not.toHaveBeenCalled();
    expect(updateSignalSourceMock).toHaveBeenCalledWith('source-rejected', expect.objectContaining({ status: 'processing', documentType: 'aged_debtors' }));
  });

  it('a rejected prior attempt, retried and rejected again, updates the existing record rather than creating a duplicate row', async () => {
    findSignalSourceByChecksumMock.mockResolvedValue({ id: 'source-rejected', status: 'rejected' });
    createSignalSourceMock.mockReset();

    const result = await ingestDocument('biz-1', 'aged_debtors', {
      filename: 'wrong.csv',
      content: 'Customer,Ref\nJane,INV-1',
    });

    expect(result.status).toBe('rejected');
    expect(createSignalSourceMock).not.toHaveBeenCalled();
    expect(updateSignalSourceMock).toHaveBeenCalledWith('source-rejected', expect.objectContaining({ status: 'rejected' }));
  });
});
