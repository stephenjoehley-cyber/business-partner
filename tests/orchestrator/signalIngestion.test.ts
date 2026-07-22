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

import { getBusinessById } from '@/lib/brain/repository';
import { persistSignals } from '@/lib/signals/repository';
import { createSignalSource, findSignalSourceByChecksum, updateSignalSource } from '@/lib/signals/sourceRepository';
import { ingestDocument } from '@/lib/orchestrator/signalIngestion';

const getBusinessByIdMock = getBusinessById as unknown as ReturnType<typeof vi.fn>;
const persistSignalsMock = persistSignals as unknown as ReturnType<typeof vi.fn>;
const createSignalSourceMock = createSignalSource as unknown as ReturnType<typeof vi.fn>;
const findSignalSourceByChecksumMock = findSignalSourceByChecksum as unknown as ReturnType<typeof vi.fn>;
const updateSignalSourceMock = updateSignalSource as unknown as ReturnType<typeof vi.fn>;

const BUSINESS = { id: 'biz-1', name: 'Meridian Gearboxes', industry: 'Automotive', goals: [], people: [] };

const VALID_CSV = `As At Date,Customer Name,Invoice Reference,Invoice Date,Due Date,Amount,Currency\n2026-06-30,Jane Cooper,INV-1,,2026-06-15,4500,ZAR`;

describe('ingestDocument', () => {
  beforeEach(() => {
    getBusinessByIdMock.mockReset();
    persistSignalsMock.mockReset();
    createSignalSourceMock.mockReset();
    findSignalSourceByChecksumMock.mockReset();
    updateSignalSourceMock.mockReset();

    getBusinessByIdMock.mockResolvedValue(BUSINESS);
    findSignalSourceByChecksumMock.mockResolvedValue(undefined);
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

  it('short-circuits on an existing completed duplicate even before the extractor runs — checksum is content-based, not filename-based', async () => {
    findSignalSourceByChecksumMock.mockResolvedValue({ id: 'source-dup', status: 'completed' });

    // Different filename, identical content — still a duplicate.
    const result = await ingestDocument('biz-1', 'aged_debtors', { filename: 'different-name.csv', content: VALID_CSV });

    expect(result.status).toBe('duplicate');
  });
});
