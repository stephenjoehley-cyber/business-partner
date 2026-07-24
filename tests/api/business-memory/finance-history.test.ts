import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/brain/repository', () => ({
  getBusinessByOwner: vi.fn(),
}));

vi.mock('@/lib/signals/sourceRepository', () => ({
  listSignalSourcesForBusiness: vi.fn(),
  getExcludedRowsForSource: vi.fn().mockResolvedValue([]),
}));

import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { listSignalSourcesForBusiness, getExcludedRowsForSource } from '@/lib/signals/sourceRepository';
import { GET } from '@/app/api/business-memory/finance/history/route';

const createClientMock = createClient as unknown as ReturnType<typeof vi.fn>;
const getBusinessByOwnerMock = getBusinessByOwner as unknown as ReturnType<typeof vi.fn>;
const listSignalSourcesMock = listSignalSourcesForBusiness as unknown as ReturnType<typeof vi.fn>;
const getExcludedRowsForSourceMock = getExcludedRowsForSource as unknown as ReturnType<typeof vi.fn>;

function mockAuthedUser(userId: string | null) {
  createClientMock.mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
  });
}

describe('GET /api/business-memory/finance/history', () => {
  beforeEach(() => {
    createClientMock.mockReset();
    getBusinessByOwnerMock.mockReset();
    listSignalSourcesMock.mockReset();
    getExcludedRowsForSourceMock.mockReset();
    getExcludedRowsForSourceMock.mockResolvedValue([]);
  });

  it('returns 401 without an authenticated user', async () => {
    mockAuthedUser(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('translates a completed source into the approved status label and plain document-type subtitle', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });
    listSignalSourcesMock.mockResolvedValue([
      {
        id: 'source-1',
        originalFilename: 'debtors-june.csv',
        documentType: 'aged_debtors',
        status: 'completed',
        excludedRowCount: 0,
        reportingDate: new Date('2026-06-30'),
        createdAt: new Date('2026-07-01'),
      },
    ]);

    const res = await GET();
    const body = await res.json();

    expect(body.uploads[0].status).toBe('Understood');
    expect(body.uploads[0].subtitle).toContain('money owed to you');
    expect(body.uploads[0].needsConfirmation).toBe(false);
  });

  it('labels a completed source with excluded rows as "Mostly understood", and includes the translated excluded-row detail — Financial Evidence History, 23 July 2026', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });
    listSignalSourcesMock.mockResolvedValue([
      {
        id: 'source-1',
        originalFilename: 'x.csv',
        documentType: 'aged_creditors',
        status: 'completed',
        excludedRowCount: 2,
        reportingDate: new Date('2026-06-30'),
        createdAt: new Date('2026-07-01'),
      },
    ]);
    getExcludedRowsForSourceMock.mockResolvedValue([
      { rowNumber: 3, reason: 'unparseable_amount' },
      { rowNumber: 7, reason: 'missing_currency' },
    ]);

    const res = await GET();
    const body = await res.json();
    expect(body.uploads[0].status).toBe('Mostly understood');
    expect(body.uploads[0].excludedRows).toEqual([
      { rowNumber: 3, reason: "the amount didn't make sense to me" },
      { rowNumber: 7, reason: "I couldn't tell what currency this was in" },
    ]);
    expect(getExcludedRowsForSourceMock).toHaveBeenCalledWith('source-1');
  });

  it('flags a pending_confirmation source as needing confirmation', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });
    listSignalSourcesMock.mockResolvedValue([
      {
        id: 'source-1',
        originalFilename: 'x.csv',
        documentType: 'aged_debtors',
        status: 'pending_confirmation',
        excludedRowCount: 0,
        reportingDate: undefined,
        createdAt: new Date('2026-07-01'),
      },
    ]);

    const res = await GET();
    const body = await res.json();
    expect(body.uploads[0].needsConfirmation).toBe(true);
    expect(body.uploads[0].status).toBe('Needs one thing from you');
  });
});
