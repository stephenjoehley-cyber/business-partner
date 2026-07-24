import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    partner: { findUnique: vi.fn() },
    partnerReferral: { create: vi.fn() },
  },
}));

vi.mock('@/lib/demo/config', () => ({
  isDemoMode: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { isDemoMode } from '@/lib/demo/config';
import { resolveReferral } from '@/lib/executive/partnerReferral';

const findUniqueMock = prisma.partner.findUnique as unknown as ReturnType<typeof vi.fn>;
const createMock = prisma.partnerReferral.create as unknown as ReturnType<typeof vi.fn>;
const isDemoModeMock = isDemoMode as unknown as ReturnType<typeof vi.fn>;

describe('resolveReferral', () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
    createMock.mockReset();
    isDemoModeMock.mockReset();
    isDemoModeMock.mockReturnValue(false);
  });

  it('does nothing when no referral code is present', async () => {
    await resolveReferral('biz-1', undefined);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it('does nothing in demo mode, even with a real-looking code', async () => {
    isDemoModeMock.mockReturnValue(true);
    await resolveReferral('biz-1', 'REAL-CODE');
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it('does nothing for a code that matches no partner — never fabricates an attribution', async () => {
    findUniqueMock.mockResolvedValue(null);
    await resolveReferral('biz-1', 'MADE-UP-CODE');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('does nothing for a code matching an inactive partner', async () => {
    findUniqueMock.mockResolvedValue({ id: 'partner-1', referralCode: 'OLD-CODE', status: 'inactive' });
    await resolveReferral('biz-1', 'OLD-CODE');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('creates a PartnerReferral for a real, active partner match', async () => {
    findUniqueMock.mockResolvedValue({ id: 'partner-1', referralCode: 'CHAMBER2026', status: 'active' });
    createMock.mockResolvedValue({});

    await resolveReferral('biz-1', 'CHAMBER2026');

    expect(createMock).toHaveBeenCalledWith({
      data: { businessId: 'biz-1', partnerId: 'partner-1', referralCode: 'CHAMBER2026' },
    });
  });

  it('never throws if a referral was somehow already recorded for this business', async () => {
    findUniqueMock.mockResolvedValue({ id: 'partner-1', referralCode: 'CHAMBER2026', status: 'active' });
    createMock.mockRejectedValue(new Error('Unique constraint failed on the fields: (`businessId`)'));

    await expect(resolveReferral('biz-1', 'CHAMBER2026')).resolves.toBeUndefined();
  });
});
