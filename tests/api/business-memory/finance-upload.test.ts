import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/brain/repository', () => ({
  getBusinessByOwner: vi.fn(),
}));

vi.mock('@/lib/orchestrator/signalIngestion', () => ({
  ingestDocument: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { getBusinessByOwner } from '@/lib/brain/repository';
import { ingestDocument } from '@/lib/orchestrator/signalIngestion';
import { POST } from '@/app/api/business-memory/finance/upload/route';

const createClientMock = createClient as unknown as ReturnType<typeof vi.fn>;
const getBusinessByOwnerMock = getBusinessByOwner as unknown as ReturnType<typeof vi.fn>;
const ingestDocumentMock = ingestDocument as unknown as ReturnType<typeof vi.fn>;

function mockAuthedUser(userId: string | null) {
  createClientMock.mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
  });
}

function makeUploadRequest(opts: { file?: File; documentType?: string; currency?: string; reportingDate?: string }) {
  const formData = new FormData();
  if (opts.file) formData.set('file', opts.file);
  if (opts.documentType) formData.set('documentType', opts.documentType);
  if (opts.currency) formData.set('currency', opts.currency);
  if (opts.reportingDate) formData.set('reportingDate', opts.reportingDate);
  return new Request('http://localhost/api/business-memory/finance/upload', { method: 'POST', body: formData });
}

const VALID_CSV_FILE = new File(['a,b\n1,2'], 'debtors.csv', { type: 'text/csv' });

describe('POST /api/business-memory/finance/upload', () => {
  beforeEach(() => {
    createClientMock.mockReset();
    getBusinessByOwnerMock.mockReset();
    ingestDocumentMock.mockReset();
  });

  it('returns 401 when there is no authenticated user', async () => {
    mockAuthedUser(null);
    const res = await POST(makeUploadRequest({ file: VALID_CSV_FILE, documentType: 'aged_debtors' }));
    expect(res.status).toBe(401);
    expect(ingestDocumentMock).not.toHaveBeenCalled();
  });

  it('returns 409 when the owner has no business', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue(null);
    const res = await POST(makeUploadRequest({ file: VALID_CSV_FILE, documentType: 'aged_debtors' }));
    expect(res.status).toBe(409);
  });

  it('rejects a request with no file, in the approved malformed-file voice', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });
    const res = await POST(makeUploadRequest({ documentType: 'aged_debtors' }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.message).toContain("couldn't make sense of this file");
  });

  it('rejects a non-csv file with the unsupported-file-type copy', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });
    const pdfFile = new File(['x'], 'debtors.pdf', { type: 'application/pdf' });
    const res = await POST(makeUploadRequest({ file: pdfFile, documentType: 'aged_debtors' }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.message).toContain('spreadsheet files (.csv)');
  });

  it('rejects a file over the size ceiling with the file-too-large copy', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });
    const bigContent = 'a'.repeat(5 * 1024 * 1024 + 1);
    const bigFile = new File([bigContent], 'debtors.csv', { type: 'text/csv' });
    const res = await POST(makeUploadRequest({ file: bigFile, documentType: 'aged_debtors' }));
    const body = await res.json();
    expect(res.status).toBe(413);
    expect(body.message).toContain('5 MB');
  });

  it('maps a wrong_document_type rejection to the approved copy, naming the document type in plain language', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });
    ingestDocumentMock.mockResolvedValue({ status: 'rejected', kind: 'wrong_document_type', reason: 'internal reason' });

    const res = await POST(makeUploadRequest({ file: VALID_CSV_FILE, documentType: 'aged_debtors' }));
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.message).toContain('money owed to you');
    expect(body.message).not.toContain('internal reason');
  });

  it('maps a duplicate result to the approved copy with filename and date', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });
    ingestDocumentMock.mockResolvedValue({
      status: 'duplicate',
      source: { originalFilename: 'debtors-june.csv', createdAt: new Date('2026-06-30') },
    });

    const res = await POST(makeUploadRequest({ file: VALID_CSV_FILE, documentType: 'aged_debtors' }));
    const body = await res.json();

    expect(body.message).toContain('debtors-june.csv');
    expect(body.message).toContain("I've already got this one");
  });

  it('maps a pending_confirmation result to the correct prompts, only for what is actually needed', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });
    ingestDocumentMock.mockResolvedValue({
      status: 'pending_confirmation',
      sourceId: 'source-1',
      needsCurrency: true,
      needsReportingDate: false,
    });

    const res = await POST(makeUploadRequest({ file: VALID_CSV_FILE, documentType: 'aged_debtors' }));
    const body = await res.json();

    expect(body.currencyPrompt).toContain('currency');
    expect(body.reportingDatePrompt).toBeUndefined();
  });

  it('passes confirmation fields through to ingestDocument on a follow-up call', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });
    ingestDocumentMock.mockResolvedValue({
      status: 'completed',
      source: { processedRowCount: 1, totalRowCount: 1, reportingDate: new Date('2026-06-30') },
      excludedRows: [],
      qualifiedCount: 0,
    });

    await POST(makeUploadRequest({ file: VALID_CSV_FILE, documentType: 'aged_debtors', currency: 'ZAR' }));

    expect(ingestDocumentMock).toHaveBeenCalledWith(
      'biz-1',
      'aged_debtors',
      expect.objectContaining({ filename: 'debtors.csv' }),
      expect.objectContaining({ currency: 'ZAR' })
    );
  });

  it('uses the "needs attention" copy when the qualified count is above zero, and "all clear" when it is not', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });
    ingestDocumentMock.mockResolvedValue({
      status: 'completed',
      source: { processedRowCount: 2, totalRowCount: 2, reportingDate: new Date('2026-06-30') },
      excludedRows: [],
      qualifiedCount: 1,
    });

    const res = await POST(makeUploadRequest({ file: VALID_CSV_FILE, documentType: 'aged_debtors' }));
    const body = await res.json();

    expect(body.outcomeMessage).toContain('worth your attention');
    expect(body.heading).toBe('This is now part of how I understand your business.');
    expect(body.reinforcement).toBeTruthy();
  });

  it('translates excluded row reason codes into the approved plain-language disclosure text', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });
    ingestDocumentMock.mockResolvedValue({
      status: 'completed',
      source: { processedRowCount: 1, totalRowCount: 2, reportingDate: new Date('2026-06-30') },
      excludedRows: [{ rowNumber: 2, reason: 'unparseable_amount' }],
      qualifiedCount: 0,
    });

    const res = await POST(makeUploadRequest({ file: VALID_CSV_FILE, documentType: 'aged_debtors' }));
    const body = await res.json();

    expect(body.excludedRows).toEqual([{ rowNumber: 2, reason: "the amount didn't make sense to me" }]);
  });

  it('returns the calm unexpected-failure copy if ingestDocument throws, never a raw error', async () => {
    mockAuthedUser('user-1');
    getBusinessByOwnerMock.mockResolvedValue({ id: 'biz-1' });
    ingestDocumentMock.mockRejectedValue(new Error('database exploded'));

    const res = await POST(makeUploadRequest({ file: VALID_CSV_FILE, documentType: 'aged_debtors' }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.message).not.toContain('database exploded');
    expect(body.message).toContain("Something went wrong on my side");
  });
});
