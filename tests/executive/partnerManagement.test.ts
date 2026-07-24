import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    partner: {
      update: vi.fn(),
      delete: vi.fn(),
    },
    partnerRevenueShareTerm: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    partnerReferral: {
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '@/lib/prisma';
import { updatePartner, deletePartner, InvalidRevenueShareError, PartnerDeletionBlockedError } from '@/lib/executive/partnerManagement';

const partnerUpdateMock = prisma.partner.update as unknown as ReturnType<typeof vi.fn>;
const partnerDeleteMock = prisma.partner.delete as unknown as ReturnType<typeof vi.fn>;
const termFindFirstMock = prisma.partnerRevenueShareTerm.findFirst as unknown as ReturnType<typeof vi.fn>;
const termUpdateMock = prisma.partnerRevenueShareTerm.update as unknown as ReturnType<typeof vi.fn>;
const termCreateMock = prisma.partnerRevenueShareTerm.create as unknown as ReturnType<typeof vi.fn>;
const termDeleteManyMock = prisma.partnerRevenueShareTerm.deleteMany as unknown as ReturnType<typeof vi.fn>;
const referralCountMock = prisma.partnerReferral.count as unknown as ReturnType<typeof vi.fn>;
const transactionMock = prisma.$transaction as unknown as ReturnType<typeof vi.fn>;

describe('updatePartner', () => {
  beforeEach(() => {
    partnerUpdateMock.mockReset();
    termFindFirstMock.mockReset();
    transactionMock.mockReset();
    transactionMock.mockResolvedValue([]);
  });

  it('rejects an out-of-range revenue share without touching the database', async () => {
    await expect(updatePartner('partner-1', { revenueSharePercent: 150 })).rejects.toThrow(InvalidRevenueShareError);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('closes the current term and creates a new one — never overwrites history', async () => {
    termFindFirstMock.mockResolvedValue({ id: 'term-old', revenueSharePercent: 20, effectiveTo: null });

    await updatePartner('partner-1', { revenueSharePercent: 25 });

    expect(transactionMock).toHaveBeenCalled();
    const transactionArg = transactionMock.mock.calls[0][0];
    // Both the closing-update of the old term and the creation of the new one are in one transaction.
    expect(transactionArg).toHaveLength(2);
  });

  it('creates a first term directly when a partner has no current one yet', async () => {
    termFindFirstMock.mockResolvedValue(null);

    await updatePartner('partner-1', { revenueSharePercent: 20 });

    const transactionArg = transactionMock.mock.calls[0][0];
    expect(transactionArg).toHaveLength(1);
  });

  it('updates direct fields (name, organisation, email, status) without touching revenue-share history at all', async () => {
    await updatePartner('partner-1', { partnerName: 'New Name', status: 'inactive' });

    expect(transactionMock).not.toHaveBeenCalled();
    expect(partnerUpdateMock).toHaveBeenCalledWith({
      where: { id: 'partner-1' },
      data: { partnerName: 'New Name', status: 'inactive' },
    });
  });
});

describe('deletePartner', () => {
  beforeEach(() => {
    referralCountMock.mockReset();
    transactionMock.mockReset();
    partnerDeleteMock.mockReset();
    termDeleteManyMock.mockReset();
  });

  it('refuses to delete a partner with real referred signups', async () => {
    referralCountMock.mockResolvedValue(3);
    await expect(deletePartner('partner-1')).rejects.toThrow(PartnerDeletionBlockedError);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('deletes a partner with zero referrals, including their revenue-share history', async () => {
    referralCountMock.mockResolvedValue(0);
    transactionMock.mockResolvedValue([]);

    await deletePartner('partner-1');

    expect(transactionMock).toHaveBeenCalled();
    const transactionArg = transactionMock.mock.calls[0][0];
    expect(transactionArg).toHaveLength(2);
  });
});
