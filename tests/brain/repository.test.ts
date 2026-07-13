import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    business: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/demo/config', () => ({
  isDemoMode: vi.fn(),
  DEMO_BUSINESS_ID: 'demo-business',
}));

vi.mock('@/lib/demo/store', () => ({
  getDemoBusinessById: vi.fn(),
  addDemoPeople: vi.fn(),
  createDemoBusinessProfile: vi.fn(),
  getDemoBusinessByOwner: vi.fn(),
  replaceDemoGoals: vi.fn(),
  updateDemoBusinessProfile: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { isDemoMode } from '@/lib/demo/config';
import { getDemoBusinessById } from '@/lib/demo/store';
import { getAllBusinessIds } from '@/lib/brain/repository';

const findManyMock = prisma.business.findMany as unknown as ReturnType<typeof vi.fn>;
const isDemoModeMock = isDemoMode as unknown as ReturnType<typeof vi.fn>;
const getDemoBusinessByIdMock = getDemoBusinessById as unknown as ReturnType<typeof vi.fn>;

describe('getAllBusinessIds', () => {
  beforeEach(() => {
    findManyMock.mockReset();
    isDemoModeMock.mockReset();
    getDemoBusinessByIdMock.mockReset();
  });

  it('queries every business id when not in Demo Mode', async () => {
    isDemoModeMock.mockReturnValue(false);
    findManyMock.mockResolvedValue([{ id: 'biz-1' }, { id: 'biz-2' }]);

    const result = await getAllBusinessIds();

    expect(findManyMock).toHaveBeenCalledWith({ select: { id: true } });
    expect(result).toEqual(['biz-1', 'biz-2']);
  });

  it('returns an empty array when no businesses exist', async () => {
    isDemoModeMock.mockReturnValue(false);
    findManyMock.mockResolvedValue([]);

    const result = await getAllBusinessIds();

    expect(result).toEqual([]);
  });

  it('returns the single seeded demo business id in Demo Mode, without touching Prisma', async () => {
    isDemoModeMock.mockReturnValue(true);
    getDemoBusinessByIdMock.mockReturnValue({ id: 'demo-business' });

    const result = await getAllBusinessIds();

    expect(result).toEqual(['demo-business']);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it('returns an empty array in Demo Mode if the demo business is somehow missing', async () => {
    isDemoModeMock.mockReturnValue(true);
    getDemoBusinessByIdMock.mockReturnValue(null);

    const result = await getAllBusinessIds();

    expect(result).toEqual([]);
  });
});
