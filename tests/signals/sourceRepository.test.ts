import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    excludedRowRecord: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/demo/config', () => ({
  isDemoMode: vi.fn(),
}));

vi.mock('@/lib/demo/store', () => ({
  createDemoSignalSource: vi.fn(),
  findDemoSignalSourceByChecksum: vi.fn(),
  updateDemoSignalSource: vi.fn(),
  getDemoSignalSource: vi.fn(),
  listDemoSignalSourcesForBusiness: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { isDemoMode } from '@/lib/demo/config';
import { getExcludedRowsForSource } from '@/lib/signals/sourceRepository';

const findManyMock = prisma.excludedRowRecord.findMany as unknown as ReturnType<typeof vi.fn>;
const isDemoModeMock = isDemoMode as unknown as ReturnType<typeof vi.fn>;

/**
 * Financial Evidence History, 23 July 2026 — the new retrieval function
 * backing the history list's per-upload detail view.
 */
describe('getExcludedRowsForSource', () => {
  beforeEach(() => {
    findManyMock.mockReset();
    isDemoModeMock.mockReset();
    isDemoModeMock.mockReturnValue(false);
  });

  it('returns the stored reason codes, unstranslated — translation happens at the presentation layer, not here', async () => {
    findManyMock.mockResolvedValue([
      { id: 'r1', signalSourceId: 'source-1', rowNumber: 3, reason: 'unparseable_amount' },
      { id: 'r2', signalSourceId: 'source-1', rowNumber: 7, reason: 'missing_currency' },
    ]);

    const result = await getExcludedRowsForSource('source-1');

    expect(result).toEqual([
      { rowNumber: 3, reason: 'unparseable_amount' },
      { rowNumber: 7, reason: 'missing_currency' },
    ]);
    expect(findManyMock).toHaveBeenCalledWith(expect.objectContaining({ where: { signalSourceId: 'source-1' } }));
  });

  it('returns an empty array for a source with no excluded rows, not an error', async () => {
    findManyMock.mockResolvedValue([]);
    expect(await getExcludedRowsForSource('source-1')).toEqual([]);
  });

  it('returns an empty array in demo mode without touching the database — honest, not fabricated', async () => {
    isDemoModeMock.mockReturnValue(true);
    expect(await getExcludedRowsForSource('source-1')).toEqual([]);
    expect(findManyMock).not.toHaveBeenCalled();
  });
});
